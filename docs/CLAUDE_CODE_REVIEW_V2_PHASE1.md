# Claude Code Review｜meisun-marketing-os-v2 Phase 1

審查日期：2026-07-14
審查對象：`meisun-marketing-os-v2` repo（commit `5087c18`）、`docs/phase-1-mvp.md`
審查方式：實測 `index.html`、`assets/app.js`（762 行）、`assets/styles.css`、`docs/phase-1-mvp.md`，並與先前 `CLAUDE_CODE_REVIEW_2026-07-14.md`（舊平台 schema 審查 + 已確認決策）逐項比對。

---

## 主要結論

1. **目前是純前端角色切換原型，沒有任何後端連線**——沒有 `core/config.js`/`api.js`/`auth.js`，也沒有任何 SQL migration 檔案。`assets/app.js` 762 行全部是寫死的假資料（KPI 數字、表格內容都是硬編碼字串）。這代表在談「資料表夠不夠」之前，v2 專案還缺一層基礎：跟 Supabase 的連線。
2. 三個角色的頁面骨架**大致符合**原始需求，但**行銷總監角色缺 2 個關鍵入口**（預算管理、Channel 成效），**招標工具的「管理」功能三個角色都沒有入口**（只有業務看得到結果，沒人能管關鍵字/掃描規則）。詳見下方「角色頁面缺口」。
3. Phase 1 資料表清單（12 張）與先前審查的建議**基本一致，但少了一張**：`association_relationship_tags`（公會多選關係標籤）。這張表在最初的 Task 1 審查就有提過，但在整合成最終決策清單時被漏掉；更值得注意的是，**目前的 UI 原型（`associationTagsSection`）已經把「多標籤、可自訂」寫成產品原則卡片**，代表 Codex 自己也認知到需要這個功能，只是資料表清單沒跟上。
4. 12 張新表本身**不會影響舊平台**——經比對，這些表名跟 v1 現有的 22 張表完全沒有命名衝突。真正需要注意的是幾個**既有表要加欄位**（`tender_results.converted_lead_id`、`marketing_campaign_documents.vendor_id`/`deliverable_id`），這技術上會「碰到」現有表，但用的是 `add column if not exists`，跟 v1 自己的 `schema_v4`/`v6`/`v21` 等既有慣例完全一致，屬於安全的增量寫法，符合「不破壞既有功能」的精神（純新增欄位不會讓舊查詢壞掉）。
5. UI 原型裡幾乎所有指標都還沒有真實資料來源——除了少數幾個直接對應 v1 既有表（`marketing_campaigns`、`marketing_resources`、`tender_results`）的畫面，其餘全部依賴還沒建立的 12 張新表 + 2 個尚未定義的彙總 view。

---

## 風險

| 風險 | 說明 | 影響 |
|---|---|---|
| **無後端連線** | 沒有 `core/*.js`，即使把 12 張表都建好，畫面上還是會顯示假資料，因為沒有程式碼去讀 Supabase。 | 高——這是目前最大的阻塞點，優先權高於「哪張表先建」。 |
| **公會多選標籤表缺失** | `association_relationship_tags` 沒進到 Phase 1 清單，但 UI 原型的 `associationTagsSection` 已經展示「多標籤、可自訂」為核心賣點。 | 中——公會管理頁面上線時這個核心差異化功能會做不出來，畫面會跟資料兜不起來。 |
| **行銷總監入口缺口** | 行銷總監角色的 nav 沒有「預算/補助/付款」、「Channel 成效」兩個入口，但原始需求明確寫「行銷總監管理預算申請/核銷」「行銷總監要看 Channel 數據與轉換率」。 | 中——現在的原型讓行銷總監「沒地方維護預算細節」，跟總經理頁面上寫的「細節由行銷總監維護」互相矛盾。 |
| **招標工具管理沒有入口** | 三個角色都沒有「管理監測專案/關鍵字/篩選規則」的頁面，只有業務看得到標案結果列表。 | 中——原始需求說行銷總監要管搜尋邏輯，目前 UI 原型沒有反映這件事，Phase 1 若照現有 nav 做，這塊功能會沒有畫面可用。 |
| **`來源關聯表`措辭模糊** | `phase-1-mvp.md` 寫「產品知識庫：`product_knowledge_items` 與來源關聯表」，這句話可以讀成只做 evidence source（`product_knowledge_sources`/`product_knowledge_item_sources`），漏掉跟 `marketing_resources` 雙向關聯用的 `product_knowledge_resource_links`（已確認決策 #5 要做雙向）。 | 低——只是文件措辭問題，但如果 Codex 照字面理解會漏一張表，實作前建議明確列出四張表名。 |
| **業務看不到公會資訊** | 業務角色 nav 沒有公會相關入口，但原始需求（p.8/9）寫業務要能查公會背景與名單。 | 低——業務多數需求可能透過 `leads.source_association_id` 間接查到來源，是否需要獨立頁面屬於可以晚一點決定的取捨，先標記。 |

