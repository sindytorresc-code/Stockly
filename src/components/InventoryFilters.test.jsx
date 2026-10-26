import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import InventoryFilters from "./InventoryFilters.jsx";

const theme = {
  panel: "bg-[var(--brand-soft)] border-[color:var(--brand-border)]",
  panelSoft: "bg-white",
  input: "bg-white text-slate-950",
  text: "text-slate-900",
  muted: "text-slate-500",
  accent: "bg-[var(--brand-accent)] text-white",
};

describe("filtros de inventario por empresa", () => {
  it("renders search, stock, and category filters in a shared theme-aware layout", () => {
    const html = renderToStaticMarkup(<InventoryFilters
      theme={theme} query="" onQuery={vi.fn()} filter="all" onFilter={vi.fn()}
      filterOptions={[["all", "Todos"], ["stock", "En stock"], ["low", "Stock bajo"], ["empty", "Agotados"]]}
      categories={[{ key: "makeup", label: "Maquillaje", count: 3 }, { key: "skincare", label: "Cuidado", count: 4 }]}
      categoryFilter="all" onCategoryFilter={vi.fn()}
    />);
    expect(html).toContain("Buscar inventario");
    expect(html).toContain("Existencias");
    expect(html).toContain("Categorías");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("var(--brand-accent)");
    expect(html).toContain("Maquillaje");
    expect(html).toContain("Agotados");
  });

  it("does not require category columns when no category data exists", () => {
    const html = renderToStaticMarkup(<InventoryFilters theme={theme} query="" onQuery={vi.fn()} filter="all" onFilter={vi.fn()} filterOptions={[["all", "Todos"]]} categories={[]} categoryFilter="all" onCategoryFilter={vi.fn()} />);
    expect(html).not.toContain("Categorías");
    expect(html).toContain("Existencias");
  });
});
