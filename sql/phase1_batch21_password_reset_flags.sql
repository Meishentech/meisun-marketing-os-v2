-- Batch 21 - Password reset and first-login password-change flags
-- Purpose:
-- 1. Keep existing passwords for Eric/admin accounts.
-- 2. Require every other active account, including executive accounts, to change
--    the initial password after first successful login.
--
-- Important:
-- This updates the Marketing OS access flag only. Supabase Auth passwords are
-- encrypted and must be created/reset from Supabase Auth Admin UI or Admin API.

begin;

update public.app_user_access
set
  must_change_password = false,
  updated_at = now()
where lower(email::text) in (
  'eric@mcttw.com.tw',
  'eric@tonsun.com.tw',
  'info@mcttw.com.tw'
);

update public.app_user_access
set
  must_change_password = true,
  updated_at = now()
where is_active = true
  and lower(email::text) not in (
    'eric@mcttw.com.tw',
    'eric@tonsun.com.tw',
    'info@mcttw.com.tw'
  );

notify pgrst, 'reload schema';

commit;

-- Smoke test 1: reserved accounts should not be forced to change passwords.
select
  email,
  role,
  is_active,
  must_change_password
from public.app_user_access
where lower(email::text) in (
  'eric@mcttw.com.tw',
  'eric@tonsun.com.tw',
  'info@mcttw.com.tw'
)
order by email;

-- Smoke test 2: every other active account should be forced to change passwords.
select
  email,
  role,
  is_active,
  must_change_password
from public.app_user_access
where is_active = true
  and lower(email::text) not in (
    'eric@mcttw.com.tw',
    'eric@tonsun.com.tw',
    'info@mcttw.com.tw'
  )
order by role, email;
