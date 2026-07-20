-- Phase 1 Batch 18B: role helper foundation for RLS governance.
--
-- Purpose:
-- - Keep Batch 17S anon/public lockdown intact.
-- - Add reusable role helpers for later per-table RLS policies.
-- - Tighten app_user_access to self-row access at the RLS layer.
-- - Do not yet change business-table policies; those start in Batch 18C.
--
-- Review before running live:
-- - Helper functions are SECURITY INVOKER, not SECURITY DEFINER.
-- - Role decisions use the authenticated JWT email claim matched to app_user_access.email.
-- - This file does not create, drop, or alter business data columns.
-- - This file intentionally keeps admin separate from executive: admin is not allowed to
--   pass is_executive(), because approval decisions are reserved for the real executive.

create or replace function public.current_app_user_email()
returns citext
language sql
stable
security invoker
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'email', '')::citext;
$$;

create or replace function public.current_app_user_role()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((
    select lower(trim(a.role))
    from public.app_user_access a
    where a.email = public.current_app_user_email()
      and a.is_active is distinct from false
    limit 1
  ), '');
$$;

create or replace function public.is_marketing_or_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.current_app_user_role() in (
    'marketing',
    'marketing_director',
    'director',
    '行銷總監',
    'admin',
    'administrator',
    '系統管理者'
  );
$$;

create or replace function public.is_executive()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.current_app_user_role() in (
    'executive',
    'general_manager',
    'gm',
    '總經理'
  );
$$;

revoke all on function public.current_app_user_email() from public;
revoke all on function public.current_app_user_role() from public;
revoke all on function public.is_marketing_or_admin() from public;
revoke all on function public.is_executive() from public;

grant execute on function public.current_app_user_email() to authenticated;
grant execute on function public.current_app_user_role() to authenticated;
grant execute on function public.is_marketing_or_admin() to authenticated;
grant execute on function public.is_executive() to authenticated;

alter table public.app_user_access enable row level security;

revoke all privileges on table public.app_user_access from anon;
revoke all privileges on table public.app_user_access from public;
revoke all privileges on table public.app_user_access from authenticated;

grant select (email, display_name, role, is_active, must_change_password)
  on table public.app_user_access
  to authenticated;

grant update (must_change_password, updated_at)
  on table public.app_user_access
  to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_user_access'
  loop
    execute format('drop policy if exists %I on public.app_user_access', policy_record.policyname);
  end loop;
end $$;

create policy app_user_access_select_self
  on public.app_user_access
  for select
  to authenticated
  using (email = public.current_app_user_email());

create policy app_user_access_update_self_password_flag
  on public.app_user_access
  for update
  to authenticated
  using (email = public.current_app_user_email())
  with check (email = public.current_app_user_email());

-- Executive account setup.
-- Create these users in Supabase Auth first if they do not already exist.
insert into public.app_user_access (email, display_name, role, is_active, must_change_password)
values
  ('kevin@mcttw.com.tw', 'Kevin', 'executive', true, false),
  ('kevin@tonsun.com.tw', 'Kevin', 'executive', true, false)
on conflict (email) do update
set display_name = excluded.display_name,
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();

notify pgrst, 'reload schema';

-- Smoke test 1: helper functions exist and are not SECURITY DEFINER.
select
  p.proname,
  p.prosecdef as is_security_definer,
  p.provolatile as volatility
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'current_app_user_email',
    'current_app_user_role',
    'is_marketing_or_admin',
    'is_executive'
  )
order by p.proname;

-- Expected:
-- - 4 rows.
-- - is_security_definer = false for all rows.
-- - volatility = 's' for all rows.

-- Smoke test 2: app_user_access keeps column-limited grants.
select
  has_table_privilege('anon', 'public.app_user_access', 'select') as anon_can_select_app_user_access,
  has_table_privilege('authenticated', 'public.app_user_access', 'select') as auth_table_select,
  has_column_privilege('authenticated', 'public.app_user_access', 'email', 'select') as auth_can_select_email,
  has_column_privilege('authenticated', 'public.app_user_access', 'display_name', 'select') as auth_can_select_display_name,
  has_column_privilege('authenticated', 'public.app_user_access', 'role', 'select') as auth_can_select_role,
  has_column_privilege('authenticated', 'public.app_user_access', 'is_active', 'select') as auth_can_select_is_active,
  has_column_privilege('authenticated', 'public.app_user_access', 'must_change_password', 'select') as auth_can_select_must_change_password,
  has_column_privilege('authenticated', 'public.app_user_access', 'must_change_password', 'update') as auth_can_update_must_change_password;

-- Expected:
-- - anon_can_select_app_user_access = false.
-- - auth_table_select may be false because access is column-granted, not table-wide.
-- - all auth_can_* values = true.

-- Smoke test 3: app_user_access has only the two expected RLS policies.
select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'app_user_access'
order by policyname;

-- Expected:
-- - app_user_access_select_self
-- - app_user_access_update_self_password_flag

-- Smoke test 4: simulate helper decisions in SQL Editor.
-- Replace emails with real rows that already exist in app_user_access.
--
-- select set_config('request.jwt.claims', '{"email":"eric@mcttw.com.tw"}', true);
-- select
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as role,
--   public.is_marketing_or_admin() as is_marketing_or_admin,
--   public.is_executive() as is_executive;
--
-- Expected for eric/admin:
-- - is_marketing_or_admin = true
-- - is_executive = false
--
-- Executive account checks:
--
-- select set_config('request.jwt.claims', '{"email":"kevin@mcttw.com.tw"}', true);
-- select
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as role,
--   public.is_marketing_or_admin() as is_marketing_or_admin,
--   public.is_executive() as is_executive;
--
-- select set_config('request.jwt.claims', '{"email":"kevin@tonsun.com.tw"}', true);
-- select
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as role,
--   public.is_marketing_or_admin() as is_marketing_or_admin,
--   public.is_executive() as is_executive;
--
-- Expected for both executive accounts:
-- - is_marketing_or_admin = false
-- - is_executive = true
