# Claude Code Review｜V1 → V2 搬遷計畫複查

審查日期：2026-07-17
審查對象：`docs/V1_TO_V2_MIGRATION_PLAN.md`
審查方式：不只讀計畫文件本身，直接進 v1 repo（`/Users/yikaihuang/Documents/美昇 Marketing OS 專案/marketing-platform`，已 `git pull` 到最新 `5c2b490`）逐一核對文件裡列出的每個宣稱——真刪除清單是否完整、外鍵 cascade 是否如文件所述、v1 查詢是否真的不過濾狀態、CSV 匯出實際欄位、兩個匯入腳本的實際行為。這份計畫文件本身寫得很扎實，我核對下來沒有發現任何一項判斷是錯的，但補上幾個文件目前沒寫清楚、需要一併拍板的細節，尤其是你直接問的 Batch 11A 範圍問題。

---

## 結論先講：Batch 11A 範圍建議「兩者都做，但主從關係要分清楚」

**核心風險（也是 Batch 11A 存在的理由）只有停用 `delResource()` 才能解決**——這是唯一會觸發 `on delete cascade` 靜默清掉 `product_knowledge_resource_links` 的動作，只要這個按鈕還能點，其他任何配套都是治標不治本。

但**「v1 是否同步隱藏 `deleted_at is not null` 的資源」不是可有可無的裝飾，我建議一併做**，理由是我實際查了 v1 `renderResourcesPage()`（`app.js:1686`）的查詢：

```js
RESOURCES = await safeGET('marketing_resources?order=updated_at.desc');
```

**完全沒有任何狀態過濾**——v2 的 `deleted_at` 欄位加上去之後，PostgREST 預設 `select=*` 會自動把這個新欄位一起吐回來，但 v1 現在的程式碼不會去讀它、不會排除它。停用刪除按鈕之後，v1 端還是會照樣把已封存資源當一般資源顯示在列表裡、點進去還能編輯——**這會製造一個新的、Batch 11A 之前不存在的困惑**：行銷總監在 v2 把資源封存（業務端已經看不到了），結果自己在 v1 打開資源管理，那筆資源看起來完全正常、可以編輯，編輯完存檔後，v2 那邊除了 `updated_at` 變了以外，`deleted_at` 還是有值、還是維持封存狀態——「為什麼我剛剛才編輯過的資源在 v2 業務頁還是看不到」會是很合理的疑問。

建議 Batch 11A 兩件事都做，但明確分主從：**停用刪除按鈕是這批存在的理由（阻擋 cascade）；過濾已封存資源是防止上面那個困惑的配套（維持兩邊資料語意一致），優先度低一級但成本很小**（`renderResourcesPage()` 的查詢加一個 `&deleted_at=is.null`，`app.js:1686`），建議一起做完，不要拆成兩批。

**具體實作位置**（供 Codex 動工前參考，我不會改 v1 的程式碼，這是給你判斷範圍用）：
- 刪除按鈕定義在 `index.html:772`：`<button class="btn btn-red" id="res-delete" onclick="delResource()">刪除</button>`——最小改法是把 `onclick` 換成一個提示文字（例如「資源已改由 v2 管理，請至 v2 封存」），或直接拿掉按鈕，不需要動 `delResource()` 函式本身（保留著，只是沒有入口點得到，比直接刪函式更容易回溯）。
- `renderResourcesPage()` 的查詢（`app.js:1686`）跟儀表板那條 `is_external_usable=eq.true` 的資源查詢（`app.js:501`、`1794`）一併補 `deleted_at=is.null`——這三處都會受影響，不是只有管理頁一處。

---

## 逐項核對你列的複查重點

### 1. `delResource()` 是否仍是最高優先風險？

