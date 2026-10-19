import {
  hasSupabaseConfig,
  initSupabase,
  isSupabaseConfigured,
  requireSupabaseConfig,
} from "./supabaseConfig.js";
import { normalizeCompanyAccessCode } from "./companyAccessCode.js";

export { hasSupabaseConfig, initSupabase, isSupabaseConfigured };

const ACCESS_TOKEN_KEY = "stockly-access-token";
const REFRESH_TOKEN_KEY = "stockly-refresh-token";
const PKCE_VERIFIER_KEY = "stockly-oauth-verifier";
const COMPANY_CODE_KEY = "stockly-pending-company-code";
let accessToken = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(REFRESH_TOKEN_KEY);
let tokenExpiresAt = Number(typeof sessionStorage === "undefined" ? 0 : sessionStorage.getItem("stockly-token-expiry")) || 0;
let refreshPromise = null;
export function hasAuthenticatedSession() { return Boolean(accessToken); }
function saveSession(session) {
  accessToken = session.access_token;
  refreshToken = session.refresh_token || refreshToken;
  tokenExpiresAt = Date.now() + Number(session.expires_in || 3600) * 1000;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  sessionStorage.setItem("stockly-token-expiry", String(tokenExpiresAt));
}
async function refreshSession() {
  if (!refreshToken) return false;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const config = await requireSupabaseConfig();
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const session = await response.json();
    if (!response.ok || !session.access_token) { clearSession(); return false; }
    saveSession(session);
    return true;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}
async function ensureFreshSession() {
  if (!accessToken) return false;
  if (tokenExpiresAt > Date.now() + 60_000) return true;
  return refreshSession();
}
function clearSession() {
  accessToken = null; refreshToken = null; tokenExpiresAt = 0;
  if (typeof sessionStorage !== "undefined") {
    [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, "stockly-token-expiry"].forEach((key) => sessionStorage.removeItem(key));
  }
}
export async function signInWithPassword(email, password, companyCode) {
  companyCode = normalizeCompanyAccessCode(companyCode);
  const config = await requireSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error(result.msg || result.message || "Correo o contraseña incorrectos");
  saveSession(result);
  try { await joinCompanyWithCode(companyCode); }
  catch (error) { await signOut(); throw new Error(error.message?.includes("invalid_company_access_code") ? "El código de empresa no es válido o está desactivado." : error.message); }
  return result.user;
}

export async function joinCompanyWithCode(companyCode) {
  return supabaseRequest("/rpc/join_company_with_code", {
    method: "POST", body: JSON.stringify({ access_code: normalizeCompanyAccessCode(companyCode) }),
  });
}
export async function signInWithGoogle(companyCode) {
  const normalizedCode = normalizeCompanyAccessCode(companyCode);
  const config = await requireSupabaseConfig();
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = toBase64Url(verifierBytes);
  const challenge = toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(COMPANY_CODE_KEY, normalizedCode);
  const authorize = new URL(`${config.url}/auth/v1/authorize`);
  authorize.searchParams.set("provider", "google");
  authorize.searchParams.set("redirect_to", redirectTo);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "s256");
  window.location.assign(authorize.toString());
}

