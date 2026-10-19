import { describe, expect, it } from "vitest";
import { normalizeCompanyAccessCode } from "./companyAccessCode.js";

describe("normalizeCompanyAccessCode", () => {
  it("normalizes generated codes without changing their value", () => {
    expect(normalizeCompanyAccessCode(" aBcD1234 ef567890 12345678 90abcdef "))
      .toBe("ABCD1234EF5678901234567890ABCDEF");
  });

  it("rejects invalid or short codes before requesting company membership", () => {
    expect(() => normalizeCompanyAccessCode("no-es-un-codigo"))
      .toThrow("El código de empresa debe tener 32 caracteres hexadecimales.");
  });
});
