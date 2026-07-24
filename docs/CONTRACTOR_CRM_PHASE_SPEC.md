# 工程公司 CRM｜規格與開發安排

## 目標

在美昇 Marketing OS v2 的行銷端新增「工程公司 CRM」，由行銷維護工程公司、技師、拜訪紀錄與後續追蹤，支援長期市場開發與專案合作管理。

此模組不是一般業務名單，也不先併入既有業務管理系統。Phase 1 先作為行銷維護的關係資料庫，之後再評估是否與客戶管理或業務名單系統串接。

## 使用角色

| 角色 | 權限 |
| --- | --- |
| 行銷 / admin | 可新增、編輯、封存工程公司、聯絡人、拜訪紀錄與追蹤事項；可執行匯入與去重。 |
| 總經理 / executive | 先只看摘要與重點追蹤，不開放編輯；是否可編輯另行討論。 |
| 業務 / member | Phase 1 先不顯示此模組；工程公司資料由行銷端維護。 |

## 來源資料

使用者提供的三份 Excel 是第一批資料來源：

1. `工程公司+技師拜訪名單-已整理 03.10.xlsx`
   - `甲種承裝業`
   - `重點公司`
   - `技師拜訪名單`
   - `技師開發名單`
2. `甲種空調工程公司通訊錄 115.01.28.xlsx`
   - `甲種承裝業`
   - `重點公司`
3. `美昇工程公司拜訪表.xlsx`
   - `台中工程公司拜訪表(`
   - `台北工程公司拜訪表`

### 來源盤點摘要

| 檔案 | 工作表 | 目前可辨識資料量 | 主要內容 |
| --- | --- | --- | --- |
| `工程公司+技師拜訪名單-已整理 03.10.xlsx` | `甲種承裝業` | 約 131 間公司 | 甲種空調承裝業公司主檔 |
| `工程公司+技師拜訪名單-已整理 03.10.xlsx` | `重點公司` | 約 22 間公司 | 重點工程公司、聯絡人與工程案件 |
| `工程公司+技師拜訪名單-已整理 03.10.xlsx` | `技師拜訪名單` | 約 128 筆技師 / 拜訪對象 | 技師、地區、公司寶號、慣用廠牌 |
| `工程公司+技師拜訪名單-已整理 03.10.xlsx` | `技師開發名單` | 約 29 筆開發對象 | 待開發技師與公司資訊 |
| `甲種空調工程公司通訊錄 115.01.28.xlsx` | `甲種承裝業` | 約 132 間公司 | 較新的甲種承裝業通訊錄 |
| `甲種空調工程公司通訊錄 115.01.28.xlsx` | `重點公司` | 約 22 間公司 | 重點公司補充資料，含年營業額 |
| `美昇工程公司拜訪表.xlsx` | `台中工程公司拜訪表(` | 約 34 筆拜訪紀錄 | 台中工程公司拜訪與掌握度 |
| `美昇工程公司拜訪表.xlsx` | `台北工程公司拜訪表` | 約 26 筆拜訪紀錄 | 台北工程公司拜訪與掌握度 |

## 資料模型草案

### `contractor_companies`

工程公司或相關單位主檔。

| 欄位 | 用途 |
| --- | --- |
| `id` | UUID 主鍵 |
| `company_name` | 公司名稱 |
| `company_type` | 工程公司、技師事務所、顧問公司、承裝業、其他 |
| `region` | 北部、中部、南部、東部、未分類 |
| `address` | 地址 |
| `phone` | 公司電話 |
| `fax` | 傳真 |
| `email` | 公司 Email |
| `website` | 網站 |
| `representative_name` | 負責人 |
| `primary_contact_name` | 主要聯絡人 |
| `mobile` | 主要聯絡手機 |
| `capital_amount_text` | 資本額，先保留來源文字 |
| `annual_revenue_text` | 年營業額，先保留來源文字 |
| `employee_count_text` | 員工數，先保留來源文字 |
| `contractor_grade` | 空調承裝業等級 |
| `dealer_brands` | 經銷品牌 |
| `preferred_brands` | 慣用廠牌 |
| `project_experience` | 相關工程案件 |
| `relationship_status` | 洽談中、已拜訪、重點維護、暫緩、封存等自由狀態 |
| `potential_level` | A/B/C 或 H/M/L，可先用文字 |
| `owner` | 內部負責人，指向 `app_user_access.email` |
| `source_note` | 來源說明 |
| `import_batch_id` | 匯入批次 |
| `archived_at` / `archived_by` / `archive_reason` | 封存紀錄 |
| `created_at` / `updated_at` | 建立與更新時間 |

