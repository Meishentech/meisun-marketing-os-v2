# Claude Code Review｜Batch 10 實作結果（資源封存工作流程）

審查日期：2026-07-17
審查對象：commit `b680e6c`「Add resource archive workflow」
審查方式：逐行核對 `assets/app.js`/SQL diff，並實際啟動本機 preview 注入涵蓋「有引用」與「無引用」兩種資源的測試資料，**用真實 `.click()` 事件走完使用者要求的完整路徑**：資源管理頁點「封存」→ modal 顯示引用數量 → 點「封存資源」送出 PATCH → 資源從管理列表移到已封存清單 → 業務端列表與首頁「常用資料」不再顯示該資源；另外交叉核對了知識條目已連結資源卡片、`resourceReferenceCounts()` 的資料來源是否會重複計算。

---

## 結論：乾淨通過，完整點擊路徑五步驟全部驗證正確，沒有發現問題

`phase-1-mvp.md` 記錄的設計決策（軟封存不真刪除、不改 FK、允許封存但要提示引用數量、封存後停用下載/開啟動作）跟程式碼實作完全一致，而且部分細節做得比草案審查建議的更完整。

---

## 完整點擊路徑逐步驗證

用真實 `.click()`（不是直接呼叫函式）觸發，過程如下：

1. **資源管理頁點「封存」**：對一筆同時被 1 個知識條目連結、1 個業務需求單（`deliverable_resource_id`）引用的測試資源點擊 `[data-action="archive-marketing-resource"]`。
2. **Modal 顯示引用數量**：確認彈窗文字正確顯示「這份資源目前被 **2** 個地方引用（**知識條目 1 / 需求單 1**）」，數字跟來源分類都對；另外測試了一筆完全沒有引用的資源，正確顯示「目前沒有被知識條目或需求單引用」的另一種文案，沒有把「0 個引用」跟「有引用」共用同一句話。
3. **送出 PATCH**：攔截 `api()` 確認送出的是 `PATCH marketing_resources?id=eq.{id}`，payload 正確帶 `deleted_at`（ISO 時間戳）、`deleted_by`（登入者 email）、`updated_at`。
4. **資源移到已封存清單**：重新渲染後，「文宣資源管理」表格正確少了這筆資源，「已封存文宣資源」標題數字從 (0) 變成 (1)，展開 `<details>` 後正確顯示標題、類型、引用摘要（「知識條目 1 / 需求單 1」）、封存日期與操作者。
5. **業務端不再顯示**：切到業務角色，「文宣 / 資源下載」頁跟業務首頁「常用資料」都正確排除已封存資源，同時確認**沒有連帶排除其他仍在使用中的資源**（另一筆沒被封存的測試資源在兩個頁面都還正常顯示）。

五步驟全部符合預期，沒有一步需要修正。

---

## 額外核對的細節

### 已封存但仍被引用的資源：知識條目卡片行為符合文件記錄的（比建議更嚴格的）決策
`phase-1-mvp.md` 寫的是「不提供下載或開啟動作」，比我在草案審查裡只建議加標籤更保守。實測知識條目詳情裡的已連結資源卡片：標題旁正確出現「已封存」amber 標籤，操作按鈕變成單一個 disabled 的「已封存」按鈕（`resourceActionButtons()` 一偵測到 `deleted_at` 就直接短路，不再判斷 `file_path`/`resource_url`/`canva_url` 個別來源），「移除連結」仍然可以點——這個組合是對的：標題保留可辨識、下載/開啟徹底鎖死、但知識條目擁有者還是能自行決定要不要把這個過時的關聯拿掉。

### 引用計數來源正確，沒有重複計算
`resourceReferenceCounts()` 合併 `state.data.salesRequests`（`loadSalesRequests()` 過濾 `cancelled_at is null`）跟 `state.data.cancelledSalesRequests`（過濾 `cancelled_at not.is.null`）兩個陣列——查了這兩個 loader 的查詢條件，互斥不重疊，不會有同一筆需求單被算兩次的問題。

### `findResource()` 與 `activeResources()` 職責分離正確
草案建議的「`findResource()` 保持不過濾、`activeResources()` 給可選取情境用」這個分工在 diff 裡確實分開處理：`marketingResourceManagerSection()`/`resourceLibrarySection()`/`salesHomeResourcesSection()`/`availableResourcesForKnowledgeItem()` 全部改用 `activeResources()`；`resourcesForKnowledgeItem()`（已連結資源的標題查詢）維持用 `findResource()` 不過濾——這正是已封存資源在知識條目卡片還能正確顯示標題、但不會出現在「新增連結」選單或管理列表的原因。

### SQL migration 最小化，符合建議
`sql/phase1_batch10_resource_archive.sql` 只加兩個 nullable 欄位（`deleted_at`/`deleted_by`），沒有動任何既有欄位或外鍵約束，符合「不改 FK、只要 v2 不發真 DELETE 就不會觸發 cascade」的建議。

### 額外發現的好設計：`loadMarketingResources()` 三層 fallback
這批把原本單一行的 `marketing_resources` 查詢改寫成 `loadMarketingResources()`，依序嘗試「完整新欄位」→「不含封存欄位但含 tags/notes」→「最原始欄位」三種 select，任一層因為資料庫還沒跑 migration 而查詢失敗（回傳非陣列）就自動降級到下一層。這不是草案建議的內容，是這批自己加的防呆，避免「SQL 還沒套用、但前端已經部署新版程式碼」這個時間差窗口讓整頁掛掉——跟這個專案其他地方（`loadTenderResults()`/`loadUserAccess()`）已經用過的同款 fallback 手法一致，值得記錄下來當作以後加欄位查詢時的標準做法。

---

## 關於使用者提到的兩件事

**v1 真刪除風險提醒**：已經在確認範圍內，這批的 `phase-1-mvp.md` 也把這個現況風險正式記錄下來了（「v2 接手期間需先提醒行銷總監避免在 v1 刪除資源」），不需要我再重複提醒，但確認這件事沒有被之後的批次遺忘——之後如果有人問「為什麼還要提醒 v1」，答案在 `phase-1-mvp.md` 第 13 項。

**Supabase changelog 交叉核對**：這批 SQL 只在既有表 `marketing_resources` 上加兩個欄位，沒有新建資料表，不受「新表 Data API 預設暴露」這類 breaking change 影響，跟使用者的判斷一致，我這邊從程式碼跟 SQL 內容角度也沒有看到需要另外處理 Data API 曝露範圍的地方。

---

## 下次接手備註

Batch 10 完全收尾，沒有殘留問題。「已封存資源復原」功能刻意留白（`phase-1-mvp.md` 明確寫「Phase 1 僅提供已封存資源只讀清單，不提供復原按鈕」），之後如果使用者問「封存錯了要怎麼救回來」，目前答案是要手動去 Supabase 後台改 `deleted_at` 為 null，還沒有 UI 入口，這是已知、刻意的範圍界線，不是遺漏。
