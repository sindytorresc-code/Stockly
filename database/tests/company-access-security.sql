-- Manual integration test. Run from Supabase SQL Editor after creating two Auth
-- test users, applying both production migrations, and selecting a safe test DB.
-- The transaction is rolled back; it changes no lasting memberships or data.
begin;

do $$
declare user_one uuid; user_two uuid; company_one uuid; company_two uuid; employee_role uuid;
begin
  select id into user_one from auth.users order by created_at, id limit 1;
  select id into user_two from auth.users where id <> user_one order by created_at, id limit 1;
  select id into company_one from public.clients order by created_at, id limit 1;
  select id into company_two from public.clients where id <> company_one order by created_at, id limit 1;
  select id into employee_role from public.roles where name='employee';
  if user_one is null or user_two is null then raise exception 'test_requires_two_supabase_auth_users'; end if;
  if company_one is null or company_two is null then raise exception 'test_requires_two_companies'; end if;
  if employee_role is null then raise exception 'employee_role_not_configured'; end if;
  perform set_config('stockly.test.user_one', user_one::text, true);
  perform set_config('stockly.test.user_two', user_two::text, true);
  perform set_config('stockly.test.company_one', company_one::text, true);
  perform set_config('stockly.test.company_two', company_two::text, true);
  insert into public.client_memberships(client_id,user_id,role_id,active)
    values(company_one,user_one,employee_role,true),(company_two,user_two,employee_role,true)
    on conflict(client_id,user_id) do update set role_id=excluded.role_id,active=true;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('stockly.test.user_one'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('stockly.test.user_one'),'role','authenticated')::text,true);
do $$
begin
  if exists(select 1 from public.clients where id=current_setting('stockly.test.company_two')::uuid) then
    raise exception 'tenant_isolation_failed_user_one_read_company_two';
  end if;
  if exists(select 1 from public.products where client_id=current_setting('stockly.test.company_two')::uuid) then
    raise exception 'tenant_isolation_failed_user_one_read_company_two_products';
  end if;
  begin
    perform public.join_company_with_code('00000000000000000000000000000000');
    raise exception 'invalid_code_was_accepted';
  exception when others then
    if sqlerrm='invalid_code_was_accepted' then raise; end if;
  end;
  begin
    update public.client_memberships set role_id=(select id from public.roles where name='admin')
      where client_id=current_setting('stockly.test.company_one')::uuid
        and user_id=current_setting('stockly.test.user_one')::uuid;
    raise exception 'employee_promoted_self_to_admin';
  exception when insufficient_privilege then null;
  end;
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
