# NOMAD-GO 系統架構與會員權限權威指南

本文件為 NOMAD-GO 雙邊平台（Next.js + Supabase）的全系統架構與會員權限權威指南。作為團隊開發與交接的 Single Source of Truth，詳述了系統的路由設計、雙邊資料流、資料庫結構、權限矩陣以及後續商轉推進藍圖。

---

## 1. 系統架構與雙邊資料流總覽 (Architecture & Core Data Flow)

### 1.1 路由隔離設計
本平台採用嚴格的路由隔離設計，確保不同身份使用者的操作邊界與資訊安全：

*   **前台 (`/app/(main)` 與 `/talent`)**：面向所有訪客與人才，提供首頁、人才總覽、公開資訊展示。
*   **人才後台 (`/dashboard`)**：專屬於已註冊之 `nomad/talent`，提供履歷編輯、數據分析（Profile Views）、職缺配對與通知中心。
*   **企業後台 (`/employer`)**：專屬於企業雇主 (`employer`)，涵蓋職缺管理、人才庫搜尋（主動出擊）、付費訂閱管理與查看完整人才履歷。
*   **營運總後台 (`/admin`)**：系統最高權限中心 (`super_admin`)，用於平台數據監控、企業審核、會員權限與特殊配置管理。

### 1.2 數據飛輪：雙邊互動資料流與底層 RLS 防護
NOMAD-GO 的核心價值在於活絡的「雙邊媒合數據飛輪」，其真實互動流程與底層防護機制如下：

1.  **企業尋才 (Search & Discovery)**：企業雇主於 `/employer/talents` 瀏覽人才列表。
2.  **查看履歷 (View Profile)**：雇主點擊特定人才進行查看。此處會觸發訂閱狀態檢查（Freemium 攔截或 Pro 解鎖）。
3.  **觸發寫入 (Trigger Event)**：當具備足夠權限的企業成功查看人才詳細履歷時，系統同步寫入兩項關鍵資料：
    *   新增一筆 `public.profile_views` 紀錄，保存雇主與人才的關聯。
    *   新增一筆 `public.notifications` 紀錄，告知人才被特定企業查看。
4.  **即時動態通知 (Real-time Notification)**：人才端後台的「小鈴鐺」即時亮起。該通知帶有真實寫入的 `action_url`（如 `/companies/[employer_id]`），允許人才點擊跳轉至該企業的公開專頁，形成雙向互動閉環。

**底層 RLS (Row-Level Security) 安全守門規則**：
資料庫層級實作嚴謹的 RLS 政策，確保「只有付費/具備權限的企業能寫入完整的檢視紀錄與通知」，以及「人才只能讀取屬於自己的通知與檢視明細」，阻斷任何越權 API 呼叫的可能。

---

## 2. 資料庫核心 Schema 實體對照表

以下列出目前關鍵資料表的最新欄位設計與業務用途，作為後端邏輯開發的基石。

### `public.profiles` (會員主檔)
存放所有註冊使用者的核心身份與權限資訊。
*   **`id`**: UUID, Primary Key, 對應 Supabase Auth UID。
*   **`role`**: 系統角色 (例如: `super_admin`, `member`)。
*   **`account_type`**: 帳號類型，區分雙邊市場 (`nomad`, `talent`, `employer` 等)。
*   **`status`**: 帳號狀態 (例如: `published` 已發布, `pending` 審核中/未公開)。
*   **`subscription_plan`**: 當前訂閱方案 (例如: `free`, `vip`, `pro`)。
*   **`plan_expires_at`**: 方案到期時間 (Timestampz)。
*   **`direct_connect_tokens`**: 主動敲門/聯繫的可用額度 (Integer)。
*   **`is_public`**: 是否允許在前台目錄公開展示 (Boolean)。

### `public.companies` (企業檔案)
儲存企業雇主的詳細資訊與 B2B 訂閱狀態。
*   **`employer_id`**: UUID, 關聯至 `public.profiles.id`。
*   **`name`**: 企業名稱。
*   **`approval_status`**: 企業審核狀態 (例如: `approved`, `pending_review`)。
*   **`subscription_plan`**: 企業方案層級 (例如: `free`, `pro`)。
*   **`plan_expires_at`**: 企業方案到期時間。
*   **`max_active_jobs`**: 同時可上架的活躍職缺數量上限。
*   **`free_unlock_limit`**: 免費方案可解鎖查看人才履歷的次數上限。

### `public.profile_views` (履歷檢視紀錄)
紀錄企業查看人才的歷史，支撐人才端的數據分析功能。
*   **核心欄位**：`viewer_id` (查看者, 企業), `viewed_profile_id` (被查看者, 人才), `created_at` (查看時間)。

### `public.notifications` (系統通知)
驅動平台互動的核心通知表。
*   **核心欄位**：`user_id` (接收通知者), `type` (通知類型), `content` (通知內容), `action_url` (點擊跳轉連結), `is_read` (已讀狀態)。

