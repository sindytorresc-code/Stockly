import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import InventoryDashboard from "./InventoryDashboard.jsx";
import { businesses } from "../data/businesses.js";

function renderDashboard(business) {
  return renderToStaticMarkup(
    <InventoryDashboard
      business={business}
      theme={business.theme}
      stats={{ total: 0, value: 0, low: 0, empty: 0 }}
      query=""
      filter="all"
      campaignFilter="all"
      categoryFilter="all"
      products={[]}
      isLoadingProducts={false}
      dataSource="Supabase"
      onBack={vi.fn()}
      onQuery={vi.fn()}
      onFilter={vi.fn()}
      onCampaignFilter={vi.fn()}
      onCategoryFilter={vi.fn()}
      onAdd={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onImport={vi.fn()}
      onToggleHistory={vi.fn()}
      onManageAccess={vi.fn()}
      onManageBranding={vi.fn()}
      onSignOut={vi.fn()}
      onExport={vi.fn()}
    />,
  );
}

describe("InventoryDashboard theme surfaces", () => {
  it("uses a dark header and raised action surfaces for AT AIN", () => {
    const html = renderDashboard(businesses.find((business) => business.id === "atain"));

    expect(html).toContain("bg-slate-900 border-slate-800 text-slate-50");
    expect(html).toContain("bg-slate-800 border-slate-700 text-slate-50");
    expect(html).toContain("ATAIN");
    expect(html).toContain("Agregar activo");
    expect(html).toContain("Borrar todo");
    expect(html).toContain('aria-label="Buscar en el inventario"');
    expect(html).toContain('aria-label="Acciones del inventario"');
    expect(html).toContain('aria-label="Navegación del inventario"');
    expect(html).toContain('aria-label="Abrir menú"');
    expect(html).toContain("> Inventario</button>");
    expect(html).toContain("Tipos de activos");
    expect(html).toContain("Activos destacados");
    expect(html).toContain("Usuarios y roles");
    expect(html).toContain("Personalizar marca");
  });

  it("keeps the white header and surfaces used by the light business themes", () => {
    const html = renderDashboard(businesses.find((business) => business.id === "sabor"));

    expect(html).toContain("bg-white border-slate-200 text-stone-950");
    expect(html).toContain("Agregar producto");
    expect(html).toContain("Productos destacados");
    expect(html).toContain("Categorías");
    expect(html).toContain("Productos registrados");
    expect(html).not.toContain("bg-slate-900 border-slate-800");
  });

  it("keeps dashboards responsive and uses the selected tenant accent on neutral stat cards", () => {
    const business = businesses.find((item) => item.id === "mara");
    const html = renderDashboard(business);

    expect(html).toContain("lg:grid-cols-[250px_minmax(0,1fr)]");
    expect(html).toContain("xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.9fr)]");
    expect(html).toContain("bg-white border-pink-200");
    expect(html).toContain("bg-[var(--brand-accent,#475569)]");
  });
});
