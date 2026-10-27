import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { computeAtainAssetBreakdown, countAtainBodegaAssets } from "./atainStats.js";
import {
  computeStats,
  deriveTag,
  matchesFilter,
  matchesCategoryFilter,
  computeCategoryBreakdown,
  matchesAtainAssetFilter,
  matchesAtainCampaignFilter,
  matchesAtainFilters,
  matchesSearch,
  mergeProductsByCode,
  parseCsvProducts,
  decodeCsvText,
  isAtainAssetCsv,
  parseAtainAssetCsv,
  parseAtainImport,
  dedupeImportProductsByCode,
  readExcelProducts,
  prepareProductImport,
  parseMappedProductImport,
  parseProductForm,
  validateProduct,
} from "./products.js";

describe("deriveTag", () => {
  it("forces Agotado when stock is zero", () => {
    expect(deriveTag(0, "En stock")).toBe("Agotado");
  });

  it("keeps Reparacion when stock is zero", () => {
    expect(deriveTag(0, "Reparacion")).toBe("Reparacion");
  });

  it("clears Agotado when stock is available", () => {
    expect(deriveTag(5, "Agotado")).toBe("En stock");
  });
});

describe("matchesFilter", () => {
  const product = { stock: 2, minStock: 5 };

  it("marks low stock using minStock", () => {
    expect(matchesFilter(product, "low")).toBe(true);
    expect(matchesFilter(product, "stock")).toBe(false);
  });

  it("detects empty inventory", () => {
    expect(matchesFilter({ stock: 0, minStock: 3 }, "empty")).toBe(true);
  });
});

describe("category dashboard data", () => {
  const products = [
    { category: "Bebidas" },
    { category: " bebidas " },
    { category: "Despensa" },
    { category: "" },
  ];

  it("groups categories without case or whitespace duplicates and omits empty values", () => {
    expect(computeCategoryBreakdown(products)).toEqual([
      { key: "bebidas", label: "Bebidas", count: 2 },
      { key: "despensa", label: "Despensa", count: 1 },
    ]);
  });

  it("filters by category while keeping all products for the all option", () => {
    expect(matchesCategoryFilter(products[0], "BEBIDAS")).toBe(true);
    expect(matchesCategoryFilter(products[2], "bebidas")).toBe(false);
    expect(matchesCategoryFilter(products[2], "all")).toBe(true);
  });
});

describe("matchesSearch", () => {
  const product = {
    name: "Monitor 4K",
    code: "TC-004",
    category: "Monitores",
    tag: "Reparacion",
    spot: "A1",
    campaign: "PRICELINE1",
    brand: "Dell",
    comments: "Pendiente diagnostico",
  };

  it("finds products by campaign and comments", () => {
    expect(matchesSearch(product, "priceline")).toBe(true);
    expect(matchesSearch(product, "diagnostico")).toBe(true);
    expect(matchesSearch(product, "inexistente")).toBe(false);
  });

  it("does not search Atain-only states and campaigns for general businesses", () => {
    expect(matchesSearch(product, "reparacion", { isAtain: false })).toBe(false);
    expect(matchesSearch(product, "priceline", { isAtain: false })).toBe(false);
    expect(matchesSearch(product, "diagnostico", { isAtain: false })).toBe(true);
  });
});

describe("validateProduct", () => {
  it("rejects invalid stock and price", () => {
    expect(validateProduct({ name: "A", code: "1", category: "X", price: -1, stock: 1, purchasePrice: 0, minStock: 0 }, false)).toBe("Precio invalido");
    expect(validateProduct({ name: "A", code: "1", category: "X", price: 10, stock: -1, purchasePrice: 0, minStock: 0 }, false)).toBe("Stock invalido");
  });

  it("accepts ATAIN products without price input", () => {
    expect(
      validateProduct(
        {
          name: "A",
          code: "1",
          category: "Desktop",
          price: 0,
          stock: 1,
          purchasePrice: 0,
          minStock: 0,
          spot: "A1",
          campaign: "PRICELINE1",
          brand: "Bodega",
        },
        true,
      ),
    ).toBeNull();
  });
});

