-- Phase 1 Batch 5 prerequisite: campaign budget payment fields.
-- Safe incremental migration:
-- - Adds nullable fields only.
-- - Keeps existing quote_status untouched.
-- - Prepares marketing_campaign_budget_items for all_expenses_overview.

alter table marketing_campaign_budget_items
  add column if not exists payment_status text;

alter table marketing_campaign_budget_items
  add column if not exists payment_date date;

create index if not exists idx_marketing_campaign_budget_items_payment
  on marketing_campaign_budget_items(payment_status, payment_date);

-- Optional smoke test after running this migration:
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'marketing_campaign_budget_items'
--   and column_name in ('payment_status', 'payment_date')
-- order by column_name;
