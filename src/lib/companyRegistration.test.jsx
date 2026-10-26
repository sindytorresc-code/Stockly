import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import SignIn from "../components/SignIn.jsx";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

afterEach(() => vi.unstubAllGlobals());

describe("registro de empresa desde inicio de sesión", () => {
  it("muestra el acceso para agregar empresa debajo del login existente", () => {
    const html = renderToStaticMarkup(<SignIn onRegisterCompany={() => {}} />);
    expect(html).toContain("Continuar con Google");
    expect(html).toContain("Iniciar sesión");
    expect(html).toContain("¿Tu empresa aún no está registrada?");
    expect(html).toContain("Agregar empresa");
  });

  it("persiste el borrador y comienza Google OAuth sin exigir código previo", async () => {
    const storage = new MemoryStorage();
    const assign = vi.fn();
    const historyReplace = vi.fn();
    vi.stubGlobal("sessionStorage", storage);
    const location = { origin: "https://owner.github.io", pathname: "/Stockly/", href: "https://owner.github.io/Stockly/", assign };
    vi.stubGlobal("window", { location, history: { replaceState: historyReplace } });
    vi.stubGlobal("document", { title: "Stockly" });
    vi.stubGlobal("crypto", { getRandomValues: (bytes) => bytes.fill(7), subtle: { digest: async () => new Uint8Array(32).buffer } });
    const fetchMock = vi.fn(async (url) => String(url).includes("stockly-config.json")
      ? ({ ok: true, json: async () => ({ supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "public-key" }) })
      : ({ ok: true, json: async () => ({ access_token: "test-access", refresh_token: "test-refresh", expires_in: 3600 }) }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("btoa", (value) => Buffer.from(value, "binary").toString("base64"));

    vi.resetModules();
    const { registerCompanyWithGoogle, consumePendingCompanyDraft, completeGoogleSignIn } = await import("./supabase.js");
    await registerCompanyWithGoogle({ name: "Acme", type: "Retail", description: "Inventory" });

    expect(new URL(assign.mock.calls[0][0]).searchParams.get("provider")).toBe("google");
    expect(storage.getItem("stockly-oauth-flow")).toBe("create-company");
    expect(storage.getItem("stockly-pending-company-code")).toBeNull();
    location.href = "https://owner.github.io/Stockly/?code=oauth-code";
    expect(await completeGoogleSignIn()).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/rpc/join_company_with_code"))).toBe(false);
    expect(consumePendingCompanyDraft()).toEqual({ name: "Acme", type: "Retail", description: "Inventory", icon: "package", brandColor: "#4f46e5", logoDataUrl: "" });
    expect(consumePendingCompanyDraft()).toBeNull();
  });

  it("rechaza datos incompletos antes de iniciar la autenticación", async () => {
    vi.stubGlobal("sessionStorage", new MemoryStorage());
    vi.resetModules();
    const { registerCompanyWithGoogle } = await import("./supabase.js");
    await expect(registerCompanyWithGoogle({ name: "", type: "Retail" })).rejects.toThrow("Revisa los datos");
  });
});