### `contractor_contacts`

聯絡人、技師或公司內部窗口。

| 欄位 | 用途 |
| --- | --- |
| `id` | UUID 主鍵 |
| `company_id` | 對應工程公司，可為空以支援尚未歸戶技師 |
| `contact_name` | 姓名 |
| `contact_type` | 負責人、聯絡人、技師、會員代表、其他 |
| `role_title` | 職稱 |
| `phone` / `mobile` / `email` / `line_id` | 聯絡方式 |
| `region` | 地區 |
| `engineer_level` | 技師分級或內部分級 |
| `practice_status` | 執業狀態 |
| `preferred_brands` | 慣用廠牌 |
| `notes` | 備註 |
| `owner` | 內部負責人 |
| `archived_at` / `archived_by` / `archive_reason` | 封存紀錄 |
| `created_at` / `updated_at` | 建立與更新時間 |

### `contractor_interactions`

拜訪、電話、活動接觸、會議、寄送資料等互動紀錄。

| 欄位 | 用途 |
| --- | --- |
| `id` | UUID 主鍵 |
| `company_id` | 對應工程公司 |
| `contact_id` | 對應聯絡人，可選 |
| `interaction_date` | 互動日期 |
| `interaction_type` | 拜訪、電話、LINE、活動、寄送資料、其他 |
| `owner` | 負責同仁 |
| `summary` | 拜訪內容 / 摘要 |
| `customer_reaction` | 對方反應 |
| `mentioned_project` | 提到的案場或機會 |
| `competitor_info` | 競品或慣用品牌資訊 |
| `next_step` | 下一步 |
| `next_followup_date` | 下次追蹤日 |
| `potential_level` | 本次評估掌握度 H/M/L |
| `needs_marketing_support` | 是否需要行銷支援 |
| `created_at` / `updated_at` | 建立與更新時間 |

### `contractor_followups`

待追蹤事項。

| 欄位 | 用途 |
| --- | --- |
| `id` | UUID 主鍵 |
| `company_id` | 對應工程公司 |
| `contact_id` | 對應聯絡人，可選 |
| `interaction_id` | 來源互動紀錄，可選 |
| `title` | 待辦標題 |
| `priority` | 高、中、低 |
| `due_date` | 到期日 |
| `status` | 待處理、追蹤中、已完成 |
| `owner` | 負責人 |
| `result_note` | 完成結果 |
| `completed_at` | 完成時間 |
| `cancelled_at` / `cancelled_by` / `cancel_reason` | 取消紀錄 |
| `created_at` / `updated_at` | 建立與更新時間 |

### `contractor_import_batches`

Excel 匯入批次紀錄。

| 欄位 | 用途 |
| --- | --- |
| `id` | UUID 主鍵 |
| `file_name` | 檔名 |
| `sheet_name` | 工作表名稱 |
| `imported_by` | 匯入者 |
| `imported_at` | 匯入時間 |
| `row_count` | 原始列數 |
| `created_count` | 新增筆數 |
| `matched_count` | 合併筆數 |
| `skipped_count` | 跳過筆數 |
| `status` | 待審核、已匯入、需人工確認、失敗 |
| `notes` | 匯入備註 |

## Excel 欄位對應

| 來源工作表 | 主要匯入對象 | 對應方式 |
| --- | --- | --- |
| `甲種承裝業` | `contractor_companies` | 公司名稱、負責人、聯絡人、電話、資本額、地址、備註進公司主檔。 |
| `重點公司` | `contractor_companies` + `contractor_contacts` | 公司資料進主檔；會員代表、聯絡人、手機、Email 另建聯絡人；相關工程案件進 `project_experience`。 |
| `技師拜訪名單` | `contractor_contacts` + 公司暫存主檔 | 姓名、分級、地區、執業、公司寶號、公司電話、地址、慣用廠牌進聯絡人；若公司不存在，建立待確認公司。 |
| `技師開發名單` | `contractor_contacts` + 公司暫存主檔 | 同技師拜訪名單，但標記來源為開發名單。 |
| `台中工程公司拜訪表(` | `contractor_companies` + `contractor_interactions` | 公司資料補入主檔；日期、負責擔當、拜訪內容、掌握度、備註建立互動紀錄。 |
| `台北工程公司拜訪表` | `contractor_companies` + `contractor_interactions` | 同台中拜訪表。 |

