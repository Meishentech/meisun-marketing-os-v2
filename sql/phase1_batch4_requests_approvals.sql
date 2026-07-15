-- Phase 1 Batch 4: sales requests and approval requests.
-- Safe incremental migration:
-- - Adds two new workflow tables.
-- - Does not alter existing v1 tables.
-- - Keeps resource linkage optional so requests can be completed before formal library publishing.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists sales_requests (
  id uuid primary key default gen_random_uuid(),
  request_name text not null,
  requested_by citext references app_user_access(email) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  request_type text,
  priority text not null default '一般',
  status text not null default '待處理',
  assigned_to citext references app_user_access(email) on delete set null,
  due_date date,
  description text,
  deliverable_resource_id uuid references marketing_resources(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  title text not null default '未命名審核',
  summary text,
  amount numeric,
  due_date date,
  requested_by citext references app_user_access(email) on delete set null,
  approver_role text not null,
  status text not null default '待審核',
  decided_by citext references app_user_access(email) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_requests_status_priority
  on sales_requests(status, priority, due_date);

create index if not exists idx_sales_requests_requested_by
  on sales_requests(requested_by, created_at desc);

create index if not exists idx_sales_requests_assigned_to
  on sales_requests(assigned_to, status, due_date);

create index if not exists idx_sales_requests_lead
  on sales_requests(lead_id);

create index if not exists idx_approval_requests_entity
  on approval_requests(entity_type, entity_id);

create index if not exists idx_approval_requests_status_role
  on approval_requests(status, approver_role, due_date);

create index if not exists idx_approval_requests_requested_by
  on approval_requests(requested_by, created_at desc);

alter table sales_requests enable row level security;
alter table approval_requests enable row level security;

grant select, insert, update, delete on sales_requests to authenticated;
grant select, insert, update, delete on approval_requests to authenticated;

drop policy if exists "authenticated manage sales requests" on sales_requests;
create policy "authenticated manage sales requests"
  on sales_requests
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage approval requests" on approval_requests;
create policy "authenticated manage approval requests"
  on approval_requests
  for all
  to authenticated
  using (true)
  with check (true);

-- Batch 4 integration note:
-- Vendor quote approvals should use entity_type = 'vendor_quote'
-- and entity_id = marketing_campaign_vendors.id.
--
-- Optional smoke tests after running this migration:
-- select table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name in ('sales_requests', 'approval_requests');
--
-- select id, request_name, status from sales_requests order by created_at desc limit 5;
-- select id, entity_type, title, status from approval_requests order by created_at desc limit 5;
