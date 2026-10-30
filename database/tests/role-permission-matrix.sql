-- Read-only assertion for the canonical role catalog, permission matrix and
-- the RLS checks that consume those permissions. It performs no data writes.
do $$
declare
  actual_count integer;
begin
  if (select count(*) from public.roles) <> 3
    or exists (select 1 from public.roles where name not in ('admin','manager','viewer') or not system_role) then
    raise exception 'role_catalog_must_contain_only_admin_manager_viewer';
  end if;

  if (select count(*) from public.permissions) <> 7
    or exists (select 1 from public.permissions where code not in (
      'company.read','company.manage','inventory.read','inventory.write',
      'movements.read','users.manage','exports.create'
    )) then
    raise exception 'permission_catalog_must_match_stockly_matrix';
  end if;

  with expected(role_name, permission_code) as (
    values
      ('admin','company.read'), ('admin','company.manage'), ('admin','inventory.read'),
      ('admin','inventory.write'), ('admin','movements.read'), ('admin','users.manage'), ('admin','exports.create'),
      ('manager','company.read'), ('manager','inventory.read'), ('manager','inventory.write'),
      ('manager','movements.read'), ('manager','exports.create'),
      ('viewer','company.read'), ('viewer','inventory.read'), ('viewer','movements.read'), ('viewer','exports.create')
  ), actual(role_name, permission_code) as (
    select r.name, p.code
    from public.role_permissions rp
    join public.roles r on r.id=rp.role_id
    join public.permissions p on p.id=rp.permission_id
  )
  select count(*) into actual_count from (
    (select * from expected except select * from actual)
    union all
    (select * from actual except select * from expected)
  ) difference;
  if actual_count <> 0 then raise exception 'role_permission_matrix_mismatch'; end if;

  if not exists (select 1 from pg_class where oid='public.products'::regclass and relrowsecurity)
    or not exists (select 1 from pg_class where oid='public.clients'::regclass and relrowsecurity)
    or not exists (select 1 from pg_class where oid='public.client_memberships'::regclass and relrowsecurity) then
    raise exception 'required_rls_was_disabled';
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products'
      and policyname='products_member_insert' and with_check like '%inventory.write%')
    or not exists (select 1 from pg_policies where schemaname='public' and tablename='products'
      and policyname='products_member_update' and qual like '%inventory.write%' and with_check like '%inventory.write%')
    or not exists (select 1 from pg_policies where schemaname='public' and tablename='clients'
      and policyname='clients_manager_update' and qual like '%company.manage%' and with_check like '%company.manage%')
    or not exists (select 1 from pg_policies where schemaname='public' and tablename='client_memberships'
      and policyname='memberships_admin_insert' and with_check like '%users.manage%') then
    raise exception 'role_based_rls_policies_missing_or_changed';
  end if;
end $$;
