import { describe, expect, it } from "vitest";
import { deactivateMembershipRequest, membershipGrantsPermission, membershipRevocationResult } from "./clientMembership.js";

describe("deactivateMembershipRequest", () => {
  it("only deactivates the active membership scoped to the selected company and user", () => {
    const request = deactivateMembershipRequest("client one", "user-one");
    const params = new URLSearchParams(request.path.split("?")[1]);
    expect(request.path).toMatch(/^\/client_memberships\?/);
    expect(params.get("client_id")).toBe("eq.client one");
    expect(params.get("user_id")).toBe("eq.user-one");
    expect(params.get("active")).toBe("eq.true");
    expect(request.options.method).toBe("PATCH");
    expect(JSON.parse(request.options.body)).toEqual({ active: false });
    expect(request.options.headers.Prefer).toBe("return=representation");
  });

  it("does not report success when RLS hides the row or no active membership was changed", () => {
    expect(membershipRevocationResult([])).toMatchObject({ ok: false });
    expect(membershipRevocationResult(null)).toMatchObject({ ok: false });
    expect(membershipRevocationResult([{ active: false }])).toMatchObject({ ok: true });
  });

  it("only exposes user management for an active membership with that role permission", () => {
    const activeAdmin = { role_id: "admin-role", active: true };
    const permissions = [{ role_id: "admin-role", permission_id: "users-manage" }];
    expect(membershipGrantsPermission(activeAdmin, "users-manage", permissions)).toBe(true);
    expect(membershipGrantsPermission({ ...activeAdmin, active: false }, "users-manage", permissions)).toBe(false);
    expect(membershipGrantsPermission({ ...activeAdmin, role_id: "viewer-role" }, "users-manage", permissions)).toBe(false);
  });

  it("requires company.manage for branding and denies inactive or non-admin role grants", () => {
    const admin = { role_id: "admin-role", active: true };
    const manager = { role_id: "manager-role", active: true };
    const employee = { role_id: "employee-role", active: true };
    const grants = [{ role_id: "admin-role", permission_id: "company-manage" }];
    expect(membershipGrantsPermission(admin, "company-manage", grants)).toBe(true);
    expect(membershipGrantsPermission(manager, "company-manage", grants)).toBe(false);
    expect(membershipGrantsPermission(employee, "company-manage", grants)).toBe(false);
    expect(membershipGrantsPermission({ ...admin, active: false }, "company-manage", grants)).toBe(false);
  });
});
