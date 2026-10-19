const escapeXml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function worksheet(name, headers, rows) {
  const rowXml = [headers, ...rows].map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>`).join("");
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rowXml}</Table></Worksheet>`;
}

// Excel 2003 XML is a multi-sheet workbook supported by Excel and LibreOffice.
export function exportBusinessWorkbook(business, products, movements = []) {
  const sheets = [
    worksheet("Empresa", ["Campo", "Valor"], [["Nombre", business.name], ["Tipo", business.type], ["Descripción", business.description], ["Exportado", new Date().toISOString()]]),
    worksheet("Inventario", ["Nombre", "Código", "Categoría", "Precio", "Precio de compra", "Existencias", "Stock mínimo", "Estado", "Marca", "Ubicación", "Campaña", "Comentarios"], products.map((p) => [p.name, p.code, p.category, p.price, p.purchasePrice, p.stock, p.minStock, p.tag, p.brand, p.spot, p.campaign, p.comments])),
    worksheet("Dashboard", ["Indicador", "Valor"], [["Productos", products.length], ["Unidades", products.reduce((n, p) => n + Number(p.stock || 0), 0)], ["Valor inventario", products.reduce((n, p) => n + Number(p.price || 0) * Number(p.stock || 0), 0)], ["Stock bajo", products.filter((p) => Number(p.stock || 0) <= Number(p.minStock || 3)).length], ["Movimientos incluidos", movements.length]]),
    worksheet("Movimientos", ["Fecha", "Tipo", "Producto", "Código", "Cantidad", "Detalle"], movements.map((m) => [m.created_at, m.movement_type, m.product_name, m.product_code, m.quantity, m.notes])),
  ];
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${sheets.join("")}</Workbook>`;
  const url = URL.createObjectURL(new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(business.name).trim().replace(/[^\w-]+/g, "-")}-respaldo.xls`;
  link.click();
  URL.revokeObjectURL(url);
}