## 去重與匯入策略

第一階段不建議直接批次覆蓋正式資料，而是採「匯入批次 + 預覽 + 合併」：

1. 公司名稱完全相同：可自動合併。
2. 公司名稱相近且電話或地址相同：列入人工確認。
3. 公司名稱不同但電話相同：列入人工確認。
4. 技師資料有公司寶號但找不到公司：先建立待確認公司或未歸戶聯絡人。
5. 原始 Excel 值不覆蓋使用者已手動更新的欄位；匯入時只補空欄位，衝突值保留在備註或來源紀錄。

## 行銷端畫面

側邊欄建議在「公會管理」附近新增「工程公司 CRM」。

### 工程公司 CRM 首頁

上方 KPI：

- 工程公司數
- 重點維護公司
- 待追蹤事項
- 30 天內拜訪 / 互動

主要區塊：

- 工程公司列表
- 待追蹤清單
- 最近互動紀錄

列表篩選：

- 關鍵字
- 地區
- 類型
- 等級
- 掌握度
- 負責人
- 是否有待追蹤

### 工程公司詳情頁

標題直接顯示公司名稱。

上方資訊列：

- 關係狀態 / 掌握度
- 地區 / 類型
- 主要聯絡人
- 下次追蹤日

內容區塊：

- 公司基本資料
- 聯絡人 / 技師
- 拜訪與互動紀錄
- 待追蹤事項
- 相關工程案件 / 備註
- 已封存 / 已取消紀錄

新增按鈕放在各區塊右上角，不另外做一整塊「新增功能說明卡」。

## 總經理視角

Phase 1 不新增完整工程公司管理頁。若要讓總經理掌握進度，建議只在總經理戰情室或週報摘要加入：

- 重點工程公司追蹤數
- 逾期追蹤事項
- 本週新增拜訪紀錄
- 高潛力公司清單

總經理只看摘要與詳情，編輯權限另行討論。

## 業務視角

Phase 1 不顯示工程公司 CRM。

原因：

- 使用者已確認業務名單來源未來會由客戶管理系統處理。
- 工程公司資料屬行銷端長期維護資料。
- 避免業務端同時出現 CRM、名單、需求單三套相似資料來源。

## 開發順序

### CRM-0：規格與資料清理規則

- 確認 Excel 欄位對應。
- 決定重複資料合併規則。
- 決定公司類型、關係狀態、掌握度初始選項。

### CRM-1：SQL schema + RLS

- 建立 `contractor_companies`。
- 建立 `contractor_contacts`。
- 建立 `contractor_interactions`。
- 建立 `contractor_followups`。
- 建立 `contractor_import_batches`。
- 權限：行銷 / admin 可讀寫；總經理可讀；業務不可讀。

### CRM-2：行銷端 CRM UI

- 新增側邊欄入口。
- 建立工程公司列表。
- 建立工程公司詳情頁。
- 建立公司、聯絡人、互動、追蹤的新增 / 編輯 / 封存流程。
- 手機版依 `MOBILE_ACCEPTANCE_CHECKLIST.md` 驗收。

### CRM-3：Excel 匯入與去重

- 先做本機轉換工具或管理端匯入流程。
- 匯入前顯示新增、合併、需人工確認筆數。
- 正式匯入後寫入 `contractor_import_batches`。

### CRM-4：總經理摘要

- 將高潛力、逾期追蹤、本週拜訪數納入週報或總經理戰情室。
- 不提供總經理編輯入口，除非另行拍板。

## 驗收標準

- 三份 Excel 可轉成工程公司、聯絡人與互動紀錄，不出現明顯重複公司。
- 行銷可以查詢、篩選、編輯、封存工程公司資料。
- 行銷可以記錄每次拜訪與下一步追蹤。
- 逾期追蹤事項會清楚顯示。
- 業務端不顯示工程公司 CRM。
- 總經理端只顯示摘要，不暴露不必要的維護表單。
- 手機版可完整操作列表、詳情、表單與封存確認。

## SQL 前需拍板

1. 公司類型是否先用自由文字，或固定選項。
2. 掌握度是否沿用 Excel 的 H/M/L，或改成 A/B/C。
3. 工程公司與技師是否允許「未歸戶聯絡人」存在。
4. Excel 匯入第一版要做成管理 UI，還是先用本機轉換 SQL / CSV 匯入。
5. 總經理是否只看摘要，或也可進入工程公司詳情。
