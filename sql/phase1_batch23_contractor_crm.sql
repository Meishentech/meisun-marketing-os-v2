-- Phase 1 Batch 23: contractor CRM foundation.
--
-- Purpose:
-- - Add marketing-owned contractor / engineer CRM tables.
-- - Support company master data, contacts, interactions, follow-ups, and import batches.
-- - Restrict reads to marketing/admin and executive; writes to marketing/admin only.
-- - Keep sales/member accounts from seeing this module in Phase 1.
--
-- Review before running live:
-- - Requires Batch 18B role helper functions to exist and be executable by authenticated.
-- - This file creates new tables only; it does not alter existing business tables.
-- - No DELETE privilege is granted. Companies/contacts are archived; interactions/follow-ups are cancelled.
-- - Parent-child FKs use ON DELETE SET NULL, not cascade, to preserve CRM history if a parent is ever removed by an owner-level operation.

do $$
begin
  if to_regprocedure('public.current_app_user_email()') is null
     or to_regprocedure('public.current_app_user_role()') is null
     or to_regprocedure('public.is_marketing_or_admin()') is null
     or to_regprocedure('public.is_executive()') is null then
    raise exception 'Batch 18B role helper functions are required before running Batch 23';
  end if;
end $$;

create table if not exists public.contractor_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  sheet_name text,
  imported_by citext references public.app_user_access(email) on delete set null,
  imported_at timestamptz not null default now(),
  row_count integer not null default 0,
  created_count integer not null default 0,
  matched_count integer not null default 0,
  skipped_count integer not null default 0,
  status text not null default '待審核',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractor_companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_type text,
  region text,
  address text,
  phone text,
  fax text,
  email text,
  website text,
  representative_name text,
  primary_contact_name text,
  mobile text,
  capital_amount_text text,
  annual_revenue_text text,
  employee_count_text text,
  contractor_grade text,
  dealer_brands text[] not null default '{}',
  preferred_brands text[] not null default '{}',
  project_experience text,
  relationship_status text not null default '待整理',
  potential_level text,
  owner citext references public.app_user_access(email) on delete set null,
  source_note text,
  import_batch_id uuid references public.contractor_import_batches(id) on delete set null,
  archived_at timestamptz,
  archived_by citext references public.app_user_access(email) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractor_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.contractor_companies(id) on delete set null,
  contact_name text not null,
  contact_type text,
  role_title text,
  phone text,
  mobile text,
  email text,
  line_id text,
  region text,
  engineer_level text,
  practice_status text,
  preferred_brands text[] not null default '{}',
  notes text,
  owner citext references public.app_user_access(email) on delete set null,
  import_batch_id uuid references public.contractor_import_batches(id) on delete set null,
  archived_at timestamptz,
  archived_by citext references public.app_user_access(email) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractor_interactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.contractor_companies(id) on delete set null,
  contact_id uuid references public.contractor_contacts(id) on delete set null,
  interaction_date date not null default current_date,
  interaction_type text,
  owner citext references public.app_user_access(email) on delete set null,
  summary text,
  customer_reaction text,
  mentioned_project text,
  competitor_info text,
  next_step text,
  next_followup_date date,
  potential_level text,
  needs_marketing_support boolean not null default false,
  import_batch_id uuid references public.contractor_import_batches(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by citext references public.app_user_access(email) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractor_followups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.contractor_companies(id) on delete set null,
  contact_id uuid references public.contractor_contacts(id) on delete set null,
  interaction_id uuid references public.contractor_interactions(id) on delete set null,
  title text not null,
  priority text not null default '一般',
  due_date date,
  status text not null default '待處理',
  owner citext references public.app_user_access(email) on delete set null,
  result_note text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by citext references public.app_user_access(email) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contractor_import_batches_imported_at
  on public.contractor_import_batches (imported_at desc);

create index if not exists idx_contractor_import_batches_status
  on public.contractor_import_batches (status);

create index if not exists idx_contractor_companies_active_name
  on public.contractor_companies (archived_at, company_name);

create index if not exists idx_contractor_companies_region_type
  on public.contractor_companies (region, company_type);

create index if not exists idx_contractor_companies_owner
  on public.contractor_companies (owner);

create index if not exists idx_contractor_companies_import_batch
  on public.contractor_companies (import_batch_id);

create index if not exists idx_contractor_contacts_company
  on public.contractor_contacts (company_id);

create index if not exists idx_contractor_contacts_name
  on public.contractor_contacts (contact_name);

create index if not exists idx_contractor_contacts_owner
  on public.contractor_contacts (owner);

create index if not exists idx_contractor_contacts_import_batch
  on public.contractor_contacts (import_batch_id);

create index if not exists idx_contractor_interactions_company_date
  on public.contractor_interactions (company_id, interaction_date desc);

create index if not exists idx_contractor_interactions_contact
  on public.contractor_interactions (contact_id);

create index if not exists idx_contractor_interactions_owner
  on public.contractor_interactions (owner);

create index if not exists idx_contractor_interactions_followup_date
  on public.contractor_interactions (cancelled_at, next_followup_date);

create index if not exists idx_contractor_interactions_import_batch
  on public.contractor_interactions (import_batch_id);

create index if not exists idx_contractor_followups_company
  on public.contractor_followups (company_id);

create index if not exists idx_contractor_followups_owner_due
  on public.contractor_followups (owner, due_date);

create index if not exists idx_contractor_followups_status_due
  on public.contractor_followups (cancelled_at, status, due_date);

do $$
declare
  crm_tables text[] := array[
    'contractor_import_batches',
    'contractor_companies',
    'contractor_contacts',
    'contractor_interactions',
    'contractor_followups'
  ];
  rel text;
  policy_record record;
begin
  foreach rel in array crm_tables loop
    execute format('alter table public.%I enable row level security', rel);
    execute format('grant select, insert, update on table public.%I to authenticated', rel);
    execute format('revoke delete on table public.%I from authenticated', rel);
    execute format('revoke all privileges on table public.%I from anon', rel);
    execute format('revoke all privileges on table public.%I from public', rel);

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = rel
    loop
      execute format('drop policy if exists %I on public.%I', policy_record.policyname, rel);
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_marketing_or_admin() or public.is_executive())',
      rel || '_select_staff_scope',
      rel
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_marketing_or_admin())',
      rel || '_insert_marketing_scope',
      rel
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_marketing_or_admin()) with check (public.is_marketing_or_admin())',
      rel || '_update_marketing_scope',
      rel
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Smoke test 1: grants are correct.
with targets(relation_name) as (
  values
    ('contractor_import_batches'),
    ('contractor_companies'),
    ('contractor_contacts'),
    ('contractor_interactions'),
    ('contractor_followups')
),
existing as (
  select
    relation_name,
    to_regclass(format('public.%I', relation_name)) as relation_regclass
  from targets
)
select
  relation_name,
  has_table_privilege('anon', relation_regclass, 'select') as anon_can_select,
  has_table_privilege('authenticated', relation_regclass, 'select') as auth_can_select,
  has_table_privilege('authenticated', relation_regclass, 'insert') as auth_can_insert,
  has_table_privilege('authenticated', relation_regclass, 'update') as auth_can_update,
  has_table_privilege('authenticated', relation_regclass, 'delete') as auth_can_delete