describe("parseProductForm", () => {
  it("keeps the selected internal state for Atain", () => {
    const form = new FormData();
    form.set("name", "Teclado");
    form.set("code", "TC-001");
    form.set("category", "Perifericos");
    form.set("price", "1000");
    form.set("stock", "0");
    form.set("tag", "Reparacion");
    form.set("comments", "");

    const product = parseProductForm(form, null, true);
    expect(product.tag).toBe("Reparacion");
  });

  it("uses stock-derived status for general companies and ignores internal tags", () => {
    const form = new FormData();
    form.set("name", "Teclado");
    form.set("code", "TC-001");
    form.set("category", "Perifericos");
    form.set("price", "1000");
    form.set("stock", "0");
    form.set("tag", "Campana");
    expect(parseProductForm(form, null, false).tag).toBe("Agotado");
  });

  it("keeps editing code when FormData omits disabled code field", () => {
    const form = new FormData();
    form.set("name", "Mouse Dell");
    form.set("category", "Mouse");
    form.set("spot", "");
    form.set("campaign", "");
    form.set("tag", "En stock");
    form.set("comments", "mancha de pintura");
    form.set("inBodega", "on");

    const product = parseProductForm(
      form,
      { dbId: "abc-123", code: "6545562215", price: 0, tag: "En stock" },
      true,
    );

    expect(product.code).toBe("6545562215");
    expect(product.dbId).toBe("abc-123");
    expect(product.comments).toBe("mancha de pintura");
    expect(product.brand).toBe("Bodega");
  });
});

describe("parseAtainAssetCsv", () => {
  it("parses ATAIN workstation rows with semicolon delimiter", () => {
    const csv = [
      "spot;modelo;serial;hostname;pantalla 1;pantalla 2;headset;mouse;teclado",
      "39;Optiplex 3050 Micro;9PP2WP2;BG1DTRN9PP2WP2;CN0SCREEN1;S/N;S/N;CN0MOUSE1;CN0KEY1",
      "40;ThinkCentre M720q;MJ0BV0T8;BG1DTRNMJ0BV0T8;CN0SCREEN2;;S/N;S/N;CN0KEY2",
    ].join("\n");

    const products = parseAtainAssetCsv(csv, "TRN1");
    expect(products.length).toBeGreaterThan(2);
    expect(products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          spot: "39",
          name: "Optiplex 3050 Micro",
          code: "9PP2WP2",
          category: "Desktop",
          campaign: "TRN1",
        }),
        expect.objectContaining({
          spot: "39",
          name: "Pantalla 1",
          code: "CN0SCREEN1",
          category: "Pantalla",
        }),
        expect.objectContaining({
          spot: "39",
          name: "Mouse",
          code: "CN0MOUSE1",
          category: "Mouse",
        }),
      ]),
    );
  });

  it("detects ATAIN asset CSV headers", () => {
    expect(isAtainAssetCsv("spot,modelo,serial,hostname\n1,PC,ABC,HOST")).toBe(true);
    expect(isAtainAssetCsv("name,code,category,price,stock\nA,1,X,10,1")).toBe(false);
  });

  it("parses UTF-16 CSV exports from Excel on Windows", () => {
    const csv = "spot;modelo;serial;hostname\n39;Optiplex 3050 Micro;9PP2WP2;BG1DTRN9PP2WP2";
    const asciiBytes = Array.from(new TextEncoder().encode(csv));
    const utf16Body = asciiBytes.flatMap((byte) => [byte, 0]);
    const utf16 = new Uint8Array([0xff, 0xfe, ...utf16Body]);
    const text = decodeCsvText(utf16.buffer);

    expect(isAtainAssetCsv(text)).toBe(true);
    expect(parseAtainAssetCsv(text, "TRN1")).toHaveLength(1);
  });

  it("parses ATAIN rows by column position when headers are not detected", () => {
    const csv = [
      "Reporte de activos TRN1",
      "39;Optiplex 3050 Micro;9PP2WP2;BG1DTRN9PP2WP2;CN0SCREEN1;S/N;S/N;CN0MOUSE1;CN0KEY1",
      "40;ThinkCentre M720q;MJ0BV0T8;BG1DTRNMJ0BV0T8;CN0SCREEN2;;S/N;S/N;CN0KEY2",
    ].join("\n");

    expect(parseAtainImport(csv, { campaign: "TRN1" }).products.length).toBeGreaterThan(3);
  });

  it("skips sep= lines from Excel", () => {
    const csv = [
      "sep=;",
      "spot;modelo;serial;hostname;pantalla 1;pantalla 2;headset;mouse;teclado",
      "39;Optiplex 3050 Micro;9PP2WP2;BG1DTRN9PP2WP2;CN0SCREEN1;S/N;S/N;CN0MOUSE1;CN0KEY1",
    ].join("\n");

    expect(parseAtainImport(csv, { campaign: "TRN1" }).products.length).toBeGreaterThan(1);
  });
});

