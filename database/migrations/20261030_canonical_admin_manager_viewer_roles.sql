-- Consolidate legacy role rows while preserving every company membership.
-- Legacy administrator aliases map to admin; read-only legacy roles map to viewer.
-- The only current employee membership was inactive at migration preparation.
begin;

lock table public.roles, public.permissions, public.role_permissions, public.client_memberships in share row exclusive mode;

do $$
declare
  admin_id uuid;
  manager_id uuid;
  viewer_id uuid;
  unexpected_role text;
  has_duplicate_legacy_user_role boolean := false;
begin
  select lower(btrim(name)) into unexpected_role
  from public.roles
  where lower(btrim(name)) not in (
    'admin', 'manager', 'viewer',
    'administrador', 'administrator', 'adminstrador',
    'consulta', 'employee', 'encargado'
  )
  order by lower(btrim(name))
  limit 1;
  if unexpected_role is not null then
    raise exception 'role_migration_aborted_unmapped_role_%', unexpected_role;
  end if;

  if (select count(*) from public.permissions) <> 7
    or exists (select 1 from public.permissions where code not in (
      'company.read', 'company.manage', 'inventory.read', 'inventory.write',
      'movements.read', 'users.manage', 'exports.create'
    ))
    or exists (select 1 from (values
      ('company.read'), ('company.manage'), ('inventory.read'), ('inventory.write'),
      ('movements.read'), ('users.manage'), ('exports.create')
    ) expected(code) where not exists (
      select 1 from public.permissions permission_row where permission_row.code=expected.code
    )) then
    raise exception 'role_migration_aborted_unexpected_permission_catalog';
  end if;

  insert into public.roles(name, description, system_role) values
    ('admin', 'Administración completa', true),
    ('manager', 'Gestión de inventario', true),
    ('viewer', 'Consulta', true)
  on conflict (name) do update set
    description=excluded.description,
    system_role=true;

  select id into admin_id from public.roles where name='admin';
  select id into manager_id from public.roles where name='manager';
  select id into viewer_id from public.roles where name='viewer';

  -- Preserve company memberships and their active flags; only canonicalize role_id.
  update public.client_memberships membership
  set role_id = case
    when lower(btrim(role_row.name)) in ('admin','administrador','administrator','adminstrador') then admin_id
    when lower(btrim(role_row.name)) = 'manager' then manager_id
    else viewer_id
  end
  from public.roles role_row
  where role_row.id=membership.role_id
    and lower(btrim(role_row.name)) not in ('admin','manager','viewer');

  -- Preserve assignments in the legacy global user_roles table if it exists.
  -- Abort instead of allowing the role FK cascade to discard an assignment pair.
  if to_regclass('public.user_roles') is not null then
    execute $sql$
      select exists (
        select 1
        from public.user_roles old_assignment
        join public.roles old_role on old_role.id=old_assignment.role_id
        join public.user_roles canonical_assignment
          on canonical_assignment.user_id=old_assignment.user_id
        join public.roles canonical_role on canonical_role.id=canonical_assignment.role_id
        where lower(btrim(old_role.name)) in ('administrador','administrator','adminstrador','consulta','employee','encargado')
          and lower(btrim(canonical_role.name)) in ('admin','manager','viewer')
          and (
            (lower(btrim(old_role.name)) in ('administrador','administrator','adminstrador') and lower(btrim(canonical_role.name))='admin')
            or (lower(btrim(old_role.name)) in ('consulta','employee','encargado') and lower(btrim(canonical_role.name))='viewer')
          )
      )
    $sql$ into has_duplicate_legacy_user_role;
    if has_duplicate_legacy_user_role then
      raise exception 'role_migration_aborted_duplicate_legacy_user_role';
    end if;

    execute $sql$
      update public.user_roles assignment
      set role_id = case
        when lower(btrim(role_row.name)) in ('admin','administrador','administrator','adminstrador') then $1
        when lower(btrim(role_row.name))='manager' then $2
        else $3
      end
      from public.roles role_row
      where role_row.id=assignment.role_id
        and lower(btrim(role_row.name)) not in ('admin','manager','viewer')
    $sql$ using admin_id, manager_id, viewer_id;
  end if;

  -- Remove old grants from the three canonical roles, then set the exact matrix.
  delete from public.role_permissions
  where role_id in (admin_id, manager_id, viewer_id);

  insert into public.role_permissions(role_id, permission_id)
  select case matrix.role_code
      when 'admin' then admin_id
      when 'manager' then manager_id
      else viewer_id
    end,
    permission_row.id
  from (values
    ('admin','company.read'), ('admin','company.manage'),
    ('admin','inventory.read'), ('admin','inventory.write'),
    ('admin','movements.read'), ('admin','users.manage'), ('admin','exports.create'),
    ('manager','company.read'), ('manager','inventory.read'), ('manager','inventory.write'),
    ('manager','movements.read'), ('manager','exports.create'),
    ('viewer','company.read'), ('viewer','inventory.read'),
    ('viewer','movements.read'), ('viewer','exports.create')
  ) as matrix(role_code, permission_code)
  join public.permissions permission_row on permission_row.code=matrix.permission_code;

  -- Memberships and legacy user_roles now reference canonical IDs; cascading
  -- role_permissions cleanup removes grants attached to retired aliases only.
  delete from public.roles where name not in ('admin','manager','viewer');
