import {
  hasSupabaseConfig,
  initSupabase,
  isSupabaseConfigured,
  requireSupabaseConfig,
} from "./supabaseConfig.js";
import { normalizeCompanyAccessCode } from "./companyAccessCode.js";
import { buildGoogleAuthorizeUrl } from "./googleOAuth.js";
import { deactivateMembershipRequest, membershipGrantsPermission, membershipRevocationResult } from "./clientMembership.js";
import { normalizeHexColor, validateBrandLogo } from "./businessTheme.js";
import { selectableCompanyRoles } from "./roles.js";

export { hasSupabaseConfig, initSupabase, isSupabaseConfigured };

const ACCESS_TOKEN_KEY = "stockly-access-token";
const REFRESH_TOKEN_KEY = "stockly-refresh-token";
const PKCE_VERIFIER_KEY = "stockly-oauth-verifier";
const COMPANY_CODE_KEY = "stockly-pending-company-code";
const OAUTH_FLOW_KEY = "stockly-oauth-flow";
const COMPANY_DRAFT_KEY = "stockly-pending-company-draft";
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

export async function signInWithPassword(email, password, companyCode = "") {
  const config = await requireSupabaseConfig();

  const response = await fetch(
    `${config.url}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.access_token) {
    throw new Error(
      result.msg ||
        result.message ||
        "Correo o contraseña incorrectos"
    );
  }

  saveSession(result);

  // Vincular a una empresa solo si se proporcionó un código.
  // Si falla, conservar la sesión válida para no expulsar al usuario.
  if (String(companyCode || "").trim()) {
    try {
      await joinCompanyWithCode(companyCode);
    } catch (error) {
      throw new Error(
        error.message?.includes("invalid_company_access_code")
          ? "Iniciaste sesión, pero el código de empresa no es válido o está desactivado. Puedes intentarlo nuevamente."
          : `Iniciaste sesión, pero no se pudo vincular la empresa: ${error.message}`
      );
    }
  }

  return result.user;
}

export async function signUpWithPassword(email, password) {
  const config = await requireSupabaseConfig();

  const response = await fetch(
    `${config.url}/auth/v1/signup`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: String(email).trim(),
        password,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.msg ||
        result.message ||
        result.msg_description ||
        "No fue posible crear la cuenta."
    );
  }

  if (result.access_token) {
    saveSession(result);
  }

  return {
    user: result.user,
    needsEmailConfirmation: !result.access_token,
  };
}

export async function joinCompanyWithCode(companyCode) {
  const clientId = await supabaseRequest("/rpc/join_company_with_code", {
    method: "POST", body: JSON.stringify({ access_code: normalizeCompanyAccessCode(companyCode) }),
  });
  // The RPC returns the client UUID only after creating or confirming the
  // caller's membership. A 2xx response without that value is not success.
  if (typeof clientId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)) {
    throw new Error("Supabase no confirmó la empresa asociada al código. Inténtalo nuevamente.");
  }
  return clientId;
}
export async function signInWithGoogle(companyCode = "") {
  const normalizedCode = String(companyCode || "").trim()
    ? normalizeCompanyAccessCode(companyCode)
    : "";

  return beginGoogleOAuth({
    mode: normalizedCode ? "join" : "login",
    companyCode: normalizedCode,
  });
}

export async function registerCompanyWithGoogle(draft) {
  const cleanDraft = {
    name: String(draft?.name || "").trim(),
    type: String(draft?.type || "").trim(),
    description: String(draft?.description || "").trim(),
    icon: String(draft?.icon || "package"),
    brandColor: normalizeHexColor(draft?.brandColor || "#4f46e5"),
    logoDataUrl: String(draft?.logoDataUrl || ""),
  };
  if (!cleanDraft.name || !cleanDraft.type || cleanDraft.name.length > 80 || cleanDraft.type.length > 60 || cleanDraft.description.length > 200) {
    throw new Error("Revisa los datos de la empresa antes de continuar.");
  }
  validateBrandingInput(cleanDraft);
  sessionStorage.setItem(COMPANY_DRAFT_KEY, JSON.stringify(cleanDraft));
  return beginGoogleOAuth({ mode: "create-company" });
}

async function beginGoogleOAuth({ mode, companyCode }) {
  const config = await requireSupabaseConfig();
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = toBase64Url(verifierBytes);
  const challenge = toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_FLOW_KEY, mode);
  if (companyCode) sessionStorage.setItem(COMPANY_CODE_KEY, companyCode);
  else sessionStorage.removeItem(COMPANY_CODE_KEY);
  window.location.assign(buildGoogleAuthorizeUrl({ supabaseUrl: config.url, redirectTo, codeChallenge: challenge }));
}

export function consumePendingCompanyDraft() {
  const serialized = sessionStorage.getItem(COMPANY_DRAFT_KEY);
  sessionStorage.removeItem(COMPANY_DRAFT_KEY);
  if (!serialized) return null;
  try {
    const draft = JSON.parse(serialized);
    if (typeof draft?.name !== "string" || typeof draft?.type !== "string") return null;
    return draft;
  } catch {
    return null;
  }
}

export async function completeGoogleSignIn() {
  const url = new URL(window.location.href);
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const authCode = url.searchParams.get("code");
  const oauthFlow = sessionStorage.getItem(OAUTH_FLOW_KEY) || "join";
  if (oauthError) {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(COMPANY_CODE_KEY);
    sessionStorage.removeItem(OAUTH_FLOW_KEY);
    sessionStorage.removeItem(COMPANY_DRAFT_KEY);
    window.history.replaceState({}, document.title, url.pathname);
    throw new Error(oauthError);
  }
  if (!authCode) return false;
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const companyCode = sessionStorage.getItem(COMPANY_CODE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(COMPANY_CODE_KEY);
  sessionStorage.removeItem(OAUTH_FLOW_KEY);
  window.history.replaceState({}, document.title, `${url.pathname}${url.hash}`);
 if (!verifier) {
  throw new Error("Se perdió la información del inicio de sesión. Vuelve a intentarlo.");
}
  const config = await requireSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=pkce`, {
    method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" },
    body: JSON.stringify({ auth_code: authCode, code_verifier: verifier }),
  });
  const session = await response.json();
  if (!response.ok || !session.access_token) throw new Error(session.msg || session.message || "No se pudo completar el acceso con Google.");
  saveSession(session);
  if (oauthFlow === "create-company") {
    if (!sessionStorage.getItem(COMPANY_DRAFT_KEY)) {
      await signOut();
      throw new Error(
        "Se perdieron los datos de la empresa. Vuelve a iniciar el registro."
      );
    }
  } else if (oauthFlow === "join" && companyCode) {
    try {
      await joinCompanyWithCode(companyCode);
    } catch (error) {
      console.error("No se pudo vincular la empresa:", error);
      // Conservamos la sesión aunque el código no sea válido.
    }
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

async function fetchAuthenticatedUser() {
  const config = await requireSupabaseConfig();
  if (!accessToken || !(await ensureFreshSession())) return null;
  const userResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!userResponse.ok) throw new Error("No se pudo verificar la sesión actual.");
  return userResponse.json();
}

export async function hasActiveClientMembership(clientId) {
  const user = await fetchAuthenticatedUser();
  if (!user?.id) return false;
  const memberships = await supabaseRequest(
    `/client_memberships?client_id=eq.${encodeURIComponent(clientId)}&user_id=eq.${encodeURIComponent(user.id)}&select=active&limit=1`,
  );
  return Boolean(memberships?.some((membership) => membership.active));
}

export async function hasClientPermission(clientId, permissionCode) {
  const user = await fetchAuthenticatedUser();
  if (!user?.id) return false;
  const memberships = await supabaseRequest(
    `/client_memberships?client_id=eq.${encodeURIComponent(clientId)}&user_id=eq.${encodeURIComponent(user.id)}&select=role_id,active&limit=1`,
  );
  const membership = memberships?.find((item) => item.active);
  if (!membership) return false;
  const permissions = await supabaseRequest(`/permissions?code=eq.${encodeURIComponent(permissionCode)}&select=id&limit=1`);
  const permissionId = permissions?.[0]?.id;
  if (!permissionId) return false;
  const rolePermissions = await supabaseRequest(
    `/role_permissions?role_id=eq.${encodeURIComponent(membership.role_id)}&permission_id=eq.${encodeURIComponent(permissionId)}&select=role_id,permission_id&limit=1`,
  );
  return membershipGrantsPermission(membership, permissionId, rolePermissions || []);
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
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await supabaseRequest(
      `/products?client_id=eq.${encodeURIComponent(clientId)}&select=*&order=created_at.desc`,
      { headers: { Range: `${offset}-${offset + 999}` } },
    );
    result.push(...(page || []));
    if (!page || page.length < 1000) return result;
  }
}

