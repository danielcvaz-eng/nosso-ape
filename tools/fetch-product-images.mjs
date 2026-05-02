import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import produtos from "../data/produtos.js";

const OUTPUT_DIR = path.resolve("assets/produtos");
const IMAGE_WIDTH = 900;
const IMAGE_HEIGHT = 675;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MANUAL_IMAGE_URLS = {
  1: "https://electrolux.vtexassets.com/arquivos/ids/289484/7909569485637_1-1000x1000.jpg?v=639060023232470000",
  3: "https://faetton.com/cdn/shop/files/Conjunto-de-4-Capas-de-Almofadas-Decorativas-em-Tons-Terrosos-Delamantina-Capa-de-almofada-DELAMANTINA-option3-by-faetton_com-homedecor_600x.jpg?v=1766072091"
};

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeImageUrl(rawUrl, pageUrl) {
  if (!rawUrl) {
    return "";
  }

  const decodedUrl = decodeHtmlEntities(String(rawUrl).trim());

  if (decodedUrl.startsWith("//")) {
    return `https:${decodedUrl}`;
  }

  try {
    return new URL(decodedUrl, pageUrl).toString();
  } catch {
    return "";
  }
}

function getMetaContent(html, names) {
  for (const name of names) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const metaPattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
    const reverseMetaPattern = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedName}["'][^>]*>`, "i");
    const match = html.match(metaPattern) || html.match(reverseMetaPattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function getAmazonImage(html) {
  const dynamicImageMatch = html.match(/data-a-dynamic-image=["']({.+?})["']/);

  if (dynamicImageMatch?.[1]) {
    const jsonText = decodeHtmlEntities(dynamicImageMatch[1]);

    try {
      return Object.keys(JSON.parse(jsonText))[0] || "";
    } catch {
      return "";
    }
  }

  return "";
}

async function discoverImageUrl(product, page) {
  const response = await page.goto(product.link, {
    waitUntil: "domcontentloaded",
    timeout: 45000
  }).catch(() => null);

  const finalUrl = page.url() || product.link;
  const html = response ? await response.text().catch(() => "") : await page.content().catch(() => "");
  const metaUrl = getMetaContent(html, [
    "og:image:secure_url",
    "og:image",
    "twitter:image",
    "twitter:image:src"
  ]);
  const amazonUrl = getAmazonImage(html);
  const domUrl = await page.evaluate(() => {
    const selectors = [
      "#landingImage",
      "[data-old-hires]",
      "img[data-a-dynamic-image]",
      "img[data-testid*='product']",
      "img[src*='m.media-amazon']",
      "img[src*='magazineluiza']",
      "img[src*='temu']",
      "main img"
    ];

    for (const selector of selectors) {
      const image = document.querySelector(selector);
      const source = image?.getAttribute("data-old-hires")
        || image?.getAttribute("src")
        || image?.getAttribute("data-src");

      if (source) {
        return source;
      }
    }

    return "";
  }).catch(() => "");

  return normalizeImageUrl(metaUrl || amazonUrl || domUrl, finalUrl);
}

async function fetchImageAsDataUrl(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function renderWebp(browser, dataUrl, product) {
  const page = await browser.newPage({
    viewport: {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT
    }
  });

  try {
    const result = await page.evaluate(async ({ dataUrl: imageDataUrl, productName, width, height }) => {
      const image = new Image();
      image.decoding = "async";
      image.src = imageDataUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      context.fillStyle = "#fffaf5";
      context.fillRect(0, 0, width, height);

      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const drawnWidth = Math.round(image.naturalWidth * scale);
      const drawnHeight = Math.round(image.naturalHeight * scale);
      const x = Math.round((width - drawnWidth) / 2);
      const y = Math.round((height - drawnHeight) / 2);

      context.drawImage(image, x, y, drawnWidth, drawnHeight);

      if (drawnWidth < width || drawnHeight < height) {
        context.strokeStyle = "rgba(119, 91, 76, 0.12)";
        context.lineWidth = 2;
        context.strokeRect(1, 1, width - 2, height - 2);
      }

      return {
        alt: productName,
        dataUrl: canvas.toDataURL("image/webp", 0.82)
      };
    }, {
      dataUrl,
      productName: product.nome,
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT
    });

    return Buffer.from(result.dataUrl.split(",")[1], "base64");
  } finally {
    await page.close();
  }
}

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: USER_AGENT,
  locale: "pt-BR"
});

try {
  for (const product of produtos) {
    const filename = `${String(product.id).padStart(2, "0")}-${slugify(product.nome)}.webp`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    console.log(`Buscando imagem: ${product.id} - ${product.nome}`);

    try {
      const imageUrl = MANUAL_IMAGE_URLS[product.id] || await discoverImageUrl(product, page);

      if (!imageUrl) {
        throw new Error("Imagem principal não encontrada");
      }

      console.log(`  ${imageUrl}`);
      const dataUrl = await fetchImageAsDataUrl(imageUrl);
      const webpBuffer = await renderWebp(browser, dataUrl, product);
      await writeFile(outputPath, webpBuffer);
      console.log(`  salvo em ${path.relative(process.cwd(), outputPath)}`);
    } catch (error) {
      console.warn(`  falhou: ${error.message}`);
    }
  }
} finally {
  await page.close();
  await browser.close();
}
