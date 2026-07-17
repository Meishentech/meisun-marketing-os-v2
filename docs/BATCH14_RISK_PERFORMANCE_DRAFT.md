# Batch 14 草案：風險 / 待決事項、成效資料、追蹤紀錄、週報摘要搬遷規格

建立日期：2026-07-17

## 目標

Batch 13B 已讓 V2 接手行銷案詳情頁的三個核心子模組：任務、預算、文件。Batch 14 的目標是把「專案管理中最需要總經理知道的事」接上 V2：

- 風險 / 待決事項：`marketing_campaign_risks`
- 風險追蹤紀錄：`marketing_campaign_risk_updates`
- 行銷成效資料：`marketing_campaign_performance`
- 週報摘要：先由既有資料彙整產生，是否落表留待 Claude 審查後決定

此批完成後，總經理應能在戰情室看到真正需要拍板、追蹤或關注的行銷風險；行銷總監能在單一行銷案詳情頁維護風險、追蹤紀錄與成效數字。

## 建議拆批

不建議一次把四個主題全部做完。建議拆成：

### Batch 14A：V1 風險真刪除凍結

目的：先避免 V1 刪除風險資料時，連帶刪掉 V2 未來要使用的追蹤紀錄。

範圍：

- 停用 V1 `delRisk()` 真刪除。
- 停用 V1 `delRiskUpdate()` 真刪除，或至少改成提示此功能將移至 V2。
- 暫不停用 V1 風險新增 / 編輯，直到 V2 風險管理完成。
- 暫不處理 V1 `delPerformance()`，除非 Claude 判定成效資料已被 V2 現有頁面正式依賴。

原因：

- `marketing_campaign_risk_updates.risk_id` 是 `references marketing_campaign_risks(id) on delete cascade`。
- V1 刪除一筆 risk 會直接 cascade 刪除該風險所有追蹤紀錄。
- 追蹤紀錄是後續總經理判斷「目前卡在哪裡」的關鍵資料，不應真刪除。

### Batch 14B：V2 風險 / 待決事項管理

目的：讓 V2 正式管理 `marketing_campaign_risks` 與 `marketing_campaign_risk_updates`。

範圍：

- 行銷案詳情頁新增「風險 / 待決事項」區塊。
- 風險可新增 / 編輯 / 封存。
- 追蹤紀錄可新增 / 編輯 / 取消。
- 高風險、逾期未追蹤、標示 show_on_dashboard 的事項進入總經理戰情室。
- 總經理戰情室顯示只讀摘要，不在總經理頁做完整編輯。

14B 必須納入的生命週期規則：

- 封存後的風險仍應留在行銷案詳情頁的歷史清單，可讀取標題、類型、影響程度、封存時間、封存人與封存原因；但不可再出現在總經理戰情室、逾期追蹤卡或進行中風險清單。
- 已取消的追蹤紀錄不參與「最新追蹤」、「逾期提醒」、「重要更新」與總經理摘要排序，只保留在已取消追蹤歷史清單中。
- 任何 14B SQL migration 經審查通過後，必須實際執行到 live Supabase project，並用 live 查詢驗證欄位存在；不能只建立檔案或完成 code review。

### Batch 14C：V2 成效資料與 Channel 指標

目的：讓 `marketing_campaign_performance` 成為總經理與行銷總監看到的真實成效資料來源。

範圍：

- 行銷案詳情頁新增「成效資料」區塊。
- 行銷總監可新增 / 編輯成效資料。
- 因 `marketing_campaign_performance` 目前有 `unique(campaign_id)`，Phase 1 建議不做刪除，只做更新。
- 總經理戰情室與 Channel 成效頁改用真實 performance 資料計算摘要。

### Batch 14D：週報摘要

目的：用 V2 既有資料自動整理每週報告初稿。

建議第一版先不落表，而是即時計算：

- 本週新增 / 完成 / 取消的任務。
- 本週新增 / 取消的預算項目與待付款項目。
- 本週新增 / 封存的文件。
- 本週新增 / 更新 / 結案的風險。
- 本週成效資料更新摘要。

是否需要 `marketing_campaign_weekly_summaries` 表，留給 Claude 審查後決定。若總經理需要固定留存每週版本，才建表。

## 已確認 V1 風險

### 1. `marketing_campaign_risks` 真刪除會 cascade 追蹤紀錄

V1 schema：

```sql
risk_id uuid not null references marketing_campaign_risks(id) on delete cascade
```

V1 現況：

- `delRisk()` 會直接 `DELETE marketing_campaign_risks?id=eq.{id}`。
- `delRiskUpdate()` 會直接 `DELETE marketing_campaign_risk_updates?id=eq.{id}`。

風險：