**是，而且比 Batch 9B/10 審查時發現的情況更明確**：只有 `product_knowledge_resource_links.resource_id` 這個外鍵是 `on delete cascade`，其他共用表目前都還沒有 v2 側的功能在依賴它們（v2 對 `marketing_campaigns` 目前只讀，還沒有任何 v2 建的子表指向它）。`marketing_campaigns` 的 cascade 範圍其實更大（詳見下一點），但那個風險目前是「潛在」的——只要 v2 不開始寫入、v1 刪除行銷案不會波及任何 v2 建的資料，頂多是 v1 自己的任務/預算/文件消失（這是 v1 原本就有的既有風險，不是這次搬遷計畫製造的新風險）。**資源刪除風險已經是「現在進行式」（v2 的知識庫功能已經上線在用），行銷案刪除風險是「Batch 12 開始後才會變成現在進行式」**——文件把 Batch 11A 排在資源、Batch 11B/12 之後才處理行銷案，這個順序是對的，不需要調整。

### 2. `marketing_campaigns` 若改封存，會不會影響 v1 排序、Dashboard、CSV 匯出？

**加欄位本身不會讓 v1 壞掉，但 v1 完全不會尊重封存狀態——這點文件目前沒寫清楚，建議補進 Batch 11B 的範圍。**

查證結果：v1 對 `marketing_campaigns` 的所有查詢（`app.js` 裡至少 8 處 `GET`/`safeGET`，包含 dashboard、`renderCampaignsPage`、`campaignDetail`、`loadCampaignsForManagement`）**沒有一處帶任何狀態過濾**，全部是 `marketing_campaigns?order=created_at.desc` 這種不篩選的寫法。`sortByStatus()`（`app.js:66`）只用 `status`/`priority`/`created_at` 排序，不會排除任何列。`exportCampaignsCSV()`（`app.js:3000`）直接把記憶體裡的 `CAMPAIGNS` 陣列（同樣沒過濾）整包轉成 CSV，欄位清單裡也沒有任何封存狀態欄位。

**代表 Batch 11B 加了 `archived_at` 之後，如果只在 v2 做過濾，v1 這邊的 dashboard、清單、排序、CSV 匯出會繼續把已封存行銷案當正常在用的案子顯示、排序、算進統計、匯出到 CSV 裡**——跟資源封存是同一種「v1 不知道 v2 引入的新語意」問題，只是這次影響的是總經理常看的 dashboard 跟對外匯出的 CSV，可見度比資源管理頁更高。建議 Batch 11B 明確決定：這批只在 v2 做封存（v1 維持現狀，之後 Batch 12 開始接手行銷案管理後再一次處理 v1 這端），還是這批順便讓 v1 也排除已封存案子——**我傾向建議先不動 v1（維持文件目前寫的範圍），因為 Batch 11B 階段 v2 都還沒開放新增/編輯，行銷案的封存主要是「幫 Batch 12 先把安全生命週期準備好」，不是要現在就切換誰是主要入口；但這個落差要寫進文件，不要讓「加了封存欄位」被誤以為「v1 也會跟著正確顯示」。**

### 3. 子表外鍵 cascade 風險核對

逐一查了 v1 的 SQL：

| 子表 | FK 行為 | 來源檔案 |
|---|---|---|
| `marketing_campaign_tasks` | `on delete cascade` | `schema_v8_tasks_budget.sql:10` |
| `marketing_campaign_budget_items` | `on delete cascade` | `schema_v8_tasks_budget.sql:25` |
| `marketing_campaign_documents` | `on delete cascade` | `schema_v9_documents.sql:5` |
| `marketing_campaign_risks` | `on delete cascade` | `schema_v10_risks.sql:3` |
| `marketing_campaign_performance` | `on delete cascade` | `schema_v12_performance_resources.sql:3` |
| `marketing_content_drafts.campaign_id` | `on delete set null` | `schema.sql:27` |
| `association_tasks.marketing_campaign_id` | `on delete set null` | `schema_v19_association_tasks_expenses.sql:6` |

