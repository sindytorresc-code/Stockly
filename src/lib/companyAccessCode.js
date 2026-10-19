export function normalizeCompanyAccessCode(value) {
  const code = String(value || "").replace(/\s/g, "").toUpperCase();
  if (!/^[A-F0-9]{32}$/.test(code)) {
    throw new Error("El código de empresa debe tener 32 caracteres hexadecimales.");
  }
  return code;
}
