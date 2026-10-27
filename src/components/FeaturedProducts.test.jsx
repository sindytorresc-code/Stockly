import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { businesses } from "../data/businesses.js";
import FeaturedProducts, { rankFeaturedProducts } from "./FeaturedProducts.jsx";

describe("FeaturedProducts", () => {
  it("ranks only real items with positive stock and price by inventory value", () => {
    const products = [
      { code: "A", name: "Producto A", price: 10, stock: 5, category: "Aseo" },
      { code: "B", name: "Producto B", price: 20, stock: 2, category: "Aseo" },
      { code: "C", name: "Sin stock", price: 900, stock: 0 },
      { code: "D", name: "Sin precio", price: 0, stock: 30 },
    ];

    expect(rankFeaturedProducts(products).map((product) => product.code)).toEqual(["A", "B"]);
  });

  it("renders the ranking criterion, real product details, and an inventory link", () => {
    const markup = renderToStaticMarkup(
      <FeaturedProducts
        products={[{ code: "A-1", name: "Crema hidratante", price: 25000, stock: 8, minStock: 2, category: "Cuidado" }]}
        theme={businesses.find((business) => business.id === "mara").theme}
        onViewAll={vi.fn()}
      />,
    );

    expect(markup).toContain("Productos destacados");
    expect(markup).toContain("precio × existencias");
    expect(markup).toContain("Crema hidratante");
    expect(markup).toContain("Cuidado · 8 unidades");
    expect(markup).toContain("En stock");
    expect(markup).toContain("Ver todos");
  });

  it("explains when no authentic inventory-value candidates are available", () => {
    const markup = renderToStaticMarkup(
      <FeaturedProducts products={[{ code: "X", name: "Sin valor", price: 0, stock: 1 }]} theme={businesses[0].theme} />,
    );
    expect(markup).toContain("No hay artículos con existencias y precio registrados");
  });
});
