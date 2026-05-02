import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

function getEnv(name: string) {
  return Deno.env.get(name) || "";
}

function buildFingerprint(payload: Record<string, unknown>) {
  const payment = (payload.payment || {}) as Record<string, unknown>;
  const eventId = payload.id || payload.eventId;

  if (eventId) {
    return String(eventId);
  }

  return [
    payload.event,
    payment.id,
    payment.status,
    payment.value,
    payment.paymentDate || payment.clientPaymentDate || payment.dateCreated || payload.dateCreated
  ].filter(Boolean).join(":");
}

function getPaymentAmount(payload: Record<string, unknown>) {
  const payment = (payload.payment || {}) as Record<string, unknown>;
  return Number(payment.value || payment.netValue || 0);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, { status: 405 });
  }

  const webhookToken = getEnv("ASAAS_WEBHOOK_TOKEN");
  const receivedToken = request.headers.get("asaas-access-token") || "";

  if (!webhookToken || receivedToken !== webhookToken) {
    return jsonResponse({ error: "Webhook não autorizado." }, { status: 401 });
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase service role não configurada." }, { status: 503 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Payload inválido." }, { status: 400 });
  }

  const payment = (payload.payment || {}) as Record<string, unknown>;
  const eventType = String(payload.event || "");
  const providerPaymentId = String(payment.id || "");
  const eventFingerprint = buildFingerprint(payload);

  if (!eventType || !providerPaymentId || !eventFingerprint) {
    return jsonResponse({ error: "Evento Asaas incompleto." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data, error } = await supabase.rpc("process_asaas_payment_event", {
    event_type: eventType,
    event_fingerprint: eventFingerprint,
    provider_payment_id: providerPaymentId,
    provider_amount: getPaymentAmount(payload),
    payload
  });

  if (error) {
    console.error("[Asaas webhook] processing failed", error);
    return jsonResponse({ error: "Não foi possível processar webhook." }, { status: 500 });
  }

  return jsonResponse({ ok: true, result: data });
});
