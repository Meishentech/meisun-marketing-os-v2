# Batch 15 草案：平台穩定化與 V1/V2 收斂

建立日期：2026-07-19

## 背景

Batch 11 到 Batch 14D 已讓 V2 接手多個核心模組：

- 行銷資源與知識庫。
- 行銷案主檔新增 / 編輯 / 封存。
- 行銷案任務、預算、文件。
- 合作廠商 / 交付物。
- 風險 / 待決事項與追蹤紀錄。
- 成效資料與 Channel 真資料。
- 週報摘要。

下一步不應急著新增大功能。應先穩住平台，避免 V1/V2 雙邊管理造成資料不一致，也把 live Supabase、手機版、匯出、取消 / 封存等高頻操作做成固定驗收流程。

## 目標

Batch 15 的目標是「讓目前已完成的 V2 可以穩定使用」，不是擴大功能範圍。

完成後應達成：

- 已由 V2 接手的功能，V1 不再提供新增 / 編輯 / 真刪除入口，或至少明確提示「請至 V2 管理」。
- V2 每個核心頁面都有固定 smoke test。
- live Supabase migration 狀態與前端依賴欄位有清單可查。
- 手機版最低可用性驗收可重複執行。
- 已知限制被記錄，不被誤判成 bug。

## 建議拆批

### Batch 15A：穩定化盤點與凍結清單

目的：先確認哪些 V1 入口已該停用，哪些仍需保留。

建議先盤點 V1：

- `marketing_resources`
- `marketing_campaigns`
- `marketing_campaign_tasks`
- `marketing_campaign_budget_items`
- `marketing_campaign_documents`
- `marketing_campaign_risks`
- `marketing_campaign_risk_updates`
- `marketing_campaign_performance`

建議判斷原則：

- V2 已能新增 / 編輯 / 取消或封存：V1 對應新增 / 編輯 / 刪除應停用或加導向提示。
- V2 只讀但尚未能管理：V1 可短期保留新增 / 編輯，但真刪除應優先停用。
- V2 完全未接手：暫不動 V1。

需請 Claude Code 審查：

- V1 目前哪些函式仍會寫入上述表。
- 哪些功能已經可安全停用 V1 新增 / 編輯。
- 是否有 v1 查詢仍會顯示 v2 已封存 / 已取消資料，造成使用者誤會。

### Batch 15B：V1 已接手模組入口停用

目的：把已由 V2 接手的 V1 寫入入口收掉，避免同一資料兩邊改。

候選範圍：

- 行銷資源：V1 新增 / 編輯是否改只讀。
- 行銷案主檔：V1 新增 / 編輯是否停用或提示改至 V2。
- 任務 / 預算 / 文件：V1 新增 / 編輯是否停用或提示改至 V2。
- 風險 / 追蹤：V1 新增 / 編輯是否停用或提示改至 V2。
- 成效資料：V1 新增 / 編輯 / 刪除是否停用或提示改至 V2。

建議第一版採「保守停用」：

- V1 保留只讀列表與詳情。
- V1 寫入按鈕 disabled。
- V1 寫入函式即使從 console 直接呼叫，也只顯示提示，不送 API。
- 提示文案一致：`此功能已移至 V2，請至新版行銷管理平台操作。`

不建議第一版直接 Cloudflare 轉址，避免使用者找不到舊資料。

### Batch 15C：V2 live smoke test 固定化

目的：建立一份每次部署後都能照跑的驗收清單。

建議建立文件：

- `docs/V2_PRODUCTION_SMOKE_TEST.md`

建議包含：

1. 登入與角色
   - 測試帳號可登入。
   - admin / eric 可切換三種視角。
   - 一般業務不能切換角色。

2. 總經理
   - 戰情室能載入年度行銷案彙總。
   - 待決策中心不顯示 demo 假資料。
   - Channel 成效頁讀 live performance / leads。
   - 週報摘要可產生、複製、匯出。

3. 行銷總監
   - 行銷案可新增 / 編輯 / 封存。
   - 任務可新增 / 編輯 / 取消。
   - 預算可新增 / 編輯 / 取消。
   - 文件可新增版本 / 編輯資訊 / 封存 / 開啟檔案。
   - 風險可新增 / 編輯 / 封存。
   - 追蹤紀錄可新增 / 編輯 / 取消。
   - 成效資料可新增 / 編輯。
   - 文宣資源可新增 / 編輯 / 封存。

4. 業務
   - 文宣 / 資源下載只顯示未封存且可用資料。
   - 知識庫不顯示禁止使用或待確認條目。
   - 業務需求單只看到自己的需求。

5. 防假資料
   - `state.dataStatus === "live"` 時，核心頁面不可退回 demo row。
   - 無資料時要顯示空狀態。

