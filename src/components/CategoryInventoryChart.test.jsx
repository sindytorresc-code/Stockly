import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { businesses } from "../data/businesses.js";
import CategoryInventoryChart from "./CategoryInventoryChart.jsx";

describe("CategoryInventoryChart", () => {
  it("shows the category total, category counts, and interactive filter state", () => {
    const markup = renderToStaticMarkup(
      <CategoryInventoryChart
        products={[{ category: "Bebidas" }, { category: "Bebidas" }, { category: "Despensa" }]}
        theme={businesses.find((business) => business.id === "sabor").theme}
        categoryFilter="bebidas"
        onCategoryFilter={() => {}}
      />,
    );

    expect(markup).toContain("Distribución de 3 productos por categoría");
    expect(markup).toContain("Bebidas");
    expect(markup).toContain("2");
    expect(markup).toContain('aria-pressed="true"');
  });

  it.each(["atain", "mara", "vogue", "sabor"])("renders with the configured %s brand colors", (businessId) => {
    const theme = businesses.find((business) => business.id === businessId).theme;
    const markup = renderToStaticMarkup(
      <CategoryInventoryChart products={[{ category: "General" }]} theme={theme} categoryFilter="all" onCategoryFilter={() => {}} />,
    );
    expect(markup).toContain(theme.panel.split(" ")[0]);
    expect(markup).toContain(theme.accent.split(" ")[0]);
    expect(markup).toContain(theme.softAccent.split(" ")[0]);
  });
});