export async function fetchSupabaseCategories(clientId) {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await supabaseRequest(
      `/categories?client_id=eq.${encodeURIComponent(clientId)}&select=id,client_id,name,description&order=name.asc`,
      { headers: { Range: `${offset}-${offset + 999}` } },
    );
    result.push(...(page || []));
    if (!page || page.length < 1000) return result;
  }
}

export async function createSupabaseBusiness(business) {
  await supabaseRequest("/rpc/create_company", {
    method: "POST",
    body: JSON.stringify({ company_slug: business.id, company_name: business.name, company_type: business.type, company_description: business.description }),
  });
  const client = await fetchSupabaseClient(business.id);
  if (!client) throw new Error("La empresa se creó, pero no se pudo recuperar su configuración.");
  await updateSupabaseBusinessBranding(client.id, {
    icon: business.icon || "package",
    theme: business.brandConfig || { brandColor: business.brandColor, logoDataUrl: business.logoDataUrl || "" },
  });
  return client;
}

function validateBrandingInput({ brandColor, logoDataUrl }, { requireColor = true } = {}) {
  if (requireColor && !normalizeHexColor(brandColor)) throw new Error("El color de marca debe ser un HEX válido, por ejemplo #db2777.");
  if (brandColor && !normalizeHexColor(brandColor)) throw new Error("El color de marca debe ser un HEX válido, por ejemplo #db2777.");
  if (logoDataUrl) {
    const fileLike = { type: logoDataUrl.match(/^data:(image\/[a-z]+);base64,/)?.[1] || "", size: Math.ceil(logoDataUrl.length * 0.75) };
    const logoError = validateBrandLogo(fileLike);
    if (logoError || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z\d+/]+=*$/.test(logoDataUrl)) {
      throw new Error(logoError || "El formato del logo no es válido.");
    }
  }
}

