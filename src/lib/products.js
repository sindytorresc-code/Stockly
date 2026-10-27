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

export function matchesSearch(product, query, { isAtain = true } = {}) {
  if (!query.trim()) return true;
  const needle = query.toLowerCase();
  const values = [
    product.name,
    product.code,
    product.category,
    product.brand,
    product.comments,
  ];
  if (isAtain) values.push(product.tag, product.spot, product.campaign);
  return values.some((value) => String(value || "").toLowerCase().includes(needle));
}

export function matchesFilter(product, filter) {
  const limit = lowStockLimit(product);
  if (filter === "stock") return product.stock > limit;
  if (filter === "low") return product.stock > 0 && product.stock <= limit;
  if (filter === "empty") return product.stock === 0;
  return true;
}

export function matchesCategoryFilter(product, filter) {
  if (!filter || filter === "all") return true;
  return String(product.category || "").trim().toLocaleLowerCase() === String(filter).trim().toLocaleLowerCase();
}

export function computeCategoryBreakdown(products) {
  const counts = new Map();
  for (const product of products) {
    const category = String(product.category || "").trim();
    if (!category) continue;
    const key = category.toLocaleLowerCase();
    const current = counts.get(key);
    counts.set(key, { key, label: current?.label || category, count: (current?.count || 0) + 1 });
  }
  return Array.from(counts.values())
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "es"));
}

export function matchesAtainAssetFilter(product, filter) {
  if (filter === "all") return true;
  const category = String(product.category || "").trim().toLowerCase();
  return category === filter;
}

export function matchesAtainCampaignFilter(product, filter) {
  if (filter === "all") return true;
  const inBodega = String(product.brand || "").trim().toLowerCase() === "bodega";
  if (filter === "Bodega") return inBodega;
  return !inBodega && String(product.campaign || "").trim() === filter;
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
  // Disabled inputs are omitted from FormData; fall back to the product being edited.
  const formCode = form.get("code");
  const code = String(formCode != null && formCode !== "" ? formCode : editingProduct?.code || "").trim();

  return {
    dbId: editingProduct?.dbId,
    name: String(form.get("name")).trim(),
    code,
    category: String(form.get("category")).trim(),
    brand: isAtain ? (form.get("inBodega") === "on" ? "Bodega" : "") : String(form.get("brand") || "").trim(),
    price: isAtain ? Number(editingProduct?.price || 0) : Number(form.get("price")),
    purchasePrice: isAtain ? 0 : Number(form.get("purchasePrice") || 0),
    spot: String(form.get("spot") || "").trim(),
    campaign: String(form.get("campaign") || "").trim(),
    stock,
    minStock: isAtain ? 1 : Number(form.get("minStock") || 0),
    image: isAtain ? "" : String(form.get("image") || "").trim(),
    tag: isAtain ? deriveTag(stock, userTag) : stock === 0 ? "Agotado" : "En stock",
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
    const inBodega = String(product.brand || "").trim().toLowerCase() === "bodega";
    if (!inBodega && !product.spot) return "Completa el spot del activo";
    if (!inBodega && !product.campaign) return "Selecciona la campana";
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

const productHeaderAliases = {
  name: ["name", "nombre", "nombre del producto", "nombre producto", "producto", "articulo", "activo"],
  code: ["code", "codigo", "codigo del producto", "sku", "referencia", "ref", "serial", "numero de serie"],
  category: ["category", "categoria", "tipo", "modelo"],
  price: ["price", "precio", "precio de venta", "valor", "venta"],
  purchasePrice: ["purchase price", "precio de compra", "costo", "coste", "cost", "costo unitario"],
  stock: ["stock", "existencias", "cantidad", "unidades", "inventario", "qty"],
  minStock: ["min stock", "stock minimo", "existencia minima", "minimo", "min"],
  tag: ["tag", "estado", "status"],
  brand: ["brand", "marca"],
  spot: ["spot", "ubicacion", "bodega", "sede"],
  campaign: ["campaign", "campana"],
  comments: ["comments", "comentarios", "descripcion", "observaciones"],
  image: ["image", "imagen"],
};

const importFields = ["name", "code", "price", "purchasePrice", "stock", "minStock", "category", "brand", "tag", "comments", "image", "spot", "campaign"];
const requiredImportFields = new Set(["name", "code", "price", "stock", "category"]);
const importFieldLabels = {
  name: "Nombre", code: "Código", price: "Precio de venta", purchasePrice: "Precio de compra",
  stock: "Stock", minStock: "Stock mínimo", category: "Categoría", brand: "Marca", tag: "Estado",
  comments: "Comentarios", image: "Imagen", spot: "Ubicación", campaign: "Campaña",
};

function makeColumnLabels(width) {
  return Array.from({ length: width }, (_, index) => {
    let number = index + 1;
    let label = "";
    while (number > 0) {
      number -= 1;
      label = String.fromCharCode(65 + (number % 26)) + label;
      number = Math.floor(number / 26);
    }
    return `${label}`;
  });
}

function detectProductHeaders(rows) {
  let best = null;
  rows.slice(0, 15).forEach((row, rowIndex) => {
    const mapping = {};
    row.forEach((cell, columnIndex) => {
      const header = normalizeCsvHeader(cell);
      const field = importFields.find((candidate) => productHeaderAliases[candidate]?.includes(header));
      if (field && mapping[field] === undefined) mapping[field] = columnIndex;
    });
    const score = Object.keys(mapping).length;
    const reliable = mapping.name !== undefined && mapping.code !== undefined
      && score >= 3
      && ["price", "stock", "category"].some((field) => mapping[field] !== undefined);
    if (reliable && (!best || score > best.score)) best = { rowIndex, mapping, score };
  });
  return best;
}

export async function prepareProductImport(input, { fileName = "", businessId = "" } = {}) {
  const XLSX = await import("xlsx");
  let workbook;
  try {
    const type = typeof input === "string" ? "string" : "array";
    if (type === "array") {
      const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer ?? input, input.byteOffset ?? 0, input.byteLength);
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
      const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
      const prefix = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 256))).trimStart();
      const isSpreadsheetXml = /^(?:<\?xml|<Workbook|<workbook)/i.test(prefix);
      if (!isZip && !isOle && !isSpreadsheetXml) throw new Error("invalid workbook signature");
    }
    workbook = XLSX.read(input, { type, cellDates: false, raw: false });
  } catch {
    throw new Error("No pude leer el archivo. Verifica que el Excel o CSV no este danado.");
  }
  const sheetName = workbook.SheetNames.find((name) => normalizeCsvHeader(name) === "inventario") || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("El archivo no contiene hojas con datos.");
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  if (!rows.some((row) => row.some((cell) => String(cell).trim()))) throw new Error("El archivo esta vacio.");
  const atainHeaderIndex = businessId === "atain" ? rows.findIndex((row) => {
    const headers = row.map((cell) => normalizeCsvHeader(cell));
    return headers.includes("spot") && headers.includes("modelo") && headers.includes("serial");
  }) : -1;
  if (atainHeaderIndex >= 0) {
    const atainText = rows.slice(atainHeaderIndex).map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    return { atainText, fileName, sheetName, businessId };
  }
  const header = detectProductHeaders(rows);
  const width = Math.max(...rows.map((row) => row.length));
  const columns = makeColumnLabels(width);
  const headerIndex = header?.rowIndex ?? -1;
  const dataRows = header ? rows.slice(header.rowIndex + 1) : rows;
  return {
    fileName,
    sheetName,
    businessId,
    columns,
    headers: header ? rows[header.rowIndex] : columns.map((column) => `Columna ${column}`),
    rows: dataRows,
    headerDetected: Boolean(header),
    headerRow: header ? header.rowIndex : null,
    mapping: header?.mapping ?? {},
    detectionScore: header?.score ?? 0,
  };
}

