-- Phase 1 Batch 5: product knowledge base and expense overview.
-- Safe incremental migration:
-- - Adds product knowledge tables.
-- - Adds nullable payment_date to campaign vendor expenses.
-- - Adds one read-only expense overview view.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

alter table marketing_campaign_vendors
  add column if not exists payment_date date;

create index if not exists idx_marketing_campaign_vendors_payment
  on marketing_campaign_vendors(payment_status, payment_date);

create table if not exists product_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  product_line text,
  knowledge_type text not null,
  target_segment text,
  use_context text,
  summary text,
  detail text,
  recommended_pitch text,
  prohibited_pitch text,
  evidence_level text not null default 'C' check (evidence_level in ('A', 'B', 'C', 'D')),
  visibility_status text not null default '待確認' check (visibility_status in ('可對外', '僅內部', '待確認', '禁止使用')),
  related_competitor text,
  owner citext references app_user_access(email) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text,
  url_or_file text,
  verified_by citext references app_user_access(email) on delete set null,
  verified_date date,
  created_at timestamptz not null default now()
);

create table if not exists product_knowledge_item_sources (
  id uuid primary key default gen_random_uuid(),
  knowledge_item_id uuid not null references product_knowledge_items(id) on delete cascade,
  source_id uuid not null references product_knowledge_sources(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (knowledge_item_id, source_id)
);

create table if not exists product_knowledge_resource_links (
  id uuid primary key default gen_random_uuid(),
  knowledge_item_id uuid not null references product_knowledge_items(id) on delete cascade,
  resource_id uuid not null references marketing_resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (knowledge_item_id, resource_id)
);

create index if not exists idx_product_knowledge_items_type
  on product_knowledge_items(knowledge_type);

create index if not exists idx_product_knowledge_items_evidence_visibility
  on product_knowledge_items(evidence_level, visibility_status);

create index if not exists idx_product_knowledge_items_owner
  on product_knowledge_items(owner);

create index if not exists idx_product_knowledge_sources_type
  on product_knowledge_sources(source_type);

create index if not exists idx_product_knowledge_item_sources_item
  on product_knowledge_item_sources(knowledge_item_id);

create index if not exists idx_product_knowledge_item_sources_source
  on product_knowledge_item_sources(source_id);

create index if not exists idx_product_knowledge_resource_links_item
  on product_knowledge_resource_links(knowledge_item_id);

create index if not exists idx_product_knowledge_resource_links_resource
  on product_knowledge_resource_links(resource_id);

alter table product_knowledge_items enable row level security;
alter table product_knowledge_sources enable row level security;
alter table product_knowledge_item_sources enable row level security;
alter table product_knowledge_resource_links enable row level security;

grant select, insert, update, delete on product_knowledge_items to authenticated;
grant select, insert, update, delete on product_knowledge_sources to authenticated;
grant select, insert, update, delete on product_knowledge_item_sources to authenticated;
grant select, insert, update, delete on product_knowledge_resource_links to authenticated;

drop policy if exists "authenticated manage product knowledge items" on product_knowledge_items;
create policy "authenticated manage product knowledge items"
  on product_knowledge_items
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage product knowledge sources" on product_knowledge_sources;
create policy "authenticated manage product knowledge sources"
  on product_knowledge_sources
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage product knowledge item sources" on product_knowledge_item_sources;
create policy "authenticated manage product knowledge item sources"
  on product_knowledge_item_sources
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage product knowledge resource links" on product_knowledge_resource_links;
create policy "authenticated manage product knowledge resource links"
  on product_knowledge_resource_links
  for all
  to authenticated
  using (true)
  with check (true);

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
left join vendors v on v.id = mcv.vendor_id;

grant select on all_expenses_overview to authenticated;

-- Knowledge approval convention:
-- Product knowledge external-use approvals should use approval_requests with:
-- entity_type = 'knowledge_item'
-- entity_id = product_knowledge_items.id
-- title/summary/amount/due_date as submission snapshots.
--
-- Optional smoke tests after running this migration:
-- select table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name in (
--     'product_knowledge_items',
--     'product_knowledge_sources',
--     'product_knowledge_item_sources',
--     'product_knowledge_resource_links'
--   );
--
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'marketing_campaign_vendors'
--   and column_name = 'payment_date';
--
-- select source_table, title, amount, payment_status, payment_date
-- from all_expenses_overview
-- order by payment_date desc nulls last, created_at desc
-- limit 20;