---

## 3. 雙邊會員等級與核心權限矩陣 (Membership & Permission Matrix)

平台採用 Freemium 商業模式，透過精細的 Paywall (付費牆) 與「殘缺感」設計，引導雙邊用戶升級。

### A. 人才端 (B2C Nomad / Talent)

*   **免費版 (Free) - 創造殘缺感 Hook**
    *   **履歷瀏覽次數**：可看得到「總瀏覽次數」數據。但明細列表僅顯示最新 1 筆。
    *   **Paywall 體驗**：其餘檢視者卡片強制加上 `blur-sm` 模糊濾鏡與鎖頭 Icon，點擊即跳出升級提示。
    *   **主動敲門 (Direct Connect)**：資源受限，每月僅發放 1 個 Token。
*   **Pro 版 - 完整數據賦能**
    *   **解鎖明細**：履歷檢視明細全解鎖，無模糊限制。
    *   **進階數據**：提供競爭者落點數據分析，掌握市場身價。
    *   **充沛資源**：獲得更多 Direct Connect Token，增加主動面試機會。
*   **VIP 版 (如超級管理員 Albus 的配置) - 終極特權**
    *   **無限權限**：系統各項限制次數皆設定為無限。
    *   **遠期失效**：到期日設定為 2099 年遠期失效 (far_future)。
    *   **專屬生態系 Perks**：解鎖跨國生存大禮包，例如「30 天內須開通的全球通用上網 eSIM」等針對 Nomad 族群的專屬福利。

### B. 企業雇主端 (B2B Employer)

*   **免費方案 (Free) - 體驗與限制**
    *   **人才庫瀏覽**：允許進入 `/employer/talents` 瀏覽公開人才庫的「摘要資訊卡」。
    *   **Paywall 阻擋**：當點擊「查看完整履歷」或嘗試獲取聯絡方式時，會被 Paywall 攔截，彈出 **$49/mo 升級 Pro** 的提示視窗。
    *   **招募限制**：職缺發布數量受到嚴格限制 (`max_active_jobs = 1`)。
*   **企業 Pro 方案 ($49/mo) - 火力全開**
    *   **無限制查閱**：合法繞過 RLS 防護與訂閱安全觸發器 (`guard_company_subscription_fields`)。
    *   **完整聯絡資訊**：無限制主動查閱人才聯絡方式與完整履歷細節。
    *   **互動足跡寫入**：企業的每次點擊查看，皆會於底層同步對人才寫入真實未讀通知與 `action_url`，有效促進人才回訪企業專頁。

---

## 4. 接下來的優化與商轉推進藍圖 (Next-Step Roadmap)

根據目前開發與修復進度，以下為優先順序最高的系統優化與商轉推進項目：

1.  **人才目錄前台最佳化 (`/talent`)**
    *   **RLS 權限打通**：確保未登入訪客 (anon) 對 `public.profiles` (條件為 `is_public=true`) 的 `SELECT` 權限完全暢通。
    *   **即時數據呈現**：移除 `/talent` 頁面的靜態頁面 Cache，全面改用 `force-dynamic`。確保新發布或更新狀態的人才卡片能即時呈現，避免因舊 Cache 導致空資料而進入 catch 區塊顯示錯誤。
2.  **AI 履歷健檢實體化**
    *   **拔除空殼**：移除目前僅顯示「已啟動」狀態的空殼 UI。
    *   **串接真實 AI**：將後端 Server Action 實際串接 LLM API (如 OpenAI 或 Gemini)。
    *   **前端體驗優化**：實作呼叫過程中的前端分析中狀態 (Loading Spinner)，並將生成的分析結果以 Markdown 格式優雅地呈現在彈出視窗 (Modal) 中。
3.  **企業公開專頁開發**
    *   **完善跳轉終點**：因通知 (`notifications`) 與瀏覽紀錄 (`profile_views`) 皆已綁定 `action_url` 至 `/companies/[id]`，必須優先刻出**求職者視角**的企業品牌專頁 UI。
    *   **內容展示**：展示企業文化、開缺列表，完善「企業看人才 -> 人才點通知 -> 查看企業 -> 投遞履歷」的完整回流路徑。
4.  **金流 Webhook 權威來源同步 (Single Source of Truth for Payments)**
    *   **統一欄位**：全面統一以 `profiles.subscription_plan` + `plan_expires_at` (或 `companies` 對應欄位) 作為系統唯一付費守門標準。
    *   **廢除舊制**：徹底廢除並清理可能導致邏輯分裂的舊有 `plan_type` 欄位。
    *   **Stripe 整合**：確保 Stripe Webhook 扣款成功事件與後台的升級寫入邏輯一致，更新至同一張表。
    *   **環境隔離**：落實 Production 環境強制禁用 Mock Data Fallback 機制，確保真實金流防護的可靠性。
