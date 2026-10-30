import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CompanyRoleSelect from "./CompanyRoleSelect.jsx";

const roles = [
  { id: "role-admin", name: "admin", label: "Administrador" },
  { id: "role-manager", name: "manager", label: "Manager" },
  { id: "role-viewer", name: "viewer", label: "Viewer" },
];

describe("selector de roles de empresa", () => {
  it("renders only the three visible names and preserves canonical role IDs", () => {
    const html = renderToStaticMarkup(<CompanyRoleSelect roles={roles} />);
    expect(html).toContain('value="role-admin">Administrador</option>');
    expect(html).toContain('value="role-manager">Manager</option>');
    expect(html).toContain('value="role-viewer">Viewer</option>');
    expect(html).not.toContain("administrador");
    expect(html).not.toContain("encargado");
    expect(html).not.toContain("employee");
    expect(html).not.toContain("consulta");
  });
});
