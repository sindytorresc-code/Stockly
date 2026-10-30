-- Transactional integration test for the three application roles.
-- Uses existing Auth users only as temporary test identities; all rows and
-- inventory movement trigger effects are rolled back at the end.
begin;

do $$
declare
  admin_user uuid;
  second_user uuid;
  test_client uuid;
  test_product uuid;
  admin_role uuid;
  manager_role uuid;
  viewer_role uuid;
begin
  select id into admin_user from auth.users order by created_at, id limit 1;
  select id into second_user from auth.users where id <> admin_user order by created_at, id limit 1;
  select id into admin_role from public.roles where name='admin';
  select id into manager_role from public.roles where name='manager';
  select id into viewer_role from public.roles where name='viewer';
  if admin_user is null or second_user is null then raise exception 'rls_role_test_requires_two_auth_users'; end if;
  if admin_role is null or manager_role is null or viewer_role is null then raise exception 'canonical_roles_missing'; end if;

  insert into public.clients(slug,name,business_type)
  values ('stockly-role-rls-probe-'||replace(gen_random_uuid()::text,'-',''),'Role RLS probe','TEST')
  returning id into test_client;
  insert into public.products(client_id,name,code,category,price,stock)
  values (test_client,'Temporary role test product','ROLE-RLS-PROBE','Test',1,1)
  returning id into test_product;
  insert into public.client_memberships(client_id,user_id,role_id,active)
  values (test_client,admin_user,admin_role,true);

  perform set_config('stockly.test.role_user',admin_user::text,true);
  perform set_config('stockly.test.second_user',second_user::text,true);
  perform set_config('stockly.test.role_client',test_client::text,true);
  perform set_config('stockly.test.role_product',test_product::text,true);
  perform set_config('stockly.test.admin_role',admin_role::text,true);
  perform set_config('stockly.test.manager_role',manager_role::text,true);
  perform set_config('stockly.test.viewer_role',viewer_role::text,true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('stockly.test.role_user'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('stockly.test.role_user'),'role','authenticated')::text,true);
do $$
declare affected integer;
begin
  if not exists(select 1 from public.clients where id=current_setting('stockly.test.role_client')::uuid)
    or not exists(select 1 from public.products where id=current_setting('stockly.test.role_product')::uuid) then
    raise exception 'admin_cannot_read_company_inventory';
  end if;
  update public.products set comments='admin permission probe' where id=current_setting('stockly.test.role_product')::uuid;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'admin_cannot_write_inventory'; end if;
  update public.clients set name='Role RLS probe updated' where id=current_setting('stockly.test.role_client')::uuid;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'admin_cannot_manage_company'; end if;
  insert into public.client_memberships(client_id,user_id,role_id,active)
  values (current_setting('stockly.test.role_client')::uuid,current_setting('stockly.test.second_user')::uuid,
    current_setting('stockly.test.viewer_role')::uuid,true);
  if not exists(select 1 from public.client_memberships where client_id=current_setting('stockly.test.role_client')::uuid
      and user_id=current_setting('stockly.test.second_user')::uuid and active) then
    raise exception 'admin_cannot_manage_members';
  end if;
end $$;

reset role;
update public.client_memberships set role_id=current_setting('stockly.test.manager_role')::uuid
where client_id=current_setting('stockly.test.role_client')::uuid and user_id=current_setting('stockly.test.role_user')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('stockly.test.role_user'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('stockly.test.role_user'),'role','authenticated')::text,true);
do $$
declare affected integer;
begin
  update public.products set comments='manager inventory probe' where id=current_setting('stockly.test.role_product')::uuid;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'manager_cannot_write_inventory'; end if;
  update public.clients set name='Manager must not rename' where id=current_setting('stockly.test.role_client')::uuid;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'manager_can_manage_company'; end if;
  update public.client_memberships set active=false where client_id=current_setting('stockly.test.role_client')::uuid
    and user_id=current_setting('stockly.test.second_user')::uuid;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'manager_can_manage_members'; end if;
end $$;

reset role;
update public.client_memberships set role_id=current_setting('stockly.test.viewer_role')::uuid
where client_id=current_setting('stockly.test.role_client')::uuid and user_id=current_setting('stockly.test.role_user')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('stockly.test.role_user'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('stockly.test.role_user'),'role','authenticated')::text,true);
do $$
declare affected integer;
begin
  if not exists(select 1 from public.clients where id=current_setting('stockly.test.role_client')::uuid)
    or not exists(select 1 from public.products where id=current_setting('stockly.test.role_product')::uuid) then
    raise exception 'viewer_cannot_read_company_inventory';
  end if;
  update public.products set comments='viewer must not write' where id=current_setting('stockly.test.role_product')::uuid;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'viewer_can_write_inventory'; end if;
  begin
    insert into public.products(client_id,name,code,category,price,stock)
    values (current_setting('stockly.test.role_client')::uuid,'Forbidden viewer insert','VIEWER-FORBIDDEN','Test',1,1);
    raise exception 'viewer_insert_should_be_blocked';
  exception when insufficient_privilege then
    if sqlerrm='viewer_insert_should_be_blocked' then raise; end if;
  end;
end $$;

rollback;
