# Claude Code Review｜Batch 12B 實作結果（v2 行銷案主檔新增/編輯/封存）

審查日期：2026-07-17
審查對象：commit `7b71c5b`「Add v2 campaign CRUD」
審查方式：逐行核對 `assets/app.js`/`assets/styles.css` diff，並實際啟動本機 preview 在桌機與 375×812 手機寬度下，用真實 render + 攔截 `api()`/`safeGET` 驗證新增、編輯、封存三個流程的實際送出內容，以及三種角色（行銷總監/總經理/業務）看到的畫面差異。

---

## 結論：五項全部驗證通過，沒有發現問題

---

## 逐項驗證

### 1. 新增 / 編輯 payload 是否完整對齊 21 欄位

`campaignPayload()` 送出的欄位（`name`/`association_id`/`association_activity_type`/`budget`/`actual_spend`/`subsidy_planned`/`subsidy_received`/`midea_budget_code`/`payment_status`/`claim_status`/`flight_cost`/`purpose`/`status`/`priority`/`vendors`/`owner`/`owner_unit`/`planned_start`/`planned_end`/`actual_start`/`actual_end`/`notes`/`updated_at`）逐一核對跟 Batch 12 草案審查時確認過的 v1 `saveCampaign()` payload 完全一致，沒有遺漏也沒有多餘。

實測填表送出（`name`/`status`/`budget`/`association_activity_type` 四個欄位）攔截到的 `POST` payload，數字欄位（`budget: 50000`）正確轉型成 number 而非字串，未填欄位正確送 `null` 而非空字串或 `undefined`。編輯模式重新打開表單也確認正確預填所有測試欄位，包含 `vendors` 陣列正確轉成 textarea 的換行文字（`"廠商A\n廠商B"`），送出時 `parseCampaignVendors()` 能正確轉換回陣列，往返一致。

### 2. `sort_order` 是否正確

`nextCampaignSortOrder()` 分兩層：先查資料庫目前 `sort_order` 非空的最小值（`marketing_campaigns?select=sort_order&sort_order=not.is.null&order=sort_order.asc&limit=1`）減 10；查詢失敗或沒有資料時，退回本地 `state.data.campaigns`/`archivedCampaigns` 合併計算最小值減 10；都沒有才給預設值 990。

分別實測兩條路徑：模擬遠端查到 `sort_order: 250` → 正確回傳 `240`；模擬遠端查詢失敗（空陣列）、本地資料裡有一筆 `sort_order: 100` → 正確 fallback 回傳 `90`。這跟 v1 `saveCampaign()` 「目前最小值減 10、讓新案子排最前面」的邏輯效果一致，而且直接查資料庫真實最小值比 v1 依賴記憶體裡的 `CAMPAIGNS` 陣列更準確（不受目前載入了多少筆的限制）。

### 3. 封存是否只 PATCH `archived_*`，沒有刪除

`openArchiveCampaignModal()` 送出前先確認彈窗文案正確（「確定要封存...封存後會從進行中列表與新增廠商合作下拉移除，但既有廠商、交付物、費用與歷史資料會保留」），實測填入封存原因後送出，攔截到的呼叫**只有一筆 `PATCH marketing_campaigns?id=eq.c1`**，payload 正確帶 `archived_at`/`archived_by`/`archive_reason`/`updated_at`，整個流程中沒有任何 `DELETE` 呼叫。

### 4. 手機版 modal 是否可操作

375px 寬度實測新增行銷案表單（23 個含 `sort_order` 在內的欄位，是這系列目前最長的一個表單）：`.form-section` 把欄位分成「基本資訊」「預算與補助」「公會與外部單位」「期間與備註」四個視覺分區，各自有邊框卡片跟小標題，捲動流暢、分區清楚不會讓人迷失在一長串欄位裡；底部「建立行銷案」/「取消」按鈕全寬可觸達。封存確認 modal（文案 + 封存原因欄位 + 「確認封存」/「取消」）在手機寬度下不需捲動就能完整看到，沒有欄位被截斷。

### 5. 行銷總監可操作，總經理/業務不可操作

實測三種角色：
- **行銷總監**（`marketing:campaigns`）：`projectOverviewSection()` 表頭正確多出「操作」欄，`[data-action="edit-campaign"]`/`[data-action="archive-campaign"]` 都存在。
- **總經理**（`executive:dashboard`）：同一個 `projectOverviewSection()` 函式渲染出的表頭是原本的 6 欄（不含「操作」），畫面上完全查不到 `edit-campaign`/`archive-campaign` 兩個 action。
- **業務**（`sales:dashboard`）：同樣查不到這兩個 action，`primaryAction` 按鈕文字是業務自己的「提出素材需求」，不會被行銷案的新增邏輯攔截。

判斷依據是 `const marketingActions = state.role === "marketing" && state.page === "campaigns"`，同時檢查角色跟頁面，執行結果符合預期。跟這個專案 Phase 1 一路以來的既定架構一致：這是前端 UI 層級的角色控制（沒有另外收緊 RLS），`marketing_campaigns` 的 `grant ... to authenticated using(true)` 政策本來就還沒收緊——這不是這批的缺口，是 Phase 1 全專案共同的已知範圍，草案審查時也確認過不需要為這批提前做 RLS。

---

## 附帶觀察（非問題，值得記錄）

- `association_activity_type` 採用 HTML 原生 `<input list>` + `<datalist>`（`associationActivitySuggestions()` 聯集固定選項＋目前資料庫所有行銷案實際用過的值＋當筆記錄現值），比我在草案審查建議的「純文字框」更完整——使用者打字時會有既有值自動建議，但仍然可以自由輸入全新類型，不會被鎖死。這是用瀏覽器原生元件達到接近 v1 `setCustomSelect()` 效果、且不用另外寫互動邏輯的乾淨做法。
- `primaryAction`「v2 暫不新增行銷案」文字與 `openCampaignCreationDeferredModal()` 攔截邏輯已經完全移除，跟 Batch 12A（v1 端）、Batch 11B（封存模型）串起來看，這條「v2 開始正式管理行銷案」的主線到這批算是完整落地。

---

## 下次接手備註

Batch 12B 完全收尾，沒有殘留問題。下一步照 `V1_TO_V2_MIGRATION_PLAN.md` 是 Batch 13（任務/預算/文件搬遷），動工前記得那份文件裡提到的兩個匯入腳本（`import-campaign-details.mjs`/`seed-exhibition-oct2026.mjs`）會整批刪除重建 `marketing_campaign_tasks`/`budget_items`/`documents`，跟 Batch 13 打算做的軟取消衝突，需要先處理。
