# 專案進度概覽

**專案名稱**: Multilingual RAG-Powered Chatbot  
**分支**: `001-multilingual-rag-chatbot`  
**最後更新**: 2026-01-05  
**總體狀態**: ✅ MVP 完成，Step 3 UI/UX 優化，Step 6 體驗升級（移除引用、顯示模型資訊），狀態重置邏輯完善

---

## 📊 當前系統狀態

### ✅ 已完成功能
- **Session 管理**: 自動建立、30分鐘TTL、語言切換、重啟功能
- **文件上傳**: PDF、TXT、URL上傳，包含內容審核
- **網站爬蟲**: 自動提取網頁內容，Token限制，UI 簡化
- **內容審核**: 整合Gemini Safety API，檢測不當內容
- **向量儲存**: Qdrant數據庫，會話隔離
- **RAG查詢**: 語義搜索，嚴格基於上傳內容回答
- **多語言支援**: 8種語言UI切換
- **Metrics儀表板**: 實時性能監控
- **6步驟工作流程**: RAG配置→AI行為設定→資料上傳→內容審核→文字處理→AI對話
- **Loading Overlay**: 全局處理狀態提示，防止重複操作
- **工作流程狀態保留**: 步驟3/4/5/6 返回上一步時保持狀態
- **狀態重置機制**: Step 3 上傳新資料時自動重置後續步驟 (4, 5, 6)
- **建議氣泡功能**: AI無法回答時自動生成2-3個可點擊的建議問題
- **Step 2 完整參數**: 回答語言、嚴格RAG模式、引用風格、檢索Top-K、相似度閾值、最大上下文Token等
- **Step 3 UI 重構**: 2步驟嚮導模式，移除冗餘資訊，修復圖示顯示
- **Step 5 UI 優化**: 向量化狀態顯示優化，顯示 Vector DB 技術規格
- **Step 6 體驗優化**: 移除引用標記（[Document 1]），新增模型名稱顯示 (Gemini 2.0 Flash)

---

## 🎯 最近完成

### 📅 2026-01-05 - Step 3 & Step 6 UI/UX 優化與狀態重置邏輯

**🎯 優化目標**:
完善使用者體驗細節，確保資料更新時的流程正確性，並優化 AI 回答的閱讀體驗。

**✨ 主要變更**:

1.  **Step 3 爬蟲 UI 優化 (Crawler UI Cleanup)**:
    *   **資訊簡化**: 移除爬蟲面板中冗餘的 Tokens 和 Chunks 統計顯示，保持介面簡潔。
    *   **圖示修復**: 修復 `WebsiteCrawlerPanel` 中重複顯示 Spinner/Icon 的問題。
    *   **檔案**: `frontend/src/components/WebsiteCrawlerPanel/WebsiteCrawlerPanel.tsx`

2.  **狀態重置邏輯 (State Reset Logic)**:
    *   **自動重置**: 在 `WorkflowStepper` 中實作 `resetDownstreamSteps`。當 Step 3 上傳新檔案或爬取新網站時，自動重置 Step 4 (審核)、Step 5 (處理) 和 Step 6 (對話) 的狀態。
    *   **防止資料不一致**: 確保使用者在上傳新資料後，必須重新執行審核和向量化流程，避免舊的索引資料殘留。
    *   **檔案**: `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx`, `frontend/src/components/UploadScreen/UploadScreen.tsx`

3.  **Step 6 AI 對話體驗 (AI Chat Experience)**:
    *   **移除引用標記**: 更新 `citationMap`，明確指示 LLM **不要**在回答中包含 `[文件x]` 等引用標記，提升閱讀流暢度。
    *   **模型資訊顯示**: 在 Step 6 標題旁新增 "Model: Gemini 2.0 Flash" Badge，讓使用者明確知道當前使用的模型。
    *   **檔案**: `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx`

**🔧 修改的檔案**:
- `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx`
- `frontend/src/components/WebsiteCrawlerPanel/WebsiteCrawlerPanel.tsx`
- `frontend/src/components/UploadScreen/UploadScreen.tsx`
- `frontend/src/components/DataUploadStep/DataUploadStep.tsx`

---

### 📅 2026-01-04 - Step 3 資料上傳 UI 重構與流程優化

