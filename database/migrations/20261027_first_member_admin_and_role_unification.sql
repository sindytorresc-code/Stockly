-- Consolidates administrator role aliases and makes first-code-join admin
-- assignment atomic. Membership rows and legacy role rows are preserved.
begin;

insert into public.roles(name, description, system_role)
values ('administrador', 'Administración completa', true)
on conflict (name) do update set system_role = true;

-- Preserve the union of permissions from all historical administrator aliases.
insert into public.role_permissions(role_id, permission_id)
select official.id, grants.permission_id
from public.roles official
join public.roles legacy on lower(btrim(legacy.name)) in ('admin', 'administrator', 'administrador')
join public.role_permissions grants on grants.role_id = legacy.id
where official.name = 'administrador'
on conflict (role_id, permission_id) do nothing;

-- The access-code and membership UI can safely expose just this canonical role.
-- Change role_id in place; client_id, user_id, active, and created_at are kept.
update public.client_memberships membership
set role_id = official.id
from public.roles official
where official.name = 'administrador'
  and membership.role_id in (
    select legacy.id from public.roles legacy
    where lower(btrim(legacy.name)) in ('admin', 'administrator')
  );

-- Keep legacy role rows and permissions for rollback/history, but stop treating
-- aliases as assignable system roles. They are not deleted.
update public.roles
set system_role = false
where lower(btrim(name)) in ('admin', 'administrator');

-- The optional Encargado role needs company/product read access plus the
-- export permission. Existing roles such as consulta, employee and viewer are
-- left unchanged.
insert into public.role_permissions(role_id, permission_id)
select role_row.id, permission_row.id
from public.roles role_row
join public.permissions permission_row
  on permission_row.code in ('company.read', 'inventory.read', 'movements.read', 'exports.create')
where lower(btrim(role_row.name)) = 'encargado'
on conflict (role_id, permission_id) do nothing;

create or replace function private.create_company(
  company_slug text,
  company_name text,
  company_type text,
  company_description text
)
returns public.clients
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created public.clients;
  administrator_role uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if length(trim(coalesce(company_slug, ''))) not between 1 and 80
    or length(trim(coalesce(company_name, ''))) not between 1 and 80
    or length(trim(coalesce(company_type, ''))) not between 1 and 60
    or length(coalesce(company_description, '')) > 200 then
    raise exception 'invalid_company_details';
  end if;

  insert into public.clients(slug, name, business_type, description)
  values (trim(company_slug), trim(company_name), trim(company_type), coalesce(trim(company_description), ''))
  returning * into created;

  select id into administrator_role
  from public.roles where name = 'administrador' and system_role;
  if administrator_role is null then
    raise exception 'administrator_role_not_configured';
  end if;

  insert into public.client_memberships(client_id, user_id, role_id, active)
  values (created.id, auth.uid(), administrator_role, true);
  return created;
end;
$$;
revoke all on function private.create_company(text, text, text, text) from public, anon;
grant execute on function private.create_company(text, text, text, text) to authenticated;

create or replace function public.create_company(
  company_slug text,
  company_name text,
  company_type text,
  company_description text default ''
)
returns public.clients
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select private.create_company(company_slug, company_name, company_type, company_description)
$$;
revoke all on function public.create_company(text, text, text, text) from public, anon;
grant execute on function public.create_company(text, text, text, text) to authenticated;

create or replace function private.join_company_with_code(raw_code text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  caller_id uuid := auth.uid();
  matched_client uuid;
  administrator_role uuid;
  employee_role uuid;
  assigned_role uuid;
  normalized_code text;
  has_active_membership boolean;
begin
  if caller_id is null then
    raise exception 'authentication_required';
  end if;
  normalized_code := upper(regexp_replace(coalesce(raw_code, ''), '\s', '', 'g'));
  if normalized_code !~ '^[A-F0-9]{32}$' then
    raise exception 'invalid_company_access_code';
  end if;

  select code_row.client_id into matched_client
  from public.company_access_codes code_row
  where code_row.code_hash = encode(extensions.digest(lower(normalized_code), 'sha256'), 'hex')
    and code_row.active
    and code_row.deactivated_at is null
  for key share;
  if matched_client is null then
    raise exception 'invalid_company_access_code';
  end if;

  -- Serialize first joins per company. The lock lives to transaction end, so
  -- concurrent requests cannot both observe an empty active-membership set.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(matched_client::text, 0));

  select id into administrator_role
  from public.roles where name = 'administrador' and system_role;
  select id into employee_role
  from public.roles where name = 'employee' and system_role;
  if administrator_role is null then
    raise exception 'administrator_role_not_configured';
  end if;
  if employee_role is null then
    raise exception 'employee_role_not_configured';
  end if;

  select exists (
    select 1 from public.client_memberships membership
    where membership.client_id = matched_client and membership.active
  ) into has_active_membership;
  assigned_role := case when has_active_membership then employee_role else administrator_role end;

  insert into public.client_memberships(client_id, user_id, role_id, active)
  values (matched_client, caller_id, assigned_role, true)
  on conflict (client_id, user_id) do update
    set active = true,
        role_id = case
          when public.client_memberships.active then public.client_memberships.role_id
          else excluded.role_id
        end;

  insert into public.user_profiles(user_id, display_name)
  values (caller_id, coalesce(auth.jwt()->'user_metadata'->>'full_name', auth.jwt()->'user_metadata'->>'name', ''))
  on conflict (user_id) do nothing;
  return matched_client;
end;
$$;
revoke all on function private.join_company_with_code(text) from public, anon;
grant execute on function private.join_company_with_code(text) to authenticated;

create or replace function public.join_company_with_code(access_code text)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select private.join_company_with_code(access_code)
$$;
revoke all on function public.join_company_with_code(text) from public, anon;
grant execute on function public.join_company_with_code(text) to authenticated;

commit;
