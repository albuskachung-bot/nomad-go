create or replace function public.set_admin_role_by_email(
  target_email text,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  normalized_role text := lower(trim(target_role));
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can update admin roles';
  end if;

  if normalized_role is null or normalized_role not in ('member', 'reviewer', 'editor', 'super_admin') then
    raise exception 'target_role must be member, reviewer, editor, or super_admin';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(trim(target_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No registered user found for email %', target_email;
  end if;

  insert into public.profiles (id, role)
  values (target_user_id, normalized_role)
  on conflict (id) do update
    set role = excluded.role,
        updated_at = now();
end;
$$;
