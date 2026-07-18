# Batch 14C 草案：成效資料 / Channel 指標搬遷規格

建立日期：2026-07-18

## 背景

Batch 13B 已讓 V2 接手行銷案詳情頁的任務、預算、文件。
Batch 14B 已讓 V2 接手風險 / 待決事項與追蹤紀錄。

Batch 14C 的目標是讓 V2 開始使用真實 `marketing_campaign_performance`，讓總經理與行銷總監看到行銷案成效與 Channel 轉換，而不是目前的靜態摘要。

## 目前資料表現況

V1 既有 schema 來源：`marketing-platform/schema_v12_performance_resources.sql`

```sql
create table if not exists marketing_campaign_performance (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references marketing_campaigns(id) on delete cascade,
  reach_count integer not null default 0,
  lead_count integer not null default 0,
  inquiry_count integer not null default 0,
  qualified_lead_count integer not null default 0,
  estimated_opportunity_amount numeric not null default 0,
  deal_count integer not null default 0,
  deal_amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_campaign_performance_campaign_unique unique (campaign_id)
);
```

目前欄位重點：

- 一個行銷案只有一筆成效資料：`unique(campaign_id)`。
- 沒有 `channel` 欄位。
- 沒有封存 / 取消欄位。
- `campaign_id` 指向 `marketing_campaigns(id) on delete cascade`。
- RLS 使用 V1 既有 `authenticated all` policy。

## V1 現有操作風險

V1 目前有完整 CRUD：

- `renderPerformancePage()` 讀取 `marketing_campaign_performance`。
- `openPerformanceModal()` 新增 / 編輯成效資料。
- `savePerformance()` 對成效資料做 `POST` / `PATCH`。
- `delPerformance()` 會直接 `DELETE marketing_campaign_performance?id=eq.{id}`。

風險判斷：

- V2 14C 一旦接上成效資料，V1 `delPerformance()` 會變成正式風險，因為它會刪掉 V2 正在讀取的成效紀錄。
- `marketing_campaign_performance` 沒有下游 V2 新表 FK，因此刪除不會 cascade 到 V2 新表；但會讓總經理 / 行銷總監看到的成效數字消失。
- 建議 14C 第一個步驟先凍結 V1 `delPerformance()`，模式比照 11A / 12A / 13A / 14A。
- V1 新增 / 編輯可暫時保留到 V2 成效新增 / 編輯實測通過；14C 完成後再停用 V1 成效新增 / 編輯。

## Channel 欄位判斷

先前 schema review 曾建議新增：

```sql
alter table marketing_campaign_performance
  add column if not exists channel text;
```

此欄位安全：

- nullable，不影響既有資料。
- V1 用具名欄位讀寫，不會因新增欄位壞掉。
- V1 `PATCH` 不包含 `channel`，不會覆蓋 V2 填入的 channel。

但要注意：

- 因為表上有 `unique(campaign_id)`，`channel` 只能代表該行銷案的「主要 Channel」或「主要來源分類」。
- 它不能支援同一行銷案拆成多個 Channel 明細，例如一個展覽案同時有展會現場、LINE、官網、業務轉介。
- 若要做到完整 Channel 明細，應另設 `marketing_campaign_channel_performance` 類型的新表，但這會讓 14C 範圍明顯變大。

建議 14C 第一版：

- 補 `marketing_campaign_performance.channel text` 作為「主要 Channel」。
- Channel 成效頁第一版使用兩個資料來源：
  - `marketing_campaign_performance.channel`：行銷案成效的主要歸因。
  - `leads.source_channel`：實際名單來源。
- 先不新增多對多或多筆 Channel 明細表。
- 完整多 Channel attribution 留到後續 Batch。

## 建議拆批

### Batch 14C-A：V1 成效真刪除凍結

目的：先避免 V1 刪除成效資料，造成 V2 成效摘要消失。

範圍：

