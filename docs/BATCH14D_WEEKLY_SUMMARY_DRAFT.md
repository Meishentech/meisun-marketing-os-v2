# Batch 14D 草案：週報摘要

建立日期：2026-07-19

## 背景

Batch 13B 已讓 V2 接手行銷案詳情頁的任務、預算與文件。
Batch 14B 已讓 V2 接手風險 / 待決事項與追蹤紀錄。
Batch 14C 已讓 V2 接手成效資料與 Channel 成效頁。

Batch 14D 的目標是把上述資料整理成每週可直接拿給總經理看的「週報摘要初稿」，讓行銷總監不用每週重新翻各頁整理。

## 核心決策建議

### 1. 第一版先不建表

建議 14D 第一版做「即時計算週報」，不新增 `marketing_campaign_weekly_summaries`。

原因：

- 週報內容第一版主要是從既有 V2 資料彙整，不需要新增資料來源。
- 不建表就不需要 live Supabase SQL migration、RLS、grant、PostgREST schema reload。
- 可以先驗證總經理實際想看的摘要格式，再決定是否需要固定留存每週版本。

若總經理之後需要「每週送出後不可變動」的歷史版本，再開 14D-B / 15A 做快照表。

### 2. 第一版不用 AI 生成

建議先做規則式摘要，不接 AI。

原因：

- 現在資料欄位多半已經能產生可讀摘要。
- 規則式輸出可追溯、可驗證，不會自行補不存在的判斷。
- 之後若要加入 AI，可以把規則式摘要當作輸入材料，再由 AI 改寫成週報語氣。

### 3. 第一版以本週週一到今天為範圍

週期定義：

- 開始日：本週一。
- 結束日：今天。
- 使用前端既有 `startOfWeekString()` 與 `localDateString()`，以使用者本機日期處理。

後續若要固定週報為「週一到週日完整週」，再另加日期選擇器。

## 資料來源

14D 第一版只讀既有資料：

- `marketing_campaigns`
- `marketing_campaign_tasks`
- `marketing_campaign_budget_items`
- `marketing_campaign_documents`
- `marketing_campaign_risks`
- `marketing_campaign_risk_updates`
- `marketing_campaign_performance`
- `approval_requests`
- `sales_requests`
- `all_expenses_overview`
- `leads`

不新增、不修改、不刪除任何資料。

## 週報內容

### 1. 本週總覽

建議顯示：

- 本週有異動的行銷案數。
- 本週新增任務數。
- 本週完成任務數。
- 本週新增追蹤紀錄數。
- 本週新增 / 更新成效資料數。
- 目前待付款金額。
- 目前高風險未解決數。

### 2. 行銷案進度摘要

來源：

- `marketing_campaigns`
- `marketing_campaign_tasks`
- `marketing_campaign_budget_items`
- `marketing_campaign_documents`
- `marketing_campaign_risks`

建議顯示每個本週有異動的行銷案：

- 行銷案名稱。
- 目前狀態與重要性。
- 任務完成情況。
- 待付款 / 待請款項目。
- 本週新增文件或版本。
- 仍需處理的風險 / 待決事項。

排序：

1. 重要性高。
2. 有高風險未解決。
3. 有待付款或逾期任務。
4. 最近更新時間。

### 3. 風險 / 待決事項摘要

來源：

- `marketing_campaign_risks`
- `marketing_campaign_risk_updates`
- `approval_requests`

建議分三組：

- 高風險未解決。
- 逾期未追蹤。
- 本週新增重要追蹤。

規則：

- 已封存風險不進週報主摘要。
- 已取消追蹤紀錄不列入週報。
- `show_on_dashboard = true` 的風險應進入週報，即使不是高風險。
- 第一版不自動新增 `approval_requests`，避免週報與待決策中心互相寫入。

### 4. 預算 / 付款摘要

來源：

- `all_expenses_overview`
- `marketing_campaign_budget_items`
- `marketing_campaign_vendors`
- 公會費用相關資料已由 `all_expenses_overview` 彙總。

建議顯示：

- 本週新增或更新的費用項目。
- 待付款項目。
- 已逾期付款項目。
- 本週已付款項目。
- 預算與實支差異較大的行銷案。

規則：

- 已取消預算項目不列入。
- 已取消廠商合作不列入。
- 已封存行銷案的歷史費用仍可列入年度支出統計，但週報主摘要優先顯示進行中行銷案。

### 5. 成效 / Channel 摘要

來源：

- `marketing_campaign_performance`
- `leads`

建議顯示：

- 本週更新成效資料的行銷案。
- 本週新增名單來源。
- 表現較好的 Channel。
- 需要補資料的 Channel。

沿用 14C-D 已拍板規則：

