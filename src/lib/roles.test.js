import { describe, expect, it } from "vitest";
import { selectableCompanyRoles } from "./roles.js";

describe("selectableCompanyRoles", () => {
  it("shows the official administrator role once and preserves unrelated roles", () => {
    const roles = ["admin", "administrador", "administrator", "encargado", "consulta", "employee", "manager", "viewer"]
      .map((name) => ({ id: name, name }));
    expect(selectableCompanyRoles(roles).map((role) => role.name)).toEqual([
      "administrador", "encargado", "consulta", "employee", "manager", "viewer",
    ]);
  });
});