- 停用 V1 `delPerformance()`。
- V1 成效 modal 的刪除按鈕改為 disabled，文字改「刪除已停用」。
- 直接呼叫 `delPerformance()` 時只顯示提示，不送 DELETE。
- 不停用 V1 新增 / 編輯，直到 V2 14C-B 驗收完成。

驗收：

1. V1 開成效 modal，刪除按鈕 disabled。
2. 直接呼叫 `delPerformance()` 不送 DELETE。
3. V1 `savePerformance()` 新增 / 編輯仍可用。

### Batch 14C-B：SQL migration

目的：補上 V2 需要的主要 Channel 欄位。

建議 SQL：

```sql
-- Phase 1 Batch 14C: campaign performance channel field.
-- Adds a nullable primary channel dimension to campaign-level performance records.

alter table marketing_campaign_performance
  add column if not exists channel text;

create index if not exists idx_marketing_campaign_performance_channel
  on marketing_campaign_performance(channel);

notify pgrst, 'reload schema';

-- Smoke test 1: confirm live columns.
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'marketing_campaign_performance'
--   and column_name in ('channel', 'reach_count', 'lead_count', 'inquiry_count', 'qualified_lead_count', 'estimated_opportunity_amount', 'deal_count', 'deal_amount', 'notes')
-- order by column_name;

-- Smoke test 2: confirm existing table remains readable.
-- select count(*) as performance_count
-- from marketing_campaign_performance;
```

需要 Claude Code 審查：

- `channel text` 是否足夠，或 14C 應直接拆多 Channel 明細表。
- index 是否需要，或資料量小可先不加。
- 是否需要 `grant`，目前是既有表新增欄位，理論上不需要。

### Batch 14C-C：V2 前端接成效資料

目的：讓 V2 讀寫 `marketing_campaign_performance`。

範圍：

- `loadExistingData()` 新增讀取 `marketing_campaign_performance`。
- 行銷案詳情頁新增「成效資料」區塊。
- 行銷總監可新增 / 編輯成效資料。
- 不做刪除。
- 因 `unique(campaign_id)`，新增時需處理重複：
  - 如果該 campaign 已有 performance，按鈕應顯示「編輯成效」。
  - 不應讓使用者重複 POST 造成 unique constraint error。

欄位：

- 主要 Channel：`channel`
- 觸及人數：`reach_count`
- 名單數：`lead_count`
- 詢問數：`inquiry_count`
- 有效商機數：`qualified_lead_count`
- 預估商機金額：`estimated_opportunity_amount`
- 成交件數：`deal_count`
- 成交金額：`deal_amount`
- 備註：`notes`

衍生指標：

- 名單轉換率：`lead_count / reach_count`
- 詢問率：`inquiry_count / reach_count`
- 有效名單率：`qualified_lead_count / lead_count`
- 成交率：`deal_count / qualified_lead_count`
- 名單成本：行銷案支出 / `lead_count`
- 有效商機成本：行銷案支出 / `qualified_lead_count`

成本來源建議：

- 優先使用 `marketing_campaigns.actual_spend`。
- 若無實支，使用 `marketing_campaigns.budget`。
- 若兩者都無，顯示「未填」。

### Batch 14C-D：Channel 成效頁接真資料

目的：讓總經理與行銷總監 Channel 成效頁不再使用靜態假資料。

資料來源：

- `marketing_campaign_performance.channel`
- `leads.source_channel`

第一版顯示：

- Channel
- 觸及：sum `reach_count`
- 名單：sum `lead_count` + leads count
- 詢問：sum `inquiry_count`
- 有效名單：sum `qualified_lead_count`
- 成交件數：sum `deal_count`
- 成交金額：sum `deal_amount`
- 管理判斷：
  - 成交金額或有效名單高：加碼
  - 觸及高但有效名單低：調整
  - 資料不足：待補資料

注意：

