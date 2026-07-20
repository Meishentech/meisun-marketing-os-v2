# Batch 18 草案：資料庫層權限治理

建立日期：2026-07-20

## 背景

Batch 17S 已完成第一層安全底線：

- V2 前端 `core/api.js` 已要求 REST / Storage 讀寫必須有登入 token。
- live Supabase 已撤掉 `anon` / `public` 對核心 business tables 與 views 的直接權限。
- `authenticated` 角色仍保留大多數資料表的 `select, insert, update, delete` 權限。

這代表目前未登入風險已收斂，但登入後仍是 Phase 1 的寬鬆模式：只要使用者有合法登入 token，就可能繞過前端按鈕，直接呼叫 REST API 改到前端角色原本不允許操作的資料。

Batch 18 目標不是新增功能，而是把「前端角色限制」逐步落到資料庫層。

## 目前權限模型

### 前端角色

V2 目前依 `app_user_access.role` 正規化為三種畫面：

- `executive`：總經理視角。
- `marketing`：行銷總監視角。
- `sales`：業務視角。

`admin` / `administrator` / `系統管理者` 目前正規化成行銷總監視角，但 `state.auth.canSwitchRoles = true`，可在前端切換三種視角。

重要原則：資料庫層不能相信「目前切到哪個視角」，只能相信登入帳號在 `app_user_access` 內的真實角色。也就是 eric/admin 即使切到業務畫面，資料庫層仍應視為管理者帳號；一般業務不能靠改前端狀態取得行銷總監寫入權限。

### 目前資料庫權限

`sql/phase1_batch17s_anon_lockdown.sql` 已做：

- `anon` / `public`：核心資料表與 view 無權限。
- `authenticated`：核心資料表多數仍是全表 `select, insert, update, delete`。
- `association_stage_options`：`authenticated` 可 `select, insert, update`，不可 `delete`。
- `app_user_access`：只給欄位級 `select` / `update must_change_password`。

多數早期 migration 的 policy 仍是 `to authenticated using (true) with check (true)` 這類 Phase 1 寬鬆模式。

## 風險判斷

### 已處理

- 未登入者不能直接用 anon key 讀寫核心資料。
- 前端不再用 anon key 當 Authorization fallback。
- V1 已凍結大部分由 V2 接手的寫入入口，降低跨平台真刪除與寫入衝突。

### 尚未處理

1. 業務帳號理論上仍可直接 REST `PATCH marketing_campaigns`、`POST marketing_resources`、`DELETE product_knowledge_resource_links` 等，只要拿到自己的登入 token。
2. 總經理帳號理論上仍可直接寫入行銷案、公會、資源、知識庫等資料表，即使前端只給審核與總覽。
3. `app_user_access` 目前是權限來源，但尚未建立完整的 RLS helper / policy 來讓其他資料表依照登入信箱判斷角色。
4. Storage bucket 權限尚未跟資料列治理完整對齊。前端會依 `is_external_usable` 控制下載按鈕，但資料庫 / Storage 層仍需另外確認是否能被直接簽出。

## 設計原則

1. **先不改前端角色邏輯**
   - 前端 UI 已可用，Batch 18 先補資料庫防線，不重新設計畫面。

2. **資料庫以登入帳號為準**
   - 使用 Supabase Auth JWT 內可信的 email claim 對應 `app_user_access.email`。
   - 不使用 `user_metadata` 做授權判斷，避免使用者可改欄位影響權限。
   - 長期若要更嚴謹，可把 `app_user_access` 改為以 `auth.users.id` / `auth.uid()` 做主鍵；Phase 1 先沿用 email，因為現有所有 FK 都指向 `app_user_access.email`。

3. **分批套 RLS，不一次全改**
   - 一次改完所有 policy 風險太高，會讓 production 難以定位是哪張表斷掉。
   - 每批只處理一組資料表，SQL 後必跑 live smoke test，再做前端角色流程驗收。

4. **先收斂寫入，再收斂讀取**
   - 讀取權限影響總經理總覽、週報、Channel、費用彙總與 V1 查詢，風險較高。
   - 第一階段優先禁止不該寫的人寫入；讀取可先維持較寬，再逐步收斂敏感表。