**🎯 優化目標**:
徹底重構 Step 3 (資料上傳) 的使用者介面，使其更現代化且易於使用，並解決流程重複執行的問題。

**✨ 主要變更**:

1.  **UI 重構 (UploadScreen)**:
    *   **導航優化**: 將原本的 Tabs 切換改為兩個置中的大型按鈕（檔案上傳 / 網站爬蟲）。
    *   **2步驟嚮導 (Wizard Flow)**: 實作內部 2 步驟流程：
        *   **Step 1**: 參數設定（檔案大小/類型限制、爬蟲 Token/頁數限制）。
        *   **Step 2**: 執行上傳（拖放區域或網址輸入框）。
    *   **視覺簡化**: 縮減卡片寬度 (max-width: 600px)，移除冗餘的邊框與背景色，使焦點更集中。
    *   **列表優化**: 移除已上傳文件列表中的「預覽：」文字前綴，保持介面清爽。
    *   **檔案**: `frontend/src/components/UploadScreen/UploadScreen.tsx`, `frontend/src/components/UploadScreen/UploadScreen.scss`

2.  **流程邏輯調整 (Backend & Frontend)**:
    *   **移除重複審核**: 在 Flow 3 的後端上傳 API (`upload.py`) 中，**停用**自動觸發的內容審核 (Content Moderation)，將此職責完全交由 Flow 4 (Content Review) 處理，避免重複執行與計費。
    *   **移除 Toast**: 移除前端上傳成功後的 Toast 通知，避免干擾用戶操作。
    *   **檔案**: `backend/src/api/routes/upload.py`, `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx`

**🔧 修改的檔案**:
- `frontend/src/components/UploadScreen/UploadScreen.tsx`
- `frontend/src/components/UploadScreen/UploadScreen.scss`
- `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx`
- `backend/src/api/routes/upload.py`

---

### 📅 2026-01-04 - Step 6 AI 對話體驗優化

**🎯 優化目標**:
提升 AI 回答的可讀性與互動性，解決引用標記干擾閱讀的問題，並增加引導式建議問題。

**✨ 主要變更**:

1.  **移除引用標記**:
    *   修改後端 RAG Prompt，明確指示 AI **不要**在回答中包含 `[Document X]` 等引用標記，使閱讀體驗更流暢。
    *   **檔案**: `backend/src/services/rag_engine.py`

2.  **建議問題氣泡 (Suggestion Bubbles)**:
    *   **前端實作**: 在 AI 回答下方新增可點擊的建議問題氣泡。
    *   **互動邏輯**: 點擊氣泡後，自動將問題填入輸入框並發送。
    *   **API 整合**: 確保前端正確接收後端回傳的 `suggestions` 欄位並渲染。
    *   **檔案**: `frontend/src/components/ChatMessage/ChatMessage.tsx`, `frontend/src/services/chatService.ts`

3.  **系統修復**:
    *   修復 `chatService.ts` 中重複導出 `getSuggestions` 導致的 Build Error。

**🔧 修改的檔案**:
- `backend/src/services/rag_engine.py`
- `frontend/src/components/ChatMessage/ChatMessage.tsx`
- `frontend/src/services/chatService.ts`

---

### 📅 2026-01-04 - Session 管理機制優化與 Log 系統建立

**🎯 優化目標**:
解決 Session Heartbeat 異常與過期處理邏輯，建立後端結構化日誌系統以利排查，並優化前端 Session 過期提示體驗。

**✨ 主要變更**:

1.  **後端 Session 機制與日誌 (Backend)**:
    *   **TTL 設定**: 正式環境 Session 有效期設定為 **10 分鐘**。
    *   **結構化日誌 (Structured Logging)**: 實作 `SessionActivityLogger`，詳細記錄 Session 生命周期事件 (`CREATED`, `HEARTBEAT`, `CLOSED`, `EXPIRED`)，包含 Session ID、User ID 與時間戳記。
    *   **API 路由**: 整合日誌系統至 `create`, `heartbeat`, `close` 等 API 端點。
    *   **檔案**: `backend/src/models/session.py`, `backend/src/core/logger.py`, `backend/src/api/routes/session.py`

