# Codex Overnight Handoff - 2026-07-20

## Completed Commits

1. `24f6b7e` - Fix vendor deliverable table rendering.
   - Fixed raw HTML showing in the vendor deliverables table.
   - Added explicit trusted-table-cell rendering so only approved HTML cells render as HTML.
   - Escaped deliverable text fields before wrapping trusted HTML.

2. `6ee32e2` - Draft marketing core RLS policies.
   - Added `sql/phase1_batch18e_marketing_core_rls.sql`.
   - Restricts writes for marketing core tables, vendors, resources, and knowledge tables to marketing/admin.
   - Keeps conservative read paths for frontend compatibility.

3. `c0d656f` - Draft association RLS policies.
   - Added `sql/phase1_batch18f_association_rls.sql`.
   - Restricts association data to marketing/admin and executive reads.
   - Blocks sales/member from reading or writing association data.

4. `fa9fdb2` - Draft storage RLS policies.
   - Added `sql/phase1_batch18g_storage_rls.sql`.
   - Replaces broad authenticated Storage policies for `marketing-resource-files` and `campaign-documents`.
   - Keeps upload/delete object operations available only to marketing/admin for rollback and cleanup.

5. `77c53c5` - Fix approval withdrawal trigger guard.
   - Updated only `sql/phase1_batch18d_approval_requests_rls.sql`.
   - Moved `status` handling out of the generic marketing/admin decision-field block so `status = '已撤回'` can be handled by the dedicated withdrawal guard.
   - Smoke test 4 is the key live check for this fix.

## Live SQL Status

Already confirmed by user screenshots:

- Batch 18B role helper SQL: live and smoke tested.
- Batch 18C sales data RLS SQL: live and smoke tested.

Not yet live:

- Batch 18D: `sql/phase1_batch18d_approval_requests_rls.sql`
- Batch 18E: `sql/phase1_batch18e_marketing_core_rls.sql`
- Batch 18F: `sql/phase1_batch18f_association_rls.sql`
- Batch 18G: `sql/phase1_batch18g_storage_rls.sql`

## Required Execution Order

Run only after Claude review:

1. 18D approval requests.
2. 18E marketing core.
3. 18F association.
4. 18G Storage.

18G should run after 18E because its `marketing-resource-files` select policy checks `marketing_resources.deleted_at` and `is_external_usable`.

## Claude Review Focus

For 18D:

- Confirm trigger allows marketing/admin to withdraw own open approvals with `status = '已撤回'`.
- Confirm only executive can write decision fields.
- Confirm `approval_requests` delete remains revoked.

For 18E:

- Confirm broad marketing core SELECT is intentional for Phase 1 frontend compatibility.
- Confirm `product_knowledge_resource_links` keeps DELETE only for marketing/admin.
- Confirm sales/member can read effective resources and usable knowledge, but cannot write.

For 18F:

- Confirm sales/member cannot read association tables or `association_cooperation_overview`.
- Confirm executive read-only access works.
- Confirm `association_relationship_tags` DELETE remains only for marketing/admin.

For 18G:

- Confirm Storage policy syntax on `storage.objects`.
- Confirm signed URL generation still works after policies are tightened.
- Confirm sales/member can download only externally usable resource files and cannot download campaign documents.
- Confirm marketing/admin upload and rollback delete still work.

## Current Blocker

Codex cannot safely execute live Supabase SQL from this workspace because no Supabase admin/service execution channel is available.

Attempted on 2026-07-21:

- Supabase MCP `_get_project("apgrclmrkarxlajmhnpa")` returned permission denied.
- Local Supabase CLI is installed (`2.109.0`) and logged in, but `supabase projects list` does not include the Marketing OS project ref `apgrclmrkarxlajmhnpa`.

The SQL files and smoke tests are ready for Supabase SQL Editor execution after review.

## Local State Notes

Untracked files intentionally left untouched:

- `.claude/`
- `docs/CLAUDE_CODE_REVIEW_BATCH13B_TO_15_SWEEP.md`
- `docs/CLAUDE_CODE_REVIEW_V1_FULL_FREEZE_RESULT.md`
