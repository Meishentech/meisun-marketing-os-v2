# 美昇 Marketing OS v2｜Phase 1 MVP

## 目標

先做出可操作的角色分權版本，讓總經理、行銷總監、業務能看到不同首頁與功能入口，並確認資料流程是否符合管理需求。

## Phase 1 優先功能

1. 角色入口
   - 總經理：戰情室、預算、商機、Channel、待決策。
   - 行銷總監：工作台、行銷案、公會、廠商交付物、產品知識、業務需求。
   - 業務：資料中心、文宣下載、產品知識、招標工具、我的名單、需求單。

2. 核心資料模型
   - 商機 / 名單：`leads`、`lead_follow_ups`。
   - 多廠商交付：`vendors`、`marketing_campaign_vendors`、`marketing_campaign_vendor_deliverables`。
   - 審核與需求：`approval_requests`、`sales_requests`。
   - 公會彈性狀態：`association_stage_options`。
   - 產品知識庫：`product_knowledge_items` 與來源關聯表。

3. 優先接資料的頁面
   - 商機 / 名單管理。
   - 行銷專案詳情。
   - 合作廠商 / 交付物。
   - 業務需求單。
   - 公會合作紀錄。

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
