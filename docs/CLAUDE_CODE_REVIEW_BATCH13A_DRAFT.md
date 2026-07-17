# Claude Code Review｜Batch 13A 草案：匯入腳本與 v1 子模組刪除前置安全檢查

審查日期：2026-07-17
審查對象：`docs/BATCH13_IMPORT_PRECHECK_DRAFT.md`
審查方式：進 v1 repo（`marketing-platform`，已 `git pull` 到最新）核對兩支腳本的實際刪除邏輯、`delTask()`/`delBudgetItem()`/`delDocument()` 現況，並回頭查 v2 repo 所有 SQL/`app.js` 確認 `marketing_campaign_tasks`/`budget_items`/`documents` 這三張表目前有沒有被 v2 任何既有功能依賴——這是這次審查最關鍵的一步，因為答案不是「三張表一樣」，直接影響第 2 題的建議。

---

## 結論先講：三張表裡，`marketing_campaign_documents` 的凍結急迫性應該跟 Batch 11A/12A 同一級，`tasks`/`budget_items` 則不急，這點草案沒有區分開來

草案把 `delTask()`/`delBudgetItem()`/`delDocument()` 三個放在同一題（第 2 題）一起問「要不要同批停用」，但查了 v2 現有程式碼後，**這三張表現在跟 v2 的關係並不對等**：

- `marketing_campaign_tasks`、`marketing_campaign_budget_items`：查了 v2 所有 SQL 跟 `app.js`，**目前完全沒有任何 v2 建的功能讀寫這兩張表**（`marketing_campaign_budget_items` 只在 Batch 5 補了 `payment_status`/`payment_date` 兩個欄位、被 `all_expenses_overview` 這個 view 讀取用於費用彙總，沒有專屬管理 UI；`marketing_campaign_tasks` 連欄位層級的接觸都沒有）。這兩張表現在**完全是 v1 獨佔管理**，跟 Batch 12A 之前的 `marketing_campaigns`（v1 是主要入口但 v2 已經在讀）不是同一種情況。

- `marketing_campaign_documents`：**不一樣，v2 已經在用**。Batch 3 建廠商合作模組時，這張表被加了 `vendor_id`/`deliverable_id` 兩個外鍵（`sql/phase1_batch3_vendors.sql:97-107`），v2 現在會查 `marketing_campaign_documents?...vendor_id=not.is.null`（`app.js:3992`），結果餵給 `formatVendorDocuments()`，**顯示在「合作廠商 / 交付物」頁面每筆廠商合作的「文件」欄位**（列出這筆合作關聯了哪些文件類型）。這代表：**如果現在有人在 v1 刪除一份文件，而這份文件剛好被 v2 廠商合作模組引用（`vendor_id` 有值），v2 那個廠商列表的「文件」欄位會靜默少一筆，不會報錯，只是資訊消失**——這是現在就存在的風險，不是 Batch 13B 上線後才會發生。

**建議調整第 2 題的答案**：`delDocument()` 建議這批（Batch 13A）就跟 `delTask()`/`delBudgetItem()` 分開處理，比照 Batch 11A/12A 的急迫度立即停用（含連動的 `deleteStorageFile('campaign-documents', ...)`）；`delTask()`/`delBudgetItem()` 則建議維持現況先不動，等 Batch 13B v2 真的接手這兩個子模組時再停用——現在停用的話，行銷總監在 Batch 13B 上線前的這段期間會完全沒有地方能修正任務/預算的輸入錯誤（v1 是目前唯一入口，跟 Batch 12A 當時判斷「v1 仍是主要管理入口時不要太早收緊」是同一個框架，這次套用在 tasks/budget_items 上）。

---

## 逐項回答草案的 7 個問題

### 1. 兩支腳本是否要加第二層授權旗標

**同意，技術上很簡單**：兩支腳本現在的旗標判斷都是 `process.argv.includes('--apply')` 這種單一布林檢查（`import-campaign-details.mjs:12`、`seed-exhibition-oct2026.mjs:14`），加一個 `--allow-destructive-reimport` 用同樣的 `includes()` 判斷即可，不需要改動其他邏輯，风险最低。

補充一個草案沒提到的細節：`import-campaign-details.mjs` 的 dry-run 訊息本身就寫「Dry-run only. Re-run with `--apply` to replace existing task/budget detail rows」（`scripts/import-campaign-details.mjs:147`）——這支腳本的設計本來就預期會被「重新執行以取代資料」，是三個風險來源裡**唯一明確為週期性重跑設計**的（對應「從 Google Sheet 匯入」這種會反覆更新的資料來源）；`seed-exhibition-oct2026.mjs` 從命名（`seed-` + 特定活動名稱）看更像一次性建置腳本，被誤重跑的機率相對低，但兩者都應該加旗標，不必因為這個差異而只保護一支。

### 2. Batch 13A 是否要同步停用 `delTask()`/`delBudgetItem()`/`delDocument()`

見上方結論——**建議拆開**：`delDocument()` 這批就停用（已有真實 v2 依賴）；`delTask()`/`delBudgetItem()` 建議留到 Batch 13B 對應子模組上線時才停用（現在沒有 v2 依賴，停用只有壞處沒有好處）。

### 3. 軟取消欄位命名：`cancelled_*` 還是 `archived_*`

建議照這個專案目前已經確立的兩套慣例分別套用，不要三張表統一成同一種：