function importNumber(value, { integer = false, defaultValue } = {}) {
  if (value === undefined || value === null || String(value).trim() === "") return defaultValue;
  let text = String(value).trim()
    .replace(/^COP\s*/i, "")
    .replace(/\s*COP$/i, "")
    .replace(/[\p{Sc}\s]/gu, "");
  if (!/^-?[\d.,]+$/.test(text)) return NaN;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    const [integerPart, fractionalPart, ...extra] = text.split(decimalSeparator);
    if (extra.length || !/^\d+$/.test(fractionalPart) || !isValidGroupedInteger(integerPart, groupingSeparator)) return NaN;
    text = `${integerPart.replaceAll(groupingSeparator, "")}.${fractionalPart}`;
  } else {
    const separator = lastComma >= 0 ? "," : lastDot >= 0 ? "." : "";
    if (separator) {
      const pieces = text.split(separator);
      if (pieces.length > 2) {
        if (!isValidGroupedInteger(text, separator)) return NaN;
        text = text.replaceAll(separator, "");
      } else {
        const [integerPart, fractionalPart] = pieces;
        if (!fractionalPart) return NaN;
        // In COP exports, a single separator followed by three digits is the
        // usual thousands format (e.g. 1.099 or 209,000), not a decimal.
        if (fractionalPart.length === 3 && integerPart.replace(/^-/, "").length <= 3) {
          text = `${integerPart}${fractionalPart}`;
        } else {
          text = `${integerPart}.${fractionalPart}`;
        }
      }
    }
  }
  const number = Number(text);
  return Number.isFinite(number) && (!integer || Number.isInteger(number)) ? number : NaN;
}

function isValidGroupedInteger(value, separator) {
  const signless = value.startsWith("-") ? value.slice(1) : value;
  if (!signless.includes(separator)) return /^\d+$/.test(signless);
  const groups = signless.split(separator);
  return groups.length > 1
    && /^\d{1,3}$/.test(groups[0])
    && groups.slice(1).every((group) => /^\d{3}$/.test(group));
}

