# Integração Asaas Pix

Esta etapa prepara Pix dinâmico via Asaas usando Supabase Edge Functions.

O frontend continua no GitHub Pages. A chave privada do Asaas fica somente em secrets do Supabase.

## Arquitetura

Fluxo visitante:

1. Visitante escolhe produto e valor.
2. Site chama a Edge Function `create-asaas-pix-charge`.
3. A função valida produto, valor e disponibilidade no Supabase.
4. A função cria cobrança Pix no Asaas.
5. O site mostra QR Code Pix e Pix copia e cola.
6. Asaas chama `asaas-webhook` quando o pagamento for recebido.
7. O webhook processa o evento de forma idempotente e confirma a contribuição.
8. Se o webhook falhar, moradores ainda podem confirmar manualmente.

## Arquivos

- `supabase/patch-etapa-14-asaas-pix.sql`: patch de banco para pagamentos e webhooks.
- `supabase/functions/create-asaas-pix-charge/index.ts`: cria cobrança Pix.
- `supabase/functions/asaas-webhook/index.ts`: recebe webhook do Asaas.
- `scripts/api.js`: chamada da Edge Function.
- `scripts/main.js`: UX Pix dinâmico com fallback manual.

## Secrets necessários

Configure no Supabase, nunca no frontend:

```bash
supabase secrets set ASAAS_API_KEY=...
supabase secrets set ASAAS_API_BASE_URL=https://api.asaas.com/v3
supabase secrets set ASAAS_CUSTOMER_ID=...
supabase secrets set ASAAS_WEBHOOK_TOKEN=...
```

Para sandbox, use a URL base sandbox correspondente do Asaas.

O `ASAAS_CUSTOMER_ID` deve ser um cliente criado no Asaas para representar a lista Nosso Apê, já que o site não coleta CPF/CNPJ do visitante.

## Deploy das Edge Functions

Depois de instalar/autenticar o Supabase CLI:

```bash
supabase functions deploy create-asaas-pix-charge
supabase functions deploy asaas-webhook
```

O arquivo `supabase/config.toml` deixa `asaas-webhook` com `verify_jwt = false`, porque o Asaas não envia JWT do Supabase. A segurança do webhook vem do header `asaas-access-token`.

## Webhook no Asaas

No painel Asaas, configure o webhook apontando para:

```text
https://nhoexiahfcqqgzombptj.supabase.co/functions/v1/asaas-webhook
```

Ative pelo menos eventos de pagamento recebido/confirmado:

```text
PAYMENT_RECEIVED
PAYMENT_CONFIRMED
```

Configure o token do webhook com o mesmo valor de `ASAAS_WEBHOOK_TOKEN`. O Asaas envia esse valor no header `asaas-access-token`.

## Aplicar patch SQL

No Supabase SQL Editor, execute:

```text
supabase/patch-etapa-14-asaas-pix.sql
```

Esse patch:

- cria `payments`;
- cria `payment_events`;
- cria `pix_charge_attempts` para rate limit básico de geração de Pix;
- amplia os status de `contributions`;
- preserva contribuições já confirmadas;
- mantém confirmação manual como fallback;
- adiciona função idempotente para processar webhooks Asaas.

## Como testar

Antes de pagamento real:

```bash
npm run test:e2e
```

Com Supabase real:

```bash
RUN_SUPABASE_SMOKE=1 npm run test:e2e
```

Depois de configurar Asaas:

1. Gere um Pix de valor pequeno em um item colaborativo.
2. Pague o Pix.
3. Aguarde o webhook.
4. Confirme se a contribuição virou `confirmed`.
5. Confirme se o progresso do item atualizou.
6. Confira se reenviar o mesmo webhook não duplica valor.

## Limites anti-abuso

A Edge Function `create-asaas-pix-charge` aplica limite básico de 10 tentativas de Pix por IP por hora. Isso reduz spam de cobranças, mas não substitui monitoramento real. Antes de produção ampla, acompanhe logs do Supabase e do Asaas.

## Conciliação manual

Se o Asaas criar uma cobrança mas o Supabase falhar ao salvar `payments`, a função tenta cancelar a cobrança no Asaas. Mesmo assim, revise o painel Asaas em caso de erro e compare pelo `externalReference`, que recebe o `contribution_id`.

## Fallback

Se Asaas ou Edge Function falhar, o site mostra a chave Pix manual. Nesse caso, a contribuição volta ao fluxo pendente e os moradores conferem manualmente pelo painel.
