-- Phase 1 Batch 14B: campaign risk lifecycle fields.
-- Safe incremental migration:
-- - Adds archive fields to campaign risks.
-- - Adds soft-cancel fields to campaign risk updates.
-- - Reloads PostgREST schema cache after column changes.

create extension if not exists "citext";

alter table marketing_campaign_risks
  add column if not exists archived_at timestamptz;

alter table marketing_campaign_risks
  add column if not exists archived_by citext references app_user_access(email);

alter table marketing_campaign_risks
  add column if not exists archive_reason text;

alter table marketing_campaign_risk_updates
  add column if not exists cancelled_at timestamptz;

alter table marketing_campaign_risk_updates
  add column if not exists cancelled_by citext references app_user_access(email);

alter table marketing_campaign_risk_updates
  add column if not exists cancel_reason text;

create index if not exists idx_marketing_campaign_risks_archived
  on marketing_campaign_risks(archived_at);

create index if not exists idx_marketing_campaign_risk_updates_cancelled
  on marketing_campaign_risk_updates(cancelled_at);

notify pgrst, 'reload schema';

-- Required live smoke tests after running this migration:
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and (
--     (table_name = 'marketing_campaign_risks' and column_name in ('archived_at', 'archived_by', 'archive_reason'))
--     or (table_name = 'marketing_campaign_risk_updates' and column_name in ('cancelled_at', 'cancelled_by', 'cancel_reason'))
--   )
-- order by table_name, column_name;
--
-- Expected result: 6 rows.
--
-- select
--   (select count(*) from marketing_campaign_risks) as risk_count,
--   (select count(*) from marketing_campaign_risk_updates) as risk_update_count;