export function parseMappedProductImport(draft, mapping) {
  const missingFields = [...requiredImportFields].filter((field) => mapping[field] === undefined || mapping[field] === null || mapping[field] === "");
  const assigned = new Map();
  const mappingConflicts = [];
  Object.entries(mapping).forEach(([field, column]) => {
    if (column === undefined || column === null || column === "") return;
    const previousField = assigned.get(Number(column));
    if (previousField) mappingConflicts.push(`${importFieldLabels[previousField]} y ${importFieldLabels[field]} usan la misma columna.`);
    else assigned.set(Number(column), field);
  });
  if (missingFields.length || mappingConflicts.length) {
    return { products: [], issues: [], missingFields: missingFields.map((field) => importFieldLabels[field]), mappingConflicts };
  }
  const products = [];
  const issues = [];
  const seenCodes = new Set();
  const startIndex = draft.startIndex || 0;
  draft.rows.slice(startIndex).forEach((row, index) => {
    const rowNumber = (draft.headerDetected ? draft.headerRow + 2 : 1) + startIndex + index;
    if (!row.some((cell) => String(cell).trim())) {
      issues.push({ row: rowNumber, message: "Fila vacia" });
      return;
    }
    const get = (field) => mapping[field] === undefined || mapping[field] === null || mapping[field] === "" ? "" : row[Number(mapping[field])] ?? "";
    const product = {
      name: String(get("name")).trim(), code: String(get("code")).trim(), category: String(get("category")).trim(),
      price: importNumber(get("price")), purchasePrice: importNumber(get("purchasePrice"), { defaultValue: 0 }),
      stock: importNumber(get("stock"), { integer: true }), minStock: importNumber(get("minStock"), { integer: true, defaultValue: 3 }),
      brand: String(get("brand")).trim(), image: String(get("image")).trim(), spot: String(get("spot")).trim(),
      campaign: String(get("campaign")).trim(), comments: String(get("comments")).trim(),
    };
    const rowErrors = [];
    if (!product.name) rowErrors.push("falta el nombre");
    if (!product.code) rowErrors.push("falta el código");
    if (!product.category) rowErrors.push("falta la categoría");
    if (!Number.isFinite(product.price) || product.price < 0) rowErrors.push("precio de venta inválido");
    if (!Number.isFinite(product.purchasePrice) || product.purchasePrice < 0) rowErrors.push("precio de compra inválido");
    if (!Number.isInteger(product.stock) || product.stock < 0) rowErrors.push("stock inválido");
    if (!Number.isInteger(product.minStock) || product.minStock < 0) rowErrors.push("stock mínimo inválido");
    const codeKey = product.code.toLocaleLowerCase();
    if (codeKey && seenCodes.has(codeKey)) rowErrors.push("código repetido dentro del archivo");
    if (codeKey) seenCodes.add(codeKey);
    if (rowErrors.length) issues.push({ row: rowNumber, message: rowErrors.join(", ") });
    else {
      product.tag = draft.businessId === "atain"
        ? deriveTag(product.stock, String(get("tag") || "En stock").trim())
        : product.stock === 0 ? "Agotado" : "En stock";
      products.push(product);
    }
  });
  return { products, issues, missingFields: [], mappingConflicts: [] };
}

export async function readExcelProducts(input, options = {}) {
  const draft = await prepareProductImport(input, options);
  if (draft.atainText) return draft;
  if (!draft.headerDetected) return { ...draft, needsMapping: true };
  return { ...parseMappedProductImport(draft, draft.mapping), draft };
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

function expandAtainRowToProducts(record, campaign) {
  const spot = pickRecordField(record, "spot");
  const campaignValue = String(campaign || pickRecordField(record, "campana", "campaign") || "").trim();
  const hostname = pickRecordField(record, "hostname", "host");
  const modelo = pickRecordField(record, "modelo", "model");
  const desktopSerial = pickRecordField(record, "serial", "serie");

  if (!spot || !campaignValue) return [];

  const base = {
    spot,
    campaign: campaignValue,
    brand: "",
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
  const mapped = records.flatMap((record) => expandAtainRowToProducts(record, campaign));

  if (mapped.length) return mapped;
  return parseAtainAssetCsvPositional(text, campaign);
}

function parseAtainAssetCsvPositional(text, campaign) {
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
    .flatMap((cells) => expandAtainRowToProducts(cellsToAtainRecord(cells), campaign));
}

export function describeAtainImportFailure(text) {
  const rows = splitCsvLines(text);
  if (!rows.length) {
    return "El archivo esta vacio o no se pudo leer.";
  }

  const delimiter = detectAtainDelimiter(rows) ?? detectCsvDelimiter(rows[0]);
  const firstRow = splitDelimitedRow(rows[0], delimiter);
  const preview = firstRow.slice(0, 4).join(" | ") || "sin encabezados";

  return `No pude reconocer productos en ${rows.length} filas y ${firstRow.length} columnas (${preview}). Revisa que la hoja tenga encabezados de activos como Spot, Modelo y Serial, y datos validos.`;
}

export function parseAtainImport(text, { campaign } = {}) {
  try {
    const imported = parseAtainAssetCsv(text, campaign);
    const parsed = imported.length ? imported : parseAtainAssetCsvPositional(text, campaign);
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
      tag: options.businessId === "atain"
        ? deriveTag(parsedStock, tag || "En stock")
        : parsedStock === 0 ? "Agotado" : "En stock",
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
