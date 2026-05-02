import fallbackProducts from "../data/produtos.js";
import { APP_CONFIG } from "./config.js";
import {
  clearSession,
  getStoredSession,
  isSupabaseConfigured,
  loadCurrentUser,
  parseAuthRedirect,
  requestMagicLink,
  supabaseRest
} from "./supabaseClient.js";

const PRODUCT_IMAGES = {
  1: "assets/produtos/01-lava-e-seca-electrolux-inverter-12kg-lfc12.webp",
  2: "assets/produtos/02-micro-ondas-philco-25l-limpa-facil-pmo28e.webp",
  3: "assets/produtos/03-almofadas-decorativas-cheias.webp",
  4: "assets/produtos/04-forno-eletrico-mondial-family-ii-42l.webp",
  5: "assets/produtos/05-panela-de-pressao-eletrica-midea-6l.webp",
  7: "assets/produtos/07-kit-com-3-frigideiras-com-tampa-de-vidro.webp",
  8: "assets/produtos/08-assadeira-forma-retangular-antiaderente.webp",
  9: "assets/produtos/09-marinex-jogo-de-assadeiras-opaline-kit-3-unidades.webp",
  10: "assets/produtos/10-potes-hermeticos.webp",
  11: "assets/produtos/11-porta-temperos-giratorio.webp",
  12: "assets/produtos/12-2-lixeiras-pequenas-para-o-lavabo.webp",
  13: "assets/produtos/13-porta-chaves-de-parede.webp",
  14: "assets/produtos/14-tapete-casa-dona-200x300-cm-caramelo.webp",
  15: "assets/produtos/15-mop-com-cesto-de-inox.webp"
};

const HIDDEN_PRODUCT_IDS = new Set([6]);

function getProductImage(productId) {
  return PRODUCT_IMAGES[Number(productId)] || "";
}

function withProductImage(product) {
  return {
    ...product,
    imagem: product.imagem || getProductImage(product.id)
  };
}

function toProduct(row, progress = {}) {
  return {
    id: row.id,
    nome: row.name,
    categoria: row.category,
    preco: Number(row.price),
    prioridade: row.priority,
    tipo: row.type,
    descricao: row.description,
    link: row.link,
    status: row.status,
    precoEstimado: Boolean(row.estimated_price),
    isVisible: row.is_visible !== false,
    imagem: getProductImage(row.id),
    confirmedAmount: Number(progress.confirmed_amount || 0)
  };
}

function buildProgressMap(rows) {
  return Object.fromEntries(rows.map((row) => [row.product_id, row]));
}

export async function loadCatalogData() {
  if (!isSupabaseConfigured()) {
    return {
      mode: "local",
      products: fallbackProducts.map(withProductImage),
      message: "Supabase não configurado. Usando dados locais."
    };
  }

  try {
    const publicAccess = { accessToken: APP_CONFIG.supabase.anonKey };
    const [productRows, progressRows] = await Promise.all([
      supabaseRest("/products?select=*&order=id.asc", publicAccess),
      supabaseRest("/product_progress?select=*", publicAccess)
    ]);

    const visibleProductRows = productRows.filter((row) => row.is_visible !== false && !HIDDEN_PRODUCT_IDS.has(Number(row.id)));
    const progressMap = buildProgressMap(progressRows);

    return {
      mode: "supabase",
      products: visibleProductRows.map((row) => toProduct(row, progressMap[row.id])),
      message: "Dados sincronizados com Supabase."
    };
  } catch (error) {
    console.warn("[Nosso Ape] Falha ao carregar Supabase. Usando fallback local.", error);
    return {
      mode: "local-fallback",
      products: fallbackProducts.map(withProductImage),
      message: "Não foi possível conectar ao Supabase. Usando dados locais neste navegador.",
      error
    };
  }
}

export async function submitPendingContribution({ product, flowData }) {
  const payload = {
    product_id: product.id,
    giver_name: flowData.personName,
    giver_message: flowData.optionalMessage || null,
    amount: Number(flowData.selectedValue.toFixed(2)),
    contribution_type: flowData.giftType,
    payment_method: "pix",
    status: "pending"
  };

  await supabaseRest("/contributions", {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  return { status: "pending" };
}

export async function initializeAdminSession() {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      session: null,
      user: null,
      isAdmin: false
    };
  }

  let session;

  try {
    session = await parseAuthRedirect();
  } catch (error) {
    console.warn("[Nosso Ape] Não foi possível recuperar a sessão admin.", error);
    clearSession();
    return {
      configured: true,
      session: null,
      user: null,
      isAdmin: false,
      error
    };
  }

  const accessToken = session?.accessToken;

  if (!accessToken) {
    return {
      configured: true,
      session: null,
      user: null,
      isAdmin: false
    };
  }

  try {
    const user = session.user?.email ? session.user : await loadCurrentUser(accessToken);
    const isAdmin = await supabaseRest("/rpc/current_user_is_admin", {
      method: "POST",
      accessToken,
      body: JSON.stringify({})
    });

    return {
      configured: true,
      session: getStoredSession(),
      user,
      isAdmin: Boolean(isAdmin)
    };
  } catch (error) {
    console.warn("[Nosso Ape] Sessão admin inválida.", error);
    clearSession();
    return {
      configured: true,
      session: null,
      user: null,
      isAdmin: false,
      error
    };
  }
}

export async function requestAdminLogin(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!APP_CONFIG.supabase.admins.includes(normalizedEmail)) {
    throw new Error("Este e-mail não está autorizado como morador/admin.");
  }

  return requestMagicLink(normalizedEmail);
}

export async function loadPendingContributions() {
  return supabaseRest(
    "/contributions?select=id,product_id,giver_name,giver_message,amount,contribution_type,payment_method,status,created_at,products(name,category)&status=eq.pending&order=created_at.desc"
  );
}

export async function confirmContribution(contributionId) {
  return supabaseRest("/rpc/confirm_contribution", {
    method: "POST",
    body: JSON.stringify({ contribution_id: contributionId })
  });
}

export async function rejectContribution(contributionId, reason = "") {
  return supabaseRest("/rpc/reject_contribution", {
    method: "POST",
    body: JSON.stringify({ contribution_id: contributionId, reason })
  });
}

export async function updateRemoteProductStatus(productId, status) {
  return supabaseRest(`/products?id=eq.${productId}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify({ status })
  });
}

export function logoutAdmin() {
  clearSession();
}
