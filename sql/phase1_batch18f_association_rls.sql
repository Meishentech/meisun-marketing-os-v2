-- Phase 1 Batch 18F: association data RLS tightening.
--
-- Purpose:
-- - Keep Batch 17S anon/public lockdown intact.
-- - Restrict association data to marketing/admin and executive read paths.
-- - Allow only marketing/admin to create or update association data.
-- - Keep sales/member accounts from reading or writing association data.
--
-- Review before running live:
-- - Requires Batch 18B helper functions to exist and be executable by authenticated.
-- - This file does not alter columns, constraints, FK cascade behavior, or view definitions.
-- - Views stay security_invoker from Batch 17B; this file only confirms view grants.
-- - association_relationship_tags keeps DELETE for marketing/admin because the V2 tag UI
--   removes tags by deleting rows from the tag junction table.

do $$
begin
  if to_regprocedure('public.current_app_user_email()') is null
     or to_regprocedure('public.current_app_user_role()') is null
     or to_regprocedure('public.is_marketing_or_admin()') is null
     or to_regprocedure('public.is_executive()') is null then
    raise exception 'Batch 18B role helper functions are required before running Batch 18F';
  end if;
end $$;

do $$
declare
  soft_lifecycle_tables text[] := array[
    'associations',
    'association_tasks',
    'association_task_expenses',
    'association_events',
    'association_publication_schedules',
    'association_fee_records',
    'association_benefits',
    'association_notes'
  ];
  limited_tables text[] := array[
    'association_stage_options'
  ];
  delete_junction_tables text[] := array[
    'association_relationship_tags'
  ];
  readonly_views text[] := array[
    'association_cooperation_overview',
    'all_expenses_overview'
  ];
  rel text;
  policy_record record;
begin
  foreach rel in array soft_lifecycle_tables loop
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

  foreach rel in array limited_tables loop
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

  foreach rel in array delete_junction_tables loop
    if to_regclass(format('public.%I', rel)) is not null then
      execute format('alter table public.%I enable row level security', rel);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', rel);
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
      execute format(
        'create policy %I on public.%I for delete to authenticated using (public.is_marketing_or_admin())',
        rel || '_delete_marketing_scope',
        rel
      );
    end if;
  end loop;

  foreach rel in array readonly_views loop
    if to_regclass(format('public.%I', rel)) is not null then
      execute format('grant select on table public.%I to authenticated', rel);
      execute format('revoke all privileges on table public.%I from anon', rel);
      execute format('revoke all privileges on table public.%I from public', rel);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Smoke test 1: grants are tightened.
with targets(relation_name, expected_delete) as (
  values
    ('associations', false),
    ('association_tasks', false),
    ('association_task_expenses', false),
    ('association_events', false),
    ('association_publication_schedules', false),
    ('association_fee_records', false),
    ('association_benefits', false),
    ('association_notes', false),
    ('association_stage_options', false),
    ('association_relationship_tags', true),
    ('association_cooperation_overview', false),
    ('all_expenses_overview', false)
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
-- - authenticated select = true for every row.
-- - authenticated insert/update = true for tables, false for views.
-- - auth_can_delete = true only for association_relationship_tags.

-- Smoke test 2: policy counts by table.
select
  tablename,
  count(*) as policy_count,
  string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
  and tablename in (
    'associations',
    'association_tasks',
    'association_task_expenses',
    'association_events',
    'association_publication_schedules',
    'association_fee_records',
    'association_benefits',
    'association_notes',
    'association_stage_options',
    'association_relationship_tags'
  )
group by tablename
order by tablename;

-- Expected:
-- - association_relationship_tags: 4 policies (select/insert/update/delete).
-- - every other association table: 3 policies (select/insert/update).
-- - no old "authenticated manage ..." policies remain.

-- Smoke test 3: sales/member cannot read or write association data.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"vincent@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update public.associations
--   set name = name
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   (select count(*) from public.associations) as visible_associations,
--   (select count(*) from public.association_cooperation_overview) as visible_cooperation_rows,
--   (select count(*) from attempted_update) as updated_associations;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - app_role = member.
-- - visible_associations = 0.
-- - visible_cooperation_rows = 0.
-- - updated_associations = 0.

-- Smoke test 4: executive can read association data but cannot write it.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"kevin@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update public.associations
--   set name = name
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   public.is_executive() as is_executive,
--   (select count(*) from public.associations) as visible_associations,
--   (select count(*) from public.association_cooperation_overview) as visible_cooperation_rows,
--   (select count(*) from attempted_update) as updated_associations;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - is_executive = true.
-- - visible_associations returns the live count.
-- - visible_cooperation_rows returns the live count.
-- - updated_associations = 0.

-- Smoke test 5: admin can read and write association data.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"eric@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update public.associations
--   set name = name
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   public.is_marketing_or_admin() as is_marketing_or_admin,
--   (select count(*) from public.associations) as visible_associations,
--   (select count(*) from attempted_update) as updated_associations;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - is_marketing_or_admin = true.
-- - visible_associations returns the live count.
-- - updated_associations equals visible_associations when there are existing rows.
