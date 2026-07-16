const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

async function supabaseRequest(path, options = {}) {
  if (!hasSupabaseConfig) throw new Error("Supabase no esta configurado");

  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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
      theme: {},
    }),
  });

  return rows?.[0] || null;
}

export async function fetchSupabaseProducts(clientId) {
  return supabaseRequest(
    `/products?client_id=eq.${clientId}&select=*&order=created_at.desc`,
  );
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

export function appProductToDb(product, clientId) {
  return {
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
  };
}

export async function upsertSupabaseProducts(clientId, products) {
  return supabaseRequest("/products?on_conflict=client_id,code", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(products.map((product) => appProductToDb(product, clientId))),
  });
}

export async function upsertSupabaseProduct(clientId, product) {
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

export async function seedSupabaseProductsIfEmpty(clientId, seedProducts) {
  const rows = await fetchSupabaseProducts(clientId);
  if (rows.length) return rows.map(dbProductToApp);

  await upsertSupabaseProducts(clientId, seedProducts);
  const seeded = await fetchSupabaseProducts(clientId);
  return seeded.map(dbProductToApp);
}
