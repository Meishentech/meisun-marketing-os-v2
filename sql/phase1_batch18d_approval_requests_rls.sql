-- Phase 1 Batch 18D: approval_requests RLS tightening.
--
-- Purpose:
-- - Keep Batch 17S anon/public lockdown intact.
-- - Let marketing/admin create approval requests for executive review.
-- - Let executives read and decide approval requests.
-- - Prevent admin/marketing from directly writing decision fields.
-- - Allow marketing/admin to withdraw their own open requests with status = '已撤回'.
-- - Keep sales users out of approval_requests.
--
-- Review before running live:
-- - Requires Batch 18B helper functions to exist and be executable by authenticated.
-- - This file does not alter columns, constraints, FK cascade behavior, or Storage.
-- - approval_requests.entity_type/entity_id intentionally have no FK and remain
--   historical snapshots. RLS must not assume the source entity still exists.
-- - A BEFORE UPDATE trigger enforces field-level decision protection because RLS
--   policies are row-scoped and cannot by themselves distinguish decision columns.

do $$
begin
  if to_regprocedure('public.current_app_user_email()') is null
     or to_regprocedure('public.current_app_user_role()') is null
     or to_regprocedure('public.is_marketing_or_admin()') is null
     or to_regprocedure('public.is_executive()') is null then
    raise exception 'Batch 18B role helper functions are required before running Batch 18D';
  end if;
end $$;

alter table public.approval_requests enable row level security;

grant select, insert, update on table public.approval_requests to authenticated;
revoke delete on table public.approval_requests from authenticated;

revoke all privileges on table public.approval_requests from anon;
revoke all privileges on table public.approval_requests from public;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'approval_requests'
  loop
    execute format('drop policy if exists %I on public.approval_requests', policy_record.policyname);
  end loop;
end $$;

-- Keep this function SECURITY INVOKER. It is a guard, not a bypass.
create or replace function public.enforce_approval_request_update_scope()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_executive() then
    if old.entity_type is distinct from new.entity_type
       or old.entity_id is distinct from new.entity_id
       or old.title is distinct from new.title
       or old.summary is distinct from new.summary
       or old.amount is distinct from new.amount
       or old.due_date is distinct from new.due_date
       or old.requested_by is distinct from new.requested_by
       or old.approver_role is distinct from new.approver_role
       or old.created_at is distinct from new.created_at then
      raise exception 'Executive users can only update approval decision fields';
    end if;

    if old.status is distinct from new.status
       or old.decided_by is distinct from new.decided_by
       or old.decided_at is distinct from new.decided_at
       or old.decision_note is distinct from new.decision_note then
      if new.decided_by is distinct from public.current_app_user_email() then
        raise exception 'Executive approval decisions must set decided_by to the current user';
      end if;
      if new.decided_at is null then
        raise exception 'Executive approval decisions must set decided_at';
      end if;
    end if;

    return new;
  end if;

  if public.is_marketing_or_admin() then
    if old.status is distinct from new.status
       or old.decided_by is distinct from new.decided_by
       or old.decided_at is distinct from new.decided_at
       or old.decision_note is distinct from new.decision_note then
      raise exception 'Only executive users can update approval decision fields';
    end if;

    if old.status is distinct from new.status then
      if not (
        old.status in ('待審核', '需修正')
        and new.status = '已撤回'
      ) then
        raise exception 'Marketing/admin users can only withdraw open approval requests';
      end if;
    end if;

    if new.requested_by is distinct from old.requested_by then
      raise exception 'approval_requests.requested_by cannot be reassigned';
    end if;

    return new;
  end if;

  raise exception 'User is not allowed to update approval requests';
end;
$$;

revoke all on function public.enforce_approval_request_update_scope() from public;
grant execute on function public.enforce_approval_request_update_scope() to authenticated;

drop trigger if exists approval_requests_update_scope_guard on public.approval_requests;
create trigger approval_requests_update_scope_guard
  before update on public.approval_requests
  for each row
  execute function public.enforce_approval_request_update_scope();

-- approval_requests:
-- - marketing/admin and executive can read approval requests.
-- - sales users cannot read/write approval_requests in Batch 18D.
create policy approval_requests_select_role_scope
  on public.approval_requests
  for select
  to authenticated
  using (
    public.is_marketing_or_admin()
    or public.is_executive()
  );

-- Only marketing/admin creates approval requests in Phase 1.
-- Decision fields must start empty; executive fills them later.
create policy approval_requests_insert_marketing_scope
  on public.approval_requests
  for insert
  to authenticated
  with check (
    public.is_marketing_or_admin()
    and requested_by = public.current_app_user_email()
    and approver_role = 'executive'
    and status = '待審核'
    and decided_by is null
    and decided_at is null
    and decision_note is null
  );

-- Marketing/admin can correct non-decision snapshot fields only on their own
-- still-pending or revision-requested rows. They can also withdraw those rows
-- with status = '已撤回'. The trigger blocks decision fields.
create policy approval_requests_update_marketing_snapshot_scope
  on public.approval_requests
  for update
  to authenticated
  using (
    public.is_marketing_or_admin()
    and requested_by = public.current_app_user_email()
    and status in ('待審核', '需修正')
  )
  with check (
    public.is_marketing_or_admin()
    and requested_by = public.current_app_user_email()
    and status in ('待審核', '需修正', '已撤回')
  );

-- Executive users are the only users allowed to make decisions.
create policy approval_requests_update_executive_decision_scope
  on public.approval_requests
  for update
  to authenticated
  using (
    public.is_executive()
    and status in ('待審核', '需修正')
  )
  with check (public.is_executive());

