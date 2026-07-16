export function lowStockLimit(product) {
  return Number(product.minStock ?? 3);
}

export function deriveTag(stock, userTag) {
  const tag = userTag || "En stock";
  if (stock === 0) return tag === "Reparacion" ? "Reparacion" : "Agotado";
  if (tag === "Agotado") return "En stock";
  return tag;
}

export function tagClass(tag) {
  if (tag === "Agotado") return "bg-red-500/15 text-red-500";
  if (tag === "Reparacion") return "bg-orange-500/15 text-orange-500";
  if (tag === "Campana") return "bg-violet-500/15 text-violet-500";
  if (tag === "Asignado") return "bg-sky-500/15 text-sky-500";
  return "bg-blue-500/15 text-blue-500";
}

export function matchesSearch(product, query) {
  if (!query.trim()) return true;
  const needle = query.toLowerCase();
  return [
    product.name,
    product.code,
    product.category,
    product.tag,
    product.spot,
    product.campaign,
    product.brand,
    product.comments,
  ].some((value) => String(value || "").toLowerCase().includes(needle));
}

export function matchesFilter(product, filter) {
  const limit = lowStockLimit(product);
  if (filter === "stock") return product.stock > limit;
  if (filter === "low") return product.stock > 0 && product.stock <= limit;
  if (filter === "empty") return product.stock === 0;
  return true;
}

export function computeStats(products) {
  return {
    total: products.length,
    value: products.reduce((sum, product) => sum + product.price * product.stock, 0),
    low: products.filter(
      (product) => product.stock > 0 && product.stock <= lowStockLimit(product),
    ).length,
    empty: products.filter((product) => product.stock === 0).length,
  };
}

export function mergeProductsByCode(existing, incoming) {
  const byCode = new Map(existing.map((product) => [product.code, product]));
  for (const product of incoming) {
    byCode.set(product.code, { ...byCode.get(product.code), ...product });
  }
  return Array.from(byCode.values());
}

export function parseProductForm(form, editingProduct, isAtain) {
  const userTag = String(form.get("tag") || editingProduct?.tag || "En stock");
  const stock = Number(form.get("stock"));

  return {
    name: String(form.get("name")).trim(),
    code: String(form.get("code")).trim(),
    category: String(form.get("category")).trim(),
    brand: String(form.get("brand") || "").trim(),
    price: isAtain ? Number(editingProduct?.price || 0) : Number(form.get("price")),
    purchasePrice: Number(form.get("purchasePrice") || 0),
    spot: String(form.get("spot") || "").trim(),
    campaign: String(form.get("campaign") || "").trim(),
    stock,
    minStock: Number(form.get("minStock") || 0),
    image: String(form.get("image") || "").trim(),
    tag: deriveTag(stock, userTag),
    comments: String(form.get("comments") || "").trim(),
  };
}

export function validateProduct(product, isAtain) {
  if (!product.name || !product.code || !product.category) {
    return "Completa nombre, codigo y categoria";
  }
  if (!isAtain) {
    if (Number.isNaN(product.price) || product.price < 0) {
      return "Precio invalido";
    }
  } else {
    if (!product.spot) return "Completa el spot del activo";
    if (!product.campaign) return "Selecciona la campana";
  }
  if (Number.isNaN(product.purchasePrice) || product.purchasePrice < 0) {
    return "Precio de compra invalido";
  }
  if (!Number.isInteger(product.stock) || product.stock < 0) {
    return "Stock invalido";
  }
  if (!Number.isInteger(product.minStock) || product.minStock < 0) {
    return "Stock minimo invalido";
  }
  return null;
}

function splitCsvRow(row) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    const next = row[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsvProducts(text) {
  const rows = String(text).split(/\r?\n/).filter(Boolean);
  return rows.slice(1).map((row) => {
    const [
      name,
      code,
      category,
      price,
      stock,
      tag,
      comments,
      minStock,
      purchasePrice,
      brand,
      image,
      spot,
      campaign,
    ] = splitCsvRow(row);
    const parsedStock = Number(stock);

    return {
      name,
      code,
      category,
      price: Number(price),
      stock: parsedStock,
      tag: deriveTag(parsedStock, tag || "En stock"),
      comments: comments || "",
      minStock: Number(minStock || 3),
      purchasePrice: Number(purchasePrice || 0),
      brand: brand || "",
      image: image || "",
      spot: spot || "",
      campaign: campaign || "",
    };
  }).filter((item) => isValidImportedProduct(item));
}

function isValidImportedProduct(item) {
  if (!item.name || !item.code || !item.category) return false;
  if (Number.isNaN(item.price) || item.price < 0) return false;
  if (!Number.isInteger(item.stock) || item.stock < 0) return false;
  if (Number.isNaN(item.minStock) || item.minStock < 0) return false;
  if (Number.isNaN(item.purchasePrice) || item.purchasePrice < 0) return false;
  return true;
}