### Batch 15D：資料庫欄位依賴清單

目的：避免再發生「SQL 寫了但 live 沒跑」或「前端依賴欄位但 live 無欄位」。

建議建立文件：

- `docs/V2_LIVE_SCHEMA_DEPENDENCIES.md`

建議列出每個前端功能依賴的 live 欄位：

- `marketing_campaigns.archived_at / archived_by / archive_reason`
- `marketing_campaign_tasks.cancelled_at / cancelled_by / cancel_reason`
- `marketing_campaign_budget_items.payment_status / payment_date / cancelled_at / cancelled_by / cancel_reason`
- `marketing_campaign_documents.archived_at / archived_by / archive_reason / vendor_id / deliverable_id`
- `marketing_campaign_risks.archived_at / archived_by / archive_reason`
- `marketing_campaign_risk_updates.cancelled_at / cancelled_by / cancel_reason`
- `marketing_campaign_performance.channel`
- `marketing_resources.deleted_at / deleted_by`
- `sales_requests.cancelled_at / cancelled_by`
- `marketing_campaign_vendors.cancelled_at / cancelled_by / cancel_reason / payment_date`
- `marketing_campaign_vendor_deliverables.cancelled_at / cancelled_by / cancel_reason`

每次新增 SQL 後，需在此文件補上：

- SQL 檔名。
- live smoke test 查詢。
- 使用者確認日期。

### Batch 15E：手機版回歸驗收

目的：把手機優先原則變成可執行清單。

建議更新或擴充：

- `docs/MOBILE_ACCEPTANCE_CHECKLIST.md`

必驗頁面：

- 總經理戰情室。
- 週報摘要。
- 行銷專案管理列表。
- 行銷案詳情頁。
- 任務 / 預算 / 文件 / 風險 / 成效 modal。
- 文宣資源管理。
- 業務文宣下載。
- 業務需求單。

最低標準：

- 不需橫向捲動完成主要操作。
- Modal 底部按鈕可觸達。
- 表格在手機轉卡片後，欄位標籤清楚。
- 編輯、取消、封存按鈕歸屬清楚，不混淆是子項目還是母項目。
- 週報文字區可讀、可捲動、按鈕可觸達。

## 已知限制

### 1. 週報「本週完成任務」目前用 `planned_end` 推估

`marketing_campaign_tasks` 沒有 `completed_at` 欄位。

目前 14D 只能用：

- 任務狀態屬於已完成 / 完成 / 結案。
- `planned_end` 落在本週。

可能偏差：

- 任務逾期後本週才完成，但 `planned_end` 不在本週，週報不會算入本週完成。
- 任務上週已完成，但 `planned_end` 在本週，週報會算入本週完成。

不建議現在修；若總經理要求完成數精準，未來需新增 `completed_at` SQL 欄位。

### 2. 週報待付款估計金額沿用 `budgetComparableAmount()`

目前邏輯：

- 有台幣金額則用台幣。
- 沒有台幣才用人民幣換算或人民幣值。

大多數項目只填一種幣別時合理。

限制：

- 若同一筆預算同時填台幣與人民幣，週報加總不會兩者相加。

不建議現在修；若未來有多幣別同筆項目的真實情境，再建立專用加總函式。

## 不納入 Batch 15

- 不新增大型新功能。
- 不搬公會完整 CRUD。
- 不搬標案工具完整管理。
- 不做 AI 週報。
- 不做完整 RLS 重設。
- 不做 V1 全站轉址。
- 不做資料庫重構。

## 需要 Claude Code 複查的重點

1. V1 目前哪些新增 / 編輯 / 刪除入口仍會寫入已由 V2 接手的資料表。
2. 哪些 V1 入口應立即停用，哪些仍應短期保留只讀。
3. V1 是否仍會顯示 V2 已封存 / 已取消資料，造成判讀混亂。
4. `V2_PRODUCTION_SMOKE_TEST.md` 是否應納入更多 live 驗收步驟。
5. `V2_LIVE_SCHEMA_DEPENDENCIES.md` 的欄位清單是否完整。
6. 手機版回歸清單是否足以覆蓋目前所有核心操作。
7. 14D 兩個已知限制是否只需記錄，不需在 Batch 15 修正。

## 建議動工順序

1. Claude Code 複查本草案。
2. Batch 15A：盤點 V1 已接手模組的剩餘寫入入口。
3. Batch 15B：停用已可由 V2 替代的 V1 寫入入口。
4. Batch 15C：建立 V2 production smoke test 文件。
5. Batch 15D：建立 live schema dependency 文件。
6. Batch 15E：更新手機版回歸驗收清單。
7. 依 smoke test 實測 live 站，修正阻塞問題。
