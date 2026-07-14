-- Phase 1: allow v2 frontend to read role metadata for its own logged-in account.
-- Run in Supabase SQL editor after confirming app_user_access exists.

grant select (email, display_name, role, is_active, must_change_password)
  on app_user_access
  to authenticated;

-- Suggested role values for v2:
-- executive  = 總經理
-- marketing  = 行銷總監
-- sales      = 業務
-- admin      = 系統管理者 / can switch role views for testing

update app_user_access
set role = 'admin', updated_at = now()
where email = 'eric@mcttw.com.tw';

-- Example updates. Adjust emails before running.
-- update app_user_access set role = 'executive', updated_at = now() where email = '總經理信箱';
-- update app_user_access set role = 'marketing', updated_at = now() where email = '行銷總監信箱';
-- update app_user_access set role = 'sales', updated_at = now() where email = '業務信箱';
