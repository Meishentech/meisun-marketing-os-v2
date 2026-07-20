-- Phase 1 Batch 18E: marketing core RLS tightening.
--
-- Purpose:
-- - Keep Batch 17S anon/public lockdown intact.
-- - Tighten writes on V2-managed marketing core tables to marketing/admin only.
-- - Keep executive and sales/member read paths working where the current frontend
--   expects broad read access.
-- - Apply stricter read filters to product knowledge and marketing resources.
--
-- Review before running live:
-- - Requires Batch 18B helper functions to exist and be executable by authenticated.
-- - This file does not alter columns, constraints, FK cascade behavior, views, or Storage.
-- - Storage policies are intentionally out of scope and remain Batch 18G.
-- - product_knowledge_resource_links keeps DELETE for marketing/admin because the V2
--   knowledge UI removes links by deleting rows from the junction table.

do $$
begin
  if to_regprocedure('public.current_app_user_email()') is null
     or to_regprocedure('public.current_app_user_role()') is null
     or to_regprocedure('public.is_marketing_or_admin()') is null
     or to_regprocedure('public.is_executive()') is null then
    raise exception 'Batch 18B role helper functions are required before running Batch 18E';
  end if;
end $$;

do $$
declare
  rw_tables text[] := array[
    'marketing_campaigns',
    'marketing_campaign_tasks',
    'marketing_campaign_budget_items',
    'marketing_campaign_documents',
    'marketing_campaign_risks',
    'marketing_campaign_risk_updates',
    'marketing_campaign_performance',
    'vendors',
    'marketing_campaign_vendors',
    'marketing_campaign_vendor_deliverables'
  ];
  knowledge_admin_tables text[] := array[
    'product_knowledge_sources',
    'product_knowledge_item_sources'
  ];
  rel text;
  policy_record record;
begin
  foreach rel in array rw_tables loop
    if to_regclass(format('public.%I', rel)) is not null then
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
        'create policy %I on public.%I for select to authenticated using (true)',
        rel || '_select_authenticated',
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
    end if;
  end loop;

  foreach rel in array knowledge_admin_tables loop
    if to_regclass(format('public.%I', rel)) is not null then
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
    end if;
  end loop;
end $$;

alter table public.marketing_resources enable row level security;
alter table public.product_knowledge_items enable row level security;
alter table public.product_knowledge_resource_links enable row level security;

grant select, insert, update on table public.marketing_resources to authenticated;
grant select, insert, update on table public.product_knowledge_items to authenticated;
grant select, insert, update, delete on table public.product_knowledge_resource_links to authenticated;

revoke delete on table public.marketing_resources from authenticated;
revoke delete on table public.product_knowledge_items from authenticated;

revoke all privileges on table public.marketing_resources from anon;
revoke all privileges on table public.marketing_resources from public;
revoke all privileges on table public.product_knowledge_items from anon;
revoke all privileges on table public.product_knowledge_items from public;
revoke all privileges on table public.product_knowledge_resource_links from anon;
revoke all privileges on table public.product_knowledge_resource_links from public;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'marketing_resources',
        'product_knowledge_items',
        'product_knowledge_resource_links'
      )
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end $$;

-- marketing_resources:
-- - marketing/admin and executive can read all rows, including archived history.
-- - sales/member can read active rows only.
-- - only marketing/admin can write.
create policy marketing_resources_select_role_scope
  on public.marketing_resources
  for select
  to authenticated
  using (
    public.is_marketing_or_admin()
    or public.is_executive()
    or deleted_at is null
  );

create policy marketing_resources_insert_marketing_scope
  on public.marketing_resources
  for insert
  to authenticated
  with check (public.is_marketing_or_admin());

create policy marketing_resources_update_marketing_scope
  on public.marketing_resources
  for update
  to authenticated
  using (public.is_marketing_or_admin())
  with check (public.is_marketing_or_admin());

-- product_knowledge_items:
-- - marketing/admin and executive can read all rows.
-- - sales/member can read only externally usable or internal-use rows.
-- - only marketing/admin can write.
create policy product_knowledge_items_select_role_scope
  on public.product_knowledge_items
  for select
  to authenticated
  using (
    public.is_marketing_or_admin()
    or public.is_executive()
    or visibility_status in ('可對外', '僅內部')
  );

create policy product_knowledge_items_insert_marketing_scope
  on public.product_knowledge_items
  for insert
  to authenticated
  with check (public.is_marketing_or_admin());

create policy product_knowledge_items_update_marketing_scope
  on public.product_knowledge_items
  for update
  to authenticated
  using (public.is_marketing_or_admin())
  with check (public.is_marketing_or_admin());

-- product_knowledge_resource_links:
-- - marketing/admin and executive can read all links.
-- - sales/member can read links only when both sides are visible to them.
-- - marketing/admin can add/update/remove links.
create policy product_knowledge_resource_links_select_role_scope
  on public.product_knowledge_resource_links
  for select
  to authenticated
  using (
    public.is_marketing_or_admin()
    or public.is_executive()
    or (
      exists (
        select 1
        from public.product_knowledge_items pki
        where pki.id = knowledge_item_id
          and pki.visibility_status in ('可對外', '僅內部')
      )
      and exists (
        select 1
        from public.marketing_resources mr
        where mr.id = resource_id
          and mr.deleted_at is null
      )
    )
  );

