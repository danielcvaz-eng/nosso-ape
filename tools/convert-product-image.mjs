import { chromium } from "@playwright/test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const [inputArg, outputArg] = process.argv.slice(2);
const IMAGE_WIDTH = 900;
const IMAGE_HEIGHT = 675;
const IMAGE_QUALITY = 0.84;

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

if (!inputArg || !outputArg) {
  console.error("Uso: node tools/convert-product-image.mjs <entrada.jpg> <saida.webp>");
  process.exit(1);
}

const inputPath = path.resolve(inputArg);
const outputPath = path.resolve(outputArg);

if (!await fileExists(inputPath)) {
  console.error(`Imagem de entrada nao encontrada: ${path.relative(process.cwd(), inputPath)}`);
  process.exit(1);
}

const imageBuffer = await readFile(inputPath);
const imageDataUrl = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

await mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT
  }
});

try {
  const webpDataUrl = await page.evaluate(async ({ dataUrl, width, height, quality }) => {
    const image = new Image();
    image.decoding = "async";
    image.src = dataUrl;
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

    return canvas.toDataURL("image/webp", quality);
  }, {
    dataUrl: imageDataUrl,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    quality: IMAGE_QUALITY
  });

  await writeFile(outputPath, Buffer.from(webpDataUrl.split(",")[1], "base64"));
  console.log(`Imagem convertida: ${path.relative(process.cwd(), outputPath)}`);
} finally {
  await page.close();
  await browser.close();
}
