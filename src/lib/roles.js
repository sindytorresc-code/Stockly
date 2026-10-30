const roleLabels = Object.freeze({
  admin: "Administrador",
  manager: "Manager",
  viewer: "Viewer",
});

const canonicalRoleNames = new Set(Object.keys(roleLabels));

export function normalizeCompanyRoleCode(value) {
  const role = String(value || "").trim().toLocaleLowerCase();
  if (["admin", "administrator", "administrador", "adminstrador"].includes(role)) return "admin";
  if (role === "manager") return "manager";
  if (role === "viewer") return "viewer";
  return null;
}

export function companyRoleLabel(value) {
  const code = normalizeCompanyRoleCode(value);
  return code ? roleLabels[code] : "Rol no disponible";
}

export function selectableCompanyRoles(roles = []) {
  const canonical = new Map();
  for (const role of roles) {
    const code = normalizeCompanyRoleCode(role?.name);
    if (!code || !role?.id) continue;
    const existing = canonical.get(code);
    // Prefer the exact stored code over a historical label alias if the
    // database has not yet run the role consolidation migration.
    if (!existing || String(role.name).trim().toLowerCase() === code) {
      canonical.set(code, { ...role, name: code, label: roleLabels[code] });
    }
  }
  return [...canonicalRoleNames]
    .filter((code) => canonical.has(code))
    .map((code) => canonical.get(code));
}