---

## 建議資料表調整

### 確認：12 張表命名與 v1 現有表無衝突

已逐一比對 v1 現有 22 張表（`marketing_campaigns`、`marketing_resources`、`app_user_access`、`associations` 系列、`tender_*` 系列等），`phase-1-mvp.md` 列出的 12 張表全部是全新名稱，沒有撞名風險。

### 需要補上的表

- **`association_relationship_tags`**（`association_id` + `tag` + 是否系統預設/自訂）——對應 UI 原型 `associationTagsSection` 已經展示的「多標籤、可自訂」需求，這張表原本在最早的 Task 1 審查列過，這次補回 Phase 1 清單。

### 需要明確拆開列出的表（避免措辭模糊）

把「來源關聯表」明確拆成三張，跟 `product_knowledge_items` 一起算作知識庫這組共 4 張：
- `product_knowledge_sources`（證據來源 registry）
- `product_knowledge_item_sources`（知識條目 × 來源 junction）
- `product_knowledge_resource_links`（知識條目 × `marketing_resources` 雙向關聯 junction，對應決策 #5）

### 需要對既有表加欄位（非新表，但同批一起做）

- `tender_results` 加 `converted_lead_id`（nullable FK → `leads.id`），支援「轉名單」按鈕。
- `marketing_campaign_documents` 加 `vendor_id`、`deliverable_id`（nullable FK），支援廠商文件關聯。
- `marketing_campaign_performance` 加 `channel` 欄位（選配，只影響「觸及」曝光數的渠道拆分，不影響漏斗核心功能，可以晚一點做）。

以上全部用 `add column if not exists`，比照 v1 既有 `schema_v4_vendors.sql`/`schema_v21_campaign_associations.sql` 的寫法，不改型別、不刪欄位，不影響 v1 既有查詢。

### 需要補的彙總 view（不是表，但頁面沒有它們就沒資料可顯示）

- `association_cooperation_overview`：UNION `association_tasks`/`association_events`/`association_publication_schedules`，餵給公會管理頁的「公會合作紀錄」列表（對應 `associationSection`）。
- `all_expenses_overview`：UNION `marketing_campaign_budget_items`/`association_fee_records`/`association_task_expenses`，餵給總經理「預算/補助/付款」頁（對應 `budgetSection`）。

---

## 建議開發順序

### 第 0 步（阻塞後續一切）：接上後端連線

從 v1 的 `marketing-platform/core/` 複製 `config.js`、`api.js`、`auth.js` 過來（同一個 Supabase 專案，依決策 #1），`auth.js` 的 `loadUserAccess()` 記得補上 `role` 欄位讀取（v1 現況這欄位存在但沒被讀，v2 從一開始就要接對）。這步不做，後面建再多表畫面還是假資料。

### 第 1 批：對接已存在的 v1 資料（不需要新 migration，是最快出真實資料的地方）

- 行銷專案總覽（`projectOverviewSection`）→ 接 `marketing_campaigns`。
- 業務資源下載（`resourceLibrarySection`）→ 接 `marketing_resources`。
- 招標結果列表（`tenderSection`）→ 接 `tender_results`。

這三塊可以在第 0 步完成後立刻讓總經理/行銷總監/業務三個角色的部分畫面顯示真資料，不用等任何新表。

### 第 2 批：`leads` + `lead_follow_ups`

優先權最高的新表——解鎖總經理的商機/Channel/決策中心三頁、業務的「我的名單」頁、行銷總監 dashboard 的待辦、招標頁的「轉名單」按鈕。同批把 `tender_results.converted_lead_id` 欄位加上。

