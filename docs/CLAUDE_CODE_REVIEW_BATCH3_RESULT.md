# Claude Code Review｜Batch 3 多廠商與交付物實作結果

審查日期：2026-07-15
審查對象：`sql/phase1_batch3_vendors.sql`（commit `b9ed7be`）、`assets/app.js` 合作廠商/交付物相關程式碼
審查方式：實際讀取目前 repo 內容逐行比對，對照上一版 `CLAUDE_CODE_REVIEW_BATCH3_VENDORS.md` 草案審查的每一項要求逐一核對。

---

## 結論摘要

Batch 3 實作完全對齊草案審查的建議，沒有發現需要修正的問題，**可以直接進 Batch 4**。三個之前特別點名的風險點（`doc_type` 約束擴充、`vendor_id` 的 FK 目標、同廠商多角色的商業規則）全部處理正確。找到 2 個非阻塞的小提醒（statusTone 色彩詞彙覆蓋度、approval_requests 未來要接上報價核准），列在第 5 節供 Batch 4 參考。

---

## 1. SQL 欄位、FK、RLS/Grant 檢查

逐項核對 `sql/phase1_batch3_vendors.sql`：

| 檢查項目 | 結果 |
|---|---|
| `vendors` 表欄位 | ✅ 與草案一致，`vendor_type` 維持自由文字，符合已確認的商業規則 |
| `marketing_campaign_vendors.vendor_id references vendors(id) on delete restrict` | ✅ 正確，用 `restrict` 避免刪除廠商主檔時關聯資料無聲消失 |
| `marketing_campaign_vendors.meisun_contact citext references app_user_access(email)` | ✅ 正確延續 Batch 1（`leads.assigned_sales`）已驗證過的 `citext` 寫法，`owner`/`reviewer` 也都用了 `citext`，一致 |
| `marketing_campaign_vendors` 沒有 `unique(campaign_id, vendor_id)` | ✅ 正確反映已確認的商業規則（同一廠商可在同一專案擔任多個角色） |
| `marketing_campaign_vendor_deliverables.campaign_vendor_id` 掛在 junction 而非 `vendors` | ✅ 正確 |
| Index 覆蓋 | ✅ `campaign_id`、`vendor_id`、`campaign_vendor_id`、`(status, due_date)` 都有建，跟草案建議一致 |
| RLS/Grant 寫法 | ✅ 延續 Batch 1/2 已確立的 v2 慣例（`enable row level security` + 明確 `grant ... to authenticated` + `using(true) with check(true)` policy），三張新表風格一致 |
| `create extension if not exists "citext";` | ✅ 補上這行是穩健的做法——即使 Batch 1 應該已經啟用過，這裡用 `if not exists` 保護，重複執行不會出錯 |

沒有發現欄位、FK 或權限寫法上的問題。

---

## 2. `marketing_campaign_documents.vendor_id` FK 目標確認

```sql
alter table marketing_campaign_documents
  add column if not exists vendor_id uuid references marketing_campaign_vendors(id) on delete set null;
```

**確認正確**：FK 指向 `marketing_campaign_vendors(id)`，不是 `vendors(id)`。這是上一版草案審查特別點名容易接錯的地方（欄位命名直覺上會讓人想指到全域 `vendors` 表），這次核對過確實接對了。

前端也正確對應了這個設計：`formatVendorDocuments(campaignVendorId)`（`assets/app.js` 第 623-627 行）拿 `campaignVendor.id`（也就是 `marketing_campaign_vendors.id`）去比對 `document.vendor_id`，邏輯跟資料庫的 FK 目標一致，沒有出現「以為 vendor_id 指的是全域廠商」的誤用。

---

## 3. `doc_type` 約束擴充是否影響舊平台

```sql
alter table marketing_campaign_documents
  drop constraint if exists marketing_campaign_documents_doc_type_check;

alter table marketing_campaign_documents
  add constraint marketing_campaign_documents_doc_type_check
  check (doc_type in ('報價單','合約','設計稿','印刷檔','施工照片','完工照片','攤位設計圖','大會文件','廠商資料','其他'));
```

