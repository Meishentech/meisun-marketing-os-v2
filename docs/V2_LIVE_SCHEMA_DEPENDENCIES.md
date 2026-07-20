# V2 Live Schema Dependencies

建立日期：2026-07-20

用途：列出 V2 前端目前依賴的 live Supabase 欄位、資料表、view 與對應 SQL 檔。每次前端出現 `PGRST204`、`relation does not exist`、空白資料或寫入失敗時，先用本文件確認 live schema 是否真的已套用。

## 使用原則

- 「SQL 檔已存在 / commit 已推送」不代表 live Supabase 已執行。
- 每次新增或修改 SQL 後，需在 Supabase SQL Editor 跑完 migration，再跑本文件的 smoke test。
- Smoke test 若只回 `Success. No rows returned`，只代表語句可執行；欄位驗證應看到實際欄位列或筆數。
- 新增 view 後要確認 `security_invoker = true` 與 `grant select ... to authenticated`。
- 新增欄位後若前端仍報錯，先執行 `notify pgrst, 'reload schema';` 或等待 PostgREST schema cache 更新。

## 核心依賴總表

| 功能 | 表 / View | 前端依賴 | SQL 檔 | Live 狀態 |
| --- | --- | --- | --- | --- |
| 行銷案封存 | `marketing_campaigns` | `archived_at`, `archived_by`, `archive_reason` | `sql/phase1_batch11b_campaign_archive.sql` | 已執行過，需依 smoke test 定期確認 |
| 任務取消 | `marketing_campaign_tasks` | `cancelled_at`, `cancelled_by`, `cancel_reason` | `sql/phase1_batch13b_campaign_detail_lifecycle.sql` | 已補跑 live 後驗收 |
| 預算付款 / 取消 | `marketing_campaign_budget_items` | `payment_status`, `payment_date`, `cancelled_at`, `cancelled_by`, `cancel_reason` | `sql/phase1_batch5_expense_prereq.sql`, `sql/phase1_batch13b_campaign_detail_lifecycle.sql` | 已補跑 live 後驗收 |
| 文件廠商關聯 / 封存 | `marketing_campaign_documents` | `vendor_id`, `deliverable_id`, `archived_at`, `archived_by`, `archive_reason` | `sql/phase1_batch3_vendors.sql`, `sql/phase1_batch13b_campaign_detail_lifecycle.sql` | 已補跑 live 後驗收 |
| 風險封存 | `marketing_campaign_risks` | `archived_at`, `archived_by`, `archive_reason` | `sql/phase1_batch14b_risk_lifecycle.sql` | 已由 live smoke test 確認 `risk_count=12` |
| 追蹤紀錄取消 | `marketing_campaign_risk_updates` | `cancelled_at`, `cancelled_by`, `cancel_reason` | `sql/phase1_batch14b_risk_lifecycle.sql` | 已由 live smoke test 確認 `risk_update_count=5` |
| 成效 Channel | `marketing_campaign_performance` | `channel` | `sql/phase1_batch14c_performance_channel.sql` | 已由 live smoke test 確認 `performance_count=1` |
| 資源封存 | `marketing_resources` | `deleted_at`, `deleted_by` | `sql/phase1_batch10_resource_archive.sql` | 已執行過，需依 smoke test 定期確認 |
| 業務需求取消 | `sales_requests` | `cancelled_at`, `cancelled_by` | `sql/phase1_batch6a_sales_request_cancel.sql` | 已執行過，需依 smoke test 定期確認 |
| 廠商取消 / 付款 | `marketing_campaign_vendors` | `payment_date`, `cancelled_at`, `cancelled_by`, `cancel_reason` | `sql/phase1_batch5_knowledge_expenses.sql`, `sql/phase1_batch6c_vendor_lifecycle.sql` | 已執行過，需依 smoke test 定期確認 |
| 交付物取消 | `marketing_campaign_vendor_deliverables` | `cancelled_at`, `cancelled_by`, `cancel_reason` | `sql/phase1_batch6c_vendor_lifecycle.sql` | 已執行過，需依 smoke test 定期確認 |
| 產品知識庫 | `product_knowledge_items` | `detail`, `recommended_pitch`, `prohibited_pitch`, `related_competitor`, `visibility_status`, `evidence_level` | `sql/phase1_batch5_knowledge_expenses.sql` | 已執行過，需依 smoke test 定期確認 |
| 知識庫資源連結 | `product_knowledge_resource_links` | `knowledge_item_id`, `resource_id`, unique pair | `sql/phase1_batch5_knowledge_expenses.sql` | 已執行過，需依 smoke test 定期確認 |
| 支出彙總 | `all_expenses_overview` | `source_id`, `source_table`, `title`, `amount`, `payment_status`, `payment_date`, `campaign_id`, `vendor_id` | `sql/phase1_batch13b_campaign_detail_lifecycle.sql` 最新重建版 | 已補跑 live 後驗收 |

