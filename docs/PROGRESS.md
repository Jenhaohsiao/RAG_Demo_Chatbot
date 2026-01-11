# 專案進度概覽

**專案名稱**: Multilingual RAG-Powered Chatbot  
**分支**: `001-multilingual-rag-chatbot`  
**最後更新**: 2026-01-11  
**總體狀態**: ✅ 多語言系統優化、RAG 流程對話與文案更新

---

## 📅 2026-01-11 - RAG Flow 說明對話與文案刷新 ✅

**🎯 本次更新重點**:
1. 流程步驟提示從側邊 Toast 改為置中對話框，閱讀性提升
2. RAG 流程說明文案更新：
	 - Step 1「RAG 參數配置」：新增「什麼是 RAG?」解說（含檢索、增強、生成三階段）
	 - Step 2「System Prompt」：說明 system prompt 與一般 prompt 的差異及其在 RAG 中的約束作用
	 - Step 3「資料上傳」：強調使用者上傳檔案或爬蟲內容、AI 僅針對資料內容應答
	 - Step 5「資料向量化, 寫入 Vector DB」：以易懂比喻解釋向量化與 Vector DB 與傳統 DB 的差異

### ✏️ 主要修改檔案
- `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx`：
	- 將步驟說明由 Toast 改為置中 modal
	- 更新步驟 1/2/3/5 的標題與說明文案

---

## 📅 2026-01-10 - 多語言系統優化與 UI 體驗改進 ✅

**🎯 本次更新重點**:
1. 移除阿拉伯文語言支援（從 8 種語言降為 7 種）
2. 新增最低 Token 門檻（50 tokens）防止空內容通過
3. 改進爬蟲成功通知為置中對話框
4. 優化按鈕狀態控制與語言下拉選單行為

### 🗑️ 移除阿拉伯文語言支援

**變更原因**: 簡化系統，移除不常用語言和 RTL 佈局支援

**刪除的檔案**:
- `frontend/src/i18n/locales/ar.json` - 阿拉伯文翻譯檔案
- `frontend/src/styles/_rtl.scss` - RTL 佈局樣式

**修改的檔案**:
- `frontend/src/i18n/config.ts` - 移除 ar 語言設定和 import
- `frontend/src/components/Header/Header.tsx` - 移除語言選單中的阿拉伯文選項
- `frontend/src/components/LanguageSelector/LanguageSelector.tsx` - 移除阿拉伯文標籤
- `frontend/src/hooks/useLanguage.ts` - 移除 'ar' 語言支援
- `frontend/src/hooks/useSession.ts` - 移除語言參數中的 'ar'
- `frontend/src/services/sessionService.ts` - 移除語言參數中的 'ar'
- `frontend/src/types/session.ts` - 移除語言類型中的 'ar'
- `frontend/src/main.tsx` - 簡化語言方向設定（所有語言都是 LTR）
- `frontend/src/styles/index.scss` - 移除 RTL 樣式 import
- `backend/src/models/session.py` - 移除語言驗證中的 'ar'
- `backend/src/api/routes/upload.py` - 移除阿拉伯文 fallback 訊息
- `backend/src/api/routes/prompt.py` - 移除阿拉伯文語言映射
- `backend/src/services/rag_engine.py` - 移除所有阿拉伯文翻譯

**支援語言（7 種）**: English、繁體中文、简体中文、한국어、日本語、Español、Français

### 📊 最低資料門檻（50 Tokens）

**問題**: 網站爬蟲或文件上傳可能返回極少量數據（如 6 tokens），導致 RAG 無效

**解決方案**:
- 在 `UploadScreen.tsx` 和 `WorkflowStepper.tsx` 新增 `MIN_TOKENS_REQUIRED = 50` 常數
- 爬蟲/上傳完成後檢查 Token 數量
- 不足門檻時顯示「資料量不足」錯誤對話框
- 統一處理 "empty text list" 錯誤為相同的「資料量不足」訊息

### 🎉 爬蟲成功通知改進

**變更**: 從 Toast 通知改為置中對話框

**實現**:
- 在 `WorkflowStepper.tsx` 新增 `showSuccessDialog` 狀態
- 成功時顯示包含爬取頁數和 Token 數的對話框
- 用戶確認後自動進入下一步

### 🔘 按鈕狀態控制優化

**變更**:
- 爬蟲成功後，「上傳檔案」和「爬取網站」按鈕同時禁用
- 「下一步」按鈕在爬蟲成功後啟用
- 在 `onCrawlerSuccess` 回調中設置 `extraction_status: "EXTRACTED"`

### 📂 語言下拉選單改進

**變更**: 點擊選單外部區域自動關閉下拉選單