2.  **前端 Heartbeat 與過期處理 (Frontend)**:
    *   **Heartbeat 優化**: `useSession` Hook 增加 30 秒節流 (Throttle) 機制，避免過於頻繁的 API 請求。
    *   **過期邏輯修復**: 修正 `handleSessionExpiration` 與 `createSession` 邏輯，防止 Session 過期後自動重新建立導致的無限迴圈。
    *   **錯誤處理**: 強化 Heartbeat API 的 404 錯誤捕捉，確保前端能正確識別 Session 失效狀態。
    *   **檔案**: `frontend/src/hooks/useSession.ts`, `frontend/src/main.tsx`

3.  **UI 優化 (Session Expired Modal)**:
    *   **視覺風格**: 改為黃色警示主題 (Warning Theme)，去除多餘圖示，背景半透明 (0.5)。
    *   **提示訊息**: 明確告知「Session 已過期 (10分鐘閒置)，資料已清除」。
    *   **按鈕設計**: 調整為黃色背景、置中顯示，點擊後強制重置狀態並返回初始畫面。
    *   **檔案**: `frontend/src/components/SessionExpiredModal/SessionExpiredModal.tsx`, `frontend/src/i18n/locales/*.json`

**🔧 修改的檔案**:
- `backend/src/models/session.py`
- `backend/src/core/logger.py`
- `backend/src/api/routes/session.py`
- `frontend/src/hooks/useSession.ts`
- `frontend/src/components/SessionExpiredModal/SessionExpiredModal.tsx`
- `frontend/src/main.tsx`
- `frontend/src/i18n/locales/zh-TW.json`
- `frontend/src/i18n/locales/en-US.json`

---

### 📅 2026-01-04 - Step 3 & Step 5 UI 優化與狀態顯示改進

**🎯 優化目標**:
改善 Step 3 (資料上傳) 與 Step 5 (文字處理) 的使用者體驗，確保狀態顯示準確（區分「未執行」與「0」），並提供更具技術價值的 Vector DB 資訊。

**✨ 主要變更**:

1.  **Step 3 資料上傳 (Data Upload)**:
    *   **UI 簡化**: 移除上傳完成後的綠色 Alert 提示框，將「資料上傳完成...」訊息整合至卡片標題 (Header) 中，介面更清爽。
    *   **檔案**: `frontend/src/components/UploadScreen/UploadScreen.tsx`, `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx`

2.  **Step 5 文字處理 (Text Processing)**:
    *   **標題更新**: 英文標題更新為中文「資料向量化, 寫入 Vector DB」。
    *   **狀態顯示優化**:
        *   **Vector DB 卡片**: 當尚未開始處理時，「向量總數」與「本次新增向量」顯示為「未執行, 無資料」，而非誤導性的「0」。
        *   **RAG 準備狀態**: 新增「未執行」狀態顯示。
    *   **技術規格展示**:
        *   移除與 Step 1 重複的 RAG 參數 (Threshold, Top-K, Strict Mode)。
        *   新增 Vector DB 核心規格顯示：
            *   **Distance Metric**: Cosine
            *   **Dimensions**: 768
            *   **Index Type**: HNSW
    *   **版面調整**: 將「來源文件數」移至 Vector DB 卡片的第三順位。
    *   **檔案**: `frontend/src/components/TextProcessingStep/TextProcessingStep.tsx`, `frontend/src/i18n/locales/zh-TW.json`

3.  **系統修復**:
    *   修復 `WorkflowMain.tsx` 中重複定義 `similarity_threshold` 導致的 Build Error。

**🔧 修改的檔案**:
- `frontend/src/components/UploadScreen/UploadScreen.tsx`
- `frontend/src/components/TextProcessingStep/TextProcessingStep.tsx`
- `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx`
- `frontend/src/components/WorkflowMain/WorkflowMain.tsx`
- `frontend/src/i18n/locales/zh-TW.json`

---

### 📅 2026-01-03 - Step 2「AI 行為與回答規則設定」全面重構（含視覺標識）

**🎯 重構目標**:
將 Step 2 重新設計為「AI 行為與回答規則設定」，採用 4 區塊 2x2 Grid 卡片佈局，每個區塊配有視覺標識 Badge 說明可調整性。