end $$;

-- New companies receive admin; subsequent access-code joins receive viewer.
create or replace function private.create_company(company_slug text, company_name text, company_type text, company_description text)
returns public.clients language plpgsql security definer set search_path=pg_catalog, public as $$
declare created public.clients; administrator_role uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if length(trim(coalesce(company_slug, ''))) not between 1 and 80
    or length(trim(coalesce(company_name, ''))) not between 1 and 80
    or length(trim(coalesce(company_type, ''))) not between 1 and 60
    or length(coalesce(company_description, '')) > 200 then
    raise exception 'invalid_company_details';
  end if;
  insert into public.clients(slug, name, business_type, description)
  values (trim(company_slug), trim(company_name), trim(company_type), coalesce(trim(company_description), ''))
  returning * into created;
  select id into administrator_role from public.roles where name='admin' and system_role;
  if administrator_role is null then raise exception 'admin_role_not_configured'; end if;
  insert into public.client_memberships(client_id, user_id, role_id, active)
  values (created.id, auth.uid(), administrator_role, true);
  return created;
end;
$$;
revoke all on function private.create_company(text,text,text,text) from public, anon;
grant execute on function private.create_company(text,text,text,text) to authenticated;

create or replace function private.join_company_with_code(raw_code text)
returns uuid language plpgsql security definer set search_path=pg_catalog, public, extensions as $$
declare
  caller_id uuid := auth.uid();
  matched_client uuid;
  administrator_role uuid;
  viewer_role uuid;
  assigned_role uuid;
  normalized_code text;
  has_active_membership boolean;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  normalized_code := upper(regexp_replace(coalesce(raw_code, ''), '\s', '', 'g'));
  if normalized_code !~ '^[A-F0-9]{32}$' then raise exception 'invalid_company_access_code'; end if;

  select code_row.client_id into matched_client
  from public.company_access_codes code_row
  where code_row.code_hash=encode(extensions.digest(lower(normalized_code), 'sha256'), 'hex')
    and code_row.active and code_row.deactivated_at is null
  for key share;
  if matched_client is null then raise exception 'invalid_company_access_code'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(matched_client::text, 0));
  select id into administrator_role from public.roles where name='admin' and system_role;
  select id into viewer_role from public.roles where name='viewer' and system_role;
  if administrator_role is null then raise exception 'admin_role_not_configured'; end if;
  if viewer_role is null then raise exception 'viewer_role_not_configured'; end if;

  select exists(select 1 from public.client_memberships membership
    where membership.client_id=matched_client and membership.active) into has_active_membership;
  assigned_role := case when has_active_membership then viewer_role else administrator_role end;

  insert into public.client_memberships(client_id, user_id, role_id, active)
  values (matched_client, caller_id, assigned_role, true)
  on conflict (client_id, user_id) do update
    set active=true,
        role_id=case when public.client_memberships.active
          then public.client_memberships.role_id else excluded.role_id end;

  insert into public.user_profiles(user_id, display_name)
  values (caller_id, coalesce(auth.jwt()->'user_metadata'->>'full_name', auth.jwt()->'user_metadata'->>'name', ''))
  on conflict (user_id) do nothing;
  return matched_client;
end;
$$;
revoke all on function private.join_company_with_code(text) from public, anon;
grant execute on function private.join_company_with_code(text) to authenticated;

commit;
