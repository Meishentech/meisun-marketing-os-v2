-- Phase 1 Batch 18C: sales data RLS tightening.
--
-- Purpose:
-- - Keep Batch 17S anon/public lockdown intact.
-- - Apply role-based RLS to sales_requests, leads, and lead_follow_ups.
-- - Let sales users read all leads, but only update leads assigned to themselves.
-- - Let sales users manage only their own sales_requests.
-- - Let executives read, but not write, these operational tables.
--
-- Review before running live:
-- - Requires Batch 18B helper functions to exist and be executable by authenticated.
-- - This file does not alter columns, constraints, FK cascade behavior, or Storage.
-- - DELETE is revoked from authenticated for these three tables; Phase 1 uses
--   lifecycle fields such as cancelled_at instead of true delete.
-- - app_user_access policies must remain self-row policies and must not call
--   current_app_user_role(), is_marketing_or_admin(), or is_executive().

do $$
begin
  if to_regprocedure('public.current_app_user_email()') is null
     or to_regprocedure('public.current_app_user_role()') is null
     or to_regprocedure('public.is_marketing_or_admin()') is null
     or to_regprocedure('public.is_executive()') is null then
    raise exception 'Batch 18B role helper functions are required before running Batch 18C';
  end if;
end $$;

alter table public.sales_requests enable row level security;
alter table public.leads enable row level security;
alter table public.lead_follow_ups enable row level security;

grant select, insert, update on table public.sales_requests to authenticated;
grant select, insert, update on table public.leads to authenticated;
grant select, insert, update on table public.lead_follow_ups to authenticated;

revoke delete on table public.sales_requests from authenticated;
revoke delete on table public.leads from authenticated;
revoke delete on table public.lead_follow_ups from authenticated;

revoke all privileges on table public.sales_requests from anon;
revoke all privileges on table public.sales_requests from public;
revoke all privileges on table public.leads from anon;
revoke all privileges on table public.leads from public;
revoke all privileges on table public.lead_follow_ups from anon;
revoke all privileges on table public.lead_follow_ups from public;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('sales_requests', 'leads', 'lead_follow_ups')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end $$;

-- sales_requests:
-- - marketing/admin can read and write every request.
-- - executive can read every request, but cannot write.
-- - sales can create/read/update only rows requested_by themselves.
create policy sales_requests_select_role_scope
  on public.sales_requests
  for select
  to authenticated
  using (
    public.is_marketing_or_admin()
    or public.is_executive()
    or requested_by = public.current_app_user_email()
  );

create policy sales_requests_insert_role_scope
  on public.sales_requests
  for insert
  to authenticated
  with check (
    public.is_marketing_or_admin()
    or requested_by = public.current_app_user_email()
  );

create policy sales_requests_update_role_scope
  on public.sales_requests
  for update
  to authenticated
  using (
    public.is_marketing_or_admin()
    or requested_by = public.current_app_user_email()
  )
  with check (
    public.is_marketing_or_admin()
    or requested_by = public.current_app_user_email()
  );

-- leads:
-- - all authenticated roles can read leads, because sales needs the shared list.
-- - marketing/admin can create and update every lead.
-- - sales can create/update only leads assigned to themselves.
-- - executive can read every lead, but cannot write.
create policy leads_select_authenticated
  on public.leads
  for select
  to authenticated
  using (true);

create policy leads_insert_role_scope
  on public.leads
  for insert
  to authenticated
  with check (
    public.is_marketing_or_admin()
    or assigned_sales = public.current_app_user_email()
  );

create policy leads_update_role_scope
  on public.leads
  for update
  to authenticated
  using (
    public.is_marketing_or_admin()
    or assigned_sales = public.current_app_user_email()
  )
  with check (
    public.is_marketing_or_admin()
    or assigned_sales = public.current_app_user_email()
  );

-- lead_follow_ups:
-- - all authenticated roles can read follow-up history for lead context.
-- - marketing/admin can create and update every follow-up.
-- - sales can create/update their own follow-ups only on leads assigned to themselves.
-- - executive can read every follow-up, but cannot write.
create policy lead_follow_ups_select_authenticated
  on public.lead_follow_ups
  for select
  to authenticated
  using (true);

create policy lead_follow_ups_insert_role_scope
  on public.lead_follow_ups
  for insert
  to authenticated
  with check (
    public.is_marketing_or_admin()
    or (
      updated_by = public.current_app_user_email()
      and exists (
        select 1
        from public.leads l
        where l.id = lead_id
          and l.assigned_sales = public.current_app_user_email()
      )
    )
  );

