import { expect, test } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://localhost:8000";

test.beforeEach(async ({ page }) => {
  await page.goto(`${baseUrl}?backend=local`);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("catalogo carrega, filtra e limpa filtros", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /um cantinho novo/i })).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(16);
  await expect(page.getByRole("heading", { name: /máquina de gelo/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /micro-ondas de bancada electrolux efficient 36l/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /almofadas decorativas cheias/i })).toBeVisible();
  await expect(page.getByText("R$ 130,00")).toBeVisible();
  await expect(page.getByRole("heading", { name: /cafeteira oster inox compacta/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /fruteira metaltec/i })).toBeVisible();
  await expect(page.getByText(/preço de referência/i)).toHaveCount(0);
  await expect(page.locator(".product-image")).toHaveCount(14);
  await expect(page.locator(".product-image").first()).toHaveJSProperty("naturalWidth", 900);
  await page.getByAltText(/almofadas decorativas cheias/i).scrollIntoViewIfNeeded();
  await expect(page.getByAltText(/almofadas decorativas cheias/i)).toHaveJSProperty("naturalWidth", 900);
  await expect(page.locator(".product-image-placeholder")).toHaveCount(2);

  await page.getByLabel("Buscar item").fill("micro");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /micro-ondas de bancada/i })).toBeVisible();

  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.locator(".product-card")).toHaveCount(16);

  await page.getByLabel("Prioridade").selectOption("alta");
  await expect(page.locator(".product-card")).not.toHaveCount(0);
});

test("fluxo de presente inteiro registra intencao local e persiste", async ({ page }) => {
  const card = page.getByRole("heading", { name: /cafeteira oster inox compacta/i }).locator("xpath=ancestor::article");

  await card.getByRole("button", { name: "Quero presentear" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByLabel("Seu nome").fill("QA Codex");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: /faça o pix pela chave exibida/i })).toBeVisible();
  await expect(page.getByText("daniel.vazbtg@gmail.com")).toBeVisible();

  await page.getByLabel(/já fiz o pix/i).check();
  await page.getByRole("button", { name: "Registrar intenção" }).click();

  await expect(page.getByRole("heading", { name: /registro enviado/i })).toBeVisible();
  await page.getByLabel("Fechar modal").click();

  await expect(page.getByRole("button", { name: "Item recebido" }).first()).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Item recebido" }).first()).toBeDisabled();
});

test("fluxo colaborativo valida valor e atualiza progresso", async ({ page }) => {
  const card = page.getByRole("heading", { name: /micro-ondas de bancada/i }).locator("xpath=ancestor::article");

  await card.getByRole("button", { name: "Quero presentear" }).click();
  await page.getByLabel("Seu nome").fill("QA Codex");

  await page.getByLabel("Valor da colaboração").fill("0");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText(/valor de colaboração maior que zero/i)).toBeVisible();

  await page.getByLabel("Valor da colaboração").fill("50,00");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel(/já fiz o pix/i).check();
  await page.getByRole("button", { name: "Registrar intenção" }).click();
  await page.getByLabel("Fechar modal").click();

  await expect(page.getByText("Arrecadado: R$ 50,00").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Arrecadado: R$ 50,00").first()).toBeVisible();
});

test("modo moradores local altera status e limpeza local reseta dados", async ({ page }) => {
  await page.getByRole("button", { name: "Modo moradores local" }).click();
  await page.locator("[data-status-product-id]").first().selectOption("reservado");
  await expect(page.getByRole("button", { name: "Item reservado" }).first()).toBeDisabled();

  await page.reload();
  await expect(page.getByRole("button", { name: "Item reservado" }).first()).toBeDisabled();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Limpar dados locais" }).click();
  await expect(page.locator(".product-card")).toHaveCount(16);
  await expect(page.getByRole("button", { name: "Quero presentear" }).first()).toBeEnabled();
});