export async function completeGoogleSignIn() {
  const url = new URL(window.location.href);
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const authCode = url.searchParams.get("code");
  if (oauthError) {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(COMPANY_CODE_KEY);
    window.history.replaceState({}, document.title, url.pathname);
    throw new Error(oauthError);
  }
  if (!authCode) return false;
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const companyCode = sessionStorage.getItem(COMPANY_CODE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(COMPANY_CODE_KEY);
  window.history.replaceState({}, document.title, `${url.pathname}${url.hash}`);
  if (!verifier || !companyCode) throw new Error("Se perdió el código de empresa durante el inicio de sesión. Vuelve a intentarlo.");
  const config = await requireSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=pkce`, {
    method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" },
    body: JSON.stringify({ auth_code: authCode, code_verifier: verifier }),
  });
  const session = await response.json();
  if (!response.ok || !session.access_token) throw new Error(session.msg || session.message || "No se pudo completar el acceso con Google.");
  saveSession(session);
  try {
    await joinCompanyWithCode(companyCode);
  } catch (error) {
    await signOut();
    throw new Error(error.message?.includes("invalid_company_access_code") ? "El código de empresa no es válido o está desactivado." : error.message || "No se pudo vincular tu cuenta a la empresa.");
  }
  return true;
}

export async function restoreAuthSession() {
  if (new URL(window.location.href).searchParams.has("code")) return completeGoogleSignIn();
  if (!accessToken) return false;
  if (tokenExpiresAt && tokenExpiresAt <= Date.now() + 60_000 && !(await refreshSession())) return false;
  if (!refreshToken && !tokenExpiresAt) { clearSession(); return false; }
  const config = await requireSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) { clearSession(); return false; }
  return true;
}

export async function signOut() {
  const token = accessToken;
  clearSession();
  sessionStorage.removeItem(COMPANY_CODE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  if (!token) return;
  try {
    const config = await requireSupabaseConfig();
    await fetch(`${config.url}/auth/v1/logout`, { method: "POST", headers: { apikey: config.key, Authorization: `Bearer ${token}` } });
  } catch (error) { console.warn("No se pudo invalidar la sesión remota", error); }
}

function toBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function supabaseRequest(path, options = {}) {
  const config = await requireSupabaseConfig();
  if (accessToken && !(await ensureFreshSession())) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");

  const response = await fetch(`${config.url}/rest/v1${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken || config.key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || response.statusText);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function fetchSupabaseClient(slug) {
  const rows = await supabaseRequest(
    `/clients?slug=eq.${encodeURIComponent(slug)}&select=id,slug`,
  );
  return rows?.[0] || null;
}

export async function fetchSupabaseClients() {
  return supabaseRequest("/clients?select=id,slug,name,business_type,description,icon,theme&order=name.asc");
}

export async function ensureSupabaseClient(business) {
  const existing = await fetchSupabaseClient(business.id);
  if (existing) return existing;

  const rows = await supabaseRequest("/clients", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      slug: business.id,
      name: business.name,
      business_type: business.type,
      description: business.description,
      icon: business.icon,
      pin_hash: business.pin,
      theme: {},
    }),
  });

  return rows?.[0] || null;
}

export async function fetchSupabasePin(slug) {
  if (!(await isSupabaseConfigured()) && !(await initSupabase())) return null;

  const rows = await supabaseRequest(
    `/clients?slug=eq.${encodeURIComponent(slug)}&select=slug,pin_hash`,
  );
  const value = rows?.[0]?.pin_hash;
  return value != null && value !== "" ? String(value) : null;
}