export async function updateSupabaseBusinessBranding(clientId, { name, icon, theme }) {
  const normalizedName = name === undefined ? undefined : String(name).trim();
  if (normalizedName !== undefined && (!normalizedName || normalizedName.length > 80)) {
    throw new Error("El nombre de empresa debe tener entre 1 y 80 caracteres.");
  }
  const validatedTheme = { ...(theme || {}) };
  if (theme?.brandColor) {
    if (!normalizeHexColor(theme.brandColor)) throw new Error("El color de marca debe ser un HEX válido, por ejemplo #db2777.");
    validatedTheme.brandColor = normalizeHexColor(theme.brandColor);
  }
  else delete validatedTheme.brandColor;
  validateBrandingInput(validatedTheme, { requireColor: false });
  const rows = await supabaseRequest(`/clients?id=eq.${encodeURIComponent(clientId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...(normalizedName === undefined ? {} : { name: normalizedName }), icon, theme: validatedTheme }),
  });
  if (!rows?.length) throw new Error("No se pudo guardar la identidad visual. Comprueba el permiso company.manage.");
  return rows[0];
}

export async function fetchSupabaseMovements(clientId) {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await supabaseRequest(`/inventory_movements?client_id=eq.${encodeURIComponent(clientId)}&select=*&order=created_at.desc`, {
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
  return { roles: selectableCompanyRoles(roles || []), memberships };
}

export async function saveClientMembership(clientId, userId, roleId) {
  return supabaseRequest("/client_memberships?on_conflict=client_id,user_id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ client_id: clientId, user_id: userId, role_id: roleId, active: true }),
  });
}

export async function deactivateClientMembership(clientId, userId) {
  const request = deactivateMembershipRequest(clientId, userId);
  const rows = await supabaseRequest(request.path, request.options);
  return membershipRevocationResult(rows);
}

export async function rotateCompanyAccessCode(clientId) {
  const rows = await supabaseRequest("/rpc/rotate_company_access_code", { method: "POST", body: JSON.stringify({ target_client: clientId }) });
  return typeof rows === "string" ? rows : rows?.code || rows;
}

export async function fetchCompanyAccessCodeStatus(clientId) {
  return supabaseRequest("/rpc/company_access_code_status", {
    method: "POST",
    body: JSON.stringify({ target_client: clientId }),
  });
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