**🏗️ 新架構 - 4 區塊設計（含視覺標識）**:

| 區塊 | 名稱 | Badge 標識 | 內容 |
|------|------|------------|------|
| A | 系統規則 (System Rules) | 🔒 Session 階段固定 | 回答語言、嚴格RAG模式、允許推論、外部知識、無資料回應政策 |
| B | 回應政策 (Response Policy) | 💬 對話中可微調 | Response Style, Tone, Persona, Citation Style 下拉選單 |
| C | 執行限制 (Runtime Constraints) | ⚙️ 部分固定 | Max Tokens, Top-K, Similarity Threshold, Max Context, Warning 滑桿 |
| D | 系統資訊 (System Info) | 📋 唯讀 | LLM Model, Context Window, Vector DB, Embedding, Moderation, TTL |

**📋 完整參數設計**:

| 區塊 | 參數 | 類型 | 選項/範圍 | 預設值 |
|------|------|------|-----------|--------|
| A 系統規則 | 回答語言 | 下拉選單 | 自動偵測/繁體中文/English | 自動偵測 |
| A 系統規則 | 嚴格RAG模式 | 開關 | 開/關 | 開 |
| A 系統規則 | 允許推論 | 開關 | 開/關 | 開 |
| A 系統規則 | 外部知識 | 顯示 | 永遠關閉（僅使用上傳文件） | - |
| A 系統規則 | 無資料回應政策 | 顯示 | 明確告知用戶無法回答 | - |
| B 回應政策 | Response Style | 下拉選單 | 簡潔/標準/詳細/步驟 | 標準 |
| B 回應政策 | Response Tone | 下拉選單 | 正式/親切/輕鬆/學術 | 親切 |
| B 回應政策 | Persona | 下拉選單 | 教授/專家/教育者/大媽大伯 | 專家 |
| B 回應政策 | Citation Style | 下拉選單 | 無/內文/註腳 | 內文 |
| C 執行限制 | Max Tokens | 滑桿 | 512-4096 | 2048 |
| C 執行限制 | Retrieval Top-K | 滑桿 | 1-10 | 5 |
| C 執行限制 | Similarity Threshold | 滑桿 | 0.30-0.95 | 0.70 |
| C 執行限制 | Max Context Tokens | 滑桿 | 1000-8000 | 4000 |
| C 執行限制 | Context Warning | 滑桿 | 50%-90% | 80% |
| D 系統資訊 | LLM Model | 唯讀 | gemini-2.0-flash | - |
| D 系統資訊 | Context Window | 唯讀 | 128,000 tokens | - |
| D 系統資訊 | Vector DB | 唯讀 | Qdrant | - |
| D 系統資訊 | Embedding Model | 唯讀 | text-embedding-004 | - |
| D 系統資訊 | Content Moderation | 唯讀 | Gemini Safety | - |
| D 系統資訊 | Session TTL | 唯讀 | 30 分鐘 | - |

**🔧 修改的檔案**:
- `frontend/src/components/PromptConfigStep/PromptConfigStep.tsx` - 完整重寫，新 4 區塊架構含視覺標識
- `frontend/src/components/WorkflowMain/WorkflowMain.tsx` - 更新 Step 2 預設參數（新增 answer_language, strict_rag_mode, citation_style, retrieval_top_k, similarity_threshold, max_context_tokens）
- `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx` - 更新 generateCustomPrompt 函數（中文 prompt 模板）
- `frontend/src/i18n/locales/zh-TW.json` - 完整 step2 翻譯區塊（badge, lang, strictRag, citation, runtime 等）
- `frontend/src/i18n/locales/en.json` - 完整 step2 翻譯區塊

**⚠️ 待更新的翻譯檔案**:
- `frontend/src/i18n/locales/zh-CN.json` - 需新增 step2 區塊
- `frontend/src/i18n/locales/ja.json` - 需新增 step2 區塊
- `frontend/src/i18n/locales/ko.json` - 需新增 step2 區塊
- `frontend/src/i18n/locales/es.json` - 需新增 step2 區塊
- `frontend/src/i18n/locales/fr.json` - 需新增 step2 區塊
- `frontend/src/i18n/locales/ar.json` - 需新增 step2 區塊

