-- Post-migration assertion for the two companies verified as having exactly
-- one membership, that membership active as viewer, and no prior admin.
do $$
declare
  target_id uuid;
  target_ids uuid[] := array[
    'e7983930-d765-4edb-a22d-60403cbc1ad0'::uuid,
    '5b454043-bfc6-45bb-af91-449ef8671ff3'::uuid
  ];
  role_name text;
  total_memberships integer;
  active_memberships integer;
begin
  foreach target_id in array target_ids loop
    select role_row.name into role_name
    from public.client_memberships membership
    join public.roles role_row on role_row.id = membership.role_id
    where membership.client_id = target_id and membership.active;
    select count(*) into total_memberships from public.client_memberships where client_id = target_id;
    select count(*) into active_memberships from public.client_memberships where client_id = target_id and active;
    if role_name <> 'admin' or total_memberships <> 1 or active_memberships <> 1 then
      raise exception 'verified_single_member_company_not_admin_%', target_id;
    end if;
  end loop;
end $$;