- 刪除風險會靜默刪除所有追蹤紀錄。
- 追蹤紀錄一旦刪除，總經理看不到過去溝通脈絡。
- 這跟 Batch 13B 前的任務 / 預算 / 文件問題同型，應先凍結真刪除。

### 2. `marketing_campaign_performance` 是每行銷案唯一一筆

V1 schema：

```sql
constraint marketing_campaign_performance_campaign_unique unique (campaign_id)
```

判斷：

- 成效資料比較像單一行銷案的累積 KPI，不像文件或追蹤紀錄是多筆歷史。
- Phase 1 建議只開新增 / 編輯，不開刪除。
- 若未來需要「移除成效資料」，要先討論 unique constraint 與封存模型，不能直接套用 archived_at 後再新增一筆。

## SQL 規格建議

重要執行規則：

- Batch 14B 的 SQL 不只要寫入 repo，也必須在 live Supabase SQL Editor 或等效 live migration 流程實際執行。
- 執行後必須驗證 `marketing_campaign_risks.archived_at`、`marketing_campaign_risk_updates.cancelled_at` 等欄位真的存在於 live project。
- 前端功能驗收前，必須先完成 live SQL 驗證；避免重演 Batch 13B「SQL 已審查但未實際套用」導致正式站取消 / 封存失敗的問題。

### 風險封存

風險本身是待決事項主檔，建議使用 `archived_*`，不是 `cancelled_*`。

```sql
create extension if not exists "citext";

alter table marketing_campaign_risks
  add column if not exists archived_at timestamptz;

alter table marketing_campaign_risks
  add column if not exists archived_by citext references app_user_access(email);

alter table marketing_campaign_risks
  add column if not exists archive_reason text;

create index if not exists idx_marketing_campaign_risks_archived
  on marketing_campaign_risks(archived_at);
```

### 追蹤紀錄取消

追蹤紀錄是單筆操作紀錄，若建立錯誤應用取消保留痕跡，建議使用 `cancelled_*`。

```sql
alter table marketing_campaign_risk_updates
  add column if not exists cancelled_at timestamptz;

alter table marketing_campaign_risk_updates
  add column if not exists cancelled_by citext references app_user_access(email);

alter table marketing_campaign_risk_updates
  add column if not exists cancel_reason text;

create index if not exists idx_marketing_campaign_risk_updates_cancelled
  on marketing_campaign_risk_updates(cancelled_at);
```

### 成效資料

Batch 14C 第一版建議不新增欄位，不做刪除，只接現有欄位：

- `reach_count`
- `lead_count`
- `inquiry_count`
- `qualified_lead_count`
- `estimated_opportunity_amount`
- `deal_count`
- `deal_amount`
- `notes`

Claude 需確認先前 schema review 提到的 `marketing_campaign_performance.channel` 是否已存在或仍需補欄位。如果尚未存在，需判斷是否放入 Batch 14C 或延到完整 Channel 成效批次。

## V2 UI 規格

### 行銷案詳情頁：風險 / 待決事項

新增區塊位置建議：

1. 任務 / 里程碑
2. 預算 / 補助 / 付款項目
3. 文件 / 版本
4. 風險 / 待決事項
5. 成效資料

風險列表欄位：

- 類型：預算、時程、廠商、原廠、素材、業務配合、補助請款、其他。
- 標題。
- 影響程度：高 / 中 / 低。
- 負責人。
- 到期日。
- 狀態：待處理 / 處理中 / 已解決 / 暫緩。
- 是否顯示於總經理戰情室。
- 最新追蹤。
- 操作：編輯、封存、追蹤紀錄。

追蹤紀錄：

- 預設顯示最新 3 筆。
- 可展開全部追蹤紀錄。
- 新增追蹤時可更新下一次追蹤日。
- 取消追蹤紀錄預設收合顯示。
- 取消後的追蹤紀錄不列入最新追蹤判斷，也不觸發逾期提醒。
- 封存風險下方仍保留追蹤紀錄歷史，方便回查整個處理脈絡。

### 總經理戰情室：待決策 / 風險摘要

總經理頁應只顯示決策與追蹤摘要，不做完整表單管理。

建議顯示：

- 高風險未解決數。
- 逾期追蹤數。
- 需要總經理決策的事項。
- 最近重要追蹤紀錄。

進入條件：

- `archived_at is null`。
- `status != '已解決'`。
- `show_on_dashboard = true`，或 `impact_level = '高'`，或最新追蹤 `is_important = true`。

排序：

1. `impact_level = '高'`。
2. 已逾期 `due_date` 或 `next_followup_date`。
3. `show_on_dashboard = true`。
4. 最近更新時間。

操作：

- 總經理可點進只讀詳情。
- 是否可直接轉成 `approval_requests` 留給 Claude 審查；第一版不建議自動寫入 approval_requests，避免兩套待決策來源互相打架。

