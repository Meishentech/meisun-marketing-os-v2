-- Phase 1 Batch 17B: association lifecycle fields.
-- Safe incremental migration:
-- - Adds archive fields to association master records and benefits.
-- - Adds soft-cancel fields to fee records, publications, events, notes, tasks, and task expenses.
-- - Rebuilds association_cooperation_overview to exclude cancelled cooperation records.
-- - Rebuilds all_expenses_overview to exclude cancelled association expenses.

create extension if not exists "citext";

alter table associations
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by citext references app_user_access(email),
  add column if not exists archive_reason text;

alter table association_benefits
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by citext references app_user_access(email),
  add column if not exists archive_reason text;

alter table association_fee_records
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_publication_schedules
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_events
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_notes
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_tasks
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_task_expenses
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

create index if not exists idx_associations_archived
  on associations(archived_at);

create index if not exists idx_association_benefits_archived
  on association_benefits(archived_at);

create index if not exists idx_association_fee_records_cancelled
  on association_fee_records(cancelled_at);

create index if not exists idx_association_publications_cancelled
  on association_publication_schedules(cancelled_at);

create index if not exists idx_association_events_cancelled
  on association_events(cancelled_at);

create index if not exists idx_association_notes_cancelled
  on association_notes(cancelled_at);

create index if not exists idx_association_tasks_cancelled
  on association_tasks(cancelled_at);

create index if not exists idx_association_task_expenses_cancelled
  on association_task_expenses(cancelled_at);

create or replace view association_cooperation_overview
with (security_invoker = true) as
select
  id,
  association_id,
  task_name as item_name,
  task_type as item_type,
  task_status as stage,
  owner,
  due_date,
  progress_pct,
  next_step,
  notes,
  attachment,
  created_at,
  updated_at,
  'task'::text as source_table
from association_tasks
where cancelled_at is null

union all

select
  id,
  association_id,
  event_name as item_name,
  event_type as item_type,
  event_status as stage,
  owner,
  event_date as due_date,
  null::integer as progress_pct,
  result_notes as next_step,
  null::text as notes,
  attachment,
  created_at,
  updated_at,
  'event'::text as source_table
from association_events
where cancelled_at is null

union all

select
  id,
  association_id,
  publication_name as item_name,
  '期刊刊登'::text as item_type,
  material_status as stage,
  owner,
  deadline_date as due_date,
  null::integer as progress_pct,
  result_notes as next_step,
  null::text as notes,
  attachment,
  created_at,
  updated_at,
  'publication'::text as source_table
from association_publication_schedules
where cancelled_at is null;

grant select on association_cooperation_overview to authenticated;

create or replace view all_expenses_overview
with (security_invoker = true) as
select
  mbi.id as source_id,
  'marketing_campaign_budget_items'::text as source_table,
  mbi.item_name as title,
  '行銷案費用'::text as category,
  mbi.amount_twd::numeric as amount,
  null::numeric as amount_budget,
  mbi.amount_twd::numeric as amount_actual,
  mbi.payment_status,
  mbi.payment_date,
  mbi.campaign_id,
  null::uuid as association_id,
  null::uuid as vendor_id,
  mc.owner::text as owner_contact,
  mbi.created_at,
  null::timestamptz as updated_at
from marketing_campaign_budget_items mbi
left join marketing_campaigns mc on mc.id = mbi.campaign_id
where mbi.cancelled_at is null

union all

select
  afr.id as source_id,
  'association_fee_records'::text as source_table,
  ('公會年費 ' || afr.year::text)::text as title,
  '公會年費'::text as category,
  afr.fee_amount::numeric as amount,
  null::numeric as amount_budget,
  afr.fee_amount::numeric as amount_actual,
  afr.payment_status,
  afr.payment_date,
  null::uuid as campaign_id,
  afr.association_id,
  null::uuid as vendor_id,
  a.internal_owner::text as owner_contact,
  afr.created_at,
  afr.updated_at
from association_fee_records afr
left join associations a on a.id = afr.association_id
where afr.cancelled_at is null

union all

select
  ate.id as source_id,
  'association_task_expenses'::text as source_table,
  ate.expense_type as title,
  '公會任務費用'::text as category,
  coalesce(ate.actual_amount, ate.budget_amount)::numeric as amount,
  ate.budget_amount::numeric as amount_budget,
  ate.actual_amount::numeric as amount_actual,
  ate.payment_status,
  ate.payment_date,
  null::uuid as campaign_id,
  ate.association_id,
  null::uuid as vendor_id,
  a.internal_owner::text as owner_contact,
  ate.created_at,
  ate.updated_at
from association_task_expenses ate
left join associations a on a.id = ate.association_id
where ate.cancelled_at is null

union all

select
  mcv.id as source_id,
  'marketing_campaign_vendors'::text as source_table,
  coalesce(v.name, mcv.role_in_project, '未命名廠商費用')::text as title,
  '廠商費用'::text as category,
  coalesce(mcv.actual_amount, mcv.budget_amount)::numeric as amount,
  mcv.budget_amount::numeric as amount_budget,
  mcv.actual_amount::numeric as amount_actual,
  mcv.payment_status,
  mcv.payment_date,
  mcv.campaign_id,
  null::uuid as association_id,
  mcv.vendor_id,
  mcv.meisun_contact::text as owner_contact,
  mcv.created_at,
  mcv.updated_at
from marketing_campaign_vendors mcv
left join vendors v on v.id = mcv.vendor_id
where mcv.cancelled_at is null;

grant select on all_expenses_overview to authenticated;

notify pgrst, 'reload schema';

-- Live smoke tests after running this migration:
-- 1) Confirm all 24 lifecycle columns exist.
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and (
--     (table_name in ('associations', 'association_benefits')
--       and column_name in ('archived_at', 'archived_by', 'archive_reason'))
--     or (table_name in (
--       'association_fee_records',
--       'association_publication_schedules',
--       'association_events',
--       'association_notes',
--       'association_tasks',
--       'association_task_expenses'
--     ) and column_name in ('cancelled_at', 'cancelled_by', 'cancel_reason'))
--   )
-- order by table_name, column_name;
--
-- 2) Confirm the two production views still respond.
-- select source_table, count(*) as row_count
-- from association_cooperation_overview
-- group by source_table
-- order by source_table;
--
-- select source_table, count(*) as row_count
-- from all_expenses_overview
-- group by source_table
-- order by source_table;
