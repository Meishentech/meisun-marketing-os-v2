# Claude Code Review｜Batch 8B 實作結果（知識條目連結文宣 / DM / 資源）

審查日期：2026-07-16
審查對象：commit `14b0718`「Link resources to knowledge items」
審查方式：逐行核對 `assets/app.js`/`assets/styles.css` diff、比對 `sql/phase1_batch5_knowledge_expenses.sql` 既有 schema，並**實際啟動本機 preview（port 8780）在 375×812 手機寬度下用注入測試資料的方式呼叫 `openViewKnowledgeItemModal`/`openAddKnowledgeResourceModal`/`openRemoveKnowledgeResourceModal` 實測渲染與行為**，包含攔截 `api()` 呼叫確認實際送出的請求內容。這次補上了使用者原本因本機 Chrome headless 環境問題沒能完成的瀏覽器實測。

---

## 結論：乾淨通過，沒有發現需要修正的問題

這批針對「多對多連結、業務可見性、手機版資源卡片、新增/移除是否誤刪原始資源」四個重點逐項核對，全部正確落地，包含一個原本就存在、這次順便確認仍然有效的資料庫層保護。

---

## 逐項核對

### 1. 多對多連結正確性
`knowledgeResourceLinksFor()`/`resourcesForKnowledgeItem()`/`availableResourcesForKnowledgeItem()` 三個 helper 職責清楚：前兩者組出「這個知識條目已連結哪些資源」給顯示用，後者算出「還沒連結的資源」給新增下拉選單用。實測塞入 2 筆已連結、1 筆未連結的資源，`openAddKnowledgeResourceModal()` 的下拉選單正確只顯示未連結的那 1 筆，已連結的 2 筆被正確排除，不會讓使用者建立重複連結。

額外核對了 DB 層：`sql/phase1_batch5_knowledge_expenses.sql:59` 早在 Batch 5 建表時就下了 `unique (knowledge_item_id, resource_id)` 約束，就算前端篩選邏輯未來被繞過（例如兩個分頁同時操作），資料庫層還是會擋掉重複列——這批不需要另外處理，既有約束已經覆蓋。`openModal()` 既有的送出防雙擊機制（`submit.disabled = true`，`app.js:3207`）也同樣適用於這個新 modal，三層防護（UI 篩選 + 送出防雙擊 + DB unique）都在。

### 2. 業務端可見性
`knowledgeResourceLinksHtml(item, canManage)` 由 `openViewKnowledgeItemModal()` 呼叫時傳入 `state.role === "marketing"`，行銷總監跟業務共用同一個渲染函式，只是 `canManage` 參數不同。實測切換 `state.role = "sales"` 後直接查 DOM：
- `[data-action="add-knowledge-resource"]` 不存在
- `[data-action="remove-knowledge-resource"]` 數量為 0
- 兩筆已連結資源的「開啟」連結正常顯示（2 個）

業務角色能查看已連結資源、但完全沒有新增/移除的操作入口，符合需求。

### 3. 手機版資源卡片
`.linked-resource-card` 桌機版是 `grid-template-columns: minmax(0,1fr) auto`（標題資訊在左、操作按鈕在右同一列），`@media (max-width: 760px)` 覆寫成 `grid-template-columns: 1fr`（改成上下堆疊）。實測 375px 寬度截圖確認：兩筆已連結資源各自是獨立卡片、有明顯邊框分隔，不是塞在表格欄位裡；「開啟」「移除連結」兩個按鈕堆疊顯示、觸控尺寸足夠、沒有互相擠壓或跟其他卡片的按鈕混淆。符合 `MOBILE_ACCEPTANCE_CHECKLIST.md` 第 2、3 條標準。

### 4. 新增/移除是否會誤刪原始資源
這是這次審查最直接驗證的一點：攔截 `openRemoveKnowledgeResourceModal()` 實際呼叫的 `api()`，確認送出的請求是 `DELETE product_knowledge_resource_links?id=eq.{link.id}`——目標是**關聯表自己的 id**，不是 `resource_id` 也不是對 `marketing_resources` 表送任何請求。移除確認彈窗文案也明確寫「這只會移除關聯，不會刪除原始文宣或 DM」，跟實際行為一致，不是文案寫得好聽但行為不同。新增流程同理，`openAddKnowledgeResourceModal()` 的下拉選單資料來源是 `state.data.resources`（既有查詢），沒有任何檔案上傳欄位或呼叫，符合「不做檔案上傳，只連結既有 `marketing_resources`」的設計。

### 5. `marketing_resources` 查詢上限 20→100
`loadExistingData()` 裡的 `marketing_resources` 查詢 `limit` 確認已從 20 提高到 100，避免資源總數超過 20 筆時，已連結但排在後面的資源在 `state.data.resources` 裡找不到、`resourceLinkCard()` 顯示成「已連結資源」空殼標題。

---

## 附帶觀察（非問題，供記錄）

- `resourceLinkCard()` 對 `resource` 用了 optional chaining + 預設值（`resource?.title || "已連結資源"` 等），代表就算未來某筆 `marketing_resources` 被刪除、留下孤兒 `product_knowledge_resource_links` 列（`on delete cascade` 理論上不會發生，因為 FK 是 cascade 不是 set null，但保留這層防呆沒有壞處），畫面也不會直接壞掉。這是好的防禦性寫法，不需要改動。
- `openAddKnowledgeResourceModal()` 在「所有資源都已連結」時會顯示獨立的空狀態提示 modal（而非把停用的新增按鈕留給使用者猜原因），比單純 disable 按鈕更清楚，是比草案建議更細緻的處理。

---

## 下次接手備註

Batch 8（詳情/編輯，含這次修正的 knowledge_type bug）與 Batch 8B（資源連結）都已收尾，沒有已知阻塞問題。若使用者之後提到「知識庫」相關新需求，先讀這份文件 + `CLAUDE_CODE_REVIEW_BATCH8_RESULT.md`，不用重新核對這兩批的基礎功能是否正確。