- **`marketing_campaign_tasks`、`marketing_campaign_budget_items` 建議用 `cancelled_at`/`cancelled_by`/`cancel_reason`**——這兩張表性質上是「依附在進行中行銷案底下的操作項目」，最接近的既有案例是 Batch 6A 的 `sales_requests` 跟 Batch 6C 的 `marketing_campaign_vendors`/`vendor_deliverables`，這兩者都是「這件事被取消了、不會發生了」用 `cancelled_*`，任務被取消、預算項目被砍掉的語意跟這組更接近。
- **`marketing_campaign_documents` 建議用 `archived_at`/`archived_by`/`archive_reason`**——文件常見的下架情境是「被新版取代」或「這份文件過時了」，語意上更接近 Batch 11B 行銷案封存（案子結束但歷史保留）跟 Batch 10 資源封存（資源退役但仍可能被引用），不是「這件事沒發生」。

這個分法不是憑空決定，是延續這個專案從 Batch 6A 到 Batch 11B 一路累積下來、我在審查記錄裡反覆用過的判斷原則（動作可不可逆、這張表的東西是「被取消」還是「功成身退」）。

### 4. 預算項目取消後，`all_expenses_overview` 要不要排除

**建議排除，比照 Batch 6C 對 `marketing_campaign_vendors` 已經採用的做法**：查了現在的 view 定義（`sql/phase1_batch6c_vendor_lifecycle.sql`），廠商費用分支已經有 `where mcv.cancelled_at is null`（已取消的廠商合作費用不算數，因為那筆交易沒發生）。預算項目一旦有了 `cancelled_at` 欄位，語意跟廠商合作取消一樣是「這筆支出沒有真的發生」，建議在 Batch 13B 改寫 view 時，比照廠商分支加上 `where mbi.cancelled_at is null`（目前這個分支還沒有任何取消欄位可以過濾，因為欄位還沒建，先记录下来給 Batch 13B 用）。

**跟 Batch 11B 的行銷案封存不要混淆**：行銷案封存不影響 `all_expenses_overview`（案子結束但錢真的花了，見 Batch 11B 審查記錄），但預算項目本身被取消是不同層級的動作，兩者答案不一樣是對的，不是前後矛盾。

### 5. 文件 Storage 檔案替換規則

草案問的是「是否只允許新增新檔並更新指向，不主動刪舊檔」——**這題要注意一個既有先例的落差**：Batch 9B（`marketing_resources` 檔案管理）採用的規則其實是**會刪舊檔**（「先確認新檔案上傳成功、資料庫更新成功後才清掉舊檔案」，見 `CLAUDE_CODE_REVIEW_BATCH9B_RESULT.md`），不是「永久保留所有版本」。

如果 Batch 13B 對文件採用草案暗示的「不刪舊檔、只更新指向」，會是這個專案第一次出現「同一種操作（換檔案）在不同資料表有不同保留政策」——不是不能這樣做（文件常常有合約/簽核版本需要保留歷史的正當理由，資源文宣通常不需要），但建議明確拍板成「刻意的差異」而不是沒注意到有先例可循。如果沒有強烈理由要保留所有舊版本，建議比照資源管理已經驗證過的模式（換檔案時清掉舊檔），維持一致性、減少之後要維護兩套邏輯的負擔。

### 6. v1 查詢是否要排除 v2 已取消/封存資料

**這題在 Batch 13A 階段還不需要處理**，因為這批確認不做 SQL（沒有新欄位可以過濾），只有 Batch 13B 建好 `cancelled_at`/`archived_at` 之後才有東西可以過濾。屆時建議套用 Batch 11B 已經定案的同一個判斷框架：`marketing_campaign_documents` 因為前面第 2 點的分析（v1 仍是文件管理主要入口，Batch 13B 才會提供 v2 替代方案）建議先不過濾；等 Batch 13B 真的讓 v2 接手文件管理後才比照 Batch 11A 的模式加過濾——不需要在 13A 現在就決定，13B 動工前再拍板即可。

### 7. 兩支舊腳本的長期定位

草案問要保留成 legacy 工具、搬到文件封存、還是改寫成 idempotent upsert——**這題建議不在 13A 或 13B 決定，先加第二層旗標擋住風險就夠**。理由：改寫成 idempotent upsert 是不小的工程（要處理「這筆任務是更新既有的還是真的新增」的比對邏輯，比現在「整批刪除重建」複雜很多），在還不確定這兩支腳本之後還會不會被使用（`import-campaign-details.mjs` 明確是為了對應 Google Sheet 更新設計的，如果 Google Sheet 已經停止更新或改用其他方式維護，這支腳本可能整個用不到了）的情況下，先花力氣改寫可能是白工。建議先加旗標卡住，之後真的有人要再用這兩支腳本時，當下再決定要重新設計還是繼續用「有旗標才給刪」的方式手動跑。

---

## 建議驗收方式的補充

草案列的 5 點驗收方式都對，補充第 6 點：**`delTask()`/`delBudgetItem()` 這批確認不動，驗收時要順便確認這兩個函式跟對應的刪除按鈕維持原樣可用**（不要因為在改 `delDocument()` 時，複製貼上的時候不小心也動到旁邊的 `delTask()`/`delBudgetItem()`——這三個函式在 `app.js` 裡彼此相鄰，`delTask()` 在 1248 行、`delBudgetItem()` 在 1292 行、`delDocument()` 在 1560 行，改動時注意範圍界線）。

---

## 給下一步的建議

Batch 13A 可以直接動工，範圍調整為：兩支腳本加第二層旗標（草案第 1 點原樣採用）＋只停用 `delDocument()`（不含 `delTask()`/`delBudgetItem()`）。第 3-5 題的命名/view/Storage 規則答案已經給了明確建議，可以直接寫進 Batch 13B 草案，不需要再等一輪確認往返。