**實現**:
- 在 `Header.tsx` 新增 `dropdownRef` 追蹤選單 DOM
- 使用 `useEffect` 監聽 `mousedown` 事件
- 點擊位置不在選單內時自動關閉

---

## 📊 當前系統狀態

### ✅ 已完成功能
| 功能類別 | 說明 |
|---------|------|
| **Session 管理** | 自動建立、30分鐘TTL、語言切換、重啟功能 |
| **文件上傳** | PDF、TXT上傳，包含內容審核，最低 50 Token 門檻 |
| **網站爬蟲** | 自動提取網頁內容，Token限制，最低資料門檻，完整錯誤處理 |
| **內容審核** | 整合Gemini Safety API，檢測不當內容 |
| **向量儲存** | Qdrant數據庫，會話隔離 |
| **RAG查詢** | 語義搜索，嚴格基於上傳內容回答 |
| **多語言支援** | 7種語言UI切換（移除阿拉伯文） |
| **Metrics儀表板** | 實時性能監控 |
| **6步驟工作流程** | RAG配置→AI行為設定→資料上傳→內容審核→文字處理→AI對話 |
| **UI 優化** | 聊天介面、設定介面、Header、語言選單點擊外部關閉 |
| **錯誤處理** | 爬蟲錯誤檢測，防爬機制識別，資料量不足統一提示 |

### 🎯 系統穩定性
所有核心功能運行正常，錯誤處理機制完善，最低資料門檻確保 RAG 品質。

---

## 🎯 歷史更新記錄

### 📅 2026-01-10 (稍早) - Flow 3 爬蟲狀態修復 ✅
- 修正 `uploadService.ts` 中的雙重解包問題
- 增強 `isCrawlerCompleted` 判斷邏輯，驗證數據有效性
- 將 `onUrlSubmitted` 移到驗證通過後執行
- 關閉錯誤對話框時清理所有相關狀態

### 📅 2026-01-09 - Flow 3 錯誤處理與用戶體驗改進 ✅
- 文檔摘要優化（約 150 字，完整描述）
- 範例網站更新為 Project Gutenberg
- 爬蟲錯誤提示增強（防爬檢測）
- 檔案格式限制（PDF, TXT）
- 錯誤對話框實作

### 📅 2026-01-06 - UI/UX 全面升級與 RAG 設定重構 ✅
- Chat UI 升級（角色識別、視覺優化、建議氣泡）
- Step 1 RAG 設定重構（僅 Similarity Threshold 與 Top-K）
- Header 清理

### 📅 2026-01-05 - Step 3 & Step 6 優化 ✅
- 爬蟲 UI 簡化
- 狀態重置邏輯實作
- AI 對話體驗優化（移除引用標記）

### 📅 2026-01-04 - Step 3 資料上傳 UI 重構 ✅
- 導航優化（兩個置中大型按鈕）
- 2步驟嚮導流程
- 移除重複審核

### 📅 2026-01-04 - Step 6 AI 對話體驗優化 ✅
- 移除引用標記
- 建議問題氣泡實作

### 📅 2026-01-01 ~ 2026-01-03 - 基礎功能完善 ✅
- 工作流程狀態管理
- Step 2 UI 重構
- 建議氣泡功能
- 聊天記錄保留

---

## 📁 專案結構

```
RAG_Demo_Chatbot/
├── backend/                 # FastAPI 後端
│   ├── src/
│   │   ├── api/routes/     # API 路由 (chat, upload, session, prompt)
│   │   ├── services/       # 核心服務 (rag_engine, embedder, vector_store)
│   │   ├── models/         # 數據模型
│   │   └── core/           # 配置與工具
│   └── tests/              # 測試檔案
├── frontend/               # React + TypeScript 前端
│   ├── src/
│   │   ├── components/     # React 組件
│   │   ├── services/       # API 服務
│   │   ├── hooks/          # 自訂 Hooks
│   │   ├── i18n/           # 7 種語言翻譯
│   │   ├── styles/         # SCSS 樣式
│   │   └── types/          # TypeScript 類型
│   └── tests/              # 測試檔案
├── docs/                   # 專案文檔
└── specs/                  # Speckit 規格文件
```

---

## 🚀 快速啟動

```powershell
# 1. 啟動 Docker 服務 (Qdrant)
docker-compose up -d

# 2. 啟動後端
cd backend
python run_server.py

# 3. 啟動前端
cd frontend
npm run dev
```

**訪問地址**:
- Frontend: http://localhost:5175
- Backend API: http://localhost:8000
- Qdrant UI: http://localhost:6333/dashboard

---

**系統已準備好進行下一階段的開發或部署工作！**
