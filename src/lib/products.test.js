import { describe, expect, it } from "vitest";
import {
  computeStats,
  deriveTag,
  matchesFilter,
  matchesAtainAssetFilter,
  matchesSearch,
  mergeProductsByCode,
  parseCsvProducts,
  decodeCsvText,
  isAtainAssetCsv,
  parseAtainAssetCsv,
  parseAtainImport,
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
        },
        true,
      ),
    ).toBeNull();
  });
});

describe("parseProductForm", () => {
  it("derives tag from stock and user selection", () => {
    const form = new FormData();
    form.set("name", "Teclado");
    form.set("code", "TC-001");
    form.set("category", "Perifericos");
    form.set("price", "1000");
    form.set("stock", "0");
    form.set("tag", "Reparacion");
    form.set("comments", "");

    const product = parseProductForm(form, null, false);
    expect(product.tag).toBe("Reparacion");
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

    expect(parseAtainImport(csv, "TRN1").length).toBeGreaterThan(3);
  });

  it("skips sep= lines from Excel", () => {
    const csv = [
      "sep=;",
      "spot;modelo;serial;hostname;pantalla 1;pantalla 2;headset;mouse;teclado",
      "39;Optiplex 3050 Micro;9PP2WP2;BG1DTRN9PP2WP2;CN0SCREEN1;S/N;S/N;CN0MOUSE1;CN0KEY1",
    ].join("\n");

    expect(parseAtainImport(csv, "TRN1").length).toBeGreaterThan(1);
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