**🎨 UI/UX 設計**:
- 使用 Bootstrap 卡片，每個區塊不同邊框色彩 + Badge 標識
- 區塊 A: warning 色 (黃) + 🔒 Session 階段固定
- 區塊 B: info 色 (藍) + 💬 對話中可微調
- 區塊 C: success 色 (綠) + ⚙️ 部分固定
- 區塊 D: secondary 色 (灰) + 📋 唯讀
- 響應式設計：`col-md-6` 實現桌面 2x2，手機單欄

**🔗 新增 TypeScript Interface**:
```typescript
interface Step2Config {
  // System Rules
  answer_language: 'auto' | 'zh-TW' | 'en';
  strict_rag_mode: boolean;
  allow_inference: boolean;
  // Response Policy
  response_style: string;
  response_tone: string;
  persona: string;
  citation_style: 'none' | 'inline' | 'footnote';
  // Runtime Constraints
  max_tokens: number;
  retrieval_top_k: number;
  similarity_threshold: number;
  max_context_tokens: number;
  context_warning_threshold: number;
}
```

---

### 📅 2026-01-01 (下午) - Step 6 建議氣泡功能

**💡 Step 6 建議氣泡功能（當 AI 無法回答時）**:
- **後端 RAGResponse**: 新增 `suggestions: Optional[List[str]]` 欄位
- **後端 _generate_suggestions()**: 根據文件內容和用戶問題生成 2-3 個建議問題
- **後端 CANNOT_ANSWER 偵測**: 根據關鍵字（無法、找不到、抱歉等）判斷是否需要建議
- **API ChatResponse**: 新增 `suggestions` 欄位傳遞到前端
- **前端 ChatMessage**: 新增建議氣泡 UI，紫色漸層按鈕，標示「也許您想問：」
- **前端 ChatScreen**: 新增 `suggestions` 狀態管理，點擊氣泡自動發送該問題

**修改的檔案**:
- `backend/src/services/rag_engine.py` - 新增 suggestions 欄位和生成邏輯
- `backend/src/api/routes/chat.py` - ChatResponse 新增 suggestions
- `frontend/src/types/chat.ts` - ChatResponse interface 新增 suggestions
- `frontend/src/components/ChatMessage/ChatMessage.tsx` - 建議氣泡 UI
- `frontend/src/components/ChatMessage/ChatMessage.scss` - 氣泡樣式
- `frontend/src/components/ChatScreen/ChatScreen.tsx` - suggestions 狀態管理

---

### 📅 2026-01-01 (上午) - 工作流程狀態管理與 Step 6 AI Chat 修復

**🔧 Step 1/2 禁用邏輯**:
- 當 Step 3 已有上傳資料（documents 或 crawledUrls）時，自動禁用 Step 1 和 Step 2
- 添加 `shouldDisableConfigSteps` useMemo 計算邏輯
- RagConfigStep 和 PromptConfigStep 添加 `disabled` prop 支援

**📁 Step 3 資料上傳畫面重構**:
- 合併「參數設定」和「上傳資料」為單一卡片
- 根據上傳模式動態顯示對應參數：
  - **檔案上傳模式**: 顯示檔案大小限制 + 支援檔案類型
  - **網站爬蟲模式**: 顯示最大 Token 數 + 最大頁面數 + 使用提示
- 添加 `onTabChange` callback 到 UploadScreen，通知父組件當前選擇的 tab
- 優化 dropzone 樣式：添加背景色、全區域可點擊

**💾 Step 4 內容審核狀態保留**:
- 添加 `savedReviewResults` 和 `onSaveReviewResults` props
- 從 Step 5 返回 Step 4 時恢復已完成的審核結果
- 避免重複審核已處理的內容

**💾 Step 5 文本處理狀態保留**:
- 添加 `savedProcessingResults` 和 `onSaveProcessingResults` props
- 從 Step 6 返回 Step 5 時恢復已完成的處理結果
- 避免重複處理已索引的內容

**💬 Step 6 AI Chat 全面修復**:

