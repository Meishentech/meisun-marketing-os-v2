-- Phase 1 Batch 17S: tighten unauthenticated Data API access.
--
-- Purpose:
-- - Keep V1/V2 logged-in users working through the authenticated role.
-- - Remove direct anon/public REST access to Marketing OS business tables and views.
-- - Keep app_user_access on column-level grants only.
--
-- Review before running live:
-- - This does not alter table columns, constraints, FK cascade behavior, or RLS policies.
-- - It only changes schema privileges for anon/public/authenticated.
-- - Storage bucket policies are not changed here; validate separately if needed.

do $$
declare
  rw_tables text[] := array[
    'marketing_campaigns',
    'marketing_content_drafts',
    'marketing_campaign_tasks',
    'marketing_campaign_budget_items',
    'marketing_campaign_documents',
    'marketing_campaign_risks',
    'marketing_campaign_risk_updates',
    'marketing_campaign_performance',
    'marketing_resources',
    'marketing_case_studies',
    'marketing_news_keywords',
    'associations',
    'association_fee_records',
    'association_benefits',
    'association_publication_schedules',
    'association_events',
    'association_notes',
    'association_tasks',
    'association_task_expenses',
    'association_relationship_tags',
    'leads',
    'lead_follow_ups',
    'sales_requests',
    'approval_requests',
    'vendors',
    'marketing_campaign_vendors',
    'marketing_campaign_vendor_deliverables',
    'product_knowledge_items',
    'product_knowledge_sources',
    'product_knowledge_item_sources',
    'product_knowledge_resource_links',
    'tender_projects',
    'tender_keywords',
    'tender_results',
    'tender_scan_runs'
  ];
  limited_tables text[] := array[
    'association_stage_options'
  ];
  readonly_views text[] := array[
    'association_cooperation_overview',
    'all_expenses_overview'
  ];
  rel text;
begin
  foreach rel in array rw_tables loop
    if to_regclass(format('public.%I', rel)) is not null then
      execute format('alter table public.%I enable row level security', rel);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', rel);
      execute format('revoke all privileges on table public.%I from anon', rel);
      execute format('revoke all privileges on table public.%I from public', rel);
    end if;
  end loop;

  foreach rel in array limited_tables loop
    if to_regclass(format('public.%I', rel)) is not null then
      execute format('alter table public.%I enable row level security', rel);
      execute format('grant select, insert, update on table public.%I to authenticated', rel);
      execute format('revoke delete on table public.%I from authenticated', rel);
      execute format('revoke all privileges on table public.%I from anon', rel);
      execute format('revoke all privileges on table public.%I from public', rel);
    end if;
  end loop;

  foreach rel in array readonly_views loop
    if to_regclass(format('public.%I', rel)) is not null then
      execute format('grant select on table public.%I to authenticated', rel);
      execute format('revoke all privileges on table public.%I from anon', rel);
      execute format('revoke all privileges on table public.%I from public', rel);
    end if;
  end loop;

  if to_regclass('public.app_user_access') is not null then
    alter table public.app_user_access enable row level security;
    revoke all privileges on table public.app_user_access from anon;
    revoke all privileges on table public.app_user_access from public;
    revoke all privileges on table public.app_user_access from authenticated;
    grant select (email, display_name, role, is_active, must_change_password)
      on table public.app_user_access
      to authenticated;
    grant update (must_change_password, updated_at)
      on table public.app_user_access
      to authenticated;
  end if;
end $$;

notify pgrst, 'reload schema';

