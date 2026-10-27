-- Idempotently gives canonical administrator role aliases the application's
-- administrator permissions. Memberships remain company-scoped and active
-- membership is still required by private.has_client_permission and RLS.
-- This does not change any RLS policy or grant access to non-members.
begin;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where lower(btrim(r.name)) in ('admin', 'administrator', 'administrador')
on conflict (role_id, permission_id) do nothing;

commit;
