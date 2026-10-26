import { describe, expect, it } from "vitest";
import { businessThemeStyle, genericBusinessTheme, isValidHexColor, resolveBusinessTheme, themeForBusinessType, validateBrandLogo } from "./businessTheme.js";
import { businesses } from "../data/businesses.js";

describe("resolveBusinessTheme", () => {
  it("uses the configured theme values over the default theme", () => {
    expect(resolveBusinessTheme({ accent: "text-blue-600", panel: "bg-slate-900" }, { accent: "text-pink-600" })).toEqual({
      accent: "text-pink-600", panel: "bg-slate-900",
    });
  });

  it("falls back safely when a new company has no saved theme", () => {
    expect(resolveBusinessTheme({ accent: "bg-green-600" }, {})).toEqual({ accent: "bg-green-600" });
    expect(resolveBusinessTheme({ accent: "bg-green-600" }, null)).toEqual({ accent: "bg-green-600" });
  });

  it("selects the existing brand theme by business type without matching company names", () => {
    expect(themeForBusinessType("cosmeticos", businesses, genericBusinessTheme)).toBe(businesses.find((item) => item.id === "mara").theme);
    expect(themeForBusinessType("restaurante", businesses, genericBusinessTheme)).toBe(genericBusinessTheme);
  });

  it("applies a persisted custom brand color to real theme tokens", () => {
    const theme = resolveBusinessTheme(genericBusinessTheme, { brandColor: "#DB2777" });
    expect(theme.brandColor).toBe("#db2777");
    expect(theme.header).toContain("--brand-accent");
    expect(theme.accent).toContain("--brand-accent");
    expect(theme.panel).toContain("--brand-soft");
    expect(businessThemeStyle(theme)["--brand-accent"]).toBe("#db2777");
  });

  it("preserves a company's current visual theme until a custom brand color is chosen", () => {
    const original = { header: "from-blue-700 to-slate-900", accent: "bg-blue-700" };
    expect(resolveBusinessTheme(original, { logoDataUrl: "data:image/png;base64,AA==" })).toEqual({ ...original, logoDataUrl: "data:image/png;base64,AA==" });
  });

  it("hydrates legacy palette names such as Mara's pink and preserves Atain's dark surfaces", () => {
    const mara = resolveBusinessTheme(businesses.find((business) => business.id === "mara").theme, { mode: "light", accent: "pink" });
    const atain = resolveBusinessTheme(businesses.find((business) => business.id === "atain").theme, { mode: "dark", accent: "blue", brandColor: "#2563eb" });
    expect(mara.brandColor).toBe("#db2777");
    expect(mara.accent).toContain("--brand-accent");
    expect(atain.appBg).toBe("bg-slate-950");
    expect(atain.panel).toContain("bg-slate-900");
    expect(atain.panelSoft).toContain("bg-slate-800");
    expect(atain.text).toBe("text-slate-50");
  });
});

describe("validación de marca", () => {
  it("accepts only six-digit HEX brand colors", () => {
    expect(isValidHexColor("#DB2777")).toBe(true);
    expect(isValidHexColor("#d27")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
  });

  it("allows small raster logos and rejects unsupported or oversized files", () => {
    expect(validateBrandLogo({ type: "image/png", size: 1000 })).toBe("");
    expect(validateBrandLogo({ type: "image/svg+xml", size: 1000 })).toContain("PNG");
    expect(validateBrandLogo({ type: "image/jpeg", size: 251 * 1024 })).toContain("250 KB");
  });
});
