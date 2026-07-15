-- Phase 1 Batch 3: campaign vendors and deliverables.
-- Safe incremental migration:
-- - Adds three new tables for project-level vendor management.
-- - Adds vendor/deliverable links to existing marketing campaign documents.
-- - Expands the existing document type check constraint to support vendor files.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vendor_type text,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_campaign_vendors (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references marketing_campaigns(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete restrict,
  role_in_project text,
  meisun_contact citext references app_user_access(email),
  quote_status text default '待報價',
  budget_amount numeric,
  actual_amount numeric,
  payment_status text default '未請款',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_campaign_vendor_deliverables (
  id uuid primary key default gen_random_uuid(),
  campaign_vendor_id uuid not null references marketing_campaign_vendors(id) on delete cascade,
  deliverable_name text not null,
  owner citext references app_user_access(email),
  due_date date,
  status text default '未開始',
  reviewer citext references app_user_access(email),
  attachment text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendors_type
  on vendors(vendor_type);

create index if not exists idx_marketing_campaign_vendors_campaign
  on marketing_campaign_vendors(campaign_id);

create index if not exists idx_marketing_campaign_vendors_vendor
  on marketing_campaign_vendors(vendor_id);

create index if not exists idx_marketing_campaign_vendor_deliverables_cv
  on marketing_campaign_vendor_deliverables(campaign_vendor_id);

create index if not exists idx_marketing_campaign_vendor_deliverables_status
  on marketing_campaign_vendor_deliverables(status, due_date);

alter table vendors enable row level security;
alter table marketing_campaign_vendors enable row level security;
alter table marketing_campaign_vendor_deliverables enable row level security;

grant select, insert, update, delete on vendors to authenticated;
grant select, insert, update, delete on marketing_campaign_vendors to authenticated;
grant select, insert, update, delete on marketing_campaign_vendor_deliverables to authenticated;

drop policy if exists "authenticated manage vendors" on vendors;
create policy "authenticated manage vendors"
  on vendors
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage campaign vendors" on marketing_campaign_vendors;
create policy "authenticated manage campaign vendors"
  on marketing_campaign_vendors
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage campaign vendor deliverables" on marketing_campaign_vendor_deliverables;
create policy "authenticated manage campaign vendor deliverables"
  on marketing_campaign_vendor_deliverables
  for all
  to authenticated
  using (true)
  with check (true);

alter table marketing_campaign_documents
  add column if not exists vendor_id uuid references marketing_campaign_vendors(id) on delete set null;

alter table marketing_campaign_documents
  add column if not exists deliverable_id uuid references marketing_campaign_vendor_deliverables(id) on delete set null;

create index if not exists idx_marketing_campaign_documents_vendor
  on marketing_campaign_documents(vendor_id);

create index if not exists idx_marketing_campaign_documents_deliverable
  on marketing_campaign_documents(deliverable_id);

alter table marketing_campaign_documents
  drop constraint if exists marketing_campaign_documents_doc_type_check;

alter table marketing_campaign_documents
  add constraint marketing_campaign_documents_doc_type_check
  check (doc_type in (
    '報價單',
    '合約',
    '設計稿',
    '印刷檔',
    '施工照片',
    '完工照片',
    '攤位設計圖',
    '大會文件',
    '廠商資料',
    '其他'
  ));

-- Batch 6 note:
-- Include marketing_campaign_vendors.budget_amount / actual_amount in all_expenses_overview.
--
-- Optional smoke tests after running this migration:
-- select table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name in ('vendors', 'marketing_campaign_vendors', 'marketing_campaign_vendor_deliverables');
--
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.marketing_campaign_documents'::regclass
--   and conname = 'marketing_campaign_documents_doc_type_check';
