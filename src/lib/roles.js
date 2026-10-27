const legacyAdministratorNames = new Set(["admin", "administrator"]);

export function selectableCompanyRoles(roles = []) {
  return roles.filter((role) => !legacyAdministratorNames.has(String(role?.name || "").trim().toLowerCase()));
}
