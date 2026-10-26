import { afterEach, describe, expect, it, vi } from "vitest";
import { businessThemeStyle, resolveBusinessTheme, genericBusinessTheme } from "./businessTheme.js";

vi.mock("./supabaseConfig.js", () => ({
  hasSupabaseConfig: vi.fn(async () => true),
  initSupabase: vi.fn(async () => true),
  isSupabaseConfigured: vi.fn(async () => true),
  requireSupabaseConfig: vi.fn(async () => ({ url: "https://stockly.test", key: "anon-key" })),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("persistencia de identidad visual de empresa", () => {
  it("crea la empresa y guarda después su color e icono con la membresía recién creada", async () => {
    const calls = [];
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/rpc/create_company")) return new Response("{}", { status: 200 });
      if (options.method === "PATCH") return new Response(JSON.stringify([{ id: "company-id", icon: "leaf", theme: JSON.parse(options.body).theme }]), { status: 200 });
      return new Response(JSON.stringify([{ id: "company-id", slug: "acme" }]), { status: 200 });
    }));
    const { createSupabaseBusiness } = await import("./supabase.js");

    await createSupabaseBusiness({ id: "acme", name: "Acme", type: "Retail", description: "", icon: "leaf", brandConfig: { brandColor: "#db2777", logoDataUrl: "" } });

    const patch = calls.find(({ options }) => options.method === "PATCH");
    expect(calls[0].url).toContain("/rpc/create_company");
    expect(patch.url).toContain("/clients?id=eq.company-id");
    expect(JSON.parse(patch.options.body)).toEqual({ icon: "leaf", theme: { brandColor: "#db2777", logoDataUrl: "" } });
  });

  it("guarda la configuración por id de empresa y propaga el rechazo RLS del servidor", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "company-a" }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "new row violates row-level security policy" }), { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const { updateSupabaseBusinessBranding } = await import("./supabase.js");

    await updateSupabaseBusinessBranding("company-a", { icon: "heart", theme: { brandColor: "#15803d", logoDataUrl: "" } });
    await expect(updateSupabaseBusinessBranding("company-b", { icon: "package", theme: { brandColor: "#15803d", logoDataUrl: "" } })).rejects.toThrow("row-level security policy");

    expect(String(fetchMock.mock.calls[0][0])).toContain("/clients?id=eq.company-a");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ icon: "heart", theme: { brandColor: "#15803d", logoDataUrl: "" } });
  });

  it("rejects invalid HEX colors and SVG or oversized logos before any request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { updateSupabaseBusinessBranding } = await import("./supabase.js");

    await expect(updateSupabaseBusinessBranding("company-a", { icon: "package", theme: { brandColor: "magenta" } })).rejects.toThrow("HEX");
    await expect(updateSupabaseBusinessBranding("company-a", { icon: "package", theme: { brandColor: "#db2777", logoDataUrl: `data:image/svg+xml;base64,${"A".repeat(80)}` } })).rejects.toThrow("PNG");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates only the visible company name, icon, and theme without sending a slug", async () => {
    const fetchMock = vi.fn(async (_url, options) => new Response(JSON.stringify([{ id: "mara-id", slug: "mara", name: "Mara Makeup Studio" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { updateSupabaseBusinessBranding } = await import("./supabase.js");

    const result = await updateSupabaseBusinessBranding("mara-id", { name: "  Mara Makeup Studio  ", icon: "sparkles", theme: { brandColor: "#DB2777" } });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: "Mara Makeup Studio", icon: "sparkles", theme: { brandColor: "#db2777" } });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("slug");
    expect(result.name).toBe("Mara Makeup Studio");
    await expect(updateSupabaseBusinessBranding("mara-id", { name: "   ", icon: "sparkles", theme: {} })).rejects.toThrow("nombre de empresa");
  });

  it("reads access-code status through the company-scoped RPC without requesting stored hashes", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ active: true, everGenerated: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchCompanyAccessCodeStatus } = await import("./supabase.js");
    await expect(fetchCompanyAccessCodeStatus("company-a")).resolves.toEqual({ active: true, everGenerated: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/rpc/company_access_code_status");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("company_access_codes?");
  });

  it("restores each company's persisted theme after reloading and switches themes by company data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([
      { id: "a", slug: "rosa", name: "Rosa", icon: "sparkles", theme: { brandColor: "#db2777", logoDataUrl: "" } },
      { id: "b", slug: "verde", name: "Verde", icon: "leaf", theme: { brandColor: "#15803d", logoDataUrl: "" } },
    ]), { status: 200 })));
    const { fetchSupabaseClients } = await import("./supabase.js");

    const restored = await fetchSupabaseClients();
    const rosaTheme = resolveBusinessTheme(genericBusinessTheme, restored[0].theme);
    const verdeTheme = resolveBusinessTheme(genericBusinessTheme, restored[1].theme);

    expect(restored.map((company) => company.icon)).toEqual(["sparkles", "leaf"]);
    expect(rosaTheme.brandColor).toBe("#db2777");
    expect(verdeTheme.brandColor).toBe("#15803d");
    expect(businessThemeStyle(rosaTheme)["--brand-accent"]).not.toBe(businessThemeStyle(verdeTheme)["--brand-accent"]);
  });
});