notify pgrst, 'reload schema';

-- Smoke test 1: grants stay open for authenticated read/create/update, but DELETE is closed.
select
  has_table_privilege('anon', 'public.approval_requests', 'select') as anon_can_select_approval_requests,
  has_table_privilege('authenticated', 'public.approval_requests', 'select') as auth_can_select_approval_requests,
  has_table_privilege('authenticated', 'public.approval_requests', 'insert') as auth_can_insert_approval_requests,
  has_table_privilege('authenticated', 'public.approval_requests', 'update') as auth_can_update_approval_requests,
  has_table_privilege('authenticated', 'public.approval_requests', 'delete') as auth_can_delete_approval_requests;

-- Expected:
-- - anon_can_select_approval_requests = false.
-- - authenticated select/insert/update = true.
-- - authenticated delete = false.

-- Smoke test 2: approval_requests has the expected policies and trigger.
select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'approval_requests'
order by policyname;

select
  tgname,
  tgenabled
from pg_trigger
where tgrelid = 'public.approval_requests'::regclass
  and tgname = 'approval_requests_update_scope_guard';

-- Expected:
-- - 4 policies:
--   approval_requests_insert_marketing_scope
--   approval_requests_select_role_scope
--   approval_requests_update_executive_decision_scope
--   approval_requests_update_marketing_snapshot_scope
-- - trigger approval_requests_update_scope_guard exists and tgenabled = 'O'.

-- Smoke test 3: marketing/admin can create a request, but cannot decide it.
-- This test intentionally expects an ERROR on the UPDATE line.
-- Run rollback after the expected error.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"eric@mcttw.com.tw"}', true);
-- set local role authenticated;
-- insert into public.approval_requests (
--   entity_type,
--   entity_id,
--   title,
--   summary,
--   amount,
--   due_date,
--   requested_by,
--   approver_role,
--   status
-- )
-- values (
--   'rls_smoke',
--   gen_random_uuid(),
--   '18D RLS smoke',
--   'Marketing/admin create test',
--   1,
--   current_date,
--   public.current_app_user_email(),
--   'executive',
--   '待審核'
-- )
-- returning id, requested_by, status;
--
-- update public.approval_requests
-- set status = '已核准',
--     decision_note = 'Admin should not decide',
--     decided_by = public.current_app_user_email(),
--     decided_at = now(),
--     updated_at = now()
-- where title = '18D RLS smoke'
-- returning id, status, decided_by;
--
-- Expected:
-- - insert returns 1 row.
-- - update raises: Only executive users can update approval decision fields.
-- - then run: rollback;

-- Smoke test 4: marketing/admin can withdraw an open request without decision fields.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"eric@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with inserted as (
--   insert into public.approval_requests (
--     entity_type,
--     entity_id,
--     title,
--     summary,
--     amount,
--     due_date,
--     requested_by,
--     approver_role,
--     status
--   )
--   values (
--     'rls_smoke',
--     gen_random_uuid(),
--     '18D withdraw smoke',
--     'Marketing/admin withdraw test',
--     1,
--     current_date,
--     public.current_app_user_email(),
--     'executive',
--     '待審核'
--   )
--   returning id
-- ),
-- withdrawn as (
--   update public.approval_requests ar
--   set status = '已撤回',
--       summary = 'Marketing/admin withdraw test / Vendor cooperation was cancelled',
--       updated_at = now()
--   from inserted
--   where ar.id = inserted.id
--   returning ar.id, ar.status, ar.decided_by, ar.decided_at, ar.decision_note
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   (select count(*) from withdrawn) as withdrawn_rows,
--   (select bool_and(status = '已撤回' and decided_by is null and decided_at is null and decision_note is null) from withdrawn) as no_decision_fields_written;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - app_role is marketing/admin.
-- - withdrawn_rows = 1.
-- - no_decision_fields_written = true.

-- Smoke test 5: executive can read and decide a request.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"eric@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with inserted as (
--   insert into public.approval_requests (
--     entity_type,
--     entity_id,
--     title,
--     summary,
--     amount,
--     due_date,
--     requested_by,
--     approver_role,
--     status
--   )
--   values (
--     'rls_smoke',
--     gen_random_uuid(),
--     '18D executive decision smoke',
--     'Executive decision test',
--     1,
--     current_date,
--     public.current_app_user_email(),
--     'executive',
--     '待審核'
--   )
--   returning id
-- ),
-- switch_to_executive as (
--   select set_config('request.jwt.claims', '{"email":"kevin@mcttw.com.tw"}', true)
-- ),
-- decided as (
--   update public.approval_requests ar
--   set status = '已核准',
--       decision_note = 'Executive smoke approved',
--       decided_by = public.current_app_user_email(),
--       decided_at = now(),
--       updated_at = now()
--   from inserted, switch_to_executive
--   where ar.id = inserted.id
--   returning ar.id, ar.status, ar.decided_by
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   public.is_executive() as is_executive,
--   (select count(*) from decided) as decided_rows;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - email = kevin@mcttw.com.tw.
-- - app_role = executive.
-- - is_executive = true.
-- - decided_rows = 1.

-- Smoke test 6: sales/member cannot read approval_requests.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"vincent@mcttw.com.tw"}', true);
-- set local role authenticated;
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   count(*) as visible_approval_requests
-- from public.approval_requests;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - app_role = member.
-- - visible_approval_requests = 0.