5. **Admin 角色全權**
   - `admin` / `administrator` / `系統管理者` 應具備所有 V2 管理權限。
   - 這是給 eric@mcttw.com.tw 等管理帳號使用，避免前端切換視角時被資料庫層誤擋。

## 建議角色矩陣

| 資料範圍 | 總經理 | 行銷總監 / Admin | 業務 |
|---|---|---|---|
| 行銷案主檔與任務 / 預算 / 文件 / 風險 / 成效 | 讀取 | 讀寫、取消、封存 | 讀取必要摘要，第一階段可先只讀 |
| 公會管理 8 張表與關係標籤 | 讀取 | 讀寫、取消、封存 | 第一階段不寫，讀取可先維持或依頁面收斂 |
| 廠商 / 交付物 | 讀取 | 讀寫、取消 | 不寫 |
| 文宣資源 / 產品知識庫 | 讀取可用內容 | 讀寫、封存、管理連結 | 讀取可用內容，提出補充需求 |
| 業務需求單 | 讀取摘要可選 | 讀取全部、更新處理狀態 | 新增自己的、讀取自己的、取消自己的 |
| 名單 / 跟進 | 讀取彙總 | 讀取全部、分派 | 讀取 / 更新 assigned_sales = 自己 |
| 待決策 approval_requests | 讀取、決策更新 | 建立、讀取、補資料 | 通常不寫；若未來要讓業務送審需另定 |
| 招標工具 | 暫緩 | 暫緩 | 暫緩 |
| Storage：文宣資源檔案 | 依資料列規則 | 上傳 / 替換 / 簽出 | 只簽出可對外檔案 |
| Storage：行銷案文件 | 讀取可選 | 上傳 / 簽出 | 不簽出 |

## 建議拆批

### Batch 18A：權限治理草案與 live 權限盤點

本批，只寫文件，不寫 SQL。

需請 Claude 複查：

- 角色矩陣是否符合實務。
- 哪些表可以先收斂寫入。
- 哪些表若收斂讀取會破壞總經理 / 週報 / V1 查詢。
- Storage 是否應先獨立成 18F，而不是混在表 RLS 內。

### Batch 18B：建立權限 helper 與 app_user_access 自身政策

目標：

- 建立資料庫可重用的角色判斷方式。
- 讓 RLS policy 能穩定判斷目前登入者是否為 admin / marketing / executive / sales。
- 不開 `SECURITY DEFINER` 寬門；若 Claude 建議必須用 helper function，需特別審查函式安全、schema、execute grant 與 RLS 互動。

建議 smoke test：

- eric/admin 判斷為 admin。
- marketing 帳號判斷為 marketing。
- sales 帳號判斷為 sales。
- 未登入 / anon 無法查 `app_user_access`。
- 登入者只能讀到必要欄位，不能讀整張使用者表的敏感欄位。

### Batch 18C：先收斂業務自有資料

優先資料表：

- `sales_requests`
- `leads`
- `lead_follow_ups`

理由：

- 前端已經有「業務只看自己的需求單」邏輯。
- 這組表最能直接驗證「業務只能寫自己的」是否成功。

建議政策：

- marketing/admin：讀寫全部。
- sales：`sales_requests.requested_by = auth email` 可讀 / 新增 / 更新取消；`leads.assigned_sales = auth email` 可讀 / 更新跟進。
- executive：讀取摘要或全部，先不給寫入。

### Batch 18D：待決策中心

資料表：

- `approval_requests`

建議政策：

- marketing/admin：可建立與更新自己建立的補充欄位。
- executive/admin：可更新 `status`、`decided_by`、`decided_at`、`decision_note`。
- sales：第一階段不寫。

注意：目前 `approval_requests.entity_type/entity_id` 無 FK，是刻意保留歷史快照；RLS 不應假設來源表一定存在。

### Batch 18E：行銷管理核心資料表

資料範圍：

- `marketing_campaigns`
- `marketing_campaign_tasks`
- `marketing_campaign_budget_items`
- `marketing_campaign_documents`
- `marketing_campaign_risks`
- `marketing_campaign_risk_updates`
- `marketing_campaign_performance`
- `marketing_campaign_vendors`
- `marketing_campaign_vendor_deliverables`
- `vendors`
- `marketing_resources`
- `product_knowledge_items`
- `product_knowledge_resource_links`