### 第 3 批：`association_stage_options` + `association_relationship_tags` + `association_cooperation_overview` view

公會管理頁（`associationSection`/`associationTagsSection`）兩張卡片都依賴這批，一起做比較有效率。

### 第 4 批：`vendors` + `marketing_campaign_vendors` + `marketing_campaign_vendor_deliverables`

解鎖行銷總監的合作廠商頁（目前 100% 假資料），同批把 `marketing_campaign_documents` 的兩個欄位加上。

### 第 5 批：`sales_requests` + `approval_requests`

解鎖業務需求單頁（雙角色）+ 總經理待決策中心。

### 第 6 批：`product_knowledge_items` 四表 + `all_expenses_overview` view

知識庫頁（雙角色）+ 總經理預算頁的彙總數字，放最後是因為知識庫的證據等級/審核流程相對獨立，不擋其他模組。

### 頁面開發順序建議跟著上面批次走，而不是照 nav 清單順序

因為現在每頁背後的資料依賴不一樣，建議完成一批 migration 就順手把對應頁面從假資料換成真資料，不要等 12 張表全部建完才開始接畫面——這樣總經理跟行銷總監可以早一點看到部分頁面是「真的在動」，比較容易在過程中抓到資料模型不合用的地方。

---

## 每頁指標資料來源缺口（重點摘要）

| 頁面 | 目前資料來源 | 缺口 |
|---|---|---|
| 總經理戰情室 | 全部假資料 | 需要 `leads`（商機轉換率）、`approval_requests`（待決策）、`all_expenses_overview`（預算） |
| 總經理預算頁 | 部分可接 v1 既有 budget/fee/expense 表 | 需要 `all_expenses_overview` view 才能一次彙總 |
| 總經理商機/Channel/決策中心 | 全部假資料 | 完全依賴 `leads` + `approval_requests` |
| 行銷總監合作廠商頁 | 全部假資料 | 完全依賴 `vendors` 三表 |
| 行銷總監公會頁 | 全部假資料 | 依賴 `association_stage_options` + `association_relationship_tags`（新補）+ UNION view |
| 行銷總監知識庫頁 / 業務知識庫頁 | 全部假資料 | 依賴知識庫四表 |
| 行銷總監業務需求頁 / 業務需求單頁 | 全部假資料 | 依賴 `sales_requests` |
| 業務資源下載頁 | 可直接接 `marketing_resources` | 「來源清楚」規則需要 `product_knowledge_resource_links` 才能顯示知識條目關聯 |
| 業務招標工具頁 | 可直接接 `tender_results` | 「轉名單」按鈕需要 `converted_lead_id` 欄位 + `leads` 表 |
| 業務我的名單頁 | 全部假資料 | 完全依賴 `leads` + `lead_follow_ups` |

---

## 需要總經理或使用者確認的問題

1. **`association_relationship_tags` 要不要補回 Phase 1？** UI 原型已經預告這個功能（多標籤、可自訂），但目前資料表清單沒有。建議補上，除非決定 Phase 1 先用 `associations.join_status`（單一欄位）頂著，多標籤挪到 Phase 2。
2. **行銷總監的「預算/補助/付款」入口要不要加回 nav？** 目前只有總經理看得到，但原型文案自己寫「細節由行銷總監維護」，需要一個地方讓他維護。
3. **行銷總監要不要看到「Channel 成效」頁？** 原始需求寫行銷總監要管 Channel 數據，目前 nav 只給總經理。
4. **招標工具的「管理」（關鍵字/監測專案/篩選規則）要放在哪個角色底下？** 目前三個角色都沒有這個入口，只有業務看得到結果列表。
5. **業務要不要看公會摘要？** 目前業務 nav 沒有公會相關頁面，若不需要獨立頁面，至少確認業務端能否透過名單來源間接看到公會背景。
6. **後端連線的優先順序你是否同意？** 建議在動任何新表之前，先把 v1 的 `core/config.js`/`api.js`/`auth.js` 複製過來接上，讓現有的 `marketing_campaigns`/`marketing_resources`/`tender_results` 三塊先顯示真資料，這樣可以最快看到「原型真的在動」，你是否同意這個順序，還是希望先把某個角色的完整資料模型做完再接線？