describe("dedupeImportProductsByCode", () => {
  it("assigns unique codes when the same serial appears more than once", () => {
    const base = {
      spot: "39",
      campaign: "BLUELINK",
      category: "Mouse",
      name: "Mouse",
      price: 0,
      stock: 1,
      minStock: 1,
      purchasePrice: 0,
      tag: "Asignado",
    };

    const { products, duplicateCount } = dedupeImportProductsByCode([
      { ...base, code: "ABC123" },
      { ...base, spot: "40", code: "ABC123" },
    ]);

    expect(products).toHaveLength(2);
    expect(products[0].code).toBe("ABC123");
    expect(products[1].code).toBe("40-Mouse-ABC123");
    expect(duplicateCount).toBeGreaterThan(0);
  });
});

describe("matchesAtainAssetFilter", () => {
  it("filters assets by type", () => {
    const desktop = { category: "Desktop" };
    const screen = { category: "Pantalla" };

    expect(matchesAtainAssetFilter(desktop, "all")).toBe(true);
    expect(matchesAtainAssetFilter(desktop, "desktop")).toBe(true);
    expect(matchesAtainAssetFilter(screen, "desktop")).toBe(false);
    expect(matchesAtainAssetFilter(screen, "pantalla")).toBe(true);
  });
});

describe("matchesAtainCampaignFilter", () => {
  it("filters assets by campaign", () => {
    const trn = { campaign: "TRN1" };
    const blue = { campaign: "BLUELINK" };

    expect(matchesAtainCampaignFilter(trn, "all")).toBe(true);
    expect(matchesAtainCampaignFilter(trn, "TRN1")).toBe(true);
    expect(matchesAtainCampaignFilter(blue, "TRN1")).toBe(false);
    expect(matchesAtainCampaignFilter({ brand: "Bodega" }, "Bodega")).toBe(true);
    expect(matchesAtainCampaignFilter({ brand: "Bodega", campaign: "TRN1" }, "TRN1")).toBe(false);
    expect(matchesAtainFilters({ category: "Desktop", campaign: "TRN1" }, "desktop", "TRN1")).toBe(true);
    expect(matchesAtainFilters({ category: "Desktop", campaign: "TRN1" }, "mouse", "TRN1")).toBe(false);
    expect(matchesAtainFilters({ category: "Desktop", brand: "Bodega" }, "all", "Bodega")).toBe(true);
  });
});

describe("parseCsvProducts", () => {
  it("parses quoted commas and skips invalid rows", () => {
    const csv = [
      "name,code,category,price,stock,tag,comments",
      'Teclado,TC-001,Perifericos,1000,2,En stock,"Entrega, pendiente"',
      "Invalido,INV-1,Cat,abc,2,En stock,",
      "Sin stock,NS-1,Cat,1000,-1,En stock,",
    ].join("\n");

    const products = parseCsvProducts(csv);
    expect(products).toHaveLength(1);
    expect(products[0].comments).toBe("Entrega, pendiente");
  });
});

