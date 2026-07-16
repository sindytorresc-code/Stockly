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

export function computeStats(products, { isAtain = false } = {}) {
  const stats = {
    total: products.length,
    value: products.reduce((sum, product) => sum + product.price * product.stock, 0),
    low: products.filter(
      (product) => product.stock > 0 && product.stock <= lowStockLimit(product),
    ).length,
    empty: products.filter((product) => product.stock === 0).length,
  };

  if (isAtain) {
    stats.assigned = products.filter((product) => product.tag === "Asignado").length;
  }

  return stats;
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

function normalizeCsvHeader(value) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function decodeCsvText(input) {
  if (typeof input === "string") {
    return input.replace(/^\uFEFF/, "").replace(/\0/g, "");
  }

  const bytes = new Uint8Array(input);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(input).replace(/\0/g, "");
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(input).replace(/\0/g, "");
  }

  return new TextDecoder("utf-8").decode(input).replace(/^\uFEFF/, "").replace(/\0/g, "");
}

function detectCsvDelimiter(firstLine) {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;

  for (const delimiter of candidates) {
    const count = splitDelimitedRow(firstLine, delimiter).length;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  }

  return bestCount > 1 ? best : ",";
}

function splitDelimitedRow(row, delimiter = ",") {
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

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function splitCsvRow(row, delimiter = ",") {
  return splitDelimitedRow(row, delimiter);
}

function rowLooksLikeAtainHeaders(headers) {
  const headerSet = new Set(headers.map(normalizeCsvHeader));
  const hasSpot = headerSet.has("spot");
  const hasModel = headerSet.has("modelo") || headerSet.has("model");
  const hasSerial = headerSet.has("serial") || headerSet.has("serie");
  return hasSpot && hasModel && hasSerial;
}

function findAtainTableStart(rows) {
  for (let index = 0; index < Math.min(rows.length, 15); index += 1) {
    const delimiter = detectCsvDelimiter(rows[index]);
    const headers = splitCsvRow(rows[index], delimiter).map(normalizeCsvHeader);
    if (rowLooksLikeAtainHeaders(headers)) {
      return { headerIndex: index, delimiter, headers };
    }
  }
  return null;
}

function parseCsvTable(text) {
  const normalizedText = decodeCsvText(text);
  const rows = normalizedText.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  if (!rows.length) return { headers: [], records: [], delimiter: "," };

  const atainStart = findAtainTableStart(rows);
  const headerIndex = atainStart?.headerIndex ?? 0;
  const delimiter = atainStart?.delimiter ?? detectCsvDelimiter(rows[headerIndex]);
  const headers = (atainStart?.headers ?? splitCsvRow(rows[headerIndex], delimiter)).map(normalizeCsvHeader);
  const records = rows.slice(headerIndex + 1).map((row) => {
    const cells = splitCsvRow(row, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });

  return { headers, records, delimiter };
}

export function isAtainAssetCsv(text) {
  const normalizedText = decodeCsvText(text);
  const rows = normalizedText.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  return Boolean(findAtainTableStart(rows));
}

function pickRecordField(record, ...aliases) {
  for (const alias of aliases) {
    const key = normalizeCsvHeader(alias);
    const value = String(record[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function deriveAtainCategory(modelo) {
  const value = String(modelo || "").toLowerCase();
  if (value.includes("optiplex") || value.includes("thinkcentre") || value.includes("latitude")) {
    return "Computadores";
  }
  if (value.includes("monitor") || value.includes("pantalla")) return "Pantallas";
  return "Equipos";
}

function deriveAtainBrand(modelo) {
  const value = String(modelo || "").toLowerCase();
  if (value.includes("optiplex") || value.includes("latitude")) return "Dell";
  if (value.includes("thinkcentre")) return "Lenovo";
  return "";
}

function isMissingSerial(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return !normalized || normalized === "S/N" || normalized === "SN" || normalized === "N/A";
}

function formatAtainComments(record) {
  const parts = [];
  const hostname = String(record.hostname || "").trim();
  if (hostname) parts.push(`Hostname: ${hostname}`);

  const peripherals = [
    ["Pantalla 1", pickRecordField(record, "pantalla 1", "pantalla1")],
    ["Pantalla 2", pickRecordField(record, "pantalla 2", "pantalla2")],
    ["Headset", pickRecordField(record, "headset")],
    ["Mouse", pickRecordField(record, "mouse")],
    ["Teclado", pickRecordField(record, "teclado")],
  ];

  for (const [label, value] of peripherals) {
    const serial = String(value || "").trim();
    if (!isMissingSerial(serial)) parts.push(`${label}: ${serial}`);
  }

  return parts.join(" | ");
}

function mapAtainAssetRecord(record, campaign) {
  const spot = pickRecordField(record, "spot");
  const name = pickRecordField(record, "modelo", "model");
  const code = pickRecordField(record, "serial", "serie");
  const hostname = pickRecordField(record, "hostname", "host");

  return {
    name,
    code,
    category: deriveAtainCategory(name),
    brand: deriveAtainBrand(name),
    spot,
    campaign: String(campaign || pickRecordField(record, "campana", "campaign") || "").trim(),
    price: 0,
    stock: 1,
    minStock: 1,
    purchasePrice: 0,
    image: "",
    tag: "Asignado",
    comments: formatAtainComments({ ...record, hostname }),
  };
}

function isValidAtainImportedProduct(item) {
  if (!item.name || !item.code || !item.spot || !item.campaign) return false;
  if (!item.category) return false;
  if (Number.isNaN(item.price) || item.price < 0) return false;
  if (!Number.isInteger(item.stock) || item.stock < 0) return false;
  if (Number.isNaN(item.minStock) || item.minStock < 0) return false;
  if (Number.isNaN(item.purchasePrice) || item.purchasePrice < 0) return false;
  return true;
}

export function parseAtainAssetCsv(text, campaign) {
  const { records } = parseCsvTable(text);
  return records
    .map((record) => mapAtainAssetRecord(record, campaign))
    .filter((item) => isValidAtainImportedProduct(item));
}

export function parseAtainImport(text, campaign) {
  if (isAtainAssetCsv(text)) {
    return parseAtainAssetCsv(text, campaign);
  }
  return parseCsvProducts(text);
}

export function parseCsvProducts(text, options = {}) {
  if (options.businessId === "atain" && isAtainAssetCsv(text)) {
    return parseAtainAssetCsv(text, options.campaign);
  }

  const { delimiter } = parseCsvTable(text);
  const rows = decodeCsvText(text).split(/\r?\n/).filter(Boolean);
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
    ] = splitCsvRow(row, delimiter);
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
