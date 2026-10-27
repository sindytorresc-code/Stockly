-- Idempotently gives the canonical administrator role full permissions and
-- the optional Encargado role the read/export permissions it needs. Active,
-- company-scoped membership is still required by RLS.
begin;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where lower(btrim(r.name)) = 'administrador'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.code in ('company.read', 'inventory.read', 'movements.read', 'exports.create')
where lower(btrim(r.name)) = 'encargado'
on conflict (role_id, permission_id) do nothing;

commit;