create policy product_knowledge_resource_links_insert_marketing_scope
  on public.product_knowledge_resource_links
  for insert
  to authenticated
  with check (public.is_marketing_or_admin());

create policy product_knowledge_resource_links_update_marketing_scope
  on public.product_knowledge_resource_links
  for update
  to authenticated
  using (public.is_marketing_or_admin())
  with check (public.is_marketing_or_admin());

create policy product_knowledge_resource_links_delete_marketing_scope
  on public.product_knowledge_resource_links
  for delete
  to authenticated
  using (public.is_marketing_or_admin());

notify pgrst, 'reload schema';

-- Smoke test 1: grants are tightened; DELETE remains only for the link junction.
with targets(relation_name, expected_delete) as (
  values
    ('marketing_campaigns', false),
    ('marketing_campaign_tasks', false),
    ('marketing_campaign_budget_items', false),
    ('marketing_campaign_documents', false),
    ('marketing_campaign_risks', false),
    ('marketing_campaign_risk_updates', false),
    ('marketing_campaign_performance', false),
    ('vendors', false),
    ('marketing_campaign_vendors', false),
    ('marketing_campaign_vendor_deliverables', false),
    ('marketing_resources', false),
    ('product_knowledge_items', false),
    ('product_knowledge_sources', false),
    ('product_knowledge_item_sources', false),
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
  has_table_privilege('anon', relation_regclass, 'select') as anon_can_select,
  has_table_privilege('authenticated', relation_regclass, 'select') as auth_can_select,
  has_table_privilege('authenticated', relation_regclass, 'insert') as auth_can_insert,
  has_table_privilege('authenticated', relation_regclass, 'update') as auth_can_update,
  has_table_privilege('authenticated', relation_regclass, 'delete') as auth_can_delete,
  expected_delete
from existing
order by relation_name;

-- Expected:
-- - anon_can_select = false for every row.
-- - authenticated select/insert/update = true for every row.
-- - auth_can_delete = expected_delete.

-- Smoke test 2: policy counts by table.
select
  tablename,
  count(*) as policy_count,
  string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
  and tablename in (
    'marketing_campaigns',
    'marketing_campaign_tasks',
    'marketing_campaign_budget_items',
    'marketing_campaign_documents',
    'marketing_campaign_risks',
    'marketing_campaign_risk_updates',
    'marketing_campaign_performance',
    'vendors',
    'marketing_campaign_vendors',
    'marketing_campaign_vendor_deliverables',
    'marketing_resources',
    'product_knowledge_items',
    'product_knowledge_sources',
    'product_knowledge_item_sources',
    'product_knowledge_resource_links'
  )
group by tablename
order by tablename;

-- Expected:
-- - standard core tables: 3 policies each (select/insert/update).
-- - product_knowledge_resource_links: 4 policies (select/insert/update/delete).
-- - no old "authenticated manage ..." policies remain.

-- Smoke test 3: sales/member can read campaigns but cannot write them.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"vincent@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update public.marketing_campaigns
--   set status = status
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   (select count(*) from public.marketing_campaigns) as visible_campaigns,
--   (select count(*) from attempted_update) as updated_campaigns;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - app_role = member.
-- - visible_campaigns returns a count.
-- - updated_campaigns = 0.

-- Smoke test 4: executive can read but cannot write marketing resources.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"kevin@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update public.marketing_resources
--   set updated_at = updated_at
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   public.is_executive() as is_executive,
--   (select count(*) from public.marketing_resources) as visible_resources,
--   (select count(*) from attempted_update) as updated_resources;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - is_executive = true.
-- - visible_resources returns a count.
-- - updated_resources = 0.

-- Smoke test 5: sales/member cannot see forbidden knowledge items.
-- This creates temporary test rows and rolls them back.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"eric@mcttw.com.tw"}', true);
-- set local role authenticated;
-- insert into public.product_knowledge_items (
--   title,
--   product_line,
--   knowledge_type,
--   summary,
--   evidence_level,
--   visibility_status,
--   owner
-- )
-- values
--   ('18E visible knowledge smoke', '測試', '市場差異化', 'Visible to sales', 'C', '可對外', public.current_app_user_email()),
--   ('18E blocked knowledge smoke', '測試', '市場差異化', 'Blocked from sales', 'C', '禁止使用', public.current_app_user_email());
--
-- select set_config('request.jwt.claims', '{"email":"vincent@mcttw.com.tw"}', true);
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   count(*) filter (where title = '18E visible knowledge smoke') as visible_test_rows,
--   count(*) filter (where title = '18E blocked knowledge smoke') as blocked_test_rows
-- from public.product_knowledge_items
-- where title in ('18E visible knowledge smoke', '18E blocked knowledge smoke');
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - app_role = member.
-- - visible_test_rows = 1.
-- - blocked_test_rows = 0.
