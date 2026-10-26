import { describe, expect, it } from "vitest";
import { genericBusinessTheme, resolveBusinessTheme, themeForBusinessType } from "./businessTheme.js";
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
});
