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

test("pix automatico indisponivel cai para Pix manual sem sucesso falso", async ({ page }) => {
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

  await page.goto(baseUrl);

  const card = page.getByRole("heading", { name: /cafeteira oster inox compacta/i }).locator("xpath=ancestor::article");
  await card.getByRole("button", { name: "Quero presentear" }).click();
  await page.getByLabel("Seu nome").fill("QA Codex");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText(/pix automático indisponível/i)).toBeVisible();
  await expect(page.getByText("daniel.vazbtg@gmail.com")).toBeVisible();
  await expect(page.locator("#dynamic-pix-box")).toHaveClass(/hidden/);

  await page.getByLabel(/já fiz o pix/i).check();
  await page.getByRole("button", { name: "Registrar intenção" }).click();

  await expect(page.getByRole("heading", { name: /registro enviado/i })).toBeVisible();
  await expect(page.locator("#success-message")).toContainText(/confirmação manual dos moradores/i);
});
