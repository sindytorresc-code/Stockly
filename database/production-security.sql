-- Modelo de producción para Supabase/PostgreSQL. Requiere Supabase Auth.
-- Ejecutar DESPUÉS de schema.sql. No ejecutar public-demo-policies.sql en producción.
create extension if not exists pgcrypto;

-- The legacy PIN is plaintext/demo authentication. Production Auth replaces it.
update clients set pin_hash = null where pin_hash is not null;

create table if not exists roles (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  description text not null default '', system_role boolean not null default false
);
alter table roles add column if not exists system_role boolean not null default false;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table if not exists permissions (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  description text not null default ''
);
create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', created_at timestamptz not null default now()
);
create table if not exists client_memberships (
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references roles(id), active boolean not null default true,
  created_at timestamptz not null default now(), primary key (client_id,user_id)
);
create index if not exists client_memberships_user_idx on client_memberships(user_id, client_id) where active;
create index if not exists client_memberships_role_idx on client_memberships(role_id);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references clients(id) on delete cascade,
  name text not null, description text not null default '', unique(client_id,name), unique(client_id,id)
);
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references clients(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 0 check(quantity >= 0), location text not null default '',
  updated_at timestamptz not null default now(), unique(client_id,product_id)
);
create table if not exists item_assignments (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references clients(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade, assigned_to text not null,
  quantity integer not null default 1 check(quantity > 0), assigned_at timestamptz not null default now(), returned_at timestamptz
);
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references clients(id) on delete cascade,
  product_id uuid references products(id) on delete set null, actor_id uuid references auth.users(id) on delete set null,
  movement_type text not null check (movement_type in ('create','update','delete','import','adjustment','assignment')),
  product_name text not null, product_code text not null, quantity integer not null default 0,
  before_data jsonb, after_data jsonb, notes text not null default '', created_at timestamptz not null default now()
);
create index if not exists inventory_movements_client_date_idx on inventory_movements(client_id,created_at desc);
create index if not exists products_client_category_idx on products(client_id,category);
create table if not exists audit_log (
  id bigint generated always as identity primary key, client_id uuid references clients(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null, action text not null,
  entity_table text not null, entity_id text, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_actor_idx on audit_log(actor_id);
create index if not exists audit_log_client_date_idx on audit_log(client_id,created_at desc);
create index if not exists inventory_items_product_idx on inventory_items(product_id);
create index if not exists item_assignments_client_idx on item_assignments(client_id);
create index if not exists item_assignments_product_idx on item_assignments(product_id);
create index if not exists inventory_movements_actor_idx on inventory_movements(actor_id);
create index if not exists inventory_movements_product_idx on inventory_movements(product_id);
create index if not exists role_permissions_permission_idx on role_permissions(permission_id);
create index if not exists products_client_category_idx on products(client_id,category);

insert into roles(name,description,system_role) values
 ('admin','Administración completa',true),('manager','Gestión de inventario y usuarios',true),('viewer','Consulta',true)
on conflict(name) do nothing;
insert into permissions(code,description) values
 ('company.read','Consultar empresa'),('company.manage','Administrar empresa'),('inventory.read','Consultar inventario'),
 ('inventory.write','Editar inventario'),('movements.read','Consultar movimientos'),('users.manage','Administrar usuarios y roles'),('exports.create','Exportar información')
on conflict(code) do nothing;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p
where lower(btrim(r.name)) in ('admin','administrator','administrador') on conflict do nothing;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r join permissions p on p.code in ('company.read','inventory.read','inventory.write','movements.read','exports.create') where r.name='manager' on conflict do nothing;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r join permissions p on p.code in ('company.read','inventory.read','movements.read','exports.create') where r.name='viewer' on conflict do nothing;

create or replace function private.has_client_permission(target_client uuid, permission_code text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from client_memberships m join role_permissions rp on rp.role_id=m.role_id
    join permissions p on p.id=rp.permission_id where m.user_id=auth.uid() and m.client_id=target_client
    and m.active and p.code=permission_code)
$$;
revoke all on function private.has_client_permission(uuid,text) from public,anon;
grant execute on function private.has_client_permission(uuid,text) to authenticated;
do $$ begin
  if to_regprocedure('public.has_client_permission(uuid,text)') is not null then
    execute 'revoke all on function public.has_client_permission(uuid,text) from public,anon';
  end if;
end $$;

create or replace function public.create_company(company_slug text, company_name text, company_type text, company_description text default '')
returns clients language plpgsql security definer set search_path=public as $$
declare created clients; manager_role uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into clients(slug,name,business_type,description) values(company_slug,company_name,company_type,company_description) returning * into created;
  select id into manager_role from roles where name='admin';
  insert into client_memberships(client_id,user_id,role_id) values(created.id,auth.uid(),manager_role);
  return created;
end $$;
revoke all on function public.create_company(text,text,text,text) from public;
revoke all on function public.create_company(text,text,text,text) from anon;
grant execute on function public.create_company(text,text,text,text) to authenticated;

create or replace function private.record_product_movement() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if TG_OP='INSERT' then
    insert into inventory_movements(client_id,product_id,actor_id,movement_type,product_name,product_code,quantity,after_data)
    values(new.client_id,new.id,auth.uid(),'create',new.name,new.code,new.stock,to_jsonb(new)); return new;
  elsif TG_OP='UPDATE' then
    insert into inventory_movements(client_id,product_id,actor_id,movement_type,product_name,product_code,quantity,before_data,after_data)
    values(new.client_id,new.id,auth.uid(),'update',new.name,new.code,new.stock-old.stock,to_jsonb(old),to_jsonb(new)); return new;
  else
    insert into inventory_movements(client_id,product_id,actor_id,movement_type,product_name,product_code,quantity,before_data)
    values(old.client_id,null,auth.uid(),'delete',old.name,old.code,-old.stock,to_jsonb(old)); return old;
  end if;
end $$;
revoke all on function private.record_product_movement() from public,anon,authenticated;
do $$ begin
  if to_regprocedure('public.record_product_movement()') is not null then
    execute 'revoke all on function public.record_product_movement() from public,anon,authenticated';
  end if;
end $$;
drop trigger if exists products_movement_audit on products;
create trigger products_movement_audit after insert or update or delete on products for each row execute function private.record_product_movement();

alter table clients enable row level security;
alter table products enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_profiles enable row level security;
alter table client_memberships enable row level security;
alter table categories enable row level security;
alter table inventory_items enable row level security;
alter table item_assignments enable row level security;
alter table inventory_movements enable row level security;
alter table audit_log enable row level security;

-- Replace any pre-existing policies on these tables so permissive demo rules
-- cannot combine with production rules. The legacy users tables are unused.
do $$ declare item record; begin
  for item in select schemaname, tablename, policyname from pg_policies
    where schemaname='public' and tablename in ('clients','products','roles','users','user_roles')
  loop execute format('drop policy if exists %I on %I.%I',item.policyname,item.schemaname,item.tablename); end loop;
  if to_regclass('public.users') is not null then execute 'revoke all on public.users from anon,authenticated'; end if;
  if to_regclass('public.user_roles') is not null then execute 'revoke all on public.user_roles from anon,authenticated'; end if;
end $$;

drop policy if exists "clients_member_read" on clients;
create policy "clients_member_read" on clients for select to authenticated using (private.has_client_permission(id,'company.read'));
drop policy if exists "clients_admin_create" on clients;
drop policy if exists "clients_manager_update" on clients;
create policy "clients_manager_update" on clients for update to authenticated using (private.has_client_permission(id,'company.manage')) with check (private.has_client_permission(id,'company.manage'));
drop policy if exists "products_member_read" on products;
create policy "products_member_read" on products for select to authenticated using (private.has_client_permission(client_id,'inventory.read'));
drop policy if exists "products_member_insert" on products;
create policy "products_member_insert" on products for insert to authenticated with check (private.has_client_permission(client_id,'inventory.write'));
drop policy if exists "products_member_update" on products;
create policy "products_member_update" on products for update to authenticated using (private.has_client_permission(client_id,'inventory.write')) with check (private.has_client_permission(client_id,'inventory.write'));
drop policy if exists "products_member_delete" on products;
create policy "products_member_delete" on products for delete to authenticated using (private.has_client_permission(client_id,'inventory.write'));
drop policy if exists "roles_read_authenticated" on roles;
create policy "roles_read_authenticated" on roles for select to authenticated using (true);
drop policy if exists "permissions_read_authenticated" on permissions;
create policy "permissions_read_authenticated" on permissions for select to authenticated using (true);
drop policy if exists "role_permissions_read_authenticated" on role_permissions;
create policy "role_permissions_read_authenticated" on role_permissions for select to authenticated using (true);
drop policy if exists "memberships_read_same_company" on client_memberships;
create policy "memberships_read_same_company" on client_memberships for select to authenticated using (private.has_client_permission(client_id,'users.manage') or user_id=(select auth.uid()));
drop policy if exists "memberships_admin_manage" on client_memberships;
drop policy if exists "memberships_admin_insert" on client_memberships;
drop policy if exists "memberships_admin_update" on client_memberships;
drop policy if exists "memberships_admin_delete" on client_memberships;
create policy "memberships_admin_insert" on client_memberships for insert to authenticated with check (private.has_client_permission(client_id,'users.manage'));
create policy "memberships_admin_update" on client_memberships for update to authenticated using (private.has_client_permission(client_id,'users.manage')) with check (private.has_client_permission(client_id,'users.manage'));
create policy "memberships_admin_delete" on client_memberships for delete to authenticated using (private.has_client_permission(client_id,'users.manage'));
drop policy if exists "profiles_self_read" on user_profiles;
create policy "profiles_self_read" on user_profiles for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "categories_member_all" on categories;
create policy "categories_member_all" on categories for all to authenticated using (private.has_client_permission(client_id,'inventory.read')) with check (private.has_client_permission(client_id,'inventory.write'));
drop policy if exists "items_member_all" on inventory_items;
create policy "items_member_all" on inventory_items for all to authenticated using (private.has_client_permission(client_id,'inventory.read')) with check (private.has_client_permission(client_id,'inventory.write'));
drop policy if exists "assignments_member_all" on item_assignments;
create policy "assignments_member_all" on item_assignments for all to authenticated using (private.has_client_permission(client_id,'inventory.read')) with check (private.has_client_permission(client_id,'inventory.write'));
drop policy if exists "movements_member_read" on inventory_movements;
create policy "movements_member_read" on inventory_movements for select to authenticated using (private.has_client_permission(client_id,'movements.read'));
drop policy if exists "audit_member_read" on audit_log;
create policy "audit_member_read" on audit_log for select to authenticated using (private.has_client_permission(client_id,'users.manage'));

drop function if exists public.has_client_permission(uuid,text);
drop function if exists public.record_product_movement();

grant select,insert,update,delete on clients,products,categories,inventory_items,item_assignments,client_memberships to authenticated;
grant select on roles,permissions,role_permissions,inventory_movements,user_profiles,audit_log to authenticated;

do $$ begin
  if to_regclass('public.users') is not null then execute 'create index if not exists users_client_idx on public.users(client_id)'; end if;
  if to_regclass('public.user_roles') is not null then execute 'create index if not exists user_roles_role_idx on public.user_roles(role_id)'; end if;
end $$;

-- Admin can bootstrap organizations only via a trusted server-side provisioning flow.
-- Never grant anon access or expose the service_role key to the browser.
