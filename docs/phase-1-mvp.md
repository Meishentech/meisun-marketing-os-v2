# 美昇 Marketing OS v2｜Phase 1 MVP

## 目標

先做出可操作的角色分權版本，讓總經理、行銷總監、業務能看到不同首頁與功能入口，並確認資料流程是否符合管理需求。

## 產品原則

- **手機優先**：v2 不是桌機後台縮小版；所有新功能都必須能在手機上完整查看、操作、編輯、取消與送審。
- 每一批新增功能都需依 `docs/MOBILE_ACCEPTANCE_CHECKLIST.md` 做手機寬度驗收。

## Phase 1 優先功能

1. 角色入口
   - 總經理：戰情室、預算、商機、Channel、待決策。
   - 行銷總監：工作台、行銷案、預算 / 補助 / 付款、Channel 成效、招標工具管理、公會、廠商交付物、產品知識、業務需求。
   - 業務：資料中心、文宣下載、產品知識、招標工具、我的名單、需求單。

2. 核心資料模型
   - 商機 / 名單：`leads`、`lead_follow_ups`。
   - 多廠商交付：`vendors`、`marketing_campaign_vendors`、`marketing_campaign_vendor_deliverables`。
   - 審核與需求：`approval_requests`、`sales_requests`。
   - 公會彈性狀態：`association_stage_options`、`association_relationship_tags`。
   - 產品知識庫：`product_knowledge_items`、`product_knowledge_sources`、`product_knowledge_item_sources`、`product_knowledge_resource_links`。

3. 彙總 view
   - `association_cooperation_overview`：整合公會任務、活動、期刊合作紀錄。
   - `all_expenses_overview`：整合行銷案預算、公會費用、公會任務費用。

4. 優先接資料的頁面
   - 行銷專案總覽：先接既有 `marketing_campaigns`。
   - 文宣 / 資源下載：先接既有 `marketing_resources`。
   - 招標結果：先接既有 `tender_results`。
   - 商機 / 名單管理。
   - 行銷專案詳情。
   - 合作廠商 / 交付物。
   - 業務需求單。
   - 公會合作紀錄。

## 建議開發順序

0. 後端連線骨架
   - 接同一個 Supabase project。
   - 先做只讀，不改舊資料表。
   - 讀取既有 `marketing_campaigns`、`marketing_resources`、`tender_results`。
   - `app_user_access` 需授權登入者讀取自己的 `role` 欄位，SQL 參考 `sql/phase1_access_role_grants.sql`。

1. 既有資料先進畫面
   - 行銷專案總覽改用真資料。
   - 業務文宣下載改用真資料。
   - 招標結果改用真資料。
   - 若未登入或權限未開，畫面維持示範資料 fallback。

2. 新增商機 / 名單資料模型
   - 建立 `leads`、`lead_follow_ups`。
   - `tender_results` 新增 `converted_lead_id`，支援標案轉名單。
   - SQL 檔：`sql/phase1_batch1_leads.sql`。
   - 驗收：手動新增一筆 lead，確認總經理商機漏斗與業務「我的名單」可讀到資料；標案可記錄 `converted_lead_id`。

3. 公會管理升級
   - 建立 `association_stage_options`。
   - 建立 `association_relationship_tags`。
   - 建立 `association_cooperation_overview`。
   - SQL 檔：`sql/phase1_batch2_associations.sql`。
   - 權限防呆補強：`sql/phase1_batch2_hardening.sql`，收回 `association_stage_options` 的刪除權限。
   - 驗收：確認 9 筆階段選項建立完成、同一公會可掛多個關係標籤、`association_cooperation_overview` 可透過前端讀取且不回權限錯誤。

4. 多廠商與交付物
   - 建立 `vendors`、`marketing_campaign_vendors`、`marketing_campaign_vendor_deliverables`。
   - `marketing_campaign_documents` 新增 `vendor_id`、`deliverable_id`。
   - 擴充 `marketing_campaign_documents.doc_type`：新增合約、設計稿、印刷檔、施工照片、完工照片。
   - SQL 檔：`sql/phase1_batch3_vendors.sql`。
   - 決策：同一廠商可在同一專案擔任多個角色，不加 `unique(campaign_id, vendor_id)`。

