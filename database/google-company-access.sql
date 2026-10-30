-- Secure Google self-service company onboarding. Apply after production-security.sql.
-- Never apply public-demo-policies.sql in production.
create table if not exists public.company_access_codes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  deactivated_at timestamptz
);
create unique index if not exists company_access_codes_one_active_idx
  on public.company_access_codes(client_id) where active;
create index if not exists company_access_codes_client_idx on public.company_access_codes(client_id);
alter table public.company_access_codes enable row level security;
revoke all on public.company_access_codes from public, anon, authenticated;
drop policy if exists company_access_codes_no_direct_access on public.company_access_codes;
create policy company_access_codes_no_direct_access on public.company_access_codes
  for all to anon, authenticated using (false) with check (false);

insert into public.roles(name, description, system_role)
values ('viewer', 'Consulta de inventario de la empresa', true)
on conflict (name) do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.code in ('company.read','inventory.read','movements.read','exports.create')
where r.name='viewer'
on conflict do nothing;

-- Creating a new company grants its creator admin privileges only inside that
-- newly created tenant. Existing company memberships and roles are untouched.
create or replace function private.create_company(company_slug text, company_name text, company_type text, company_description text)
returns public.clients language plpgsql security definer set search_path=pg_catalog, public as $$
declare created public.clients; admin_role uuid;
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
  insert into public.clients(slug,name,business_type,description)
    values(trim(company_slug),trim(company_name),trim(company_type),coalesce(trim(company_description),'')) returning * into created;
  select id into admin_role from public.roles where name='admin' and system_role;
  if admin_role is null then raise exception 'admin_role_not_configured'; end if;
  insert into public.client_memberships(client_id,user_id,role_id) values(created.id,auth.uid(),admin_role);
  return created;
end $$;
revoke all on function private.create_company(text,text,text,text) from public, anon;
grant execute on function private.create_company(text,text,text,text) to authenticated;
create or replace function public.create_company(company_slug text, company_name text, company_type text, company_description text default '')
returns public.clients language sql security invoker set search_path=pg_catalog, public as $$
  select private.create_company(company_slug,company_name,company_type,company_description)
$$;
revoke all on function public.create_company(text,text,text,text) from public, anon;
grant execute on function public.create_company(text,text,text,text) to authenticated;

create or replace function private.join_company_with_code(raw_code text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare caller_id uuid := auth.uid(); matched_client uuid; administrator_role uuid; viewer_role uuid; assigned_role uuid; normalized_code text; has_active_membership boolean;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  normalized_code := upper(regexp_replace(coalesce(raw_code, ''), '\s', '', 'g'));
  if normalized_code !~ '^[A-F0-9]{32}$' then raise exception 'invalid_company_access_code'; end if;
  select c.client_id into matched_client
    from public.company_access_codes c
    where c.code_hash = encode(extensions.digest(lower(normalized_code), 'sha256'), 'hex')
      and c.active and c.deactivated_at is null
    for key share;
  if matched_client is null then raise exception 'invalid_company_access_code'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(matched_client::text, 0));
  select id into administrator_role from public.roles where name='admin' and system_role;
  select id into viewer_role from public.roles where name='viewer' and system_role;
  if administrator_role is null then raise exception 'admin_role_not_configured'; end if;
  if viewer_role is null then raise exception 'viewer_role_not_configured'; end if;
  select exists(select 1 from public.client_memberships where client_id=matched_client and active)
    into has_active_membership;
  assigned_role := case when has_active_membership then viewer_role else administrator_role end;
  insert into public.client_memberships(client_id,user_id,role_id,active)
    values (matched_client,caller_id,assigned_role,true)
    on conflict (client_id,user_id) do update
      set active=true,
          role_id=case when public.client_memberships.active then public.client_memberships.role_id else excluded.role_id end;
  insert into public.user_profiles(user_id,display_name)
    values (caller_id,coalesce(auth.jwt()->'user_metadata'->>'full_name', auth.jwt()->'user_metadata'->>'name', ''))
    on conflict (user_id) do nothing;
  return matched_client;
end $$;
revoke all on function private.join_company_with_code(text) from public, anon;
grant execute on function private.join_company_with_code(text) to authenticated;
create or replace function public.join_company_with_code(access_code text)
returns uuid language sql security invoker set search_path = pg_catalog, public as $$
  select private.join_company_with_code(access_code)
$$;
revoke all on function public.join_company_with_code(text) from public, anon;
grant execute on function public.join_company_with_code(text) to authenticated;

create or replace function private.rotate_company_access_code(target_client uuid)
returns text language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare caller_id uuid := auth.uid(); new_code text;
begin
  if caller_id is null or not private.has_client_permission(target_client,'users.manage') then
    raise exception 'not_authorized';
  end if;
  update public.company_access_codes set active=false, deactivated_at=now()
    where client_id=target_client and active;
  new_code := upper(encode(extensions.gen_random_bytes(16),'hex'));
  insert into public.company_access_codes(client_id,code_hash,created_by)
    values(target_client,encode(extensions.digest(lower(new_code),'sha256'),'hex'),caller_id);
  return new_code;
end $$;
revoke all on function private.rotate_company_access_code(uuid) from public, anon;
grant execute on function private.rotate_company_access_code(uuid) to authenticated;
create or replace function public.rotate_company_access_code(target_client uuid)
returns text language sql security invoker set search_path = pg_catalog, public as $$
  select private.rotate_company_access_code(target_client)
$$;
revoke all on function public.rotate_company_access_code(uuid) from public, anon;
grant execute on function public.rotate_company_access_code(uuid) to authenticated;

-- Return only key existence/active flags to administrators of this company.
-- The code itself is one-time output from rotate_company_access_code; hashes
-- remain inaccessible through the Data API.
create or replace function private.company_access_code_status(target_client uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog, public as $$
begin
  if auth.uid() is null or not private.has_client_permission(target_client,'users.manage') then
    raise exception 'not_authorized';
  end if;
  return jsonb_build_object(
    'active', exists(select 1 from public.company_access_codes where client_id=target_client and active and deactivated_at is null),
    'everGenerated', exists(select 1 from public.company_access_codes where client_id=target_client)
  );
end $$;
revoke all on function private.company_access_code_status(uuid) from public, anon;
grant execute on function private.company_access_code_status(uuid) to authenticated;
create or replace function public.company_access_code_status(target_client uuid)
returns jsonb language sql stable security invoker set search_path=pg_catalog, public as $$
  select private.company_access_code_status(target_client)
$$;
revoke all on function public.company_access_code_status(uuid) from public, anon;
grant execute on function public.company_access_code_status(uuid) to authenticated;

create or replace function private.deactivate_company_access_code(target_client uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.uid() is null or not private.has_client_permission(target_client,'users.manage') then
    raise exception 'not_authorized';
  end if;
  update public.company_access_codes set active=false, deactivated_at=now()
    where client_id=target_client and active;
end $$;
revoke all on function private.deactivate_company_access_code(uuid) from public, anon;
grant execute on function private.deactivate_company_access_code(uuid) to authenticated;
create or replace function public.deactivate_company_access_code(target_client uuid)
returns void language sql security invoker set search_path = pg_catalog, public as $$
  select private.deactivate_company_access_code(target_client)
$$;
revoke all on function public.deactivate_company_access_code(uuid) from public, anon;
grant execute on function public.deactivate_company_access_code(uuid) to authenticated;
