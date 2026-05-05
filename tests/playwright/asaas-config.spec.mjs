import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("ASAAS_CUSTOMER_ID e opcional na Edge Function", async () => {
  const source = await readFile("supabase/functions/create-asaas-pix-charge/index.ts", "utf8");

  const requiredEnvDeclaration = source.match(/const requiredEnv = \[(?<envs>[^\]]+)\]/)?.groups?.envs || "";

  expect(requiredEnvDeclaration).toContain("ASAAS_API_KEY");
  expect(requiredEnvDeclaration).toContain("ASAAS_API_BASE_URL");
  expect(requiredEnvDeclaration).not.toContain("ASAAS_CUSTOMER_ID");
  expect(source).toContain("ASAAS_CUSTOMER_CPF_CNPJ");
  expect(source).toContain("Configure ASAAS_CUSTOMER_ID ou ASAAS_CUSTOMER_CPF_CNPJ");
});