from existing
order by relation_name;

-- Expected:
-- - anon_can_select = false for every row.
-- - authenticated select/insert/update = true for every row.
-- - authenticated delete = false for every row.

-- Smoke test 2: policy counts by table.
select
  tablename,
  count(*) as policy_count,
  string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
  and tablename in (
    'contractor_import_batches',
    'contractor_companies',
    'contractor_contacts',
    'contractor_interactions',
    'contractor_followups'
  )
group by tablename
order by tablename;

-- Expected:
-- - every table has 3 policies: select/insert/update.
-- - no delete policy exists.

-- Smoke test 3: sales/member cannot read or write contractor CRM data.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- insert into public.contractor_companies (company_name, source_note)
-- values ('CRM smoke test company', 'rollback smoke test');
-- select set_config('request.jwt.claims', '{"email":"vincent@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update public.contractor_companies
--   set updated_at = updated_at
--   where company_name = 'CRM smoke test company'
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   (select count(*) from public.contractor_companies where company_name = 'CRM smoke test company') as visible_companies,
--   (select count(*) from attempted_update) as updated_companies;
-- rollback;
--
-- Expected:
-- - app_role = member.
-- - visible_companies = 0.
-- - updated_companies = 0.

-- Smoke test 4: executive can read contractor CRM data but cannot write it.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- insert into public.contractor_companies (company_name, source_note)
-- values ('CRM smoke test company', 'rollback smoke test');
-- select set_config('request.jwt.claims', '{"email":"kevin@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update public.contractor_companies
--   set updated_at = updated_at
--   where company_name = 'CRM smoke test company'
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   public.is_executive() as is_executive,
--   (select count(*) from public.contractor_companies where company_name = 'CRM smoke test company') as visible_companies,
--   (select count(*) from attempted_update) as updated_companies;
-- rollback;
--
-- Expected:
-- - is_executive = true.
-- - visible_companies = 1.
-- - updated_companies = 0.

-- Smoke test 5: marketing/admin can read and write contractor CRM data.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- insert into public.contractor_companies (company_name, source_note)
-- values ('CRM smoke test company', 'rollback smoke test');
-- select set_config('request.jwt.claims', '{"email":"eric@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update public.contractor_companies
--   set updated_at = now()
--   where company_name = 'CRM smoke test company'
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   public.is_marketing_or_admin() as is_marketing_or_admin,
--   (select count(*) from public.contractor_companies where company_name = 'CRM smoke test company') as visible_companies,
--   (select count(*) from attempted_update) as updated_companies;
-- rollback;
--
-- Expected:
-- - is_marketing_or_admin = true.
-- - visible_companies = 1.
-- - updated_companies = 1.

