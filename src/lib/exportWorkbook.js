import * as XLSX from "xlsx";

const valueOf = (row, appName, dbName, fallback = "") => row?.[appName] ?? row?.[dbName] ?? fallback;
const numeric = (value) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

function worksheet(headers, rows, widths = []) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  if (widths.length) sheet["!cols"] = widths.map((wch) => ({ wch }));
  sheet["!autofilter"] = { ref: sheet["!ref"] };
  return sheet;
}

function formatCurrencyColumns(sheet, columns) {
  if (!sheet["!ref"]) return;
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    for (const column of columns) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell && typeof cell.v === "number") cell.z = '"$" #,##0.00';
    }
  }
}

export function createBusinessWorkbook(business, products = [], {
  categories = [], movements = [], inventoryItems = [], assignments = [], exportedAt = new Date(),
} = {}) {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeInventoryItems = Array.isArray(inventoryItems) ? inventoryItems : [];
  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const units = safeProducts.reduce((sum, product) => sum + numeric(valueOf(product, "stock", "stock", 0)), 0);
  const inventoryValue = safeProducts.reduce((sum, product) => sum + numeric(valueOf(product, "price", "price", 0)) * numeric(valueOf(product, "stock", "stock", 0)), 0);
  const lowStock = safeProducts.filter((product) => numeric(valueOf(product, "stock", "stock", 0)) <= numeric(valueOf(product, "minStock", "min_stock", 3))).length;
  const workbook = XLSX.utils.book_new();
  const brandTheme = { ...(business.brandConfig || business.theme || {}) };
  const logoConfigured = Boolean(brandTheme.logoDataUrl);
  delete brandTheme.logoDataUrl;

  const summary = worksheet(["Indicador", "Valor"], [
    ["Empresa", business.name],
    ["ID de empresa", business.clientId || ""],
    ["Slug", business.id || ""],
    ["Tipo", business.type || ""],
    ["Descripción", business.description || ""],
    ["Ícono", business.icon || ""],
    ["Tema de marca (JSON)", JSON.stringify(brandTheme)],
    ["Logo de empresa", logoConfigured ? "Data URI omitido; almacenar por separado desde clients.theme.logoDataUrl" : "No configurado"],
    ["Fecha de exportación", exportedAt.toISOString()],
    ["Productos exportados", safeProducts.length],
    ["Categorías exportadas", safeCategories.length],
    ["Ubicaciones de inventario exportadas", safeInventoryItems.length],
    ["Asignaciones exportadas", safeAssignments.length],
    ["Movimientos exportados", movements === null ? "Sin permiso de lectura" : (movements || []).length],
    ["Productos", safeProducts.length],
    ["Unidades en existencias", units],
    ["Valor de venta en existencias", inventoryValue],
    ["Productos con stock bajo", lowStock],
    ["Movimientos incluidos", movements === null ? "Sin permiso de lectura" : (movements || []).length],
  ], [34, 48]);
  const summaryValueCell = summary["B18"];
  if (summaryValueCell && typeof summaryValueCell.v === "number") summaryValueCell.z = '"$" #,##0.00';
  XLSX.utils.book_append_sheet(workbook, summary, "Resumen");

  const productHeaders = [
    "ID producto", "ID empresa", "Nombre", "Código", "Categoría", "Precio de venta", "Precio de compra",
    "Existencias", "Stock mínimo", "Estado", "Marca", "Ubicación", "Campaña", "Comentarios", "Imagen URL",
    "Fecha de creación", "Fecha de actualización",
  ];
  const productRows = safeProducts.map((product) => [
    valueOf(product, "dbId", "id"),
    valueOf(product, "clientId", "client_id", business.clientId || ""),
    valueOf(product, "name", "name"),
    valueOf(product, "code", "code"),
    valueOf(product, "category", "category"),
    numeric(valueOf(product, "price", "price")),
    numeric(valueOf(product, "purchasePrice", "purchase_price")),
    numeric(valueOf(product, "stock", "stock")),
    numeric(valueOf(product, "minStock", "min_stock", 3)),
    valueOf(product, "tag", "status"),
    valueOf(product, "brand", "brand"),
    valueOf(product, "spot", "spot"),
    valueOf(product, "campaign", "campaign"),
    valueOf(product, "comments", "comments"),
    valueOf(product, "image", "image_url"),
    valueOf(product, "createdAt", "created_at"),
    valueOf(product, "updatedAt", "updated_at"),
  ]);
  const productSheet = worksheet(productHeaders, productRows, [38, 38, 30, 18, 24, 18, 18, 14, 14, 16, 20, 20, 20, 40, 42, 26, 26]);
  formatCurrencyColumns(productSheet, [5, 6]);
  XLSX.utils.book_append_sheet(workbook, productSheet, "Productos");

  const categoryCounts = new Map();
  safeProducts.forEach((product) => {
    const name = String(valueOf(product, "category", "category")).trim();
    if (name) categoryCounts.set(name, (categoryCounts.get(name) || 0) + 1);
  });
  const categoryRows = safeCategories.map((category) => [
    valueOf(category, "id", "id"),
    valueOf(category, "clientId", "client_id", business.clientId || ""),
    valueOf(category, "name", "name"),
    valueOf(category, "description", "description"),
    categoryCounts.get(String(valueOf(category, "name", "name")).trim()) || 0,
  ]);
  const categorySheet = worksheet(["ID categoría", "ID empresa", "Nombre", "Descripción", "Productos"], categoryRows, [38, 38, 30, 48, 14]);
  XLSX.utils.book_append_sheet(workbook, categorySheet, "Categorías");

  const inventoryItemRows = safeInventoryItems.map((item) => [
    item.id, item.client_id || business.clientId || "", item.product_id, item.quantity,
    item.location, item.updated_at,
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet(
    ["ID registro", "ID empresa", "ID producto", "Cantidad", "Ubicación", "Fecha de actualización"],
    inventoryItemRows,
    [38, 38, 38, 14, 30, 28],
  ), "Ubicaciones");

  const assignmentRows = safeAssignments.map((assignment) => [
    assignment.id, assignment.client_id || business.clientId || "", assignment.product_id,
    assignment.assigned_to, assignment.quantity, assignment.assigned_at, assignment.returned_at,
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet(
    ["ID asignación", "ID empresa", "ID producto", "Asignado a", "Cantidad", "Fecha de asignación", "Fecha de devolución"],
    assignmentRows,
    [38, 38, 38, 32, 14, 28, 28],
  ), "Asignaciones");

  if (movements !== null) {
    const movementHeaders = ["ID movimiento", "ID empresa", "ID producto", "ID usuario", "Fecha", "Tipo", "Producto", "Código", "Cantidad", "Detalle", "Datos anteriores", "Datos posteriores"];
    const movementRows = (movements || []).map((movement) => [
      movement.id, movement.client_id || business.clientId || "", movement.product_id, movement.actor_id,
      movement.created_at, movement.movement_type, movement.product_name, movement.product_code, movement.quantity,
      movement.notes, movement.before_data == null ? "" : JSON.stringify(movement.before_data),
      movement.after_data == null ? "" : JSON.stringify(movement.after_data),
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet(movementHeaders, movementRows, [38, 38, 38, 38, 26, 18, 30, 18, 14, 40, 60, 60]), "Movimientos");
  }

  return workbook;
}

export function exportBusinessWorkbook(business, { products = [], categories = [], movements = [], inventoryItems = [], assignments = [] } = {}) {
  const workbook = createBusinessWorkbook(business, products, { movements, categories, inventoryItems, assignments });
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(business.name).trim().replace(/[^\w-]+/g, "-")}-respaldo.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
  return workbook;
}