5. 審核與業務需求
   - 建立 `sales_requests`。
   - 建立 `approval_requests`。
   - SQL 檔：`sql/phase1_batch4_requests_approvals.sql`。
   - 決策：需求完成不強制要求成品先進 `marketing_resources`；可先完成需求，再回填正式資源。
   - 決策：審核金額門檻先不寫死在資料庫，`approval_requests.approver_role` 由建立審核單時決定。
   - 決策：`approval_requests.title` / `summary` / `amount` / `due_date` 是送審當下的快照，不自動跟來源資料同步。
   - 決策：業務端只顯示自己提出的 `sales_requests`，不 fallback 顯示其他業務的需求。
   - 串接提醒：廠商報價核准使用 `entity_type = 'vendor_quote'`、`entity_id = marketing_campaign_vendors.id`。

6. 產品知識庫與費用彙總
   - 前置補強：`marketing_campaign_budget_items` 新增 `payment_status`、`payment_date`。
   - 前置 SQL：`sql/phase1_batch5_expense_prereq.sql`。
   - 建立產品知識庫四表。
   - 建立 `all_expenses_overview`。
   - SQL 檔：`sql/phase1_batch5_knowledge_expenses.sql`。
   - 決策：`product_knowledge_items.visibility_status` 使用四態：可對外、僅內部、待確認、禁止使用。
   - 決策：知識來源 Phase 1 先用 `url_or_file` 文字欄位，不新增 storage bucket。
   - 決策：知識條目對外使用審核走 `approval_requests`，不在知識表內另建審核流程欄位。
   - 決策：`all_expenses_overview` 保留 `amount`、`amount_budget`、`amount_actual`，方便總經理看預估與實支差異。
   - 補強：`marketing_campaign_vendors` 新增 `payment_date`，讓廠商費用也可依付款日期排序。
   - 費用彙總需納入 `marketing_campaign_vendors.budget_amount` / `actual_amount`。

7. 操作功能層 Batch 6A
   - 新增共用 modal 表單，不另建詳情頁路由。
   - 取消稽核欄位 SQL：`sql/phase1_batch6a_sales_request_cancel.sql`。
   - 業務可建立 `sales_requests`，`requested_by` 由登入信箱自動帶入，並可選擇關聯 `lead_id`。
   - 行銷總監可更新 `sales_requests.status`、`assigned_to`、`due_date`、`description`。
   - 業務需求單支援取消，不真刪除；取消後寫入 `cancelled_at` / `cancelled_by` 並重新讀取列表。
   - 需求狀態改成「已完成」時自動寫入 `completed_at`；改回其他狀態時清空 `completed_at`。
   - 行銷總監可從廠商合作資料建立 `approval_requests`，規則為 `entity_type = 'vendor_quote'`、`entity_id = marketing_campaign_vendors.id`。
   - 總經理可將審核項目標記為「已核准」或「需修正」，前端自動寫入 `decided_by`、`decided_at`、`updated_at`。
   - 廠商報價審核完成後，同步回寫 `marketing_campaign_vendors.quote_status` 為「已核准」或「需修正」。
   - Phase 1 先用前端控制可見操作；`approval_requests` 與其他寫入動作的資料庫層 RLS 保留到 Phase 2 一次整理。

8. 新增資料操作 Batch 6B
   - 決策：v2 完成前不新增 `marketing_campaigns`，避免測試資料直接進入 v1 正式平台共用行銷案列表。
   - 行銷總監可新增廠商合作；表單需選擇既有行銷案，可選既有廠商或在同一表單建立新 `vendors` 主檔，再寫入 `marketing_campaign_vendors`。
   - 廠商合作新增時 `meisun_contact` 固定使用登入者信箱，避免手動輸入造成 FK 錯誤。
   - 行銷總監可新增 `product_knowledge_items`；新條目預設 `visibility_status = '待確認'`，不在新增當下送審。
   - 知識庫 `owner` 固定使用登入者信箱；對外使用審核之後另走 `approval_requests`。

