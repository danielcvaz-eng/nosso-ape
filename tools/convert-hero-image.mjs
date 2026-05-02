import { chromium } from "@playwright/test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = path.resolve("assets/hero/apartamento-sala.jpg");
const OUTPUT_PATH = path.resolve("assets/hero/apartamento-sala.webp");
const OUTPUT_WIDTH = 900;
const OUTPUT_HEIGHT = 1200;
const OUTPUT_QUALITY = 0.86;

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

if (!await fileExists(INPUT_PATH)) {
  console.error("Arquivo JPG nao encontrado.");
  console.error(`Salve a foto em: ${path.relative(process.cwd(), INPUT_PATH)}`);
  process.exit(1);
}

const jpgBuffer = await readFile(INPUT_PATH);
const jpgDataUrl = `data:image/jpeg;base64,${jpgBuffer.toString("base64")}`;

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: {
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT
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
    dataUrl: jpgDataUrl,
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    quality: OUTPUT_QUALITY
  });

  await writeFile(OUTPUT_PATH, Buffer.from(webpDataUrl.split(",")[1], "base64"));
  console.log(`Imagem convertida: ${path.relative(process.cwd(), OUTPUT_PATH)}`);
} finally {
  await page.close();
  await browser.close();
}
