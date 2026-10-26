import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import BrandingEditor from "./BrandingEditor.jsx";

describe("editor de identidad visual", () => {
  it("muestra paleta estándar, color HEX, selección de icono, logo y vista previa", () => {
    const html = renderToStaticMarkup(
      <BrandingEditor value={{ brandColor: "#db2777", icon: "sparkles", logoDataUrl: "" }} onChange={() => {}} error="" onError={() => {}} />,
    );
    expect(html).toContain("Más colores…");
    expect(html).toContain("Color HEX");
    expect(html).toContain("Icono sparkles");
    expect(html).toContain("Subir PNG, JPG o WebP");
    expect(html).toContain("Vista previa");
  });

  it("anuncia errores de color con una región accesible", () => {
    const html = renderToStaticMarkup(
      <BrandingEditor value={{ brandColor: "", icon: "package", logoDataUrl: "" }} onChange={vi.fn()} error="HEX inválido" onError={vi.fn()} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("HEX inválido");
  });
});
