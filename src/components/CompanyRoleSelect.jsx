import { companyRoleLabel } from "../lib/roles.js";

export default function CompanyRoleSelect({ roles, defaultValue }) {
  return (
    <label className="text-sm font-bold">
      Rol
      <select name="roleId" required defaultValue={defaultValue} className="mt-1 h-10 w-full rounded border px-2 font-normal">
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.label || companyRoleLabel(role.name)}
          </option>
        ))}
      </select>
    </label>
  );
}