1. **翻譯鍵修復**:
   - ChatMessage.tsx: `chat.message.you` → `chat.messages.you`
   - ChatMessage.tsx: `chat.message.assistant` → `chat.messages.assistant`
   - ChatInput.tsx: `chat.input.send` → `chat.input.submit`
   - 添加 `sending` 翻譯鍵到 zh-TW.json

2. **字體大小增加**:
   - ChatMessage.scss: 訊息角色字體 `font-size-xs` → `font-size-base`
   - ChatMessage.scss: 訊息內容字體 `font-size-sm` → `font-size-lg`
   - ChatInput.scss: 輸入框字體 `font-size-sm` → `font-size-base`

3. **雙語顯示問題修復** (Backend):
   - 更新 rag_engine.py 的 prompt 模板
   - 添加明確指示：「DO NOT include any other language in your response」
   - 添加明確指示：「DO NOT include English translations or explanations in parentheses」
   - 添加明確指示：「SINGLE LANGUAGE ONLY: Your entire response must be in {response_language} only」

4. **聊天記錄保留**:
   - WorkflowStepper 添加 `savedChatMessages` state
   - AiChatStep 添加 `savedChatMessages` 和 `onSaveChatMessages` props
   - ChatScreen 初始化時使用保存的訊息，訊息變化時自動保存
   - 從 Step 5 返回 Step 6 時恢復聊天記錄

**修改的檔案**:
- `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx` - 狀態管理整合
- `frontend/src/components/RagConfigStep/RagConfigStep.tsx` - disabled prop
- `frontend/src/components/PromptConfigStep/PromptConfigStep.tsx` - disabled prop
- `frontend/src/components/DataUploadStep/DataUploadStep.tsx` - 畫面重構
- `frontend/src/components/UploadScreen/UploadScreen.tsx` - onTabChange callback
- `frontend/src/components/ContentReviewStep/ContentReviewStep.tsx` - 狀態保留
- `frontend/src/components/TextProcessingStep/TextProcessingStep.tsx` - 狀態保留
- `frontend/src/components/AiChatStep/AiChatStep.tsx` - 聊天記錄 props
- `frontend/src/components/ChatScreen/ChatScreen.tsx` - 聊天記錄保留
- `frontend/src/components/ChatMessage/ChatMessage.tsx` - 翻譯鍵修復
- `frontend/src/components/ChatMessage/ChatMessage.scss` - 字體大小
- `frontend/src/components/ChatInput/ChatInput.tsx` - 翻譯鍵修復
- `frontend/src/components/ChatInput/ChatInput.scss` - 字體大小
- `frontend/src/i18n/locales/zh-TW.json` - 添加 sending 翻譯
- `backend/src/services/rag_engine.py` - 單語言回應 prompt

---

## 🔧 技術債務與改進

### 已解決問題
- ✅ **Step 2 UI 重構與建議氣泡功能（2026-01-01 下午最新）**:
  - ✅ 合併 3 個相似下拉選單為單一「回應風格」
  - ✅ 新增「回應格式」和「來源引用」參數
  - ✅ 實作 AI 無法回答時的建議氣泡功能
  - ✅ 前後端完整整合

- ✅ **工作流程狀態管理（2026-01-01 上午）**:
  - ✅ Step 1/2 禁用邏輯（有上傳資料時）
  - ✅ Step 3 畫面重構（參數設定與上傳合併）
  - ✅ Step 4 內容審核狀態保留
  - ✅ Step 5 文本處理狀態保留
  - ✅ Step 6 聊天記錄保留
  - ✅ Step 6 翻譯鍵修復
  - ✅ Step 6 字體大小增加
  - ✅ Step 6 雙語顯示問題修復

### 代碼品質提升
- ✅ 創建可重用的 LoadingOverlay 組件
- ✅ 改進父子組件通信機制（onLoadingChange 回調）
- ✅ 增強調試日誌系統
- ✅ 改善錯誤處理邏輯
- ✅ 優化組件狀態管理
- ✅ 標準化系統配置資訊

---

## 🎯 技術架構

### 系統組件
- **前端**: React 18 + TypeScript + Vite (localhost:5175)
- **後端**: FastAPI + Python 3.14 (localhost:8000, Docker)
- **數據庫**: Qdrant Vector DB (localhost:6333, Docker)
- **AI服務**: Gemini 2.0 Flash (LLM + Embedding + Safety)