文件對這些表的風險評級（「高：刪除行銷案會 cascade 任務、預算、文件、風險、成效等子表」）完全準確，五張表全部是 cascade，這是目前 v1 唯一一個「一個真刪除動作波及五張表」的地方，比資源刪除（只波及一張連結表）blast radius 大得多。`marketing_campaign_risk_updates` 我另外查了一下（文件的「真刪除清單」裡有列，但共用資料表風險表格沒單獨列出它跟 `marketing_campaign_risks` 的關係），是指向 `marketing_campaign_risks` 而非直接指向 `marketing_campaigns`，屬於二層 cascade（刪行銷案→cascade 刪 risks→連帶 cascade 刪 risk_updates），影響範圍其實比文件表格呈現的更深一層，之後處理風險搬遷（Batch 14）時要記得這是巢狀 cascade，不是平行的五張獨立表。

### 4. Batch 12 若開始寫入 `marketing_campaigns`，v1 是否會直接看到？是否要先停用 v1 新增入口？

**會直接看到，而且 v1 新增入口現在就是活的、有三個進入點**（`app.js:656`/`708`/`770` 三處「＋ 新增行銷案」按鈕，`openCampaignModal()` 送出時走 `POST marketing_campaigns`）。因為 v1 所有查詢都是 `select=*` 不篩選，v2 一旦 `POST`/`PATCH` 這張表，下一次 v1 重新整理就會看到 v2 建立或改過的資料，沒有任何延遲或隔離。

這確認了文件已經寫的擔憂是對的，**但我想額外指出一個文件沒提到的細節**：v1 有一個 `campaignSortRank()`/`sortCampaignsManual()` 手動排序機制（依 `sort_order` 欄位），如果 Batch 12 的 v2 新增行銷案表單沒有處理 `sort_order`，新建的案子 `sort_order` 會是 null，`campaignSortRank()` 的 fallback 是 `Number.MAX_SAFE_INTEGER`，代表 v2 新建的案子在 v1 手動排序視圖裡永遠會被排到最後——不是 bug，但如果行銷總監在 v1 習慣用手動排序，這個「v2 建的案子都排最後」的行為值得先讓他知道，不然會覺得排序機制壞了。

「是否要先停用 v1 新增入口」這題文件目前留給 Batch 12「v1 行銷案新增/編輯可暫時保留，但需公告主要入口改 v2」——我同意這個做法（跟資源管理不同，資源已經有明確的「v2 已完整接手」節點，行銷案要到 Batch 12 才真正開始接手，在那之前強制切斷 v1 入口反而讓行銷總監在搬遷過渡期沒地方新增案子），但建議 Batch 12 草案審查時要具體定義「公告」是什麼機制（口頭提醒？v1 首頁加提示 banner？），不要停在文件裡一句話帶過。

### 5. v1 腳本是否有 bulk DELETE 再重建的模式？

**有，兩個腳本都確認會這樣做**，而且都會影響到 Batch 13 計畫要接手軟取消的同一批表：

- `scripts/import-campaign-details.mjs:152-153`：`DELETE marketing_campaign_tasks/budget_items WHERE campaign_id=eq.X` 再重新 `POST`。
- `scripts/seed-exhibition-oct2026.mjs:89-91`：同樣模式，多刪一張 `marketing_campaign_documents`。

好消息：兩個都是**手動執行的 Node 腳本**（需要 `--apply` 旗標、需要環境變數帶服務金鑰或帳密），預設是 dry-run，**沒有被任何 GitHub Action 排程呼叫**（查了 `.github/workflows/` 只有 `tender-monitor.yml`、`weekly-content.yml`，跟這兩個腳本無關）——代表現在不會無預警自動觸發。

