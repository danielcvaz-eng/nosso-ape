import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

type Product = {
  id: number;
  name: string;
  price: number;
  type: "inteiro" | "colaborativo";
  status: string;
  is_visible: boolean;
};

type CreateChargeBody = {
  product_id: number;
  giver_name: string;
  giver_message?: string | null;
  amount: number;
  contribution_type: "inteiro" | "colaborativo";
};

const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ASAAS_API_KEY", "ASAAS_API_BASE_URL", "ASAAS_CUSTOMER_ID"];
const MAX_PIX_ATTEMPTS_PER_HOUR = 10;

function getEnv(name: string) {
  return Deno.env.get(name) || "";
}

function getMissingEnv() {
  return requiredEnv.filter((name) => !getEnv(name));
}

function toMoney(value: unknown) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getClientIp(request: Request) {
  return (request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "unknown")
    .split(",")[0]
    .trim();
}

async function hashValue(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function validateBody(body: Partial<CreateChargeBody>) {
  const giverName = String(body.giver_name || "").trim();
  const amount = toMoney(body.amount);

  if (!Number.isInteger(Number(body.product_id))) {
    throw new Error("Produto inválido.");
  }

  if (giverName.length < 2 || giverName.length > 120) {
    throw new Error("Informe um nome entre 2 e 120 caracteres.");
  }

  if (body.giver_message && String(body.giver_message).length > 500) {
    throw new Error("A mensagem deve ter até 500 caracteres.");
  }

  if (amount <= 0) {
    throw new Error("O valor precisa ser maior que zero.");
  }
}

function validateProduct(product: Product, body: CreateChargeBody, confirmedAmount: number) {
  const amount = toMoney(body.amount);

  if (!product?.is_visible || product.status === "recebido") {
    throw new Error("Produto indisponível para presente.");
  }

  if (product.type === "inteiro") {
    if (body.contribution_type !== "inteiro" || amount !== toMoney(product.price)) {
      throw new Error("Valor inválido para presente inteiro.");
    }

    return;
  }

  const remainingAmount = toMoney(Number(product.price) - confirmedAmount);

  if (amount > remainingAmount) {
    throw new Error("Valor maior que o restante do item.");
  }
}

async function asaasFetch(path: string, init: RequestInit) {
  const baseUrl = getEnv("ASAAS_API_BASE_URL").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "access_token": getEnv("ASAAS_API_KEY"),
      ...init.headers
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    console.error("[Asaas] request failed", response.status, body);
    throw new Error("Asaas recusou a criação do Pix.");
  }

  return body;
}

async function cancelAsaasPayment(paymentId: string) {
  try {
    await asaasFetch(`/payments/${paymentId}`, { method: "DELETE" });
  } catch (error) {
    console.error("[Asaas] failed to cancel orphan payment", paymentId, error);
  }
}

async function assertRateLimit(supabase: any, request: Request, productId: number) {
  const ipHash = await hashValue(getClientIp(request));
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("pix_charge_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", oneHourAgo);

  if (countError) {
    console.error("[Nosso Ape] rate limit count failed", countError);
    throw new Error("Não foi possível validar limite de tentativas.");
  }

  if ((count || 0) >= MAX_PIX_ATTEMPTS_PER_HOUR) {
    throw new Error("Muitas tentativas de Pix em pouco tempo. Tente novamente mais tarde ou fale com os moradores.");
  }

  const { error: insertError } = await supabase
    .from("pix_charge_attempts")
    .insert({ ip_hash: ipHash, product_id: productId });

  if (insertError) {
    console.error("[Nosso Ape] rate limit insert failed", insertError);
    throw new Error("Não foi possível registrar a tentativa de Pix.");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, { status: 405 });
  }

  const missingEnv = getMissingEnv();

  if (missingEnv.length > 0) {
    return jsonResponse({
      error: "Integração Asaas não configurada.",
      missing: missingEnv
    }, { status: 503 });
  }

  const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false }
  });

  let body: CreateChargeBody;

  try {
    body = await request.json();
    validateBody(body);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Dados inválidos." }, { status: 400 });
  }

  const productId = Number(body.product_id);
  const amount = toMoney(body.amount);

  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id,name,price,type,status,is_visible")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error("Produto não encontrado.");
    }

    const { data: progressRows, error: progressError } = await supabase
      .from("product_progress")
      .select("confirmed_amount")
      .eq("product_id", productId);

    if (progressError) {
      throw new Error("Não foi possível validar o progresso atual.");
    }

    const confirmedAmount = toMoney(progressRows?.[0]?.confirmed_amount || 0);
    validateProduct(product as Product, body, confirmedAmount);
    await assertRateLimit(supabase, request, productId);

    const contributionType = (product as Product).type === "colaborativo" ? "colaborativo" : "inteiro";
    const { data: contribution, error: contributionError } = await supabase
      .from("contributions")
      .insert({
        product_id: productId,
        giver_name: body.giver_name.trim(),
        giver_message: body.giver_message ? String(body.giver_message).trim() : null,
        amount,
        contribution_type: contributionType,
        payment_method: "pix",
        status: "awaiting_payment",
        provider: "asaas",
        payment_status: "awaiting_payment"
      })
      .select("id")
      .single();

    if (contributionError || !contribution) {
      console.error("[Nosso Ape] contribution insert failed", contributionError);
      throw new Error("Não foi possível registrar a contribuição.");
    }

    let asaasPayment: Record<string, string> | null = null;
    let paymentSaved = false;

    try {
      asaasPayment = await asaasFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: getEnv("ASAAS_CUSTOMER_ID"),
          billingType: "PIX",
          value: amount,
          dueDate: getTomorrowDate(),
          description: `Nosso Apê - ${(product as Product).name}`,
          externalReference: contribution.id,
          notificationDisabled: true
        })
      });

      const pixQrCode = await asaasFetch(`/payments/${asaasPayment.id}/pixQrCode`, {
        method: "GET"
      });

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          contribution_id: contribution.id,
          product_id: productId,
          provider: "asaas",
          provider_payment_id: asaasPayment.id,
          amount,
          status: "awaiting_payment",
          qr_code_payload: pixQrCode.payload || null,
          qr_code_image: pixQrCode.encodedImage || null,
          expires_at: pixQrCode.expirationDate || null,
          raw_provider_payload: asaasPayment
        })
        .select("id,provider_payment_id,amount,status,qr_code_payload,qr_code_image,expires_at")
        .single();

      if (paymentError || !payment) {
        console.error("[Nosso Ape] payment insert failed", paymentError);
        throw new Error("Pix criado, mas não foi possível salvar o pagamento.");
      }

      paymentSaved = true;

      return jsonResponse({
        payment_id: payment.id,
        contribution_id: contribution.id,
        asaas_payment_id: payment.provider_payment_id,
        amount: payment.amount,
        status: payment.status,
        qr_code_payload: payment.qr_code_payload,
        qr_code_image: payment.qr_code_image,
        expires_at: payment.expires_at
      });
    } catch (error) {
      if (asaasPayment?.id && !paymentSaved) {
        await cancelAsaasPayment(asaasPayment.id);
      }

      await supabase
        .from("contributions")
        .update({
          status: "failed",
          payment_status: "failed"
        })
        .eq("id", contribution.id)
        .eq("status", "awaiting_payment");

      throw error;
    }
  } catch (error) {
    console.error("[Nosso Ape] create Asaas Pix failed", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Não foi possível gerar o Pix automático."
    }, { status: 400 });
  }
});
