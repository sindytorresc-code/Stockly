export function deactivateMembershipRequest(clientId, userId) {
  const params = new URLSearchParams({
    client_id: `eq.${clientId}`,
    user_id: `eq.${userId}`,
    active: "eq.true",
    select: "client_id,user_id,active",
  });

  return {
    path: `/client_memberships?${params.toString()}`,
    options: {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ active: false }),
    },
  };
}

export function membershipRevocationResult(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "No se retiró el acceso. Puede que ya estuviera inactivo o no tengas permiso para administrarlo." };
  }
  return { ok: true, message: "Acceso retirado para esta empresa." };
}

export function membershipGrantsPermission(membership, permissionId, rolePermissions) {
  if (!membership?.active || !membership.role_id || !permissionId) return false;
  return rolePermissions.some(
    (entry) => entry.role_id === membership.role_id && entry.permission_id === permissionId,
  );
}
