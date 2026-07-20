# Batch 17S 草案：收斂 anon / public 未登入權限

建立日期：2026-07-20

## 背景

Batch 17C 審查時發現一個非 17C 回歸、但屬於 production 既有風險的問題：

- `core/api.js` 原本在沒有登入 session 時，會把公開 anon key 放進 `Authorization: Bearer ...`。
- 實測顯示未登入狀態可透過 anon key 讀取 production 公會資料，且若未 mock 寫入，可能也能寫入。
- 這代表目前的保護主要依賴前端登入畫面，而不是資料庫權限邊界。

本批是插隊的穩平台批次，不是 17D 公會任務/費用功能。

## 決策

1. 前端不再用 anon key 假裝登入授權。
2. 所有 V2 REST 與 Storage 讀寫都要求有登入 access token。
3. Supabase 權限用 SQL 收斂：保留 `authenticated`，撤掉 `anon` / `public` 對核心 business tables 與 views 的直接存取。
4. `app_user_access` 維持欄位級授權，不改成整張表可讀。
5. 不在本批重寫完整 RLS 規則。Phase 1 仍維持「登入者可操作」的既有政策，只先補上「未登入不可操作」這條底線。

## 已修改前端

檔案：`core/api.js`

- `getHeaders()` 不再 fallback `Authorization: Bearer ${KEY}`。
- `api()`、`getSignedUrl()`、`uploadStorageFile()`、`deleteStorageFile()` 都要求 `requireAuth: true`。
- `getCurrentUser()` 仍允許無 token 時回傳 `null`，供登入狀態檢查使用。

這是前端防呆，不是完整安全邊界。即使前端不送 anon bearer，只要資料庫仍授權 anon，外部仍可用 anon key 直接呼叫 REST API，所以必須搭配 SQL。

## SQL 草案

檔案：`sql/phase1_batch17s_anon_lockdown.sql`

設計原則：

- 對 V2 / V1 目前會用到的核心 business tables，補齊 `grant select, insert, update, delete ... to authenticated`。
- 對 `association_stage_options` 保留既有慣例：authenticated 可 `select, insert, update`，不可 `delete`。
- 對 `association_cooperation_overview`、`all_expenses_overview` 只給 authenticated `select`。
- 對 `app_user_access`：
  - authenticated 只可 select `email, display_name, role, is_active, must_change_password`
  - authenticated 只可 update `must_change_password, updated_at`
  - anon/public 無權限
- 對 anon/public 撤掉目標表與 view 的全部權限。
- 使用 `to_regclass()` 動態判斷表是否存在，避免某些 legacy table 不存在時整段 SQL 失敗。
- 不修改 FK、cascade、欄位型別、check constraint、view 欄位形狀。

## 需 Claude 複查重點

1. SQL 是否會誤傷已登入 V1/V2 使用者。
2. `app_user_access` 是否仍維持欄位級最小授權。
3. 是否有任何 V2 正在使用、但沒有列入 authenticated grant 的表或 view。
4. 是否需要把 Storage bucket policy 一起納入本批，或另開後續批次。
5. `public` revoke 是否符合目前 Supabase Data API 暴露策略。

## Live 執行順序

1. Claude 複查 `core/api.js` 與 `sql/phase1_batch17s_anon_lockdown.sql`。
2. 複查通過後，將 SQL 貼到 live Supabase SQL Editor 執行。
3. 跑 SQL 檔案底部三段 smoke test：
   - `anon_*` 全部應為 `false`
   - authenticated 主表權限仍為 `true`
   - `app_user_access` 欄位級權限仍正確
4. 用 production 登入測：
   - eric/admin 可登入並切換視角
   - 行銷總監公會頁可讀取、可新增/編輯/封存公會
   - 業務頁仍可讀文宣、知識庫、需求單
5. 用未登入/無 session 瀏覽器測：
   - 直接開 production 只看到登入畫面
   - REST API 用 anon key 查 `associations` 應被拒絕

## 參考

Supabase 2026-04-28 changelog 已提醒 Data API 曝露與資料表權限需要明確處理；本批採用 `GRANT` / `REVOKE` 控制 API 可見性，RLS 維持既有 Phase 1 模式。
