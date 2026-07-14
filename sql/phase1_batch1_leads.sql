-- Phase 1 Batch 1: leads and follow-up records.
-- Safe incremental migration:
-- - Adds two new tables.
-- - Adds one nullable FK column to tender_results.
-- - Does not rename, remove, or alter existing v1 columns.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  source_channel text,
  source_campaign_id uuid references marketing_campaigns(id) on delete set null,
  source_association_id uuid references associations(id) on delete set null,
  source_tender_result_id uuid references tender_results(id) on delete set null,
  requirement_note text,
  importance text not null default '中',
  assigned_sales citext references app_user_access(email) on delete set null,
  stage text not null default '詢問',
  next_step text,
  next_followup_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  update_note text not null,
  updated_by citext references app_user_access(email) on delete set null,
  update_date date not null default current_date,
  next_followup_date date,
  created_at timestamptz not null default now()
);

alter table tender_results
  add column if not exists converted_lead_id uuid references leads(id) on delete set null;

create index if not exists idx_leads_assigned_stage
  on leads(assigned_sales, stage);

create index if not exists idx_leads_source_channel_stage
  on leads(source_channel, stage);

create index if not exists idx_leads_next_followup
  on leads(next_followup_date);

create index if not exists idx_leads_source_campaign
  on leads(source_campaign_id);

create index if not exists idx_leads_source_association
  on leads(source_association_id);

create index if not exists idx_leads_source_tender
  on leads(source_tender_result_id);

create index if not exists idx_lead_follow_ups_lead_update
  on lead_follow_ups(lead_id, update_date desc, created_at desc);

create index if not exists idx_lead_follow_ups_updated_by
  on lead_follow_ups(updated_by, update_date desc);

create index if not exists idx_tender_results_converted_lead
  on tender_results(converted_lead_id);

alter table leads enable row level security;
alter table lead_follow_ups enable row level security;

grant select, insert, update, delete on leads to authenticated;
grant select, insert, update, delete on lead_follow_ups to authenticated;

drop policy if exists leads_authenticated_all on leads;
create policy leads_authenticated_all
  on leads
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists lead_follow_ups_authenticated_all on lead_follow_ups;
create policy lead_follow_ups_authenticated_all
  on lead_follow_ups
  for all
  to authenticated
  using (true)
  with check (true);

-- Optional smoke test after running this migration:
-- select id, company_name, source_channel, stage, assigned_sales from leads order by created_at desc limit 5;
-- select id, title, converted_lead_id from tender_results order by last_seen_at desc limit 5;
