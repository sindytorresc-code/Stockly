import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SignIn from "./SignIn.jsx";

describe("SignIn", () => {
  it("retains the existing email, password, Google, registration and company actions", () => {
    const html = renderToStaticMarkup(<SignIn onSignedIn={() => {}} onRegisterCompany={() => {}} />);

    expect(html).toContain("Stockly");
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain("Continuar con Google");
    expect(html).toContain("Iniciar sesión");
    expect(html).toContain("Crear cuenta personal");
    expect(html).toContain("Agregar empresa");
    expect(html).toContain("stockly-primary");
  });
});