- **約束名稱確認正確**：v1 原始 `schema_v9_documents.sql` 裡的 `doc_type` check 是inline 寫法、沒有明確命名，Postgres 會依標準規則自動產生 `marketing_campaign_documents_doc_type_check` 這個名字（`<table>_<column>_check`）。這次 `drop constraint if exists` 用的正是這個自動產生的名稱，能正確命中並替換掉原本的約束——SQL 檔案裡也附了驗證用的 smoke test（查 `pg_constraint`），這是穩健的做法。
- **新清單是舊清單的超集合**：原本 5 個值（報價單/攤位設計圖/大會文件/廠商資料/其他）全部保留，只新增 5 個（合約/設計稿/印刷檔/施工照片/完工照片），既有資料列的 `doc_type` 值不會有任何一筆變成不合法，不影響 v1 舊平台既有文件記錄。
- 沒有動到欄位型別、沒有刪除任何欄位，符合「不破壞既有功能」的前提，這項異動雖然技術上是「先刪再建約束」而不是單純 `add column`，但實際效果對舊資料完全無害。

---

## 4. 前端 PostgREST 巢狀查詢檢查

```
marketing_campaign_vendors?select=id,campaign_id,role_in_project,meisun_contact,quote_status,budget_amount,actual_amount,payment_status,created_at,vendors(name,vendor_type),marketing_campaign_vendor_deliverables(id,deliverable_name,owner,due_date,status,reviewer,attachment,notes)&order=created_at.desc&limit=100
```

這正是上一版草案審查建議的寫法：一次查詢同時 embed 父層 `vendors(...)`（透過 `marketing_campaign_vendors.vendor_id` 這條單一 FK）跟子層 `marketing_campaign_vendor_deliverables(...)`（透過該表 `campaign_vendor_id` 這條單一 FK 反向關聯）。兩條 FK 路徑都是唯一、不含糊，PostgREST 能正確自動解析，不會因為命名或多重路徑造成關聯歧義。

**唯一需要留意的操作面細節（不是程式碼問題）**：Migration 剛執行完的當下，PostgREST 的 schema cache 需要重新整理才會認得新的 FK 關聯，Supabase 通常會在 DDL 變更後自動觸發 cache reload，但如果驗收時第一次呼叫這個 embedding 查詢就報「could not find relationship」，先不要懷疑 SQL 或前端寫錯，重新整理一次頁面或等幾秒通常就會恢復——這不是這次審查發現的錯誤，是操作提醒。

`marketing_campaign_documents?select=id,doc_type,vendor_id,deliverable_id&vendor_id=not.is.null&limit=100` 這個查詢語法（`not.is.null`）也正確，能篩出已經連結廠商的文件。

`safeGET` 的既有 fallback 機制（失敗回傳空陣列而非讓整個 `Promise.all` 中斷）延續了 Batch 1/2 的防護設計，這批也一致套用，沒有問題。

---

## 5. Batch 4 開始前的阻塞檢查

**沒有發現會阻塞 Batch 4（審核與業務需求：`sales_requests`、`approval_requests`）開始的問題。** 兩張表都不依賴 Batch 3 新建的任何表，可以直接開始。

**非阻塞、建議在 Batch 4 順便處理的小提醒**：

1. **`statusTone()` 還沒涵蓋廠商相關詞彙**——延續 Batch 2 出現過的同一種狀況：`vendorSection` 用到的 `quote_status`（待報價/已報價/待核准/已簽約）、`payment_status`（未請款/待付款/已付款）裡，只有「待核准」「待付款」剛好命中既有 `statusTone()` 的黃色分類，其餘（待報價/已報價/未請款/已付款/已簽約）都會顯示成無色標籤。不影響資料正確性，純視覺辨識度，之後有空一起把 `statusTone()` 的詞彙表補齊即可（公會的階段詞彙也還沒補，可以一起處理）。
2. **`approval_requests`（Batch 4）建好後，建議把廠商報價核准接進去**——目前 `vendorKpis()` 的「待核准報價」是直接在前端用 `quote_status` 篩選算出來的（第 1188 行），這對 Phase 1 顯示已經足夠。但等 Batch 4 建了共用的 `approval_requests` 表之後，總經理的「待決策中心」頁如果要看到「需要我核准的廠商報價」，建議讓 `quote_status` 變成 `待核准` 時同步寫一筆 `approval_requests`（`entity_type='vendor_quote'`、`entity_id` 指向 `marketing_campaign_vendors.id`），這樣待決策清單才會是單一資料來源，不用在總經理戰情室頁另外寫一套「去查所有 vendor 的 quote_status」的邏輯。這件事現在不用做，Batch 4 設計 `approval_requests` 的串接規則時記得把這個情境考慮進去即可。
