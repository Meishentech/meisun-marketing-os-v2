# Claude Code Review｜Batch 9B 實作結果（行銷總監資源管理）

審查日期：2026-07-17
審查對象：commit `cf1c92e`「Add marketing resource management」
審查方式：逐行核對 `assets/app.js`/`core/api.js`/`assets/styles.css` diff，比對 v1 `meisheng-marketing` 的 `schema_v12`/`schema_v16` 確認 `resource_type` check 約束與 Storage 檔案大小上限是否一致，並實際啟動本機 preview（375×812 手機寬度）注入測試資料 render 整個 `marketing:knowledge` 頁面，攔截 `uploadStorageFile`/`deleteStorageFile`/`api` 驗證新增/編輯的兩段式寫入與失敗回滾邏輯。

---

## 結論：抓到一個讓「編輯」功能完全無法從畫面進入的路由 bug，其餘實作品質很好

這批的商業決策很清楚（`phase-1-mvp.md` 已記錄：v2 之後接手管理、Phase 1 不做刪除、檔案上傳走既有私有 bucket），程式碼本身——新增/編輯表單、兩段式寫入的失敗回滾、`resource_type` 分類——做得很扎實，甚至主動避開了 Batch 8A 曾經踩過的分類窄化 bug。但**新增的「文宣資源管理」表格區塊，因為漏改一處路由分派表，實際上完全不會出現在畫面上**——這代表「編輯」這個核心動作目前對行銷總監來說是不存在的，只有「新增」還能用。

---

## 🔴 需要修正：`marketingResourceManagerSection()` 是死碼，畫面上永遠不會出現

**問題**：這批把新的資源管理表格加進了 `pages.marketing.knowledge.sections`（`app.js:245`）：

```js
sections: [knowledgeSection(true), marketingResourceManagerSection(), knowledgeGovernanceSection()],
```

但實際決定畫面上顯示哪些區塊的是 `buildCurrentSections()` 裡的 `dynamicSections` 對照表（`app.js:3266`），這批**沒有同步更新**：

```js
"marketing:knowledge": [knowledgeSection(true), knowledgeGovernanceSection()],
```

`buildCurrentSections()` 的邏輯是 `return dynamicSections[key] || page.sections;`——`"marketing:knowledge"` 這個 key 在 `dynamicSections` 裡本來就存在（不是 falsy），所以**永遠不會 fallback 到 `page.sections`**，這批加進 `pages.marketing.knowledge.sections` 的 `marketingResourceManagerSection()` 因此完全是死碼，不會被渲染。

**實測驗證**：注入測試資料、`render()` 整個 `marketing:knowledge` 頁面後，`document.body.innerText` 裡沒有「文宣資源管理」這個標題，頁面上只有「產品知識審核」「證據等級與治理」兩個區塊；`[data-action="edit-marketing-resource"]` 在整個 DOM 裡查不到任何一個。

**影響範圍**：
- 「新增資源」還可以用——因為那個按鈕是加在 `knowledgeGovernanceSection()`（本來就在 `dynamicSections` 清單裡的既有函式）內部，不受這個路由問題影響。
- **「編輯」完全不可達**——`edit-marketing-resource` 這個 action 只出現在 `marketingResourceManagerSection()` 的表格列裡，這個區塊不會渲染，等於行銷總監現在建了新資源之後，永遠沒有入口可以回頭改標題、換檔案、調整可對外狀態或補標籤。也沒有任何地方能瀏覽「目前有哪些資源」的總覽表格（`resourceLibrarySection()` 業務端頁面雖然也讀同一份資料，但那頁沒有編輯按鈕，是業務端唯讀頁）。

**修法**：把 `app.js:3266` 改成：

```js
"marketing:knowledge": [knowledgeSection(true), marketingResourceManagerSection(), knowledgeGovernanceSection()],
```