create policy lead_follow_ups_update_role_scope
  on public.lead_follow_ups
  for update
  to authenticated
  using (
    public.is_marketing_or_admin()
    or (
      updated_by = public.current_app_user_email()
      and exists (
        select 1
        from public.leads l
        where l.id = lead_follow_ups.lead_id
          and l.assigned_sales = public.current_app_user_email()
      )
    )
  )
  with check (
    public.is_marketing_or_admin()
    or (
      updated_by = public.current_app_user_email()
      and exists (
        select 1
        from public.leads l
        where l.id = lead_follow_ups.lead_id
          and l.assigned_sales = public.current_app_user_email()
      )
    )
  );

notify pgrst, 'reload schema';

-- Smoke test 1: grants stay open for authenticated reads/writes, but DELETE is closed.
select
  has_table_privilege('anon', 'public.sales_requests', 'select') as anon_can_select_sales_requests,
  has_table_privilege('anon', 'public.leads', 'select') as anon_can_select_leads,
  has_table_privilege('anon', 'public.lead_follow_ups', 'select') as anon_can_select_lead_follow_ups,
  has_table_privilege('authenticated', 'public.sales_requests', 'select') as auth_can_select_sales_requests,
  has_table_privilege('authenticated', 'public.sales_requests', 'insert') as auth_can_insert_sales_requests,
  has_table_privilege('authenticated', 'public.sales_requests', 'update') as auth_can_update_sales_requests,
  has_table_privilege('authenticated', 'public.sales_requests', 'delete') as auth_can_delete_sales_requests,
  has_table_privilege('authenticated', 'public.leads', 'select') as auth_can_select_leads,
  has_table_privilege('authenticated', 'public.leads', 'insert') as auth_can_insert_leads,
  has_table_privilege('authenticated', 'public.leads', 'update') as auth_can_update_leads,
  has_table_privilege('authenticated', 'public.leads', 'delete') as auth_can_delete_leads,
  has_table_privilege('authenticated', 'public.lead_follow_ups', 'select') as auth_can_select_lead_follow_ups,
  has_table_privilege('authenticated', 'public.lead_follow_ups', 'insert') as auth_can_insert_lead_follow_ups,
  has_table_privilege('authenticated', 'public.lead_follow_ups', 'update') as auth_can_update_lead_follow_ups,
  has_table_privilege('authenticated', 'public.lead_follow_ups', 'delete') as auth_can_delete_lead_follow_ups;

-- Expected:
-- - all anon_can_select_* = false.
-- - authenticated select/insert/update = true.
-- - authenticated delete = false for all three tables.

-- Smoke test 2: target tables have only the Batch 18C policies.
select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('sales_requests', 'leads', 'lead_follow_ups')
order by tablename, policyname;

-- Expected policy count:
-- - sales_requests: 3 policies.
-- - leads: 3 policies.
-- - lead_follow_ups: 3 policies.
-- - no old "authenticated all" policies remain.

-- Smoke test 3: non-destructive SQL Editor role simulation.
-- Uses a real non-admin member account as the sales-role equivalent: vincent@mcttw.com.tw.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"vincent@mcttw.com.tw"}', true);
-- set local role authenticated;
-- select
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as role,
--   count(*) filter (where requested_by = public.current_app_user_email()) as visible_own_sales_requests,
--   count(*) filter (where requested_by is distinct from public.current_app_user_email()) as visible_other_sales_requests
-- from public.sales_requests;
-- rollback;
--
-- Expected for a normal sales account:
-- - role is the account's app_user_access role.
-- - visible_other_sales_requests = 0, because RLS hides other users' requests.

-- Smoke test 4: sales can read all leads, but cannot no-op update leads not assigned to them.
-- Uses a real non-admin member account as the sales-role equivalent: vincent@mcttw.com.tw.
-- This uses rollback, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"vincent@mcttw.com.tw"}', true);
-- set local role authenticated;
-- select count(*) as visible_leads from public.leads;
-- update public.leads
-- set updated_at = updated_at
-- where assigned_sales is distinct from public.current_app_user_email()
-- returning id, company_name, assigned_sales;
-- rollback;
--
-- Expected for a normal sales account:
-- - visible_leads returns a count, not a permission error.
-- - update returns 0 rows.

-- Smoke test 5: executive can read but cannot write these tables.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"kevin@mcttw.com.tw"}', true);
-- set local role authenticated;
-- select public.is_executive() as is_executive, count(*) as visible_leads from public.leads;
-- update public.leads
-- set updated_at = updated_at
-- returning id, company_name;
-- rollback;
--
-- Expected:
-- - is_executive = true.
-- - visible_leads returns a count.
-- - update returns 0 rows.
