# Batch 13A 草案：任務 / 預算 / 文件搬遷前置安全檢查

建立日期：2026-07-17

## 背景

Batch 12B 已讓 v2 正式接手 `marketing_campaigns` 主檔新增、編輯與封存。下一步原本是 Batch 13：把 v1 行銷案詳情頁最常用的三個子模組搬到 v2：

- `marketing_campaign_tasks`
- `marketing_campaign_budget_items`
- `marketing_campaign_documents`

但在動工前，必須先處理兩支 v1 舊匯入腳本與 v1 子模組真刪除風險。否則 Batch 13 一旦建立軟取消 / 封存模型，舊腳本或舊平台按鈕仍可能把資料整批刪掉。

## 已確認風險

### 1. `scripts/import-campaign-details.mjs`

位置：`/Users/yikaihuang/Documents/美昇 Marketing OS 專案/marketing-platform/scripts/import-campaign-details.mjs`

現況：

- `--apply` 模式下會先刪除每個 matched campaign 的全部任務。
- 同時刪除每個 matched campaign 的全部預算明細。
- 再重新 POST 腳本內建的任務與預算資料。

關鍵位置：

- `marketing_campaign_tasks?campaign_id=eq.${campaign.id}` DELETE：第 152 行。
- `marketing_campaign_budget_items?campaign_id=eq.${campaign.id}` DELETE：第 153 行。

風險：

- 這不是增量匯入，而是整批替換。
- Batch 13 若對任務 / 預算新增 `cancelled_at` 等軟取消欄位，此腳本仍會直接真刪除資料列，導致取消紀錄、付款狀態、人工補充欄位與歷史追蹤消失。

### 2. `scripts/seed-exhibition-oct2026.mjs`

位置：`/Users/yikaihuang/Documents/美昇 Marketing OS 專案/marketing-platform/scripts/seed-exhibition-oct2026.mjs`

現況：

- `--apply` 模式下會先刪除 10 月空調展的全部任務。
- 同時刪除全部預算明細。
- 同時刪除全部文件資料列。
- 再重新 POST 任務 / 預算，並重新上傳文件到 `campaign-documents` bucket。

關鍵位置：

- `marketing_campaign_tasks?campaign_id=eq.${campaign.id}` DELETE：第 89 行。
- `marketing_campaign_budget_items?campaign_id=eq.${campaign.id}` DELETE：第 90 行。
- `marketing_campaign_documents?campaign_id=eq.${campaign.id}` DELETE：第 91 行。
- 重新上傳 Storage 文件：第 100-109 行。

風險：

- 文件資料列被刪除後，v2 後續建立的文件封存 / 版本 / 關聯資料會失去追溯。
- 腳本重新上傳文件但不清理舊 Storage 檔案，可能同時造成資料列消失與孤兒檔案。
- 若 Batch 13 之後有人重新跑這支腳本，會繞過 v2 的所有生命週期規則。

### 3. v1 行銷案子模組仍有真刪除

位置：`/Users/yikaihuang/Documents/美昇 Marketing OS 專案/marketing-platform/app.js`

已確認：

- `delTask()` 會 DELETE `marketing_campaign_tasks`。
- `delBudgetItem()` 會 DELETE `marketing_campaign_budget_items`。
- `delDocument()` 會先刪 Storage 檔案，再 DELETE `marketing_campaign_documents`。

風險：

- Batch 13 若 v2 接手這三個子模組，但 v1 仍可刪除，等於同一批共用資料有兩套生命週期規則。
- 文件刪除尤其高風險，因為會動到 Storage 實體檔案，資料列即使未來改封存也無法還原檔案。

## 建議拆批

### Batch 13A：先處理舊腳本與 v1 真刪除風險

目的：在 v2 搬遷任務 / 預算 / 文件之前，先避免既有 v1 路徑破壞新生命週期模型。

建議範圍：

1. 兩支匯入腳本的 `--apply` 加上第二層明確授權旗標，例如 `--allow-destructive-reimport`。
2. 未提供第二層旗標時，即使有 `--apply` 也直接 fail，並印出明確警告：此腳本會真刪除任務 / 預算 / 文件，不可在 v2 接手後直接執行。
3. 在 v1 `HANDOFF.md` 記錄兩支腳本已列為 legacy destructive import，不應作為日常維護工具。
4. 評估是否先停用 v1 子模組刪除：
   - `delTask()`
   - `delBudgetItem()`
   - `delDocument()`
5. 文件刪除若停用，必須同時停止 `deleteStorageFile('campaign-documents', ...)`，避免只留下資料列但檔案被刪。

不建議在 13A 做的事：

- 不重寫完整匯入邏輯。
- 不新增 import_source / import_batch_id 欄位，除非 Claude Code 判斷 Batch 13B 必須先有這些欄位。
- 不開始 v2 任務 / 預算 / 文件 UI。

### Batch 13B：v2 任務 / 預算 / 文件管理

等 13A 通過後再動工。

初步方向：

- `marketing_campaign_tasks`：新增 / 編輯 / 軟取消。
- `marketing_campaign_budget_items`：新增 / 編輯 / 軟取消；取消後 `all_expenses_overview` 是否排除需明確決策。
- `marketing_campaign_documents`：上傳 / 編輯 / 封存；不真刪除 Storage 檔案。
- 行銷案詳情頁採手機優先設計，任務 / 預算 / 文件以清楚分段或 tabs 呈現。
- 已取消 / 已封存資料提供只讀歷史清單，Phase 1 不做恢復。

## 需要 Claude Code 先確認的問題

1. 兩支匯入腳本是否應先改為「有 `--apply` 也不能直接執行」，必須再加第二層破壞性旗標？
2. Batch 13A 是否應同步停用 v1 的 `delTask()`、`delBudgetItem()`、`delDocument()`，還是等 v2 子模組完成後再停用？
3. 任務 / 預算 / 文件的軟取消欄位應統一使用 `cancelled_at`、`cancelled_by`、`cancel_reason`，還是文件應採 `archived_at`、`archived_by`、`archive_reason`？
4. `marketing_campaign_budget_items` 取消後，`all_expenses_overview` 應排除該筆，還是保留在歷史支出但標示取消？
5. 文件 Storage 檔案的替換與封存規則：是否只允許新增新檔並更新指向，不主動刪舊檔？
6. v1 若停用任務 / 預算 / 文件刪除，是否也需要讓 v1 查詢排除 v2 已取消 / 封存資料？
7. 兩支舊腳本未來應該保留為 legacy 工具、搬到文件封存，還是改寫成 idempotent upsert 匯入？

## 建議驗收方式

Batch 13A 完成後，至少驗證：

1. 沒有第二層授權旗標時，兩支腳本即使帶 `--apply` 也不會送任何 DELETE / POST / Storage upload。
2. 若保留第二層授權旗標，警告文案必須清楚列出會被刪除的資料表。
3. v1 任務 / 預算 / 文件刪除按鈕若停用，UI 層 disabled，函式層直接 alert，不送 DELETE。
4. v1 文件刪除停用時，不得呼叫 `deleteStorageFile('campaign-documents', ...)`。
5. 新文件需記錄在 v1 `HANDOFF.md` 與 v2 `V1_TO_V2_MIGRATION_PLAN.md`。