9. 廠商生命週期與手機優先收尾 Batch 6C / Batch 7
   - 廠商合作與交付物支援編輯與軟取消，不真刪除。
   - 已取消廠商合作、已取消交付物與已取消業務需求單提供只讀歷史紀錄；Phase 1 不做恢復功能。
   - 手機優先驗收標準獨立文件化，後續每批新功能都要納入檢查。

10. 產品知識庫操作 Batch 8A / 8B
   - Batch 8A：知識條目支援詳情檢視與行銷總監編輯，業務只看 `可對外` / `僅內部` 條目。
   - Batch 8A：業務可從知識條目詳情提出補充需求，預填 `sales_requests` 表單。
   - Batch 8A：`knowledge_type` 維持 8 個正式分類；下拉選單遇到既有值不在清單中時保留原值，不自動覆蓋。
   - Batch 8B：知識條目可連結既有 `marketing_resources` 文宣 / DM / 資源，不新增檔案上傳。
   - Batch 8B：行銷總監可新增 / 移除 `product_knowledge_resource_links`；業務只可查看已連結資源。

11. 資源下載可操作化 Batch 9
   - `marketing_resources.file_path` 指向私有 Storage bucket `marketing-resource-files`，不得直接當作公開連結。
   - v2 新增 `getSignedUrl()`，下載私有檔案時先取得 Supabase Storage 簽名網址。
   - 資源來源優先順序採 `file_path` ＞ `resource_url` ＞ `canva_url`；三者皆無時顯示「尚無檔案」。
   - `is_external_usable = true` 才提供私有檔案下載；內部資源可查看外部 / Canva 連結，但不簽出私有檔案。
   - Batch 9 僅做業務端與知識條目關聯資源的讀取 / 開啟，不新增或編輯 `marketing_resources`。

12. 行銷總監資源管理 Batch 9B
   - 決策：未來資源庫改以 v2 管理，逐步取代 v1。
   - 行銷總監可在 v2 新增 / 編輯 `marketing_resources`，包含外部連結、Canva 連結、標籤、備註與檔案上傳 / 替換。
   - 檔案使用既有 private Storage bucket `marketing-resource-files`；替換檔案成功寫入資料表後，才嘗試清理舊檔案。
   - 若資料表寫入失敗，已上傳的新檔案會嘗試回滾刪除，避免孤兒檔案。
   - Phase 1 不做資源刪除；因為 `marketing_resources` 可能已被知識庫或業務需求單引用，刪除需另行設計軟刪除與引用處理。

13. 資源封存 Batch 10
   - 現況風險：v1 `meisheng-marketing` 仍有 `marketing_resources` 真刪除按鈕；若刪除已被 v2 知識庫連結的資源，`product_knowledge_resource_links` 會因 `on delete cascade` 被靜默清掉。v2 接手期間需先提醒行銷總監避免在 v1 刪除資源。
   - v2 對 `marketing_resources` 採軟封存：新增 `deleted_at`、`deleted_by`，不做真刪除，不改既有 FK。
   - 封存時允許已有引用的資源被封存，但確認視窗需提示知識條目 / 需求單引用數量。
   - 已封存資源不出現在業務資料庫、常用資料、新增知識資源連結選單與行銷總監資源管理列表。
   - 若已封存資源仍被既有知識條目引用，卡片保留標題並顯示「已封存」，但不提供下載或開啟動作。
   - Phase 1 僅提供已封存資源只讀清單，不提供復原按鈕；復原需另行設計。

