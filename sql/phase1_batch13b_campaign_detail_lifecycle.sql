-- Phase 1 Batch 13B: campaign detail lifecycle fields.
-- Safe incremental migration:
-- - Adds soft-cancel fields to campaign tasks and budget items.
-- - Adds archive fields to campaign documents.
-- - Updates all_expenses_overview to exclude cancelled campaign budget items.

create extension if not exists "citext";

alter table marketing_campaign_tasks
  add column if not exists cancelled_at timestamptz;

alter table marketing_campaign_tasks
  add column if not exists cancelled_by citext references app_user_access(email);

alter table marketing_campaign_tasks
  add column if not exists cancel_reason text;

alter table marketing_campaign_budget_items
  add column if not exists cancelled_at timestamptz;

alter table marketing_campaign_budget_items
  add column if not exists cancelled_by citext references app_user_access(email);

alter table marketing_campaign_budget_items
  add column if not exists cancel_reason text;

alter table marketing_campaign_documents
  add column if not exists archived_at timestamptz;

alter table marketing_campaign_documents
  add column if not exists archived_by citext references app_user_access(email);

alter table marketing_campaign_documents
  add column if not exists archive_reason text;

create index if not exists idx_marketing_campaign_tasks_cancelled
  on marketing_campaign_tasks(cancelled_at);

create index if not exists idx_marketing_campaign_budget_items_cancelled
  on marketing_campaign_budget_items(cancelled_at);

create index if not exists idx_marketing_campaign_documents_archived
  on marketing_campaign_documents(archived_at);

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

-- Optional smoke tests after running this migration:
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and (
--     (table_name = 'marketing_campaign_tasks' and column_name in ('cancelled_at', 'cancelled_by', 'cancel_reason'))
--     or (table_name = 'marketing_campaign_budget_items' and column_name in ('cancelled_at', 'cancelled_by', 'cancel_reason'))
--     or (table_name = 'marketing_campaign_documents' and column_name in ('archived_at', 'archived_by', 'archive_reason'))
--   )
-- order by table_name, column_name;
--
-- select source_table, title, amount, payment_status, payment_date
-- from all_expenses_overview
-- order by payment_date desc nulls last, created_at desc
-- limit 20;
