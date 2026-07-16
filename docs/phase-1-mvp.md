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
