-- Manual Supabase SQL Editor integration test. It verifies that an active
-- membership with an administrator role can list its company while an
-- unrelated company remains hidden by RLS. All changes are rolled back.
begin;

do $$
declare
  probe_user uuid;
  probe_role uuid;
  authorized_client uuid;
  unauthorized_client uuid;
  role_name text := 'stockly-selector-probe-' || replace(gen_random_uuid()::text, '-', '');
begin
  select id into probe_user from auth.users order by created_at limit 1;
  if probe_user is null then raise exception 'selector_test_requires_auth_user'; end if;

  insert into public.roles(name, description, system_role)
  values (role_name, 'Temporary selector RLS test role', false)
  returning id into probe_role;

  insert into public.role_permissions(role_id, permission_id)
  select probe_role, id from public.permissions where code='company.read';

  insert into public.clients(slug, name, business_type)
  values ('stockly-selector-authorized-' || replace(gen_random_uuid()::text, '-', ''), 'Selector authorized test', 'TEST')
  returning id into authorized_client;
  insert into public.clients(slug, name, business_type)
  values ('stockly-selector-hidden-' || replace(gen_random_uuid()::text, '-', ''), 'Selector hidden test', 'TEST')
  returning id into unauthorized_client;

  insert into public.client_memberships(client_id, user_id, role_id, active)
  values (authorized_client, probe_user, probe_role, true);

  perform set_config('stockly.test.selector_user', probe_user::text, true);
  perform set_config('stockly.test.selector_authorized_client', authorized_client::text, true);
  perform set_config('stockly.test.selector_hidden_client', unauthorized_client::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('stockly.test.selector_user'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('stockly.test.selector_user'), 'role', 'authenticated')::text, true);

do $$
begin
  if not exists (
    select 1 from public.clients
    where id=current_setting('stockly.test.selector_authorized_client')::uuid
  ) then raise exception 'active_administrator_membership_company_not_visible_in_selector'; end if;
  if exists (
    select 1 from public.clients
    where id=current_setting('stockly.test.selector_hidden_client')::uuid
  ) then raise exception 'selector_exposed_company_without_authorized_membership'; end if;
end $$;

rollback;
