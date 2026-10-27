-- Promote only the two manually verified sole-member companies that were left
-- as employee by the older join RPC. This fails closed if either company now
-- has another membership, a different role, or any active administrator.
begin;
do $$
declare
  canonical_admin uuid;
  employee_role uuid;
  eligible_company_count integer;
  changed_memberships integer;
  target_ids uuid[] := array[
    'e7983930-d765-4edb-a22d-60403cbc1ad0'::uuid, -- Estilo Vogue (vogue)
    '5b454043-bfc6-45bb-af91-449ef8671ff3'::uuid  -- Sabor Fresco (sabor)
  ];
  target_id uuid;
begin
  select id into canonical_admin from public.roles where name = 'administrador' and system_role;
  select id into employee_role from public.roles where name = 'employee' and system_role;
  if canonical_admin is null or employee_role is null then
    raise exception 'required_system_roles_not_configured';
  end if;

  -- Match the join RPC's per-company lock so membership counts cannot change
  -- between eligibility checks and the role update.
  foreach target_id in array target_ids loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_id::text, 0));
  end loop;

  select count(*) into eligible_company_count
  from unnest(target_ids) target(client_id)
  join public.clients company on company.id = target.client_id
  join public.client_memberships membership on membership.client_id = company.id
  where membership.active
    and membership.role_id = employee_role
    and (select count(*) from public.client_memberships all_memberships where all_memberships.client_id = company.id) = 1
    and (select count(*) from public.client_memberships active_members where active_members.client_id = company.id and active_members.active) = 1
    and not exists (
      select 1 from public.client_memberships active_admin
      join public.roles role_row on role_row.id = active_admin.role_id
      where active_admin.client_id = company.id and active_admin.active
        and lower(btrim(role_row.name)) in ('admin', 'administrator', 'administrador')
    );

  if eligible_company_count <> cardinality(target_ids) then
    raise exception 'sole_member_repair_aborted_expected_%_eligible_companies_found_%', cardinality(target_ids), eligible_company_count;
  end if;

  update public.client_memberships membership
  set role_id = canonical_admin
  where membership.client_id = any(target_ids)
    and membership.active
    and membership.role_id = employee_role
    and (select count(*) from public.client_memberships all_memberships where all_memberships.client_id = membership.client_id) = 1
    and (select count(*) from public.client_memberships active_members where active_members.client_id = membership.client_id and active_members.active) = 1
    and not exists (
      select 1 from public.client_memberships active_admin
      join public.roles role_row on role_row.id = active_admin.role_id
      where active_admin.client_id = membership.client_id and active_admin.active
        and lower(btrim(role_row.name)) in ('admin', 'administrator', 'administrador')
    );
  get diagnostics changed_memberships = row_count;
  if changed_memberships <> cardinality(target_ids) then
    raise exception 'sole_member_repair_aborted_expected_%_updated_%', cardinality(target_ids), changed_memberships;
  end if;
end $$;
commit;
