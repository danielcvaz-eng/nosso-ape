import { APP_CONFIG } from "./config.js";

const { supabase } = APP_CONFIG;

function trimRightSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeProjectUrl() {
  return trimRightSlash(supabase.projectUrl || supabase.restUrl).replace(/\/rest\/v1$/, "");
}

function normalizeRestUrl() {
  const explicitRestUrl = trimRightSlash(supabase.restUrl);

  if (explicitRestUrl.endsWith("/rest/v1")) {
    return explicitRestUrl;
  }

  return `${normalizeProjectUrl()}/rest/v1`;
}

export function isSupabaseConfigured() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("backend") === "local") {
    return false;
  }

  return Boolean(
    supabase.enabled
    && normalizeProjectUrl()
    && normalizeRestUrl()
    && supabase.anonKey
    && !supabase.anonKey.includes("COLE_AQUI")
  );
}

function getAuthUrl(path) {
  return `${normalizeProjectUrl()}/auth/v1${path}`;
}

function getRestUrl(path) {
  return `${normalizeRestUrl()}${path}`;
}

export function getStoredSession() {
  try {
    const rawSession = window.localStorage.getItem(supabase.authStorageKey);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    window.localStorage.setItem(supabase.authStorageKey, JSON.stringify(session));
  } catch {
    // Auth continua funcionando na aba atual mesmo se localStorage estiver bloqueado.
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(supabase.authStorageKey);
  } catch {
    // Nada a limpar.
  }
}

export function getAccessToken() {
  return getStoredSession()?.accessToken || null;
}

export async function supabaseRest(path, options = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const { accessToken, headers: customHeaders, ...fetchOptions } = options;
  const token = accessToken || getAccessToken() || supabase.anonKey;
  const headers = {
    apikey: supabase.anonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...customHeaders
  };

  const response = await fetch(getRestUrl(path), {
    ...fetchOptions,
    headers
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase REST ${response.status}: ${details}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function supabaseAuth(path, options = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const { accessToken, headers: customHeaders, ...fetchOptions } = options;
  const token = accessToken || getAccessToken();
  const headers = {
    apikey: supabase.anonKey,
    "Content-Type": "application/json",
    ...customHeaders
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(getAuthUrl(path), {
    ...fetchOptions,
    headers
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase Auth ${response.status}: ${details}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function requestMagicLink(email) {
  const redirectTo = `${window.location.origin}${window.location.pathname}`;

  await supabaseAuth("/otp", {
    method: "POST",
    body: JSON.stringify({
      email,
      create_user: true,
      options: {
        email_redirect_to: redirectTo
      }
    })
  });
}

export async function loadCurrentUser(accessToken = getAccessToken()) {
  if (!accessToken) {
    return null;
  }

  return supabaseAuth("/user", {
    method: "GET",
    accessToken
  });
}

export async function parseAuthRedirect() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const expiresIn = Number(hashParams.get("expires_in") || 0);
  const tokenType = hashParams.get("token_type") || "bearer";

  if (!accessToken) {
    return getStoredSession();
  }

  const user = await loadCurrentUser(accessToken);
  const session = {
    accessToken,
    refreshToken,
    tokenType,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
    user: {
      id: user?.id || null,
      email: user?.email || null
    }
  };

  saveSession(session);
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return session;
}