- 同一 Channel 有 performance 紀錄時，詢問、名單、有效名單以 performance 為主。
- 只有 performance 缺資料時，才用 leads 來源補缺。
- 不疊加 performance 與 leads，避免雙重計算。

### 6. 下週優先事項

建議由規則產生：

- 7 天內到期且未完成的任務。
- 待付款 / 待請款項目。
- 高風險未解決。
- `show_on_dashboard = true` 的待決事項。
- 沒有填成效資料的高重要性行銷案。

此區塊應是總經理與行銷總監下週會議的重點清單。

## UI 規格

### 入口

建議放兩個入口：

1. 總經理戰情室：新增「週報摘要」區塊或按鈕。
2. 行銷總監工作台：新增「產生本週週報」區塊或按鈕。

第一版不建議放在業務視角。

### 呈現方式

建議使用一個週報頁或 modal：

- 頂部顯示週期：例如 `2026-07-13 ~ 2026-07-19`。
- 上方 4 到 6 張 KPI 卡。
- 中段為可掃描的摘要區塊。
- 下方提供「複製週報文字」與「匯出 .txt」。

週報文字格式建議：

```text
美昇 Marketing OS 週報摘要
期間：2026-07-13 ~ 2026-07-19

一、本週重點
- ...

二、行銷案進度
- ...

三、風險 / 待決事項
- ...

四、預算 / 付款
- ...

五、成效 / Channel
- ...

六、下週優先事項
- ...
```

### 操作原則

- 週報頁只做彙整與匯出，不在這裡編輯原始資料。
- 每筆摘要可提供「進入專案」連結，回到行銷案詳情頁編輯。
- 不做第二套任務 / 預算 / 風險 / 成效編輯介面。

## 手機版驗收

必驗：

1. 手機 375px 寬度可完整閱讀週報。
2. KPI 卡片不橫向溢出。
3. 週報文字區可完整捲動。
4. 「複製週報文字」與「匯出 .txt」按鈕可觸達。
5. 從週報摘要點「進入專案」後，可以清楚返回週報或行銷專案列表。
6. 無資料時顯示空狀態，不回到 demo 假資料。

## 權限

### 總經理

- 可查看週報摘要。
- 可匯出 / 複製週報。
- 不可在週報頁直接編輯原始資料。

### 行銷總監

- 可查看週報摘要。
- 可匯出 / 複製週報。
- 可從摘要進入行銷案詳情頁編輯原始資料。

### 業務

- Phase 1 不顯示週報摘要。
- 若未來要開放業務週報，應另做業務個人版，只顯示自己的需求單與可用資源。

## 是否需要 SQL

### 14D 第一版：不需要

只要讀取既有資料並在前端組摘要，不需要新增 SQL。

### 若要保存週報快照，才需要新表

可能表名：

- `marketing_weekly_summaries`

可能欄位：

- `id uuid primary key`
- `week_start date`
- `week_end date`
- `summary_text text`
- `summary_payload jsonb`
- `created_by citext references app_user_access(email)`
- `created_at timestamptz`
- `updated_at timestamptz`

若進入快照表版本，必須注意：

- 新表要 `enable row level security`。
- 需要明確 `grant select/insert/update` 給 `authenticated`，避免 Data API 不曝露。
- 若用 view，要加 `with (security_invoker = true)`。
- SQL 審查通過後必須實際跑 live Supabase，並做 smoke test。

## 不納入 14D 第一版

- 不做自動寄送 LINE / Email。
- 不做排程。
- 不做 AI 自動改寫。
- 不做週報審核流程。
- 不做週報歷史快照表。
- 不做跨週比較圖表。
- 不做業務個人週報。

## 需要 Claude Code 複查的重點

1. 第一版不建表是否合理，或是否應直接建立週報快照表。
2. 週期定義用「本週一到今天」是否符合總經理檢視習慣。
3. 週報摘要是否應包含已封存行銷案的歷史費用，或只看進行中案。
4. 風險摘要直接讀 `marketing_campaign_risks` 是否足夠，是否需要同步讀 `approval_requests`。
5. 成效 / Channel 摘要沿用 14C-D 的「performance 優先、leads 補缺、不疊加」是否正確。
6. 匯出文字是否沿用既有 `exportCurrentSummary()`，或需建立專用週報匯出函式。
7. 手機版是否需要獨立週報頁，而不是 modal。

## 建議動工順序

1. Claude Code 複查本草案。
2. 實作週報資料彙整 helper，先不做 UI。
3. 實作週報文字產生器。
4. 在總經理與行銷總監入口新增週報區塊 / 按鈕。
5. 實作週報頁或 modal。
6. 實作複製週報文字與匯出 `.txt`。
7. 手機版 375px 實測。
8. live 資料驗收，確認無資料時不顯示 demo 假資料。
