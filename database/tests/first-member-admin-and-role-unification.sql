-- Integration check for first code joins and role alias consolidation.
-- Run on a development database with at least two auth.users; all probe rows
-- are rolled back at the end.
begin;
do $$
declare
  probe_client uuid;
  raw_code text := replace(gen_random_uuid()::text, '-', '');
  first_user uuid;
  second_user uuid;
  assigned_role text;
begin
  select id into first_user from auth.users order by created_at asc limit 1;
  select id into second_user from auth.users where id <> first_user order by created_at asc limit 1;
  if first_user is null or second_user is null then
    raise exception 'test_requires_two_auth_users';
  end if;

  if position('pg_advisory_xact_lock' in pg_get_functiondef('private.join_company_with_code(text)'::regprocedure)) = 0 then
    raise exception 'first_join_lock_missing';
  end if;
  if exists (
    select 1 from public.client_memberships membership
    join public.roles legacy on legacy.id = membership.role_id
    where lower(btrim(legacy.name)) in ('admin', 'administrator')
  ) then
    raise exception 'legacy_admin_memberships_not_migrated';
  end if;
  if not exists (select 1 from public.roles where name = 'administrador' and system_role) then
    raise exception 'canonical_administrator_role_missing';
  end if;
  if exists (select 1 from public.roles where lower(btrim(name)) in ('admin', 'administrator') and system_role) then
    raise exception 'legacy_admin_role_still_assignable';
  end if;

  insert into public.clients(slug, name, business_type, description)
  values ('codex-first-member-probe-' || replace(gen_random_uuid()::text, '-', ''), 'First member probe', 'TEST', 'Rolled back')
  returning id into probe_client;
  insert into public.company_access_codes(client_id, code_hash, active)
  values (probe_client, encode(extensions.digest(lower(raw_code), 'sha256'), 'hex'), true);

  perform set_config('request.jwt.claim.sub', first_user::text, true);
  if public.join_company_with_code(raw_code) <> probe_client then raise exception 'first_join_wrong_company'; end if;
  select role_row.name into assigned_role
  from public.client_memberships membership join public.roles role_row on role_row.id = membership.role_id
  where membership.client_id = probe_client and membership.user_id = first_user and membership.active;
  if assigned_role <> 'administrador' then raise exception 'first_join_role_expected_administrador_got_%', assigned_role; end if;

  perform set_config('request.jwt.claim.sub', second_user::text, true);
  if public.join_company_with_code(raw_code) <> probe_client then raise exception 'second_join_wrong_company'; end if;
  select role_row.name into assigned_role
  from public.client_memberships membership join public.roles role_row on role_row.id = membership.role_id
  where membership.client_id = probe_client and membership.user_id = second_user and membership.active;
  if assigned_role <> 'employee' then raise exception 'subsequent_join_role_expected_employee_got_%', assigned_role; end if;
end $$;
rollback;