跟 `pages.marketing.knowledge.sections` 保持一致即可，不需要動其他地方——**我直接呼叫 `openEditMarketingResourceModal()` 驗證過，編輯 modal 本身的邏輯、預填、檔案替換、送出都是對的，純粹是「進不去那個畫面」的路由疏漏，不是編輯功能本身寫錯。**

---

## ✅ 其餘部分核對通過

### `resource_type` 分類完全對齊資料庫 check 約束
`resourceTypeOptions()` 的 10 個選項（簡報/DM/型錄/技術文章/期刊投稿/展場素材/社群文案/圖片影片/案例/其他）跟 v1 `schema_v12_performance_resources.sql` 的 `check (resource_type in (...))` 逐字逐序完全一致——**這批明顯記取了 Batch 8A `knowledgeTypeOptions()` 曾經漏掉兩個既有分類、把既有資料悄悄改壞的教訓，這次特地去核對了原始 check 約束，沒有再犯同樣的錯**，值得記錄下來。就算之後又有類似疏漏，Batch 8A 修好的 `selectOptions()` 通用防呆（不在清單裡的既有值會被保留、加註「（既有值）」）現在也對這個新表單自動生效，是雙重保護。

### 兩段式寫入的失敗回滾邏輯正確
實測攔截 `uploadStorageFile`/`api`/`deleteStorageFile` 模擬「檔案上傳成功、但資料庫寫入失敗」的情境：確認流程是先上傳檔案拿到 `file_path`、組好完整 payload（含 `file_path`/`file_name`/`file_size`）送出 `POST marketing_resources`、寫入失敗後**自動呼叫 `deleteStorageFile` 清掉剛剛上傳的孤兒檔案**，錯誤訊息正確往上拋、被 `modalSubmitHandler` 的 `try/catch` 接住並顯示在 modal 訊息區，不會卡住或靜默失敗。編輯情境的「先確認新檔案上傳成功、資料庫更新成功後才清掉舊檔案」順序也是對的，符合 `phase-1-mvp.md` 記錄的設計。這是延續 Batch 6B 審查建立的「多段式寫入要推演失敗重試情境」原則，這批確實有落地。

### 檔案大小上限跟既有 SQL 一致
`RESOURCE_FILE_MAX_BYTES = 200 * 1024 * 1024`（200MB）跟 v1 `schema_v16_resource_file_size_limit.sql` 把 bucket `file_size_limit` 調到 `209715200`（= 200MB）完全對得上，錯誤訊息裡提示「請先套用 schema_v16_resource_file_size_limit.sql」這份檔案也確實存在於 v1 repo——不是編造的檔名。

### 表單欄位處理正確
`is_external_usable` checkbox 用 `values.is_external_usable === "on"` 判斷——未勾選時 `FormData` 不會帶這個 key，`undefined === "on"` 正確為 `false`，沒有「忘記勾選導致誤判」的問題。`tags` 用逗號/頓號分隔輸入、`split(/[、,]/)` 轉陣列，跟資料庫 `text[]` 型別相容。編輯時若沒選新檔案，payload 不帶 `file_path` 等欄位，不會誤清空既有檔案資訊。

### 手機版
375px 寬度實測新增/編輯表單：所有欄位可捲動、「儲存變更」/「取消」按鈕全寬可觸達，checkbox 搭配 `<label>` 讓點文字也能勾選，原生 `<input type="file">` 正常顯示，沒有欄位被截斷或跟其他元素重疊。

---

## 下次接手備註

若使用者說「編輯功能修好了」，先確認 `app.js:3266` 的 `dynamicSections["marketing:knowledge"]` 是否已經補上 `marketingResourceManagerSection()`，並實測「編輯」按鈕真的出現在畫面上、點下去能開對應資源的編輯 modal（不要只信任 commit message，這正是這次「看起來做完了但畫面上進不去」的教訓）。

Phase 1 刻意不做刪除功能（`marketing_resources` 可能被知識庫關聯或業務需求單引用，需要另外設計軟刪除），這不是這批的疏漏，是記錄在案的決定，之後如果使用者問「怎麼刪不掉資源」，答案在這裡。