describe("readExcelProducts", () => {
  function workbookBuffer(sheets, bookType = "xlsx") {
    const workbook = XLSX.utils.book_new();
    for (const [name, rows] of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
    return XLSX.write(workbook, { type: "array", bookType });
  }

  it("reads Spanish inventory headers, maps columns, and skips invalid rows", async () => {
    const buffer = workbookBuffer([["Inventario", [
      ["Nombre", "Código", "Categoría", "Precio", "Precio de compra", "Existencias", "Stock mínimo", "Estado", "Marca", "Ubicación", "Campaña", "Comentarios"],
      ["Teclado", "TC-1", "Periféricos", 120, 80, 2, 1, "En stock", "Marca X", "Bodega", "", "Detalle"],
      ["Fila incompleta", "", "", -1, 1],
    ]]]);
    expect((await readExcelProducts(buffer, { businessId: "orus" })).products).toEqual([{
      name: "Teclado", code: "TC-1", category: "Periféricos", price: 120, stock: 2, tag: "En stock", comments: "Detalle",
      minStock: 1, purchasePrice: 80, brand: "Marca X", image: "", spot: "Bodega", campaign: "",
    }]);
  });

  it("returns ATAIN asset workbooks to the campaign-aware CSV parser", async () => {
    const buffer = workbookBuffer([["Activos", [["spot", "modelo", "serial", "hostname"], ["39", "Optiplex", "SER-1", "HOST-1"]]]]);
    const result = await readExcelProducts(buffer, { businessId: "atain" });
    expect(result.atainText).toContain('"spot","modelo","serial","hostname"');
    expect(parseAtainImport(result.atainText, { campaign: "TRN1" }).products).toHaveLength(1);
  });

  it("returns a manual mapping draft when headers are missing", async () => {
    const buffer = workbookBuffer([["Sheet1", [["Producto", "Valor"], ["A", 2]]]]);
    expect((await readExcelProducts(buffer, { businessId: "orus" })).needsMapping).toBe(true);
  });

  it("reads legacy XLS workbooks", async () => {
    const buffer = workbookBuffer([["Inventario", [
      ["Nombre", "Codigo", "Categoria", "Precio", "Stock"],
      ["Mouse", "M-1", "Perifericos", 20, 4],
    ]]], "xls");
    expect((await readExcelProducts(buffer, { businessId: "orus" })).products[0].code).toBe("M-1");
  });

  it("reads the SpreadsheetML XLS format used by Stockly exports", async () => {
    const xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Inventario"><Table><Row><Cell><Data ss:Type="String">Nombre</Data></Cell><Cell><Data ss:Type="String">Código</Data></Cell><Cell><Data ss:Type="String">Categoría</Data></Cell><Cell><Data ss:Type="String">Precio</Data></Cell><Cell><Data ss:Type="String">Stock</Data></Cell></Row><Row><Cell><Data ss:Type="String">Item</Data></Cell><Cell><Data ss:Type="String">I-XML</Data></Cell><Cell><Data ss:Type="String">General</Data></Cell><Cell><Data ss:Type="Number">20</Data></Cell><Cell><Data ss:Type="Number">1</Data></Cell></Row></Table></Worksheet></Workbook>';
    const buffer = new TextEncoder().encode(xml).buffer;
    expect((await prepareProductImport(buffer, { fileName: "stockly.xls" })).headerDetected).toBe(true);
  });

  it("detects headers after title rows and ignores accents and extra spaces", async () => {
    const buffer = workbookBuffer([["Datos", [
      ["Reporte de inventario"],
      ["  Nombre   del producto ", " referencia ", "Precio", " Costo ", "Cantidad", "Stock minimo", "Categoria", "Marca"],
      ["Bolso", "B-1", 125000, 70000, 3, 1, "Accesorios", "Marca A"],
    ]]]);
    const draft = await prepareProductImport(buffer, { fileName: "reporte.xlsx" });
    expect(draft.headerDetected).toBe(true);
    expect(draft.headerRow).toBe(1);
    expect(parseMappedProductImport(draft, draft.mapping).products[0]).toMatchObject({ name: "Bolso", code: "B-1", price: 125000, purchasePrice: 70000, stock: 3, minStock: 1, category: "Accesorios", brand: "Marca A" });
  });

  it("lets the user map headerless columns without assuming name and code positions", async () => {
    const buffer = workbookBuffer([["Sheet1", [
      ["C-9", "Jarron", 45, 2, "Hogar"],
      ["C-10", "Taza", 12, 8, "Cocina"],
    ]]]);
    const draft = await prepareProductImport(buffer, { fileName: "sin-encabezados.xlsx" });
    expect(draft.headerDetected).toBe(false);
    expect(draft.mapping).toEqual({});
    const result = parseMappedProductImport(draft, { code: 0, name: 1, price: 2, stock: 3, category: 4 });
    expect(result.products.map((product) => product.name)).toEqual(["Jarron", "Taza"]);
  });

  it("allows skipping a title row when a headerless table starts later", async () => {
    const buffer = workbookBuffer([["Sheet1", [
      ["Reporte generado por proveedor"],
      ["C-1", "Silla", 45, 2, "Hogar"],
    ]]]);
    const draft = { ...(await prepareProductImport(buffer)), startIndex: 1 };
    const result = parseMappedProductImport(draft, { code: 0, name: 1, price: 2, stock: 3, category: 4 });
    expect(result.products).toHaveLength(1);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts CSV through the same preview and mapping flow", async () => {
    const draft = await prepareProductImport("Producto,Referencia,Precio,Cantidad,Categoria\nLuz,L-1,19,4,Hogar", { fileName: "stock.csv" });
    expect(draft.headerDetected).toBe(true);
    expect(parseMappedProductImport(draft, draft.mapping).products[0].code).toBe("L-1");
  });

  it("parses Colombian peso prices from Excel and CSV without confusing thousands and decimals", async () => {
    const buffer = workbookBuffer([["Inventario", [
      ["Nombre", "Código", "Categoría", "Precio", "Stock"],
      ["Numérico Excel", "P-1", "General", 1099990, 1],
      ["Formato COP", "P-2", "General", "$1.099.990", 1],
      ["Miles con coma", "P-3", "General", "$209,000", 1],
      ["Con decimales", "P-4", "General", "1.099.990,50", 1],
      ["Formato anglosajón", "P-5", "General", "$2,499,000.00", 1],
      ["Código COP", "P-6", "General", "COP 150.000", 1],
    ]]]);
    const excelResult = await readExcelProducts(buffer);
    expect(excelResult.issues).toEqual([]);
    expect(excelResult.products.map((product) => product.price)).toEqual([
      1099990, 1099990, 209000, 1099990.5, 2499000, 150000,
    ]);

    const csv = "Nombre,Código,Categoría,Precio,Stock\nProducto CSV,C-1,General,$1.099.990,1";
    const csvResult = await readExcelProducts(csv, { fileName: "precios.csv" });
    expect(csvResult.issues).toEqual([]);
    expect(csvResult.products[0].price).toBe(1099990);
  });

  it("keeps rejecting blank, nonnumeric, malformed, and negative sale prices", async () => {
    const buffer = workbookBuffer([["Inventario", [
      ["Nombre", "Código", "Categoría", "Precio", "Stock"],
      ["Vacío", "P-1", "General", "", 1],
      ["Texto", "P-2", "General", "sin precio", 1],
      ["Miles mal agrupados", "P-3", "General", "1.09.990", 1],
      ["Negativo", "P-4", "General", "$-1.099.990", 1],
    ]]]);
    const result = await readExcelProducts(buffer);
    expect(result.products).toEqual([]);
    expect(result.issues).toHaveLength(4);
    expect(result.issues.every((issue) => issue.message.includes("precio de venta inválido"))).toBe(true);
  });

  it("defaults absent optional columns and reports invalid or blank rows", async () => {
    const buffer = workbookBuffer([["Inventario", [
      ["Nombre", "SKU", "Precio", "Stock", "Categoría"],
      ["Libro", "L-1", 20, 3, "Lectura"],
      ["Error", "L-2", "no-numero", -1, ""],
      ["", "", "", "", ""],
    ]]]);
    const draft = await prepareProductImport(buffer);
    const result = parseMappedProductImport(draft, draft.mapping);
    expect(result.products[0]).toMatchObject({ purchasePrice: 0, minStock: 3, brand: "" });
    expect(result.products).toHaveLength(1);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].message).toContain("precio de venta inválido");
    expect(result.issues[1].message).toContain("Fila vacia");
  });

  it("flags repeated codes in one file instead of importing duplicate rows", async () => {
    const buffer = workbookBuffer([["Inventario", [
      ["Nombre", "Código", "Precio", "Stock", "Categoría"],
      ["Uno", "D-1", 10, 1, "General"],
      ["Dos", "D-1", 12, 2, "General"],
    ]]]);
    const draft = await prepareProductImport(buffer);
    const result = parseMappedProductImport(draft, draft.mapping);
    expect(result.products).toHaveLength(1);
    expect(result.issues[0].message).toContain("código repetido");
  });

  it("reports invalid workbook data clearly", async () => {
    await expect(prepareProductImport(new Uint8Array([0, 1, 2, 3]))).rejects.toThrow(/No pude leer el archivo/);
  });

  it.each(["orus", "atain", "mara", "vogue", "sabor"])("maps the shared format for %s", async (businessId) => {
    const buffer = workbookBuffer([["Inventario", [["Nombre", "Código", "Precio", "Stock", "Categoría"], ["Item", "I-1", 50, 2, "General"]]]]);
    const draft = await prepareProductImport(buffer, { businessId });
    expect(parseMappedProductImport(draft, draft.mapping).products[0].code).toBe("I-1");
  });
});

