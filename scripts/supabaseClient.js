import { APP_CONFIG } from "./config.js";

const { supabase } = APP_CONFIG;
const PRODUCTION_HOSTNAME = "danielcvaz-eng.github.io";
const PRODUCTION_REDIRECT_URL = "https://danielcvaz-eng.github.io/nosso-ape/";

export class SupabaseRequestError extends Error {
  constructor(scope, response, details) {
    const message = extractSupabaseErrorMessage(details) || response.statusText || "Erro Supabase";

    super(`${scope} ${response.status}: ${message}`);
    this.name = "SupabaseRequestError";
    this.scope = scope;
    this.status = response.status;
    this.details = details;
  }
}

function trimRightSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function parseResponseText(responseText) {
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

function extractSupabaseErrorMessage(details) {
  if (!details) {
    return "";
  }

  if (typeof details === "string") {
    return details;
  }

  return details.message || details.msg || details.error_description || details.error || "";
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

function normalizeFunctionsUrl() {
  const explicitFunctionsUrl = trimRightSlash(supabase.functionsUrl);

  if (explicitFunctionsUrl) {
    return explicitFunctionsUrl;
  }

  return `${normalizeProjectUrl()}/functions/v1`;
}

function normalizeRedirectPath(pathname) {
  const currentPath = pathname || "/";

  if (currentPath === "/" || currentPath.endsWith("/")) {
    return currentPath;
  }

  const lastSegment = currentPath.split("/").pop() || "";

  if (lastSegment.includes(".")) {
    return currentPath.replace(/\/[^/]*$/, "/") || "/";
  }

  return `${currentPath}/`;
}

function getMagicLinkRedirectUrl() {
  if (window.location.hostname === PRODUCTION_HOSTNAME) {
    return PRODUCTION_REDIRECT_URL;
  }

  return `${window.location.origin}${normalizeRedirectPath(window.location.pathname)}`;
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

function getFunctionUrl(functionName) {
  return `${normalizeFunctionsUrl()}/${functionName}`;
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

  const responseText = await response.text();

  if (!response.ok) {
    throw new SupabaseRequestError("Supabase REST", response, parseResponseText(responseText));
  }

  return parseResponseText(responseText);
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

  const responseText = await response.text();

  if (!response.ok) {
    throw new SupabaseRequestError("Supabase Auth", response, parseResponseText(responseText));
  }

  return parseResponseText(responseText);
}

export async function supabaseFunction(functionName, options = {}) {
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

  const response = await fetch(getFunctionUrl(functionName), {
    ...fetchOptions,
    headers
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new SupabaseRequestError("Supabase Function", response, parseResponseText(responseText));
  }

  return parseResponseText(responseText);
}

export async function requestMagicLink(email) {
  const redirectTo = getMagicLinkRedirectUrl();
  const redirectQuery = new URLSearchParams({ redirect_to: redirectTo }).toString();

  await supabaseAuth(`/otp?${redirectQuery}`, {
    method: "POST",
    body: JSON.stringify({
      email,
      redirect_to: redirectTo,
      create_user: false,
      options: {
        email_redirect_to: redirectTo
      }
    })
  });

  return redirectTo;
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
