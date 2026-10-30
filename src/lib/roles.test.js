import { describe, expect, it } from "vitest";
import { companyRoleLabel, normalizeCompanyRoleCode, selectableCompanyRoles } from "./roles.js";

describe("selectableCompanyRoles", () => {
  it("exposes exactly the three canonical role codes and labels", () => {
    const roles = ["admin", "administrador", "administrator", "encargado", "consulta", "employee", "manager", "viewer"]
      .map((name) => ({ id: name, name }));
    expect(selectableCompanyRoles(roles)).toEqual([
      { id: "admin", name: "admin", label: "Administrador" },
      { id: "manager", name: "manager", label: "Manager" },
      { id: "viewer", name: "viewer", label: "Viewer" },
    ]);
  });

  it("normalizes historical administrator aliases without exposing other old roles", () => {
    expect(normalizeCompanyRoleCode(" Administrador ")).toBe("admin");
    expect(normalizeCompanyRoleCode("administrator")).toBe("admin");
    expect(normalizeCompanyRoleCode("encargado")).toBeNull();
    expect(normalizeCompanyRoleCode("consulta")).toBeNull();
    expect(normalizeCompanyRoleCode("employee")).toBeNull();
  });

  it("uses the requested visible labels", () => {
    expect(["admin", "manager", "viewer"].map(companyRoleLabel)).toEqual([
      "Administrador", "Manager", "Viewer",
    ]);
  });
});