14. v1 → v2 搬遷治理 Batch 11
   - 搬遷盤點文件：`docs/V1_TO_V2_MIGRATION_PLAN.md`。
   - 決策原則：先凍結 v1 危險真刪除，再逐批把管理功能搬到 v2。
   - 優先順序：先處理 v1 資源刪除風險，再設計行銷案封存，之後才開始 v2 行銷案新增 / 編輯。
   - 任何開始寫入共用表的批次，都需先請 Claude 做 schema / 行為風險審查。
   - Batch 11A：v1 已停用 `marketing_resources` 真刪除，並排除 v2 已封存資源。
   - Batch 11B：`marketing_campaigns` 新增 `archived_at`、`archived_by`、`archive_reason`；v2 排除已封存行銷案並提供只讀歷史清單。Claude 複查通過，記錄於 `CLAUDE_CODE_REVIEW_BATCH11B_RESULT.md`。
   - 決策：v1 暫時不排除已封存行銷案，直到 v2 正式接手行銷案新增 / 編輯再處理 v1 顯示與入口。
   - Batch 12 動工前草案：`BATCH12_CAMPAIGN_CRUD_DRAFT.md`。此批會開始寫入 v1/v2 共用的 `marketing_campaigns`，需先讓 Claude 審查 v1 刪除風險、欄位對齊與手機操作。
   - Batch 12A：v1 已停用 `marketing_campaigns` 真刪除，避免刪除行銷案時二層 cascade 清掉 v2 廠商合作與交付物。v1 新增 / 編輯暫時保留，供尚未搬遷的任務、預算、文件、風險、成效子模組使用。
   - Batch 12B：v2 已開放行銷案主檔新增 / 編輯 / 封存；不做真刪除。欄位對齊 v1 `saveCampaign()`，新增時沿用 v1 `sort_order` 最小值減 10 的排序規則，公會活動類型保留自由文字輸入。Claude 複查通過，記錄於 `CLAUDE_CODE_REVIEW_BATCH12B_RESULT.md`。
   - Batch 13A 動工前草案：`BATCH13_IMPORT_PRECHECK_DRAFT.md`。Claude 草案審查：`CLAUDE_CODE_REVIEW_BATCH13A_DRAFT.md`。採納結論：先替 v1 兩支會整批 DELETE 重建資料的匯入腳本加第二層破壞性旗標，並只停用 v1 文件真刪除；任務 / 預算刪除暫時保留到 Batch 13B。
   - Batch 13A 實作複查：`CLAUDE_CODE_REVIEW_BATCH13A_V1_RESULT.md`。兩支腳本防護、文件刪除停用、任務 / 預算刪除刻意保留、文件編輯不受影響，全部驗證通過。
   - 決策：V1 可以朝資料管理入口逐步停用前進，所有行銷管理資料未來轉到 V2 管理。完整路線記錄於 `V1_DISABLE_AND_FULL_V2_MIGRATION_PLAN.md`。
   - Batch 13B 正式規格：`BATCH13B_CAMPAIGN_DETAIL_SPEC.md`。採用「詳情頁 + 巡檢卡片」混合架構；巡檢列表唯讀，點列進詳情頁編輯；即將到期任務定義為未完成、未取消、逾期或 7 天內到期；待付款項目排除已付款、不需付款與已取消項目。
   - Batch 13B SQL：`phase1_batch13b_campaign_detail_lifecycle.sql`。任務 / 預算採 `cancelled_*`，文件採 `archived_*`；`all_expenses_overview` 僅排除已取消預算項目，保留歷史行銷案費用。
   - Batch 13B 前端：v2 行銷專案管理已新增跨專案巡檢卡片、單一專案詳情頁、任務新增 / 編輯 / 取消、預算項目新增 / 編輯 / 取消、文件新增版本 / 編輯資訊 / 封存 / 簽名網址開啟。
   - Batch 13B v1 凍結：v2 接手任務與預算項目後，v1 `delTask()` / `delBudgetItem()` 真刪除同步停用；後續由 v2 以取消方式保留歷史紀錄。

## 暫緩到 Phase 2

- 完整資料庫 RLS 權限。
- 欄位級敏感資料權限。
- 完整系統設定後台。
- 高度自動化報表與 AI 分析。

## Cloudflare Pages

目前以靜態前端部署：

- Production branch: `main`
- Build command: 留空
- Build output directory: `/`

若後續升級成 Vite / React：

- Build command: `npm run build`
- Build output directory: `dist`
