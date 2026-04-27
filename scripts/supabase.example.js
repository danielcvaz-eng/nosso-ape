// Exemplo de configuração pública para GitHub Pages.
// Use apenas anon/publishable key aqui. Nunca use service_role key no frontend.

export const SUPABASE_EXAMPLE_CONFIG = {
  enabled: true,
  projectUrl: "https://SEU_PROJECT_REF.supabase.co",
  restUrl: "https://SEU_PROJECT_REF.supabase.co/rest/v1",
  anonKey: "COLE_AQUI_SUA_ANON_OU_PUBLISHABLE_KEY",
  authStorageKey: "nossoApeSupabaseSession",
  admins: ["morador1@email.com", "morador2@email.com"]
};