describe("mergeProductsByCode", () => {
  it("updates existing products by code", () => {
    const existing = [{ code: "A", name: "Old", stock: 1 }];
    const incoming = [{ code: "A", name: "New", stock: 4 }];
    expect(mergeProductsByCode(existing, incoming)).toEqual([{ code: "A", name: "New", stock: 4 }]);
  });
});

describe("computeStats", () => {
  it("counts low and empty stock using minStock", () => {
    const stats = computeStats([
      { price: 1000, stock: 0, minStock: 3 },
      { price: 500, stock: 2, minStock: 5 },
      { price: 200, stock: 10, minStock: 3 },
    ]);

    expect(stats.total).toBe(3);
    expect(stats.empty).toBe(1);
    expect(stats.low).toBe(1);
    expect(stats.value).toBe(3000);
  });

  it("counts assigned assets for ATAIN", () => {
    const stats = computeStats(
      [
        { price: 0, stock: 1, minStock: 1, tag: "Asignado" },
        { price: 0, stock: 1, minStock: 1, tag: "En stock" },
      ],
      { isAtain: true },
    );

    expect(stats.assigned).toBe(1);
  });
});

describe("computeAtainAssetBreakdown", () => {
  it("counts assets by type", () => {
    const breakdown = computeAtainAssetBreakdown([
      { category: "Desktop" },
      { category: "Desktop" },
      { category: "Mouse" },
    ]);

    expect(breakdown.find((item) => item.key === "desktop")?.count).toBe(2);
    expect(breakdown.find((item) => item.key === "mouse")?.count).toBe(1);
    expect(breakdown.find((item) => item.key === "headset")?.count).toBe(0);
  });
});

describe("countAtainBodegaAssets", () => {
  it("counts only assets marked as bodega", () => {
    expect(
      countAtainBodegaAssets([
        { brand: "Bodega" },
        { brand: "Bodega" },
        { brand: "" },
        { campaign: "TRN1" },
      ]),
    ).toBe(2);
  });
});
