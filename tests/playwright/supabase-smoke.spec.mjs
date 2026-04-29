import { expect, test } from "@playwright/test";
import { APP_CONFIG } from "../../scripts/config.js";

const baseUrl = process.env.BASE_URL || "http://localhost:8000";
const supabaseConfig = APP_CONFIG.supabase;

test.skip(process.env.RUN_SUPABASE_SMOKE !== "1", "Defina RUN_SUPABASE_SMOKE=1 para testar o Supabase real.");

test("catalogo carrega usando Supabase real", async ({ page }) => {
  await page.goto(baseUrl);

  await expect(page.locator(".product-card")).toHaveCount(15);
  await expect(page.locator("#backend-state-note")).toContainText("Supabase");
  await expect(page.getByRole("heading", { name: /micro-ondas/i })).toBeVisible();
});

test("anonimo nao consegue confirmar contribuicao via RPC", async ({ request }) => {
  const response = await request.post(`${supabaseConfig.projectUrl}/rest/v1/rpc/confirm_contribution`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      "Content-Type": "application/json"
    },
    data: {
      contribution_id: "00000000-0000-0000-0000-000000000000"
    }
  });

  expect(response.ok()).toBe(false);

  const responseText = await response.text();
  expect(responseText).not.toContain("pending contribution not found");
});