export async function updateSupabasePin(slug, pin) {
  const rows = await supabaseRequest(`/clients?slug=eq.${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ pin_hash: pin }),
  });

  if (!rows?.length) {
    throw new Error(`No se encontro el cliente ${slug} en Supabase`);
  }

  const saved = rows[0].pin_hash != null ? String(rows[0].pin_hash) : null;
  if (saved !== pin) {
    throw new Error("Supabase no guardo la clave en clients.pin_hash");
  }

  const verified = await fetchSupabasePin(slug);
  if (verified !== pin) {
    throw new Error("La clave guardada no coincide con la lectura en Supabase");
  }

  return verified;
}

export async function fetchSupabaseProducts(clientId) {
  return supabaseRequest(
    `/products?client_id=eq.${clientId}&select=*&order=created_at.desc`,
  );
}

export async function createSupabaseBusiness(business) {
  const rows = await supabaseRequest("/rpc/create_company", {
    method: "POST",
    body: JSON.stringify({ company_slug: business.id, company_name: business.name, company_type: business.type, company_description: business.description }),
  });
  return rows || null;
}

export async function fetchSupabaseMovements(clientId) {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await supabaseRequest(`/inventory_movements?client_id=eq.${encodeURIComponent(clientId)}&select=created_at,movement_type,product_name,product_code,quantity,notes&order=created_at.desc`, {
      headers: { Range: `${offset}-${offset + 999}` },
    });
    result.push(...(page || []));
    if (!page || page.length < 1000) return result;
  }
}

export async function fetchAccessConfiguration(clientId) {
  const [roles, memberships] = await Promise.all([
    supabaseRequest("/roles?select=id,name&order=name.asc"),
    supabaseRequest(`/client_memberships?client_id=eq.${encodeURIComponent(clientId)}&select=user_id,role_id,active&order=created_at.asc`),
  ]);
  return { roles, memberships };
}

export async function saveClientMembership(clientId, userId, roleId) {
  return supabaseRequest("/client_memberships?on_conflict=client_id,user_id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ client_id: clientId, user_id: userId, role_id: roleId, active: true }),
  });
}

export async function rotateCompanyAccessCode(clientId) {
  const rows = await supabaseRequest("/rpc/rotate_company_access_code", { method: "POST", body: JSON.stringify({ target_client: clientId }) });
  return typeof rows === "string" ? rows : rows?.code || rows;
}

export async function deactivateCompanyAccessCode(clientId) {
  return supabaseRequest("/rpc/deactivate_company_access_code", { method: "POST", body: JSON.stringify({ target_client: clientId }) });
}

export function dbProductToApp(row) {
  return {
    dbId: row.id,
    name: row.name,
    code: row.code,
    category: row.category,
    price: Number(row.price || 0),
    purchasePrice: Number(row.purchase_price || 0),
    stock: Number(row.stock || 0),
    minStock: Number(row.min_stock || 3),
    tag: row.status || "En stock",
    brand: row.brand || "",
    spot: row.spot || "",
    campaign: row.campaign || "",
    comments: row.comments || "",
    image: row.image_url || "",
  };
}

export function appProductToDb(product, clientId, { includeId = false } = {}) {
  const row = {
    client_id: clientId,
    name: product.name,
    code: product.code,
    category: product.category,
    price: Number(product.price || 0),
    purchase_price: Number(product.purchasePrice || 0),
    stock: Number(product.stock || 0),
    min_stock: Number(product.minStock || 3),
    status: product.tag || "En stock",
    brand: product.brand || "",
    spot: product.spot || "",
    campaign: product.campaign || "",
    comments: product.comments || "",
    image_url: product.image || null,
    updated_at: new Date().toISOString(),
  };
  if (includeId && product.dbId) row.id = product.dbId;
  return row;
}

export async function upsertSupabaseProducts(clientId, products) {
  return supabaseRequest("/products?on_conflict=client_id,code", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(products.map((product) => appProductToDb(product, clientId))),
  });
}

const IMPORT_BATCH_SIZE = 25;

function dedupeBatchByCode(products) {
  const byCode = new Map();
  for (const product of products) {
    byCode.set(product.code, product);
  }
  return Array.from(byCode.values());
}

export async function upsertSupabaseProductsInBatches(clientId, products) {
  const synced = [];

  for (let index = 0; index < products.length; index += IMPORT_BATCH_SIZE) {
    const chunk = dedupeBatchByCode(products.slice(index, index + IMPORT_BATCH_SIZE));
    if (!chunk.length) continue;
    const rows = await upsertSupabaseProducts(clientId, chunk);
    if (rows?.length) synced.push(...rows.map(dbProductToApp));
  }

  return synced;
}

export async function updateSupabaseProduct(clientId, product) {
  if (!product.dbId) {
    throw new Error("No se puede actualizar un activo sin id de base de datos");
  }

  const payload = appProductToDb(product, clientId);
  const rows = await supabaseRequest(`/products?id=eq.${product.dbId}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  if (!rows?.length) {
    throw new Error("Supabase no actualizo el activo");
  }

  return dbProductToApp(rows[0]);
}

export async function upsertSupabaseProduct(clientId, product) {
  // Edits must PATCH by id so comments/status always persist.
  if (product.dbId) {
    return updateSupabaseProduct(clientId, product);
  }

  const rows = await supabaseRequest("/products?on_conflict=client_id,code", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(appProductToDb(product, clientId)),
  });
  return rows?.[0] ? dbProductToApp(rows[0]) : product;
}

export async function deleteSupabaseProduct(clientId, product) {
  const filter = product.dbId
    ? `id=eq.${product.dbId}`
    : `client_id=eq.${clientId}&code=eq.${encodeURIComponent(product.code)}`;
  await supabaseRequest(`/products?${filter}`, { method: "DELETE" });
}

export async function deleteAllSupabaseProducts(clientId) {
  await supabaseRequest(`/products?client_id=eq.${clientId}`, { method: "DELETE" });
}

export async function seedSupabaseProductsIfEmpty(clientId, seedProducts) {
  const rows = await fetchSupabaseProducts(clientId);
  if (rows.length) return rows.map(dbProductToApp);

  await upsertSupabaseProducts(clientId, seedProducts);
  const seeded = await fetchSupabaseProducts(clientId);
  return seeded.map(dbProductToApp);
}