建議政策：

- marketing/admin：讀寫。
- executive：讀取；只在 `approval_requests` 做決策寫入。
- sales：讀取資源 / 知識庫可用內容；不寫行銷案核心表。

這批不建議第一個做，因為表最多、風險最高。

### Batch 18F：公會資料表

資料範圍：

- `associations`
- `association_relationship_tags`
- `association_tasks`
- `association_task_expenses`
- `association_events`
- `association_publication_schedules`
- `association_fee_records`
- `association_benefits`
- `association_notes`
- `association_stage_options`
- `association_cooperation_overview`
- `all_expenses_overview`

建議政策：

- marketing/admin：公會管理讀寫。
- executive：讀取。
- sales：第一階段可讀摘要或不讀，需依實際業務是否需要公會資訊決定。
- `association_stage_options`：仍不開 delete。
- views：保留 `security_invoker = true`，且只 grant select。

### Batch 18G：Storage 權限治理

資料範圍：

- `marketing-resource-files`
- `campaign-documents`

要先釐清：

- 業務是否只可下載 `marketing_resources.is_external_usable = true` 的私有檔案。
- 內部文件是否應只允許 marketing/admin 簽出。
- 行銷案文件是否總經理可下載、業務不可下載。

如果 Storage policy 無法方便 join business table 欄位，需考慮改用 Edge Function / server-side signed URL 流程，避免單靠前端按鈕保護。

## SQL 實作注意

1. 不要用 `auth.role()`。
2. 不要用 `user_metadata`。
3. UPDATE policy 必須同時有 `USING` 與 `WITH CHECK`。
4. UPDATE 需要 SELECT policy，否則會變成更新 0 rows 而不報錯。
5. View 要維持 `security_invoker = true`；若新增 view，必須明確 `grant select ... to authenticated`。
6. 新表 / 新 view 不可假設會自動曝露到 Data API，SQL 後要驗證 grants 與 REST 查詢。
7. 不要把 service role key 放進前端。
8. 每批 SQL 都必須有 live smoke test，而且要實際執行，不只存檔。

## Live smoke test 要求

每批至少要有四組測試：

1. **SQL 權限檢查**
   - `anon` 對目標表仍無權限。
   - `authenticated` grants 沒被誤撤。
   - 目標 policy 存在。

2. **真實帳號 REST 測試**
   - admin 帳號可做應有操作。
   - marketing 帳號可做應有操作。
   - sales 帳號做不該做的寫入時被拒絕。
   - executive 帳號不能寫入非決策表。

3. **前端流程測試**
   - 三個角色登入 production。
   - 原本可用的頁面不應整頁壞掉。
   - 被 RLS 擋住時要顯示可理解錯誤，不可無限 loading。

4. **V1 邊界測試**
   - V1 已凍結的模組維持可查詢。
   - V1 仍在用的功能不因 V2 RLS 斷線。

## 需拍板問題

1. 業務是否需要讀取公會資料，或只由行銷總監使用公會管理。
2. 業務名單 `leads` 是否嚴格限制 `assigned_sales = 自己`，還是業務可看全部但只更新自己。
3. 總經理是否只讀全站資料，還是也允許直接編輯某些欄位。
4. `approval_requests` 是否只允許總經理決策，admin 是否也可代決策。
5. Storage 是否接受 Phase 1 先維持前端限制，還是 Batch 18 必須一起收斂。
6. 若 RLS 改完會讓 V1 某些查詢變慢或空白，是否可接受，或要先完整停用 V1 查詢。

## 建議下一步

請 Claude 先複查本草案，重點看：

1. 角色矩陣是否符合實務。
2. Batch 18B helper / app_user_access 政策是否應先做。
3. 18C 是否適合先從 `sales_requests` / `leads` 開始，而不是先動行銷案主表。
4. Storage 是否應獨立延後。

複查通過後，再寫 18B SQL；SQL 審查通過、live Supabase 實際執行並 smoke test 後，才能開始下一批。