- `leads.source_channel` 與 `performance.channel` 可能命名不一致，例如「官網 / LINE」與「LINE」。
- 14C 第一版建議不做複雜 mapping table，先用原字串分類；命名治理留到後續。
- 若 performance 沒資料但 leads 有資料，Channel 頁仍應顯示 leads 來源摘要，不要退回假資料。

## V2 UI 位置

### 行銷案詳情頁

放在風險區塊後方：

1. 任務 / 里程碑
2. 預算 / 補助 / 付款項目
3. 文件 / 版本
4. 風險 / 待決事項
5. 成效資料

顯示方式：

- KPI 卡片：觸及、名單、有效商機、成交金額。
- 表格或卡片：轉換率、名單成本、有效商機成本、主要 Channel、更新時間。
- 行銷總監有「新增 / 編輯成效」按鈕。
- 總經理只讀。
- 業務不需要進完整成效表。

### 總經理戰情室

新增或調整摘要：

- 總名單數。
- 有效商機數。
- 成交金額。
- 平均有效名單率。
- 表現最佳 Channel / 需調整 Channel。

### 行銷總監工作台

建議使用巡檢卡片：

- 尚未填成效的行銷案。
- 觸及高但名單低。
- 有效商機高的 Channel。
- 本月有成效更新。

點卡片進跨案只讀列表，再點「進入專案」到詳情頁編輯。

### Channel 成效頁

總經理與行銷總監都可看。

- 總經理：只讀摘要與管理判斷。
- 行銷總監：只讀摘要 + 從行銷案詳情頁進入編輯，不在 Channel 頁做第二套編輯。

## 手機優先要求

- 成效表單欄位較多，需用 `form-grid` 並保持手機可捲動。
- 數字欄位需用 `type="number"`、`min="0"`。
- Channel 下拉 / 輸入不能讓長字串撐破欄位。
- KPI 卡片文字不可重疊。
- Channel 成效表在手機版需轉卡片，不以橫向捲動作為主要操作。

## 不納入 14C

- 不做多 Channel attribution 明細表。
- 不做成效資料刪除或封存。
- 不做自動從 leads 反寫 performance。
- 不做 AI 自動判斷 Channel。
- 不做週報摘要，留到 14D。
- 不停用 V1 成效新增 / 編輯，直到 V2 成效新增 / 編輯驗收完成。

## Claude Code 審查問題

請 Claude Code 先審查以下事項：

1. `marketing_campaign_performance.channel text` 是否適合放在 14C，還是應直接設計多 Channel 明細表。
2. 既有 `unique(campaign_id)` 是否會讓 14C 的新增 / 編輯流程出現 UX 或資料模型問題。
3. V1 `delPerformance()` 是否應比照 14A 先凍結，或等 V2 前端完成再凍結。
4. V1 `savePerformance()` 在 V2 補 `channel` 後是否會有覆蓋或資料不一致風險。
5. Channel 成效頁應以 `performance.channel` 為主，還是以 `leads.source_channel` 為主。
6. `marketing_campaign_performance` 是否需要新增 `updated_by` 或其他稽核欄位；若要新增，需確認 `citext references app_user_access(email)` 型別。
7. 若 `channel` SQL 執行後，必須用 live smoke test 驗證欄位存在，避免重複 Batch 13B 的漏跑問題。

## 建議動工順序

1. Claude Code 審查本草案。
2. Batch 14C-A：停用 V1 `delPerformance()` 真刪除。
3. Batch 14C-B：建立並審查 `channel` SQL。
4. SQL 審查通過後，實際執行到 live Supabase，並跑 smoke test。
5. Batch 14C-C：V2 讀取成效資料與行銷案詳情頁新增 / 編輯。
6. Batch 14C-D：Channel 成效頁與總經理 / 行銷總監摘要接真資料。
7. Claude Code 複查。
8. 14C 驗收通過後，再停用 V1 成效新增 / 編輯。
9. 進 Batch 14D：週報摘要。