-- Smoke test 1: anon should have no table/view privileges on target relations.
with targets(relation_name) as (
  values
    ('marketing_campaigns'),
    ('marketing_content_drafts'),
    ('marketing_campaign_tasks'),
    ('marketing_campaign_budget_items'),
    ('marketing_campaign_documents'),
    ('marketing_campaign_risks'),
    ('marketing_campaign_risk_updates'),
    ('marketing_campaign_performance'),
    ('marketing_resources'),
    ('marketing_case_studies'),
    ('marketing_news_keywords'),
    ('associations'),
    ('association_fee_records'),
    ('association_benefits'),
    ('association_publication_schedules'),
    ('association_events'),
    ('association_notes'),
    ('association_tasks'),
    ('association_task_expenses'),
    ('association_relationship_tags'),
    ('association_stage_options'),
    ('association_cooperation_overview'),
    ('all_expenses_overview'),
    ('leads'),
    ('lead_follow_ups'),
    ('sales_requests'),
    ('approval_requests'),
    ('vendors'),
    ('marketing_campaign_vendors'),
    ('marketing_campaign_vendor_deliverables'),
    ('product_knowledge_items'),
    ('product_knowledge_sources'),
    ('product_knowledge_item_sources'),
    ('product_knowledge_resource_links'),
    ('tender_projects'),
    ('tender_keywords'),
    ('tender_results'),
    ('tender_scan_runs')
),
existing as (
  select
    relation_name,
    to_regclass(format('public.%I', relation_name)) as relation_regclass
  from targets
  where to_regclass(format('public.%I', relation_name)) is not null
)
select
  relation_name,
  has_table_privilege('anon', relation_regclass, 'select') as anon_select,
  has_table_privilege('anon', relation_regclass, 'insert') as anon_insert,
  has_table_privilege('anon', relation_regclass, 'update') as anon_update,
  has_table_privilege('anon', relation_regclass, 'delete') as anon_delete
from existing
order by relation_name;

-- Expected:
-- - All anon_* values are false.

-- Smoke test 2: authenticated should still have access to the main V2 relations.
with targets(relation_name, expected_delete) as (
  values
    ('marketing_campaigns', true),
    ('marketing_campaign_tasks', true),
    ('marketing_campaign_budget_items', true),
    ('marketing_campaign_documents', true),
    ('marketing_campaign_risks', true),
    ('marketing_campaign_risk_updates', true),
    ('marketing_campaign_performance', true),
    ('marketing_resources', true),
    ('associations', true),
    ('association_relationship_tags', true),
    ('association_stage_options', false),
    ('leads', true),
    ('sales_requests', true),
    ('approval_requests', true),
    ('vendors', true),
    ('marketing_campaign_vendors', true),
    ('marketing_campaign_vendor_deliverables', true),
    ('product_knowledge_items', true),
    ('product_knowledge_resource_links', true)
),
existing as (
  select
    relation_name,
    expected_delete,
    to_regclass(format('public.%I', relation_name)) as relation_regclass
  from targets
  where to_regclass(format('public.%I', relation_name)) is not null
)
select
  relation_name,
  has_table_privilege('authenticated', relation_regclass, 'select') as authenticated_select,
  has_table_privilege('authenticated', relation_regclass, 'insert') as authenticated_insert,
  has_table_privilege('authenticated', relation_regclass, 'update') as authenticated_update,
  has_table_privilege('authenticated', relation_regclass, 'delete') as authenticated_delete,
  expected_delete
from existing
order by relation_name;

-- Expected:
-- - authenticated_select/insert/update are true for listed tables.
-- - authenticated_delete is true except association_stage_options, where it should be false.

-- Smoke test 3: app_user_access remains column-limited.
select
  has_table_privilege('anon', 'public.app_user_access', 'select') as anon_can_select_app_user_access,
  has_column_privilege('authenticated', 'public.app_user_access', 'email', 'select') as auth_can_select_email,
  has_column_privilege('authenticated', 'public.app_user_access', 'display_name', 'select') as auth_can_select_display_name,
  has_column_privilege('authenticated', 'public.app_user_access', 'role', 'select') as auth_can_select_role,
  has_column_privilege('authenticated', 'public.app_user_access', 'is_active', 'select') as auth_can_select_is_active,
  has_column_privilege('authenticated', 'public.app_user_access', 'must_change_password', 'select') as auth_can_select_must_change_password,
  has_column_privilege('authenticated', 'public.app_user_access', 'must_change_password', 'update') as auth_can_update_must_change_password;

-- Expected:
-- - anon_can_select_app_user_access = false
-- - all auth_can_* values = true
