import { expect, test } from "@playwright/test";
import { APP_CONFIG } from "../../scripts/config.js";

const baseUrl = process.env.BASE_URL || "http://localhost:8000";
const product = {
  id: 16,
  name: "Cafeteira Oster Inox Compacta 0,75L OCAF300 - 220V",
  category: "Cozinha",
  price: 119,
  priority: "media",
  type: "inteiro",
  description: "Cafeteira compacta em inox para o café do dia a dia dos moradores.",
  link: "https://a.co/d/0a0ZVY5B",
  status: "disponivel",
  estimated_price: false,
  is_visible: true
};

const qrCodeImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const qrCodePayload = "00020101021226800014br.gov.bcb.pix2558pix.asaas.com/qr/v2/teste6304ABCD";

async function mockCatalog(page) {
  await page.route(`${APP_CONFIG.supabase.restUrl}/products**`, async (route) => {
    await route.fulfill({ json: [product] });
  });

  await page.route(`${APP_CONFIG.supabase.restUrl}/product_progress**`, async (route) => {
    await route.fulfill({
      json: [{
        product_id: product.id,
        confirmed_amount: 0,
        confirmed_count: 0
      }]
    });
  });
}

async function fillGiftFlow(page) {
  await page.goto(baseUrl);

  const card = page.getByRole("heading", { name: /cafeteira oster inox compacta/i }).locator("xpath=ancestor::article");
  await card.getByRole("button", { name: "Quero presentear" }).click();
  await page.getByLabel("Seu nome").fill("QA Codex");
  await page.getByRole("button", { name: "Continuar" }).click();
}

test("pix automatico mostra QR Code e copia e cola quando Asaas responde", async ({ page }) => {
  await mockCatalog(page);

  await page.route(`${APP_CONFIG.supabase.functionsUrl}/create-asaas-pix-charge`, async (route) => {
    await route.fulfill({
      json: {
        payment_id: "payment-test",
        contribution_id: "contribution-test",
        asaas_payment_id: "pay_test",
        amount: product.price,
        status: "awaiting_payment",
        qr_code_payload: qrCodePayload,
        qr_code_image: qrCodeImage,
        expires_at: "2026-05-08T23:59:59Z"
      }
    });
  });

  await fillGiftFlow(page);

  await expect(page.getByRole("heading", { name: /pague pelo pix automático/i })).toBeVisible();
  await expect(page.locator("#dynamic-pix-box")).not.toHaveClass(/hidden/);
  await expect(page.locator("#pix-qr-code")).toBeVisible();
  await expect(page.locator("#pix-qr-code")).toHaveAttribute("src", `data:image/png;base64,${qrCodeImage}`);
  await expect(page.locator("#pix-copy-paste")).toHaveValue(qrCodePayload);
  await expect(page.getByRole("button", { name: /copiar pix copia e cola/i })).toBeVisible();
  await expect(page.locator("#copy-feedback")).toContainText(/pix automático gerado/i);
});

test("pix automatico indisponivel cai para Pix manual sem sucesso falso", async ({ page }) => {
  await mockCatalog(page);

  await page.route(`${APP_CONFIG.supabase.functionsUrl}/create-asaas-pix-charge`, async (route) => {
    await route.fulfill({
      status: 503,
      json: { error: "Integração Asaas não configurada." }
    });
  });

  await page.route(`${APP_CONFIG.supabase.restUrl}/contributions`, async (route) => {
    expect(route.request().method()).toBe("POST");
    await route.fulfill({ status: 201, body: "" });
  });

  await fillGiftFlow(page);

  await expect(page.getByText(/pix automático indisponível/i)).toBeVisible();
  await expect(page.getByText("daniel.vazbtg@gmail.com")).toBeVisible();
  await expect(page.locator("#dynamic-pix-box")).toHaveClass(/hidden/);

  await page.getByLabel(/já fiz o pix/i).check();
  await page.getByRole("button", { name: "Registrar intenção" }).click();

  await expect(page.getByRole("heading", { name: /registro enviado/i })).toBeVisible();
  await expect(page.locator("#success-message")).toContainText(/confirmação manual dos moradores/i);
});
