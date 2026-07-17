# Claude Code Review｜Batch 11B 實作結果（行銷案封存模型）

審查日期：2026-07-17
審查對象：commit `b44c448`「Add campaign archive model」
審查方式：核對 SQL migration、逐行讀 `assets/app.js` diff，並實際啟動本機 preview 注入一筆進行中行銷案＋一筆已封存行銷案＋一筆連結已封存案的已取消廠商合作紀錄，用真實 `render()` 走過總經理/行銷總監兩個角色的頁面，並直接開啟「新增廠商合作」modal 檢查下拉選單內容。

---

## 結論：五項全部驗證通過，範圍完全符合已拍板的決定（v1 不動）

---

## 逐項驗證

### 1. SQL 欄位是否正確建立

`sql/phase1_batch11b_campaign_archive.sql` 對 `marketing_campaigns` 新增 `archived_at timestamptz`、`archived_by citext references app_user_access(email)`、`archive_reason text` 三個 nullable 欄位，外加一個 `archived_at` 的 index。跟拍板範圍「只加封存欄位，不改既有 FK」完全一致，沒有動 `marketing_campaigns` 本身或任何子表的既有約束。

### 2. v2 進行中行銷案是否排除 `archived_at` 有值的資料

`loadExistingData()` 現在用 `loadMarketingCampaigns()`（多查了 `archived_at`/`archived_by`/`archive_reason` 三欄，帶查詢失敗時的欄位降級 fallback，沿用 Batch 9/10 已經用過的同款寫法），讀回來的原始清單經過 `activeCampaigns()`/`archivedCampaigns()` 兩個 helper 拆成 `state.data.campaigns`（不含封存）跟 `state.data.archivedCampaigns`（只含封存）兩個陣列。

實測塞入 1 筆進行中 + 1 筆已封存的測試行銷案：`state.data.campaigns.length === 1`、`state.data.archivedCampaigns.length === 1`，且明確確認 `state.data.campaigns.some(c => c.id === "c2")`（已封存那筆）為 `false`——排除邏輯正確。

**跟 Batch 10 資源封存的架構選擇不同，這裡記錄一下差異，供之後接手辨識**：Batch 10 是「`state.data.resources` 保留完整資料，另開 `activeResources()` helper 給要排除的情境用」；這次 Batch 11B 是「在 `loadExistingData()` 當下就把資料拆成兩個陣列」。兩種做法都能達到同樣效果，這次選擇在載入時就拆分，換來的代價是任何要做「不分封存狀態查名稱」的地方必須明確用 `findCampaign()`（合併兩個陣列查）而不能只查 `state.data.campaigns`——這批已經把 `campaignName()` 改成走 `findCampaign()`，經核對是目前唯一需要這種合併查詢的呼叫點，沒有遺漏其他地方。

### 3. 總經理與行銷總監頁面是否都有已封存清單

`archivedCampaignsSection()` 用跟 Batch 7/10 一致的 `type:"details-table"`（預設收合、只讀），分別加進：
- `executive:dashboard`（`campaignSummarySection()`、`projectOverviewSection()` 之後）
- `marketing:campaigns`（`projectOverviewSection()` 之後）

實測 render 兩個角色頁面，`.panel h2` 都正確出現「已封存行銷案（1）」，展開後正確顯示專案名稱、狀態、重要性、預算、期間，以及封存資訊「2026-07-10 / director@meisheng.com / 專案已結案」（日期／操作者／原因三者都正確拼接）。

### 4. 新增廠商合作的行銷案下拉是否不會選到已封存案

`campaignOptions()`（`app.js:1832`）直接讀 `state.data.campaigns`，因為這個陣列在載入時已經排除封存案，下拉選單自動跟著排除，不需要額外過濾邏輯。實測開啟 `openCreateCampaignVendorModal()`，`select[name="campaign_id"]` 的選項只有 1 個（進行中的案子），已封存的案子沒有出現在選單裡。

### 5. 既有廠商或費用若關聯到封存案，名稱仍能正確顯示

塞入一筆 `campaign_id` 指向已封存案的「已取消廠商合作」紀錄，實測兩種方式都確認正確：
- 直接呼叫 `campaignName("c2")` 回傳「已封存的舊案」（不是預設的「未關聯專案」fallback）。
- 實際 render `marketing:vendors` 頁面、展開 `<details>` 後，畫面上真的顯示「已封存的舊案」這個名稱，`body.innerText` 裡確認**沒有**出現「未關聯專案」這個 fallback 字樣。

`all_expenses_overview` 這條路徑（總經理費用彙總的 `budgetSection()`）我另外確認過**不受這批 JS 端過濾影響**——那是資料庫 view 層直接 join `marketing_campaigns` 組出 `title`，不經過 `state.data.campaigns`，封存與否對這個 view 完全透明，不需要額外處理。

---

## 附帶確認：拍板範圍沒有被擴大

`docs/phase-1-mvp.md`/`V1_TO_V2_MIGRATION_PLAN.md` 的更新內容跟已拍板的 Batch 11B 範圍一致——只加欄位＋v2 顯示邏輯，沒有觸碰 v1 程式碼，也沒有開放 v2 新增/編輯行銷案（`openCampaignCreationDeferredModal()`／「v2 暫不新增行銷案」的既有攔截邏輯完全沒被動到，`openCreateCampaignVendorModal()` 在沒有可選行銷案時仍然顯示既有的攔截提示，不是這批的範圍）。

---

## 下次接手備註

Batch 11B 完全收尾，沒有殘留問題。下一步照 `V1_TO_V2_MIGRATION_PLAN.md` 是 Batch 12（v2 行銷案新增/編輯）——動工前記得那份文件「給 Claude 的複查重點」第 4 點還沒處理（v1 新增入口要不要先公告/限制），草案審查時要具體定義「公告」的機制，不要停在文件一句話帶過。
