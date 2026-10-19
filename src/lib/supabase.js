import {
  hasSupabaseConfig,
  initSupabase,
  isSupabaseConfigured,
  requireSupabaseConfig,
} from "./supabaseConfig.js";

export { hasSupabaseConfig, initSupabase, isSupabaseConfigured };

let accessToken = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("stockly-access-token");
export function hasAuthenticatedSession() { return Boolean(accessToken); }
export async function signInWithPassword(email, password) {
  const config = await requireSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error(result.msg || result.message || "Correo o contraseña incorrectos");
  accessToken = result.access_token;
  sessionStorage.setItem("stockly-access-token", accessToken);
  return result.user;
}
export function signOut() { accessToken = null; sessionStorage.removeItem("stockly-access-token"); }

async function supabaseRequest(path, options = {}) {
  const config = await requireSupabaseConfig();

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