### 行銷總監工作台

新增摘要卡：

- 高風險未解決。
- 逾期未追蹤。
- 本週新增追蹤。
- 待總經理確認。

點卡片進入跨專案只讀巡檢列表，再點列進行銷案詳情頁編輯。

### 成效資料

行銷案詳情頁新增「成效資料」區塊：

- 曝光 / 觸及數。
- 名單數。
- 詢問數。
- 有效名單數。
- 預估商機金額。
- 成交件數。
- 成交金額。
- 備註。

衍生指標：

- 名單轉換率：`lead_count / reach_count`。
- 有效名單率：`qualified_lead_count / lead_count`。
- 成交率：`deal_count / qualified_lead_count`。
- 平均成交金額：`deal_amount / deal_count`。

注意：若分母為 0，顯示「未有足夠資料」，不要顯示 0% 誤導。

## 手機版驗收

必驗動線：

1. 行銷案詳情頁 → 新增風險 → 儲存。
2. 行銷案詳情頁 → 編輯風險 → 更新狀態。
3. 行銷案詳情頁 → 新增追蹤紀錄。
4. 行銷案詳情頁 → 取消追蹤紀錄。
5. 行銷案詳情頁 → 封存風險。
6. 總經理戰情室 → 點風險摘要 → 看只讀詳情。
7. 行銷總監工作台 → 點逾期追蹤卡 → 進跨案巡檢列表 → 進專案詳情。
8. 行銷案詳情頁 → 新增 / 編輯成效資料。

手機版要求：

- 風險列表在手機上轉卡片，不使用橫向捲動作為主要操作方式。
- 高風險需用明顯紅色標籤，不能只靠文字。
- 追蹤紀錄預設收合，避免單一專案頁過長。
- Modal 底部操作按鈕固定可見，沿用 Batch 13B 修正後的樣式。
- 總經理只讀詳情不可顯示行銷總監的編輯 / 封存按鈕。

## V1 同步停用規則

### Batch 14A 完成後

- V1 停用 `delRisk()`。
- V1 停用 `delRiskUpdate()`。
- V1 風險新增 / 編輯暫時保留。
- V1 成效資料刪除暫時不動，除非 Claude Code 判定 v2 現有功能已正式依賴 `marketing_campaign_performance`。

### Batch 14B 完成並驗收後

- V1 停用風險新增 / 編輯。
- V1 風險頁面可保留只讀或加提示「此功能已移至 V2」。

### Batch 14C 完成並驗收後

- V1 停用成效資料新增 / 編輯 / 刪除。
- V1 成效頁面可保留只讀或加提示「此功能已移至 V2」。

## 不納入 Batch 14 第一版

- 不做完整資料庫層 RLS 權限重設。
- 不讓總經理直接編輯風險主檔。
- 不自動把所有風險寫入 `approval_requests`。
- 不做 AI 自動判斷風險等級。
- 不做週報寄送或自動排程。
- 不改 `marketing_campaign_performance` 的 unique constraint，除非 Claude 判定必要。

## 需要 Claude Code 動工前複查的重點

1. V1 `delRisk()` / `delRiskUpdate()` / `delPerformance()` 是否有必須立即凍結的真刪除風險。
2. `marketing_campaign_risks` 使用 `archived_*`、`risk_updates` 使用 `cancelled_*` 是否符合既有命名慣例。
3. `marketing_campaign_performance` 是否應留在 Batch 15，或可併入 Batch 14C。
4. `marketing_campaign_performance.channel` 是否已存在；若不存在，是否應在 Batch 14C 補欄位。
5. 總經理待決策中心應直接讀 `marketing_campaign_risks`，還是透過 `approval_requests` 建第二層審核紀錄。
6. 風險封存後，是否仍應在歷史清單顯示於行銷案詳情頁。
7. 追蹤紀錄取消是否會影響最新追蹤排序與逾期提醒。
8. 手機版是否需要把風險追蹤獨立成子頁，而不是塞在同一個 modal。

## 建議動工順序

1. Claude Code 審查本草案。
2. Batch 14A：停用 V1 風險與追蹤真刪除。
3. 建立 Batch 14B SQL：風險封存與追蹤取消欄位。
4. 審查通過後，實際執行 Batch 14B SQL 到 live Supabase，並查詢驗證欄位存在。
5. V2 載入風險與追蹤資料，含 lifecycle fallback。
6. 行銷案詳情頁新增風險區塊。
7. 實作風險新增 / 編輯 / 封存。
8. 實作追蹤紀錄新增 / 編輯 / 取消。
9. 總經理戰情室接風險摘要。
10. 手機版驗收。
11. V1 風險新增 / 編輯停用。
12. 再進 Batch 14C / 15：成效資料與週報摘要。
