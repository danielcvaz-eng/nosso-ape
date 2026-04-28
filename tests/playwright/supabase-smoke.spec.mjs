import { expect, test } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://localhost:8000";

test.skip(process.env.RUN_SUPABASE_SMOKE !== "1", "Defina RUN_SUPABASE_SMOKE=1 para testar o Supabase real.");

test("catalogo carrega usando Supabase real", async ({ page }) => {
  await page.goto(baseUrl);

  await expect(page.locator(".product-card")).toHaveCount(15);
  await expect(page.locator("#backend-state-note")).toContainText("Supabase");
  await expect(page.getByRole("heading", { name: /micro-ondas/i })).toBeVisible();
});
