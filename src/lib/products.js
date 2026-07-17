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

export function matchesAtainAssetFilter(product, filter) {
  if (filter === "all") return true;
  const category = String(product.category || "").trim().toLowerCase();
  return category === filter;
}

export function matchesAtainCampaignFilter(product, filter) {
  if (filter === "all") return true;
  return String(product.campaign || "").trim() === filter;
}

export function matchesAtainFilters(product, assetFilter, campaignFilter) {
  return matchesAtainAssetFilter(product, assetFilter) && matchesAtainCampaignFilter(product, campaignFilter);
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

export function dedupeImportProductsByCode(products) {
  const used = new Set();
  const deduped = [];
  let duplicateCount = 0;

  for (const product of products) {
    const baseCode = String(product.code || "").trim();
    if (!baseCode) continue;

    let code = baseCode;
    if (used.has(code)) {
      duplicateCount += 1;
      code = `${product.spot}-${product.category}-${baseCode}`;
    }

    let finalCode = code;
    let suffix = 2;
    while (used.has(finalCode)) {
      duplicateCount += 1;
      finalCode = `${code}-${suffix}`;
      suffix += 1;
    }

    used.add(finalCode);
    deduped.push(finalCode === baseCode ? product : { ...product, code: finalCode });
  }

  return { products: deduped, duplicateCount };
}

export function parseProductForm(form, editingProduct, isAtain) {
  const userTag = String(form.get("tag") || editingProduct?.tag || (isAtain ? "Asignado" : "En stock"));
  const stock = isAtain ? 1 : Number(form.get("stock"));

  return {
    name: String(form.get("name")).trim(),
    code: String(form.get("code")).trim(),
    category: String(form.get("category")).trim(),
    brand: isAtain ? String(form.get("warehouse") || "").trim() : String(form.get("brand") || "").trim(),
    price: isAtain ? Number(editingProduct?.price || 0) : Number(form.get("price")),
    purchasePrice: isAtain ? 0 : Number(form.get("purchasePrice") || 0),
    spot: String(form.get("spot") || "").trim(),
    campaign: String(form.get("campaign") || "").trim(),
    stock,
    minStock: isAtain ? 1 : Number(form.get("minStock") || 0),
    image: isAtain ? "" : String(form.get("image") || "").trim(),
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
    if (!product.brand) return "Selecciona la ubicacion (Bodega, IT o STOCK)";
    const allowed = ["desktop", "pantalla", "headset", "mouse", "teclado"];
    if (!allowed.includes(String(product.category || "").trim().toLowerCase())) {
      return "Selecciona el tipo de activo";
    }
    return null;
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
  const cleaned = String(value || "")
    .replace(/\0/g, "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");

  try {
    return cleaned.normalize("NFD").replace(/\p{M}/gu, "");
  } catch {
    return cleaned;
  }
}

export function isExcelWorkbook(input) {
  if (typeof input === "string") return false;
  const bytes = new Uint8Array(input);
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function cleanCsvText(text) {
  return String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\0/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ");
}

export function decodeCsvText(input) {
  if (typeof input === "string") {
    return cleanCsvText(input);
  }

  const bytes = new Uint8Array(input);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return cleanCsvText(new TextDecoder("utf-16le").decode(input));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return cleanCsvText(new TextDecoder("utf-16be").decode(input));
  }

  const utf8 = cleanCsvText(new TextDecoder("utf-8").decode(input));
  if (csvLooksUsable(utf8)) return utf8;

  try {
    const windows1252 = cleanCsvText(new TextDecoder("windows-1252").decode(input));
    if (csvLooksUsable(windows1252)) return windows1252;
  } catch {
    // Some runtimes do not expose windows-1252.
  }

  return utf8;
}

function splitCsvLines(text) {
  return decodeCsvText(text)
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line && !/^sep\s*=/.test(line.toLowerCase()));
}

function csvLooksUsable(text) {
  const rows = splitCsvLines(text);
  if (!rows.length) return false;
  return Boolean(findAtainTableStart(rows) || detectAtainDelimiter(rows));
}

const ATAIN_FIELD_LAYOUT = [
  "spot",
  "modelo",
  "serial",
  "hostname",
  "pantalla 1",
  "pantalla 2",
  "headset",
  "mouse",
  "teclado",
];

function detectCsvDelimiter(firstLine) {
  const candidates = [",", ";", "\t", "|"];
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

function detectAtainDelimiter(rows) {
  const sample = rows.slice(0, Math.min(rows.length, 12));
  let best = null;
  let bestScore = -1;

  for (const delimiter of [",", ";", "\t", "|"]) {
    const counts = sample
      .map((row) => splitDelimitedRow(row, delimiter).length)
      .filter((count) => count >= 8);

    if (!counts.length) continue;

    const min = Math.min(...counts);
    const max = Math.max(...counts);
    if (min === max && min > bestScore) {
      bestScore = min;
      best = delimiter;
    }
  }

  return best;
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
  const hasSpot = headerSet.has("spot") || [...headerSet].some((header) => header.includes("spot"));
  const hasModel =
    headerSet.has("modelo") ||
    headerSet.has("model") ||
    [...headerSet].some((header) => header.includes("modelo"));
  const hasSerial =
    headerSet.has("serial") ||
    headerSet.has("serie") ||
    [...headerSet].some((header) => header.includes("serial"));
  return hasSpot && hasModel && hasSerial;
}

function looksLikeAtainDataRow(cells) {
  if (!cells || cells.length < 3) return false;

  const spot = String(cells[0] || "").trim();
  const model = String(cells[1] || "").trim();
  const serial = String(cells[2] || "").trim();

  if (normalizeCsvHeader(spot) === "spot") return false;
  if (normalizeCsvHeader(model) === "modelo") return false;
  if (!spot || !model || isMissingSerial(serial)) return false;

  return true;
}

function cellsToAtainRecord(cells) {
  return Object.fromEntries(
    ATAIN_FIELD_LAYOUT.map((field, index) => [field, String(cells[index] || "").trim()]),
  );
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
  const rows = splitCsvLines(text);
  if (!rows.length) return { headers: [], records: [], delimiter: "," };

  const atainStart = findAtainTableStart(rows);
  const headerIndex = atainStart?.headerIndex ?? 0;
  const delimiter = atainStart?.delimiter ?? detectAtainDelimiter(rows) ?? detectCsvDelimiter(rows[headerIndex]);
  const headers = (atainStart?.headers ?? splitCsvRow(rows[headerIndex], delimiter)).map(normalizeCsvHeader);
  const records = rows.slice(headerIndex + 1).map((row) => {
    const cells = splitCsvRow(row, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });

  return { headers, records, delimiter };
}

export function isAtainAssetCsv(text) {
  const rows = splitCsvLines(text);
  return Boolean(findAtainTableStart(rows) || detectAtainDelimiter(rows));
}

function pickRecordField(record, ...aliases) {
  for (const alias of aliases) {
    const key = normalizeCsvHeader(alias);
    const value = String(record[key] || "").trim();
    if (value) return value;
  }
  return "";
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

function formatAtainSpotNote(spot, hostname) {
  return hostname ? `Spot ${spot} | Hostname: ${hostname}` : `Spot ${spot}`;
}

function expandAtainRowToProducts(record, campaign, warehouse = "STOCK") {
  const spot = pickRecordField(record, "spot");
  const campaignValue = String(campaign || pickRecordField(record, "campana", "campaign") || "").trim();
  const hostname = pickRecordField(record, "hostname", "host");
  const modelo = pickRecordField(record, "modelo", "model");
  const desktopSerial = pickRecordField(record, "serial", "serie");
  const warehouseValue = String(warehouse || "STOCK").trim();

  if (!spot || !campaignValue) return [];

  const base = {
    spot,
    campaign: campaignValue,
    brand: warehouseValue,
    price: 0,
    stock: 1,
    minStock: 1,
    purchasePrice: 0,
    image: "",
    tag: "Asignado",
  };

  const assets = [];

  if (modelo && !isMissingSerial(desktopSerial)) {
    assets.push({
      ...base,
      name: modelo,
      code: desktopSerial,
      category: "Desktop",
      comments: hostname ? `Hostname: ${hostname}` : "",
    });
  }

  const spotNote = formatAtainSpotNote(spot, hostname);
  const peripheralDefs = [
    { fields: ["pantalla 1", "pantalla1"], name: "Pantalla 1", category: "Pantalla" },
    { fields: ["pantalla 2", "pantalla2"], name: "Pantalla 2", category: "Pantalla" },
    { fields: ["headset"], name: "Headset", category: "Headset" },
    { fields: ["mouse"], name: "Mouse", category: "Mouse" },
    { fields: ["teclado"], name: "Teclado", category: "Teclado" },
  ];

  for (const def of peripheralDefs) {
    const serial = pickRecordField(record, ...def.fields);
    if (isMissingSerial(serial)) continue;

    assets.push({
      ...base,
      name: def.name,
      code: serial,
      category: def.category,
      comments: spotNote,
    });
  }

  return assets.filter(isValidAtainImportedProduct);
}

function isValidAtainImportedProduct(item) {
  if (!item.name || !item.code || !item.spot || !item.campaign || !item.brand) return false;
  if (!item.category) return false;
  if (Number.isNaN(item.price) || item.price < 0) return false;
  if (!Number.isInteger(item.stock) || item.stock < 0) return false;
  if (Number.isNaN(item.minStock) || item.minStock < 0) return false;
  if (Number.isNaN(item.purchasePrice) || item.purchasePrice < 0) return false;
  return true;
}

export function parseAtainAssetCsv(text, campaign, warehouse) {
  const { records } = parseCsvTable(text);
  const mapped = records.flatMap((record) => expandAtainRowToProducts(record, campaign, warehouse));

  if (mapped.length) return mapped;
  return parseAtainAssetCsvPositional(text, campaign, warehouse);
}

function parseAtainAssetCsvPositional(text, campaign, warehouse) {
  const rows = splitCsvLines(text);
  const delimiter = detectAtainDelimiter(rows);
  if (!delimiter) return [];

  const table = rows.map((row) => splitDelimitedRow(row, delimiter));
  let startIndex = 0;

  if (table[0] && rowLooksLikeAtainHeaders(table[0])) {
    startIndex = 1;
  } else {
    const firstDataIndex = table.findIndex((cells) => looksLikeAtainDataRow(cells));
    if (firstDataIndex >= 0) startIndex = firstDataIndex;
  }

  return table
    .slice(startIndex)
    .filter((cells) => looksLikeAtainDataRow(cells))
    .flatMap((cells) => expandAtainRowToProducts(cellsToAtainRecord(cells), campaign, warehouse));
}

export function describeAtainImportFailure(text) {
  const rows = splitCsvLines(text);
  if (!rows.length) {
    return "El archivo esta vacio o no se pudo leer.";
  }

  const delimiter = detectAtainDelimiter(rows) ?? detectCsvDelimiter(rows[0]);
  const firstRow = splitDelimitedRow(rows[0], delimiter);
  const preview = firstRow.slice(0, 4).join(" | ") || "sin encabezados";

  return `Se leyeron ${rows.length} filas y ${firstRow.length} columnas (${preview}). Exporta el Excel como CSV UTF-8 o CSV (delimitado por punto y coma).`;
}

export function parseAtainImport(text, { campaign, warehouse = "STOCK" } = {}) {
  try {
    const imported = parseAtainAssetCsv(text, campaign, warehouse);
    const parsed = imported.length ? imported : parseAtainAssetCsvPositional(text, campaign, warehouse);
    return dedupeImportProductsByCode(parsed);
  } catch (error) {
    console.error("Error al interpretar CSV ATAIN", error);
    return { products: [], duplicateCount: 0 };
  }
}

export function parseCsvProducts(text, options = {}) {
  if (options.businessId === "atain" && isAtainAssetCsv(text)) {
    return parseAtainAssetCsv(text, options.campaign);
  }

  const { delimiter } = parseCsvTable(text);
  const rows = splitCsvLines(text);
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
