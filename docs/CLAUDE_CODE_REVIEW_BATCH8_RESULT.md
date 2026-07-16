# Claude Code Review｜Batch 8A 實作結果（知識條目詳情/編輯）

審查日期：2026-07-16
審查對象：commit `57d8e0b`「Add knowledge item detail editing」
審查方式：逐行核對 `assets/app.js` diff，並**實際啟動本機 preview（`meisun_marketing_os_v2`，port 8780）在 375×812 手機寬度下用注入測試資料的方式呼叫 `openViewKnowledgeItemModal`/`openEditKnowledgeItemModal`/`openKnowledgeSupplementRequestModal`/`renderSection(knowledgeSection(...))` 實測渲染**，不是只讀程式碼。

---

## 結論：抓到一個會靜默改壞資料的正確性 bug，其餘四項照草案審查建議正確落地

這批把 `CLAUDE_CODE_REVIEW_BATCH8_DRAFT.md` 列的四個項目（詳情 modal、編輯功能、業務端可見性確認、提出補充需求）都做了，且大致遵循草案建議的範圍。但實作中新增的 `knowledgeTypeOptions()` 把知識類型下拉選單的選項清單改窄了，會讓部分既有資料在詳情/編輯 modal 裡顯示錯誤，儲存編輯後還會把資料庫裡的值靜默覆蓋掉。**這個問題直接發生在使用者要求重點檢查的「詳情 modal」跟「編輯功能」兩個範圍內，建議先修再上線。**

---

## 🔴 需要修正：`knowledge_type` 下拉選項清單改窄，會靜默覆蓋既有資料

**問題**：新增的 `knowledgeTypeOptions()`（`app.js:2413-2421`）只列了 7 個選項：

```
市場差異化 / 技術比較 / 競品分析 / 客戶異議處理 / FAQ / 應用情境 / 其他
```

但這個專案從 Batch 5/6B 就確立的正式分類（見 `docs/CLAUDE_CODE_REVIEW_BATCH5_KNOWLEDGE_EXPENSES.md:21`、`docs/CLAUDE_CODE_SCHEMA_REVIEW_PHASE1.md:170`）是 8 個選項：

```
市場差異化 / 技術比較 / 競品分析 / 客戶異議處理 / 應用場景 / FAQ / 簡報說法 / 資料待確認
```

差異：少了「簡報說法」「資料待確認」，「應用場景」被改名成「應用情境」（不同字串）。`knowledge_type` 欄位本身沒有資料庫 check 約束，所以既有資料完全可能存著 `應用場景`/`簡報說法`/`資料待確認` 這三個值。

**根因**：`selectOptions(options, selected)`（`app.js:1663-1668`）在 `selected` 值不在 `options` 清單裡時，不會標記任何 `<option>` 為 `selected`，瀏覽器會直接 fallback 顯示清單第一個選項（`市場差異化`）——但這只是「看起來」選到市場差異化，`<select>.value` 也真的變成 `市場差異化` 了。

**實測驗證**（塞入 `knowledge_type: "應用場景"` 的測試資料）：
1. 開 `openViewKnowledgeItemModal()`（詳情，唯讀）：知識類型欄位顯示「市場差異化」，不是「應用場景」——**詳情頁本身就顯示錯誤資料**，不需要任何編輯動作就會發生。
2. 開 `openEditKnowledgeItemModal()`（編輯）：同樣預設顯示「市場差異化」。DOM 檢查確認 `select[name="knowledge_type"].value === "市場差異化"`。
3. 這代表：行銷總監只是要補「詳細說明」「建議業務說法」這些新加的內容欄位（這批的主要目的），並沒有動知識類型欄位，只要按下「儲存變更」，PATCH payload 就會把資料庫裡原本的 `應用場景` 覆蓋成 `市場差異化`，且沒有任何提示——這是這系列審查目前唯一一次「使用者完全沒動某欄位，儲存卻改掉了它」的情況。

**建議修法（擇一）**：
- 最小改動：`knowledgeTypeOptions()` 補回被拿掉的「簡報說法」「資料待確認」，並把「應用情境」改回「應用場景」，讓清單跟既有 8 個正式分類完全一致，不要在這批順手窄化分類。
- 或者：如果窄化分類是刻意決定（例如「簡報說法」概念上被 `recommended_pitch` 欄位取代），也要在 `selectOptions()` 或呼叫端加一個防呆——當 `item.knowledge_type` 不在目前選項清單裡時，動態把它加成清單裡的一個選項（保留原字串），而不是讓它悄悄消失變成別的值。

第一種修法比較安全、改動小，且不用另外去跟行銷總監確認「簡報說法」「資料待確認」是否真的要淘汰——如果要淘汰是使用者/行銷總監該拍板的分類治理決定，不該是這批「補內容欄位」的副作用。

---

## ✅ 其餘四項核對通過

