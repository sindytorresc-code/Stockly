-- Manual integration test. Run from Supabase SQL Editor with two employee users,
-- one company admin, and both production migrations applied.
-- The transaction is rolled back; it changes no lasting memberships or data.
begin;

do $$
declare user_one uuid; user_two uuid; company_one uuid; company_two uuid; employee_role uuid; company_admin uuid; admin_client uuid;
begin
  select m.user_id,m.client_id into company_admin,admin_client from public.client_memberships m
    join public.roles r on r.id=m.role_id where m.active and r.name='admin' order by m.created_at limit 1;
  select m.user_id into user_one from public.client_memberships m join public.roles r on r.id=m.role_id
    where m.active and r.name='employee' and m.user_id<>company_admin order by m.created_at,m.user_id limit 1;
  select m.user_id into user_two from public.client_memberships m join public.roles r on r.id=m.role_id
    where m.active and r.name='employee' and m.user_id<>user_one and m.user_id<>company_admin order by m.created_at,m.user_id limit 1;
  company_one := admin_client;
  select id into company_two from public.clients where id <> company_one order by created_at, id limit 1;
  select id into employee_role from public.roles where name='employee';
  if user_one is null or user_two is null then raise exception 'test_requires_two_supabase_auth_users'; end if;
  if company_one is null or company_two is null then raise exception 'test_requires_two_companies'; end if;
  if employee_role is null then raise exception 'employee_role_not_configured'; end if;
  if company_admin is null then raise exception 'test_requires_an_existing_company_admin'; end if;
  perform set_config('stockly.test.user_one', user_one::text, true);
  perform set_config('stockly.test.user_two', user_two::text, true);
  perform set_config('stockly.test.company_one', company_one::text, true);
  perform set_config('stockly.test.company_two', company_two::text, true);
  perform set_config('stockly.test.company_admin', company_admin::text, true);
  perform set_config('stockly.test.admin_client', admin_client::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('stockly.test.company_admin'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('stockly.test.company_admin'),'role','authenticated')::text,true);
do $$
declare created public.clients; one_time_code text;
begin
  created := public.create_company('stockly-security-probe-'||replace(gen_random_uuid()::text,'-',''),'Security test company','TEST','Rolled-back integration test');
  if not exists(select 1 from public.client_memberships m join public.roles r on r.id=m.role_id
    where m.client_id=created.id and m.user_id=current_setting('stockly.test.company_admin')::uuid and r.name='admin' and m.active) then
    raise exception 'company_creator_not_assigned_admin';
  end if;
  if not exists(select 1 from public.clients where id=created.id) then raise exception 'creator_cannot_read_created_company'; end if;
  perform set_config('stockly.test.created_company',created.id::text,true);
  one_time_code := public.rotate_company_access_code(current_setting('stockly.test.admin_client')::uuid);
  if length(one_time_code)<>32 then raise exception 'admin_code_rotation_failed'; end if;
  perform public.deactivate_company_access_code(current_setting('stockly.test.admin_client')::uuid);
end $$;

