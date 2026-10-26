import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ProductDrawer from "./ProductDrawer.jsx";

const theme = {
  panel: "", panelSoft: "", text: "", muted: "", input: "", formBorder: "", accent: "", formAccent: "",
};

function renderDrawer(businessId, product = null) {
  return renderToStaticMarkup(
    <ProductDrawer business={{ id: businessId }} theme={theme} product={product} onClose={() => {}} onSubmit={() => {}} />,
  );
}

describe("ProductDrawer company-specific fields", () => {
  it("shows the internal state and all technology states for Atain create and edit", () => {
    for (const product of [null, { name: "Laptop", code: "A-1", category: "Desktop", tag: "Asignado" }]) {
      const html = renderDrawer("atain", product);
      expect(html).toContain("Estado interno");
      expect(html).toContain("Campana");
      expect(html).toContain("Reparacion");
      expect(html).toContain("Agotado");
    }
  });

  it.each(["orus", "mara", "vogue", "sabor"])("hides the internal state for %s create and edit", (businessId) => {
    for (const product of [null, { name: "Producto", code: "P-1", category: "General", tag: "Campana" }]) {
      const html = renderDrawer(businessId, product);
      expect(html).not.toContain("Estado interno");
      expect(html).not.toContain("Campana</option>");
      expect(html).not.toContain("Asignado</option>");
      expect(html).not.toContain("Reparacion</option>");
      expect(html).toContain("Precio de compra");
      expect(html).toContain("Stock Min.");
    }
  });
});
