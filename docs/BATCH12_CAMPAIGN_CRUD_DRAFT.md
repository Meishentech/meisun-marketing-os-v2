# Batch 12 Draft｜v2 行銷案主檔新增 / 編輯

日期：2026-07-17
狀態：給 Claude Code 審查用草案，尚未動工

## 背景

Batch 11A 已停用 v1 行銷資源真刪除。Batch 11B 已為 `marketing_campaigns` 補上 `archived_at`、`archived_by`、`archive_reason`，並讓 v2 把進行中與已封存行銷案分流顯示。

Batch 12 開始後，v2 會第一次正式寫入 `marketing_campaigns` 這張 v1/v2 共用核心表。這代表 v2 新增或編輯的行銷案會立刻出現在 v1 正式平台；v1 也仍可能改到同一筆資料。因此 Batch 12 需要先把 v1 入口策略說清楚，不應只做 v2 表單。

## 建議範圍

### 1. v2 行銷案主檔新增

將目前 `openCampaignCreationDeferredModal()` 改成真正的新增行銷案 modal。建議欄位先對齊 v1 主檔，不碰任務 / 預算項目 / 文件 / 風險 / 成效子表：

- 專案名稱 `name`，必填
- 專案說明 / 目的 `purpose`
- 狀態 `status`：`預計規劃`、`估價中`、`進行中`、`補助申請`、`結案`
- 重要性 `priority`：`高`、`中`、`低`
- 預算 `budget`
- 實支 `actual_spend`
- 預估補助 `subsidy_planned`
- 實際補助 `subsidy_received`
- 美的補助申請號碼 `midea_budget_code`
- 機票費用 `flight_cost`
- 付款狀態 `payment_status`
- 請款狀態 `claim_status`
- 預計開始 / 結束 `planned_start`、`planned_end`
- 實際開始 / 結束 `actual_start`、`actual_end`
- 負責人 `owner`
- 負責單位 `owner_unit`
- 外包廠商文字清單 `vendors`，沿用 v1 的 jsonb 陣列；正式多廠商管理仍走 Batch 3 的 `marketing_campaign_vendors`
- 關聯公會 `association_id`
- 公會活動類型 `association_activity_type`
- 備註 `notes`

新增時需帶 `updated_at`。若 `sort_order` 欄位可用，新增案子應給一個合理排序值，避免 v1 排序頁出現空值或排序異常。

### 2. v2 行銷案主檔編輯

在行銷案列表 / 行銷案卡片提供「編輯」入口。編輯 modal 應預填完整欄位，送出 `PATCH marketing_campaigns?id=eq.{id}`。

注意：目前 v2 `loadMarketingCampaigns()` 只撈總覽欄位，Batch 12 需要補齊上述欄位，並保留 Batch 11B 的 `archived_at` fallback 機制。

### 3. v2 封存，不做真刪除

v2 不提供 `DELETE marketing_campaigns`。既有行銷案如需移出進行中列表，只能封存：

- `archived_at = now`
- `archived_by = currentUser.email`
- `archive_reason = 使用者輸入原因`
- `updated_at = now`

封存確認視窗應提示：封存後會從進行中行銷案列表、廠商合作新增下拉、後續任務新增下拉移除，但既有關聯資料仍保留，並可在已封存行銷案清單查閱。

Phase 1 不做復原。復原牽涉已封存案是否重新出現在所有下拉與統計中，留到之後獨立設計。

### 4. v1 入口處理

建議 Batch 12 同步處理 v1 的最低風險防護：

- 停用 v1 `delCampaign()` 真刪除，改為提示「行銷案已改由 v2 封存，不再從 v1 刪除」。
- v1 的「新增 / 編輯行銷案」暫時保留，因為 Batch 13 / 14 前 v1 仍是任務、預算、文件、風險、成效的主要操作入口。
- v1 行銷案管理頁、Dashboard 新增行銷案按鈕旁或 modal 內加提示：主檔管理將逐步改由 v2 進行；v1 暫留給既有流程與子模組。
- 暫不讓 v1 排除 `archived_at` 行銷案，除非 Claude 判斷此批已適合一起處理。理由同 Batch 11B：v1 仍承擔詳情頁與子模組操作，太早隱藏可能讓使用者找不到任務 / 預算 / 文件。

### 5. 權限與角色

Phase 1 仍沿用前端角色控制：

- 行銷總監 / admin：可新增、編輯、封存行銷案。
- 總經理：先維持只讀，可看總覽與已封存清單。
- 業務：不提供行銷案主檔新增 / 編輯。
- `eric@mcttw.com.tw` 因具 admin 權限，可透過視角切換測試三個角色。

若 Claude 判斷這批已經必須提前收緊 RLS，請提出最小化 RLS 建議；否則 Phase 1 先不擴大資料庫權限工程。

## 不在本批範圍

- 任務、預算項目、文件、風險、成效 CRUD：留到 Batch 13 / 14 / 15。
- 復原已封存行銷案。
- 重構 v1 行銷案頁。
- 把 `vendors` jsonb 與 `marketing_campaign_vendors` 自動雙向同步。Batch 12 只維持 v1 主檔欄位相容；正式多廠商管理仍以 v2 廠商合作模組為主。
- 手機版完整行銷案詳情重做。Batch 12 只要求新增 / 編輯 / 封存 modal 手機可用。

## Claude Code 請優先審查

1. v1 `delCampaign()` 是否必須在 Batch 12 前或同批停用，避免 `DELETE marketing_campaigns` cascade 清掉 v2 已建立的 `marketing_campaign_vendors` / deliverables。
2. v2 新增 / 編輯欄位是否完整對齊 v1 目前 `saveCampaign()` payload，是否漏了任何已存在且重要的欄位。
3. `status` / `priority` / `association_activity_type` 的選項是否完全符合現有 check 約束與 v1 實際資料，避免重演 Batch 8A 下拉選單窄化問題。
4. `sort_order` 在 v2 新增時應如何寫入，避免 v1 手動排序頁出現異常。
5. v1 是否要在這批同步加提示但保留新增 / 編輯，還是應該更強硬地停用新增主檔。
6. v2 封存後，`all_expenses_overview` 是否需要排除封存行銷案，或總經理費用彙總應保留已封存案費用作歷史支出。
7. 手機版新增 / 編輯 modal 是否需要拆分區塊或分段表單，避免欄位過長造成操作困難。
