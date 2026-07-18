-- Phase 1 Batch 14C: campaign performance channel field.
-- Adds a nullable primary channel dimension to campaign-level performance records.
-- This is intentionally not a multi-channel attribution table; Phase 1 uses this as the campaign's primary channel.

alter table marketing_campaign_performance
  add column if not exists channel text;

create index if not exists idx_marketing_campaign_performance_channel
  on marketing_campaign_performance(channel);

notify pgrst, 'reload schema';

-- Smoke test 1: confirm live columns.
-- Expected: 9 rows, including channel.
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'marketing_campaign_performance'
--   and column_name in (
--     'channel',
--     'reach_count',
--     'lead_count',
--     'inquiry_count',
--     'qualified_lead_count',
--     'estimated_opportunity_amount',
--     'deal_count',
--     'deal_amount',
--     'notes'
--   )
-- order by column_name;

-- Smoke test 2: confirm existing table remains readable.
-- Expected: one row with the current count.
-- select count(*) as performance_count
-- from marketing_campaign_performance;
