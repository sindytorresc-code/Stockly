import { describe, expect, it } from "vitest";
import {
  computeStats,
  deriveTag,
  matchesFilter,
  matchesSearch,
  mergeProductsByCode,
  parseCsvProducts,
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
          category: "X",
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
});
