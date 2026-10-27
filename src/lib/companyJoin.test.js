import { afterEach, describe, expect, it, vi } from "vitest";
import { completeCompanyJoin } from "./companyJoin.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("flujo para unirse a una empresa", () => {
  it("limpia el formulario y anuncia éxito solo después de confirmar la unión", async () => {
    let confirmJoin;
    const form = { reset: vi.fn() };
    const onSuccess = vi.fn();
    const onJoinCompany = vi.fn(() => new Promise((resolve) => { confirmJoin = resolve; }));

    const pending = completeCompanyJoin({ code: "ABCD", form, onJoinCompany, onSuccess });
    expect(onJoinCompany).toHaveBeenCalledWith("ABCD");
    expect(form.reset).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();

    confirmJoin();
    await pending;
    expect(form.reset).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("preserva el código y no anuncia éxito si Supabase rechaza la unión", async () => {
    const form = { reset: vi.fn() };
    const onSuccess = vi.fn();
    const error = new Error("invalid_company_access_code");

    await expect(completeCompanyJoin({
      code: "ABCD",
      form,
      onJoinCompany: vi.fn().mockRejectedValue(error),
      onSuccess,
    })).rejects.toBe(error);
    expect(form.reset).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("exige un UUID confirmado por la RPC de Supabase", async () => {
    const clientId = "123e4567-e89b-42d3-a456-426614174000";
    const fetchMock = vi.fn(async (url) => String(url).includes("stockly-config.json")
      ? { ok: true, json: async () => ({ supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "public-key" }) }
      : { ok: true, status: 200, text: async () => JSON.stringify(clientId) });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });

    const { joinCompanyWithCode } = await import("./supabase.js");
    await expect(joinCompanyWithCode("abcdef0123456789abcdef0123456789")).resolves.toBe(clientId);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/rpc/join_company_with_code"))).toBe(true);

    fetchMock.mockImplementation(async (url) => String(url).includes("stockly-config.json")
      ? { ok: true, json: async () => ({ supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "public-key" }) }
      : { ok: true, status: 200, text: async () => "null" });
    await expect(joinCompanyWithCode("abcdef0123456789abcdef0123456789"))
      .rejects.toThrow("Supabase no confirmó la empresa");
  });
});