reset role;
do $$
declare employee_role uuid;
begin
  select id into employee_role from public.roles where name='employee';
  delete from public.client_memberships
    where user_id in (current_setting('stockly.test.user_one')::uuid,current_setting('stockly.test.user_two')::uuid);
  insert into public.client_memberships(client_id,user_id,role_id,active)
    values(current_setting('stockly.test.company_one')::uuid,current_setting('stockly.test.user_one')::uuid,employee_role,true),
      (current_setting('stockly.test.company_two')::uuid,current_setting('stockly.test.user_one')::uuid,employee_role,true),
      (current_setting('stockly.test.company_two')::uuid,current_setting('stockly.test.user_two')::uuid,employee_role,true)
    on conflict(client_id,user_id) do update set role_id=excluded.role_id,active=true;
  insert into public.company_access_codes(client_id,code_hash)
    values(current_setting('stockly.test.created_company')::uuid,
      encode(extensions.digest(lower('ABCDEF0123456789ABCDEF0123456789'),'sha256'),'hex'));
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('stockly.test.user_one'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('stockly.test.user_one'),'role','authenticated')::text,true);
do $$
declare affected integer;
begin
  if not exists(select 1 from public.clients where id=current_setting('stockly.test.company_two')::uuid) then
    raise exception 'member_cannot_read_second_company_before_revocation';
  end if;
  update public.client_memberships set active=false
    where client_id=current_setting('stockly.test.company_one')::uuid and user_id=current_setting('stockly.test.user_one')::uuid;
  get diagnostics affected = row_count;
  if affected<>0 or not exists(select 1 from public.client_memberships where client_id=current_setting('stockly.test.company_one')::uuid
      and user_id=current_setting('stockly.test.user_one')::uuid and active) then
    raise exception 'employee_could_revoke_own_membership';
  end if;
  begin
    perform public.join_company_with_code('00000000000000000000000000000000');
    raise exception 'invalid_code_was_accepted';
  exception when others then
    if sqlerrm='invalid_code_was_accepted' then raise; end if;
    if sqlerrm<>'invalid_company_access_code' then raise; end if;
  end;
  update public.client_memberships set role_id=(select id from public.roles where name='admin')
    where client_id=current_setting('stockly.test.company_one')::uuid
      and user_id=current_setting('stockly.test.user_one')::uuid;
  if exists(select 1 from public.client_memberships where client_id=current_setting('stockly.test.company_one')::uuid
      and user_id=current_setting('stockly.test.user_one')::uuid and role_id=(select id from public.roles where name='admin')) then
    raise exception 'employee_promoted_self_to_admin';
  end if;
  if public.join_company_with_code('ABCDEF0123456789ABCDEF0123456789')<>current_setting('stockly.test.created_company')::uuid then
    raise exception 'valid_code_did_not_join_expected_company';
  end if;
  if not exists(select 1 from public.client_memberships m join public.roles r on r.id=m.role_id
    where m.client_id=current_setting('stockly.test.created_company')::uuid
      and m.user_id=current_setting('stockly.test.user_one')::uuid and r.name='employee' and m.active) then
    raise exception 'company_join_did_not_assign_employee_role';
  end if;
end $$;

select set_config('request.jwt.claim.sub',current_setting('stockly.test.company_admin'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('stockly.test.company_admin'),'role','authenticated')::text,true);
do $$
declare affected integer;
begin
  update public.client_memberships set active=false
    where client_id=current_setting('stockly.test.company_one')::uuid and user_id=current_setting('stockly.test.user_one')::uuid and active;
  get diagnostics affected = row_count;
  if affected<>1 then raise exception 'authorized_admin_could_not_revoke_membership'; end if;
  if not exists(select 1 from public.client_memberships where client_id=current_setting('stockly.test.company_one')::uuid
      and user_id=current_setting('stockly.test.user_one')::uuid and not active) then
    raise exception 'revocation_did_not_preserve_inactive_membership';
  end if;
  if not exists(select 1 from public.client_memberships where client_id=current_setting('stockly.test.company_two')::uuid
      and user_id=current_setting('stockly.test.user_one')::uuid and active) then
    raise exception 'revocation_changed_membership_in_another_company';
  end if;
  update public.client_memberships set active=false
    where client_id=current_setting('stockly.test.company_two')::uuid and user_id=current_setting('stockly.test.user_two')::uuid and active;
  get diagnostics affected = row_count;
  if affected<>0 then raise exception 'admin_changed_membership_in_another_company'; end if;
end $$;

select set_config('request.jwt.claim.sub',current_setting('stockly.test.user_one'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('stockly.test.user_one'),'role','authenticated')::text,true);
do $$
begin
  if exists(select 1 from public.clients where id=current_setting('stockly.test.company_one')::uuid) then
    raise exception 'revoked_member_can_still_read_company';
  end if;
  if exists(select 1 from public.products where client_id=current_setting('stockly.test.company_one')::uuid) then
    raise exception 'revoked_member_can_still_read_company_products';
  end if;
  if not exists(select 1 from public.clients where id=current_setting('stockly.test.company_two')::uuid) then
    raise exception 'revocation_removed_access_to_another_company';
  end if;
end $$;

select set_config('request.jwt.claim.sub',current_setting('stockly.test.user_two'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('stockly.test.user_two'),'role','authenticated')::text,true);
do $$
begin
  if exists(select 1 from public.clients where id=current_setting('stockly.test.company_one')::uuid) then
    raise exception 'tenant_isolation_failed_user_two_read_company_one';
  end if;
  if exists(select 1 from public.products where client_id=current_setting('stockly.test.company_one')::uuid) then
    raise exception 'tenant_isolation_failed_user_two_read_company_one_products';
  end if;
end $$;

rollback;
