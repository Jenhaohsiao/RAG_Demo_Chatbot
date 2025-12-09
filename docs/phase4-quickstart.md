# Phase 4: Document Upload - 快速開始

**目標**: 測試完整的文件上傳、處理、審核、分塊、嵌入流程

---

## 前置需求

1. **啟動後端服務**:
   ```bash
   cd backend
   uvicorn src.main:app --reload
   ```

2. **啟動前端服務**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **確保 Qdrant 運行中**:
   ```bash
   docker-compose up -d
   ```

4. **設定 Gemini API Key**:
   ```bash
   # 複製 .env.example 為 .env
   cp .env.example .env
   
   # 編輯 .env 並填入你的 API key
   GEMINI_API_KEY=your_api_key_here
   ```

---

## 測試場景 1: 上傳文字檔案 (手動測試)

### 步驟：

1. **開啟瀏覽器**: http://localhost:5173

2. **建立 Session**: 點擊 "Start New Session"

3. **切換到檔案上傳模式**: 
   - 點擊 "File" 按鈕

4. **選擇或拖放文字檔案**:
   - 支援格式: `.txt`, `.pdf`
   - 大小限制: 10MB
   - 建議: 先用簡單的文字檔案測試

5. **觀察處理流程**:
   - ✅ 萃取文字 (Extracting)
   - ✅ 內容審核 (Moderating) 
   - ✅ 文字分塊 (Chunking)
   - ✅ 向量嵌入 (Embedding)
   - ✅ 儲存至 Qdrant

6. **檢查結果**:
   - 分塊數量
   - 處理進度 (0-100%)
   - 文件摘要

---

## 測試場景 2: 上傳 URL (手動測試)

### 步驟：

1. **切換到 URL 模式**: 點擊 "URL" 按鈕

2. **輸入 URL**:
   ```
   https://en.wikipedia.org/wiki/Machine_learning
   ```

3. **提交**: 點擊 "Upload" 按鈕

4. **觀察處理流程** (同上)

---

## 測試場景 3: 自動化端對端測試

### 執行測試腳本：

```bash
cd backend
python tests/test_phase4_e2e.py
```

### 測試內容：

1. ✅ 建立 Session
2. ✅ 上傳測試檔案
3. ✅ 輪詢處理狀態
4. ✅ 驗證分塊結果
5. ✅ 列出所有文件
6. ✅ 清理測試資料

---

## API 端點測試 (cURL)

### 1. 建立 Session
```bash
curl -X POST http://localhost:8000/api/v1/session/create
```

### 2. 上傳檔案
```bash
SESSION_ID="your_session_id_here"

curl -X POST \
  "http://localhost:8000/api/v1/upload/$SESSION_ID/file" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_document.txt"
```

### 3. 檢查處理狀態
```bash
DOCUMENT_ID="your_document_id_here"

curl -X GET \
  "http://localhost:8000/api/v1/upload/$SESSION_ID/status/$DOCUMENT_ID"
```

### 4. 列出所有文件
```bash
curl -X GET \
  "http://localhost:8000/api/v1/upload/$SESSION_ID/documents"
```

---

## 驗證重點

### ✅ 功能驗證

- [ ] 檔案上傳成功 (PDF/TXT)
- [ ] URL 內容抓取成功
- [ ] 內容審核通過 (無違規內容)
- [ ] 文字分塊正確 (512 tokens, 128 overlap)
- [ ] 向量嵌入正確 (768 維度)
- [ ] Qdrant 儲存成功
- [ ] 處理進度正確更新

### ✅ 錯誤處理驗證

- [ ] 上傳過大檔案 → ERR_FILE_TOO_LARGE
- [ ] 上傳不支援格式 → ERR_INVALID_FORMAT
- [ ] 上傳違規內容 → ERR_MODERATION_BLOCKED
- [ ] URL 無法存取 → ERR_FETCH_FAILED

### ✅ UI/UX 驗證

- [ ] Drag & Drop 功能正常
- [ ] 進度條正確顯示
- [ ] 錯誤訊息清晰
- [ ] 處理階段指示器正確
- [ ] 多語言支援正常

---

## 已知限制

1. **檔案大小**: 最大 10MB
2. **URL 超時**: 30 秒
3. **支援格式**: PDF, TXT only
4. **審核**: 使用 Gemini Safety API (可能過度嚴格)

---

## 疑難排解

### 問題: 上傳後一直顯示 "Processing"

**可能原因**:
1. Gemini API Key 未設定或無效
2. Qdrant 未啟動

**解決方式**:
```bash
# 檢查 backend logs
uvicorn src.main:app --reload

# 檢查 Qdrant
docker ps | grep qdrant

# 檢查 API key
cat .env | grep GEMINI_API_KEY
```

### 問題: ERR_MODERATION_BLOCKED

**原因**: 內容包含 Gemini 認為不安全的內容

**解決方式**: 使用不同的文件或調整審核設定（moderation.py）

---

## 下一步

Phase 4 完成後，繼續到 Phase 5:
- **RAG Query Response**
- 實作查詢流程
- 嚴格 RAG (similarity ≥ 0.7)
- "無法回答" 邏輯

**測試指南**: `docs/test-results-phase4.md` (待建立)
