import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ClientSelector from "./ClientSelector.jsx";

const authorizedBusiness = {
  id: "mara",
  clientId: "02c6a402-48d4-4fd0-87fb-0679a706c00c",
  name: "Mara Makeup",
  type: "Belleza",
  description: "Empresa con membresía activa",
  icon: "package",
  theme: {},
};

describe("selector de empresas autorizadas", () => {
  it("muestra cualquier empresa recibida por la consulta RLS de membresías autorizadas", () => {
    const html = renderToStaticMarkup(<ClientSelector businesses={[authorizedBusiness]} onSelect={() => {}} />);
    expect(html).toContain("Mara Makeup");
    expect(html).toContain(authorizedBusiness.description);
    expect(html).toContain("Selecciona una empresa");
    expect(html).toContain("Abrir empresa");
    expect(html).not.toContain("bg-gradient-to-br");
  });

  it("no muestra empresas que Supabase no devolvió como accesibles", () => {
    const html = renderToStaticMarkup(<ClientSelector businesses={[]} onSelect={() => {}} />);
    expect(html).not.toContain("Mara Makeup");
    expect(html).not.toContain("Empresa sin membresía");
  });

  it("conserva las acciones de cerrar sesión y administrar códigos cuando están autorizadas", () => {
    const html = renderToStaticMarkup(
      <ClientSelector businesses={[]} onSelect={() => {}} onSignOut={() => {}} onManageAccessCodes={() => {}} />,
    );
    expect(html).toContain("Cerrar sesión");
    expect(html).toContain("Administrar llaves de acceso");
  });
});