### 關鍵特性
- **會話管理**: 30分鐘自動清理，完全隔離
- **內容安全**: BLOCK_MEDIUM_AND_ABOVE安全設定，6步驟審核流程
- **多語言**: 實時UI切換，無需重載
- **透明度**: 所有AI操作可視化，包含Prompt顯示
- **用戶體驗**: Loading Overlay 提供清晰的處理狀態反饋

### 文檔結構（已優化）
```
docs/
├── README.md                          # 主要文檔入口
├── QUICK_START_GUIDE.md              # 快速啟動指南
├── PROGRESS.md                        # 項目進度概覽（本文檔）
├── TROUBLESHOOTING_GUIDE.md          # 故障排除指南
├── CONTENT_MODERATION_TEST_GUIDE.md  # 內容審核測試指南
├── USER_TESTING_SETUP.md             # 用戶測試設置
├── WEBSITE_CRAWLER_FEATURE.md        # 網站爬蟲完整指南
├── WORKFLOW_STEPPER_GUIDE.md         # 6步驟工作流程說明
├── SIMILARITY_THRESHOLD_FEATURE.md   # RAG精度控制功能
├── UPLOADED_DOCUMENT_INFO_TEST_GUIDE.md # 文檔信息顯示功能
├── METRICS_DASHBOARD_GUIDE.md        # 性能監控指南
└── qdrant-setup-guide.md            # 向量數據庫設置指南
```

---

## 🚀 快速啟動

```powershell
# 1. 啟動系統
docker-compose up -d

# 2. 檢查狀態  
docker ps
curl http://localhost:8000/health

# 3. 啟動前端
cd frontend && npm run dev

# 4. 訪問應用
# http://localhost:5175/
```

---

## 📊 系統狀態檢查

### 健康檢查命令
```powershell
# 容器狀態
docker ps | findstr rag-chatbot

# 服務健康
curl http://localhost:8000/health
# 預期回應: {"status":"healthy","gemini_model":"gemini-2.0-flash-exp","qdrant_mode":"docker","session_ttl_minutes":30}

# 前端狀態
curl http://localhost:5175/
```

### 功能測試清單
- [x] Session建立與語言切換
- [x] 文件上傳與預覽
- [x] URL上傳與網站爬蟲
- [x] 內容審核6步驟流程（已優化並驗證）
  - [x] PDF學術材料測試通過 (06_agents.pdf)
  - [x] 正常網站測試通過 (ccmbimm.ca)
  - [x] 色情網站正確阻擋 (xvideos.com)
- [x] 文本切割與向量嵌入
- [x] RAG查詢與回答
- [x] Metrics儀表板顯示
- [x] Loading Overlay 顯示與狀態管理

---

## 📚 相關文檔

### 用戶指南
- [快速開始指南](QUICK_START_GUIDE.md) - 5分鐘系統啟動
- [工作流程指南](WORKFLOW_STEPPER_GUIDE.md) - 6步驟使用說明
- [故障排除指南](TROUBLESHOOTING_GUIDE.md) - 常見問題解決

### 開發者文檔
- [內容審核測試](CONTENT_MODERATION_TEST_GUIDE.md) - 安全功能測試
- [網站爬蟲功能](WEBSITE_CRAWLER_FEATURE.md) - 爬蟲功能完整指南
- [用戶測試設置](USER_TESTING_SETUP.md) - 測試環境配置
- [Loading Overlay 實作](../LOADING_OVERLAY_IMPLEMENTATION.md) - Loading 系統完整說明

### 技術文檔
- [相似度閾值功能](SIMILARITY_THRESHOLD_FEATURE.md) - RAG精度控制
- [Metrics儀表板](METRICS_DASHBOARD_GUIDE.md) - 性能監控
- [Qdrant設置](qdrant-setup-guide.md) - 向量數據庫配置

---

## 🎉 當前狀態總結