## 必跑 Smoke Test

### 行銷案 / 任務 / 預算 / 文件

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'marketing_campaigns' and column_name in ('archived_at', 'archived_by', 'archive_reason'))
    or (table_name = 'marketing_campaign_tasks' and column_name in ('cancelled_at', 'cancelled_by', 'cancel_reason'))
    or (table_name = 'marketing_campaign_budget_items' and column_name in ('payment_status', 'payment_date', 'cancelled_at', 'cancelled_by', 'cancel_reason'))
    or (table_name = 'marketing_campaign_documents' and column_name in ('vendor_id', 'deliverable_id', 'archived_at', 'archived_by', 'archive_reason'))
  )
order by table_name, column_name;
```

預期：共 16 列。

### 風險 / 追蹤

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'marketing_campaign_risks' and column_name in ('archived_at', 'archived_by', 'archive_reason'))
    or (table_name = 'marketing_campaign_risk_updates' and column_name in ('cancelled_at', 'cancelled_by', 'cancel_reason'))
  )
order by table_name, column_name;

select
  (select count(*) from marketing_campaign_risks) as risk_count,
  (select count(*) from marketing_campaign_risk_updates) as risk_update_count;
```

預期：第一段 6 列；第二段回傳實際筆數。

### 成效 / Channel

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'marketing_campaign_performance'
  and column_name in (
    'channel',
    'reach_count',
    'lead_count',
    'inquiry_count',
    'qualified_lead_count',
    'estimated_opportunity_amount',
    'deal_count',
    'deal_amount',
    'notes'
  )
order by column_name;

select count(*) as performance_count
from marketing_campaign_performance;
```

預期：第一段 9 列；第二段回傳實際筆數。

### 文宣資源 / 業務需求

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'marketing_resources' and column_name in ('deleted_at', 'deleted_by'))
    or (table_name = 'sales_requests' and column_name in ('cancelled_at', 'cancelled_by'))
  )
order by table_name, column_name;
```

預期：共 4 列。

### 廠商 / 交付物

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'marketing_campaign_vendors' and column_name in ('payment_date', 'cancelled_at', 'cancelled_by', 'cancel_reason'))
    or (table_name = 'marketing_campaign_vendor_deliverables' and column_name in ('cancelled_at', 'cancelled_by', 'cancel_reason'))
  )
order by table_name, column_name;
```

預期：共 7 列。

### 產品知識庫

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'product_knowledge_items' and column_name in ('detail', 'recommended_pitch', 'prohibited_pitch', 'related_competitor', 'visibility_status', 'evidence_level'))
    or (table_name = 'product_knowledge_resource_links' and column_name in ('knowledge_item_id', 'resource_id'))
  )
order by table_name, column_name;

select
  (select count(*) from product_knowledge_items) as product_knowledge_items_count,
  (select count(*) from product_knowledge_resource_links) as product_knowledge_resource_links_count;
```

預期：第一段 8 列；第二段回傳實際筆數。

### 支出彙總 View

```sql
select source_table, title, amount, payment_status, payment_date
from all_expenses_overview
order by payment_date desc nulls last, created_at desc
limit 20;
```

預期：

- 可讀取，不報權限錯誤。
- 已取消的 `marketing_campaign_budget_items` 不出現。
- 已取消的 `marketing_campaign_vendors` 不出現。

## 常見錯誤判斷

| 錯誤 | 優先檢查 |
| --- | --- |
| `PGRST204` / 找不到欄位 | 欄位 migration 是否真的跑 live，PostgREST schema cache 是否 reload |
| `relation does not exist` | 該 batch SQL 是否真的執行到 live Supabase |
| `permission denied for view all_expenses_overview` | view 是否有 `grant select ... to authenticated` |
| 取消 / 封存按鈕失敗 | `cancelled_*` 或 `archived_*` 欄位是否存在，`*_by` 是否能 reference `app_user_access.email` |
| Channel 頁顯示 demo | 檢查 live 讀取是否失敗，不可用 demo 假資料掩蓋 live 錯誤 |
| 私有檔案開不起來 | 應走 signed URL，不可直接開 `file_path` |

## 每次新增 SQL 後要補的資訊

請在本文件新增：

- 功能名稱。
- 表 / view 名稱。
- 前端依賴欄位。
- SQL 檔名。
- 必跑 smoke test。
- live 執行確認日期與結果。
