-- Allow an authenticated Google user to create a new tenant during signup.
-- The caller becomes administrador only in this new tenant; existing memberships,
-- tenant data and RLS policies are unchanged. Never grant this RPC to anon.
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
    values(trim(company_slug),trim(company_name),trim(company_type),coalesce(trim(company_description),''))
    returning * into created;

  select id into admin_role from public.roles where name='administrador' and system_role;
  if admin_role is null then
    raise exception 'administrator_role_not_configured';
  end if;
  insert into public.client_memberships(client_id,user_id,role_id)
    values(created.id,auth.uid(),admin_role);
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
