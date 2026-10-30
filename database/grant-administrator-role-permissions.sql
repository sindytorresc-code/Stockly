-- Idempotently gives the canonical admin role its full permission set.
-- Active, company-scoped membership is still required by RLS.
begin;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'admin'
on conflict (role_id, permission_id) do nothing;

commit;
