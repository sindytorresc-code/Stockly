import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabaseConfig.js", () => ({
  hasSupabaseConfig: true,
  initSupabase: vi.fn(),
  isSupabaseConfigured: () => true,
  requireSupabaseConfig: async () => ({ url: "https://stockly.test", key: "test-publishable-key" }),
}));

import { fetchSupabaseBackupRows } from "./supabase.js";

describe("fetchSupabaseBackupRows", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => { globalThis.fetch = vi.fn(); });
  afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

  it("fetches all rows across pages and scopes every request to the selected company", async () => {
    const total = 1007;
    globalThis.fetch.mockImplementation(async (url, options) => {
      const match = options.headers.Range.match(/^(\d+)-(\d+)$/);
      const start = Number(match[1]);
      const end = Math.min(Number(match[2]), total - 1);
      const rows = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => ({
        id: `row-${start + index}`, client_id: "selected-company",
      }));
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "Content-Range": `${start}-${end}/${total}` },
      });
    });

    const result = await fetchSupabaseBackupRows("inventory_movements", "selected-company");
    expect(result.total).toBe(total);
    expect(result.rows).toHaveLength(total);
    expect(result.rows.at(-1).id).toBe("row-1006");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    for (const [url, options] of globalThis.fetch.mock.calls) {
      expect(url).toContain("/inventory_movements?client_id=eq.selected-company");
      expect(options.headers.Prefer).toBe("count=exact");
      expect(options.headers["Range-Unit"]).toBe("items");
    }
  });

  it("rejects incomplete responses instead of producing a partial backup", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "1" }]), {
        status: 200, headers: { "Content-Range": "0-0/2" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), {
        status: 200, headers: { "Content-Range": "1000-999/2" },
      }));
    await expect(fetchSupabaseBackupRows("products", "shop-a")).rejects.toThrow("incompleta");
  });

  it("only permits the company inventory tables in the backup query", async () => {
    await expect(fetchSupabaseBackupRows("client_memberships", "shop-a")).rejects.toThrow("no forma parte");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
