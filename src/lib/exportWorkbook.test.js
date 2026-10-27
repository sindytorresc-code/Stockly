import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createBusinessWorkbook } from "./exportWorkbook.js";

describe("createBusinessWorkbook", () => {
  it("creates a real XLSX with the full product schema and company scoped sheets", () => {
    const company = { name: "Mara Makeup", clientId: "company-mara", type: "Belleza", description: "Inventario" };
    const products = [
      { id: "p1", client_id: "company-mara", name: "Producto 1", code: "M-1", category: "Labios", price: 1099990, purchase_price: 800000, stock: 3, min_stock: 2, status: "Activo", brand: "Marca", spot: "Estante A", campaign: "", comments: "Nota", image_url: "https://example.test/a.png", created_at: "2026-01-01", updated_at: "2026-01-02" },
      { id: "p2", client_id: "company-mara", name: "Producto 2", code: "M-2", category: "Labios", price: 209000, purchase_price: 150000, stock: 1, min_stock: 2, status: "Activo" },
    ];
    const workbook = createBusinessWorkbook(company, products, {
      exportedAt: new Date("2026-01-03T00:00:00Z"),
      categories: [{ id: "cat-1", client_id: "company-mara", name: "Labios", description: "" }],
      movements: [{ id: "move-1", client_id: "company-mara", product_id: "p1", actor_id: "user-1", created_at: "2026-01-02", movement_type: "entrada", product_name: "Producto 1", product_code: "M-1", quantity: 3, notes: "" }],
    });
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const reopened = XLSX.read(bytes, { type: "array" });
    expect(reopened.SheetNames).toEqual(["Resumen", "Productos", "Categorías", "Movimientos"]);
    const rows = XLSX.utils.sheet_to_json(reopened.Sheets.Productos, { header: 1 });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("Precio de compra");
    expect(rows[1][0]).toBe("p1");
    expect(rows[1][1]).toBe("company-mara");
    expect(rows[1][5]).toBe(1099990);
    expect(XLSX.utils.sheet_to_json(reopened.Sheets.Categorías, { header: 1 })[1][4]).toBe(2);
    expect(XLSX.utils.sheet_to_json(reopened.Sheets.Movimientos, { header: 1 })[1][1]).toBe("company-mara");
  });

  it("omits movements if the active role does not have permission", () => {
    const workbook = createBusinessWorkbook({ name: "ORUS", clientId: "orus" }, [{ name: "Item", stock: 1 }], { movements: null });
    expect(workbook.SheetNames).not.toContain("Movimientos");
    expect(workbook.Sheets.Resumen.B11.v).toBe("Sin permiso de lectura");
  });

  it("keeps the export scoped to any of Stockly's five companies", () => {
    const companies = [
      ["Atain", "atain"], ["ORUS", "orus"], ["Mara Makeup", "mara"],
      ["Estilo Vogue", "estilo-vogue"], ["Sabor Fresco", "sabor-fresco"],
    ];
    for (const [name, clientId] of companies) {
      const workbook = createBusinessWorkbook({ name, clientId }, [{ id: `${clientId}-product`, client_id: clientId, name: "Producto", stock: 1 }]);
      const productRows = XLSX.utils.sheet_to_json(workbook.Sheets.Productos, { header: 1 });
      expect(productRows[1][1]).toBe(clientId);
      expect(workbook.Sheets.Resumen.B3.v).toBe(clientId);
    }
  });
});