但這是一個**寫給 Batch 13 的前置提醒，不是這批的阻塞問題**：一旦 Batch 13 讓 v2 也能新增/軟取消 `marketing_campaign_tasks`/`budget_items`/`documents`，這兩個腳本現在的寫法是「整個 campaign_id 底下的任務/預算/文件全部先刪光再重建」——如果之後有人為了更新 Google Sheet 匯入資料重新跑這個腳本，會把 v2 使用者手動加的、或已經軟取消保留歷史的那些列全部真刪除，整批清空重來，跟 Batch 13「改用軟取消保留歷史」的目標直接衝突。建議 Batch 13 動工前重新設計這兩個腳本（改成用某個「來源=匯入」的標記只刪自己匯入過的列，或乾脆改成 upsert 不刪除），這件事現在記下來，不用現在處理。

---

## 文件本身的其他觀察（非阻塞，供參考）

- 「立即操作建議」第 1 點「口頭提醒行銷總監」——這件事從 Batch 10 draft 就一直提醒到現在，建議這次真的口頭講過之後，在文件或 `phase-1-mvp.md` 記一個「已提醒，日期 X」，避免每個批次的文件都重複寫「建議提醒」卻不確定到底講了沒有。
- `association_task_campaign_id`/`marketing_content_drafts.campaign_id` 都是 `on delete set null`（軟性，不是 cascade），文件的「共用資料表與風險」表格沒有列出這兩個，建議之後處理 Batch 16（公會）或內容營運搬遷時，明確記得這兩個關聯是「刪除行銷案會讓它們變孤兒但不會消失」，跟前面五張 cascade 表性質不同，不需要用同一套緊急程度處理。

---

## 給下一步的建議

Batch 11A 可以直接動工，範圍建議「停用刪除按鈕（主）＋ 過濾已封存資源（配套，三處查詢）」一起做。Batch 11B 動工前，先把上面第 2 點「v1 是否要跟著排除已封存行銷案」這題明確拍板寫進文件，不要留著曖昧空間。Batch 13 動工前記得回來看第 5 點，重新設計那兩個匯入腳本。

---

## 2026-07-17（同日稍晚）：第 2 點已拍板——v1 這批暫時不動

Batch 11A（v1 資源刪除停用）已實作並複查通過（見 `CLAUDE_CODE_REVIEW_BATCH11A_V1_RESULT.md`），四項要求全部驗證正確。

第 2 點「v1 是否要跟著排除已封存行銷案」拍板結果：**這批不動 v1**。決策理由（使用者判斷，記錄如下）：資源庫跟行銷案目前處在不對稱的搬遷階段——資源庫已經是「v2 接手、v1 只是還沒關閉的舊入口」，行銷案現在還是「v1 為主要管理入口、v2 只讀」，同一套「v1 立刻跟著隱藏已封存資料」的做法套在不同階段上風險方向相反：資源庫不隱藏會造成「v1 編輯了但 v2 端沒反應」的困惑（Batch 11A 已處理）；行銷案如果現在就讓 v1 隱藏已封存案子，等於在 v1 仍是主力工具的階段，讓案子在主要入口突然消失，反而提高操作風險。

**Batch 11B 確認範圍**：
- 只幫 `marketing_campaigns` 建立封存欄位（`archived_at`/`archived_by`/`archive_reason`）與 v2 顯示邏輯
- v2 行銷案頁排除已封存案
- v2 顯示已封存行銷案只讀清單
- **v1 暫時不過濾已封存行銷案**（維持現狀，dashboard/清單/排序/CSV 匯出都不受影響）
- 文件需明確寫下：v1 對封存行銷案仍可見，直到 Batch 12（行銷案管理正式改由 v2 接手）才處理 v1 這端

技術上這個範圍沒有新風險——加 nullable 欄位本來就不會讓 v1 的 `select=*` 查詢壞掉，只是「v1 要不要主動排除」這個顯示層決定被延後，跟 SQL migration 本身是否安全是兩件事，Batch 11B 動工前不需要再回頭確認技術可行性，直接照這個範圍走即可。