✅ **系統狀態**: 穩定運行，核心功能完整，代碼簡潔  
✅ **Step 2 UI**: 合併相似參數，新增回應格式和引用選項  
✅ **Step 6 建議氣泡**: AI 無法回答時自動生成可點擊的建議問題  
✅ **工作流程**: 狀態保留機制完善，步驟間導航流暢  
✅ **AI Chat**: 翻譯鍵修復、字體加大、單語言回應、聊天記錄保留  
✅ **Loading 體驗**: 全局 Loading Overlay 系統已實作並整合完成  
✅ **內容審核**: 已徹底簡化並優化，通過三項實際測試驗證  
✅ **UI/UX**: 狀態同步問題全部修復，用戶體驗流暢  
✅ **測試驗證**: 所有核心功能測試通過，審核邏輯準確有效  
✅ **代碼品質**: 清理臨時檔案，簡化代碼結構，提升可維護性  
✅ **文檔系統**: 已簡化並更新，從 20 個文件精簡至 12 個  

**下一步建議**:
- 測試建議氣泡功能的實際效果
- 考慮生產環境部署
- 進行性能壓力測試
- 收集用戶反饋進行微調

---

## 📝 重要變更記錄

### Step 2 UI 重構與 Step 6 建議氣泡 (2026-01-01 下午)
**修改檔案**:
- `backend/src/services/rag_engine.py` - 新增 suggestions 欄位、_generate_suggestions 方法、CANNOT_ANSWER 偵測
- `backend/src/api/routes/chat.py` - ChatResponse 新增 suggestions 欄位
- `frontend/src/types/chat.ts` - ChatResponse interface 新增 suggestions
- `frontend/src/components/ChatMessage/ChatMessage.tsx` - 建議氣泡 UI 和點擊事件
- `frontend/src/components/ChatMessage/ChatMessage.scss` - 氣泡樣式（紫色漸層、hover 效果）
- `frontend/src/components/ChatScreen/ChatScreen.tsx` - suggestions 狀態管理、onSuggestionClick 處理
- `frontend/src/components/PromptConfigStep/PromptConfigStep.tsx` - 合併風格下拉、新增參數
- `frontend/src/components/WorkflowMain/WorkflowMain.tsx` - combined_style, response_format, citation_style 預設值
- `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx` - generateCustomPrompt 更新

**關鍵改進**:
- Step 2：3 個相似下拉合併為 1 個「回應風格」選擇器
- Step 2：新增回應格式（條列/段落/步驟化）和引用格式參數
- Step 6：AI 無法回答時自動生成 2-3 個建議問題
- Step 6：可點擊的紫色漸層氣泡，標示「也許您想問：」

### 工作流程狀態管理與 Step 6 修復 (2026-01-01 上午)
**修改檔案**:
- `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx` - 狀態管理整合
- `frontend/src/components/RagConfigStep/RagConfigStep.tsx` - disabled prop
- `frontend/src/components/PromptConfigStep/PromptConfigStep.tsx` - disabled prop
- `frontend/src/components/DataUploadStep/DataUploadStep.tsx` - 畫面重構
- `frontend/src/components/UploadScreen/UploadScreen.tsx` - onTabChange callback
- `frontend/src/components/ContentReviewStep/ContentReviewStep.tsx` - 狀態保留
- `frontend/src/components/TextProcessingStep/TextProcessingStep.tsx` - 狀態保留
- `frontend/src/components/AiChatStep/AiChatStep.tsx` - 聊天記錄 props
- `frontend/src/components/ChatScreen/ChatScreen.tsx` - 聊天記錄保留
- `frontend/src/components/ChatMessage/ChatMessage.tsx` - 翻譯鍵修復
- `frontend/src/components/ChatMessage/ChatMessage.scss` - 字體大小
- `frontend/src/components/ChatInput/ChatInput.tsx` - 翻譯鍵修復
- `frontend/src/components/ChatInput/ChatInput.scss` - 字體大小
- `frontend/src/i18n/locales/zh-TW.json` - 添加 sending 翻譯
- `backend/src/services/rag_engine.py` - 單語言回應 prompt

**關鍵改進**:
- Step 1/2 禁用邏輯：有上傳資料時防止修改配置
- Step 3 畫面重構：根據上傳模式動態顯示對應參數
- Step 4/5/6 狀態保留：返回上一步時保持已完成的結果
- Step 6 AI Chat 修復：翻譯、字體、單語言回應、聊天記錄

系統已準備好進行下一階段的開發或部署工作！