### 1. 查詢欄位補齊
`loadExistingData()` 的 `product_knowledge_items` select 已補上 `detail`/`recommended_pitch`/`prohibited_pitch`/`related_competitor`/`created_at`，跟草案建議的欄位清單一致。

### 2. 詳情 modal
`openViewKnowledgeItemModal()` 沿用 `knowledgeItemFormHtml(item, true)` 唯讀模式，完整顯示草案建議的所有欄位（主題/類型/產品線/適用對象/使用場合/摘要/詳細說明/建議業務說法/不建議說法/競品對照/證據等級/可用狀態/負責人/最後更新）。實測手機版（375px）modal 內容可正常捲動，「編輯條目」（行銷總監）/「關閉」按鈕皆在視窗內可觸及，尺寸足夠。

### 3. 行銷總監編輯功能
`openEditKnowledgeItemModal()` 開放到接近完整欄位（title/knowledge_type/product_line/target_segment/use_context/summary/detail/recommended_pitch/prohibited_pitch/related_competitor/evidence_level/visibility_status），符合草案「不只改狀態」的建議。`owner` 跟「最後更新」兩個欄位在 `knowledgeItemFormHtml` 裡沒有 `name` 屬性（純顯示用 `<input readonly>` 沒有表單值），不會被 `formValues()` 收集，正確維持唯讀，延續系列審查已確立的「citext FK 欄位不開放重新指派」原則。`PATCH` payload 有帶 `updated_at: nowIso()`，符合這個專案沒有資料庫觸發器自動更新時間戳記的既有慣例。

**未拍板但已知會晚點需要決定的商業規則**：草案審查列的「`visibility_status` 改成『可對外』要不要走 `approval_requests` 給總經理核准」這題，這批選擇了「行銷總監可以直接改」（沒有接 `approval_requests` 的寫入）。整個 repo 目前 `entity_type='knowledge_item'` 的 `approval_requests` 紀錄仍然一筆都沒有——這不是這批的 bug（草案本來就把這題列成「需要你拍板」而非「必須做」），但如果這個決定沒有被使用者明確確認過，建議之後找機會補問一次，避免變成沒人記得曾經是「暫緩」而非「否決」的狀態。

### 4. 業務端可見性
實測確認沒有繞過既有過濾：`knowledgeSection()` 的 `items = visibleKnowledgeItems(isMarketing)`、`findVisibleKnowledgeItem()` 也走同一個過濾函式，兩處都用篩選後的陣列取 `item.id`。用注入測試資料＋`state.role = "sales"` 實測 DOM，確認業務角色的詳情 modal 只會出現「提出補充需求」按鈕，不會出現「編輯條目」按鈕（`querySelector('[data-action="edit-knowledge-item"]')` 回傳 `null`）。

### 5. 提出補充需求
`openKnowledgeSupplementRequestModal()` 重用 `openCreateSalesRequestModal(prefill)`，帶入的 `request_type: "市場分析"`、`priority: "一般"` 都確認存在於 `requestFormHtml()` 自己的選項清單裡（跟上面 `knowledge_type` 的問題不同，這裡沒有選項不匹配的風險）。實測手機版渲染：需求名稱正確帶入「補充資料：{標題}」、需求說明正確帶入摘要與提示文字，表單可捲動，「建立需求」/「取消」按鈕可觸達。

### 手機版整體
新增的 `knowledgeActionGroup()`（查看/編輯按鈕）沿用既有 `actionGroup`/`actionButton` 元件跟 `data-label` 卡片轉換機制，跟 Batch 6C 已經驗證過的模式相同。實測 `renderSection(knowledgeSection(true))` 在 375px 寬度下渲染，「查看」「編輯」兩個按鈕視覺上有清楚分隔、尺寸足夠、不會誤觸——符合 `MOBILE_ACCEPTANCE_CHECKLIST.md` 第 2、3 條標準。列表表頭從 4 欄改成 5 欄時，示範資料（fallback rows）跟真實資料兩個分支都同步補上「操作」欄，沒有造成欄位數對不齊。

---

## 下次接手備註

若使用者說「knowledge_type 選項清單已經修好了」，先確認是採用「補回 8 個選項」還是「加防呆讓不在清單裡的既有值不被吃掉」哪一種修法，再確認既有資料庫裡是否真的有 `應用場景`/`簡報說法`/`資料待確認` 這三個值的紀錄（如果這批上線前資料庫還是空的或只有這批自己建的測試資料，實際受影響筆數可能是零，但修法本身建議還是要做，避免以後又踩到）。

`approval_requests` 是否要接上知識條目可對外審核這題，目前维持「暫緩」狀態，不算這批的阻塞問題。

Batch 8B（`product_knowledge_resource_links` 多對多資源連結管理介面）尚未開始，草案審查已完整涵蓋，之後可直接動工。
