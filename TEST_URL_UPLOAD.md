# URL 上傳功能測試指南

## 概述
URL 上傳是 Phase 4 (US2 - Document Upload) 的功能。您可以提供一個網址，系統會自動:
1. ✅ 抓取網頁內容
2. ✅ 清理 HTML (移除 script、style、nav、header、footer 等)
3. ✅ 提取純文字
4. ✅ 進行內容安全審核 (Gemini Safety API)
5. ✅ 分塊、嵌入、存儲到向量資料庫

---

## 環境要求

✅ **前端**: http://localhost:5173 運行中  
✅ **後端**: http://localhost:8000/api/v1 運行中  
✅ **Gemini API Key**: 已設置在 `.env` 檔案  
✅ **Qdrant**: Docker 容器運行中

---

## 測試 URL 推薦清單

### 1️⃣ 簡單文字內容網站 (推薦新手用)
```
https://example.com
```
**特點**: 簡單 HTML 結構，易於提取

### 2️⃣ Wikipedia 文章 (推薦測試長內容)
```
https://en.wikipedia.org/wiki/Machine_learning
https://en.wikipedia.org/wiki/Artificial_intelligence
https://zh.wikipedia.org/wiki/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0
```
**特點**: 結構化內容，包含豐富信息

### 3️⃣ 新聞網站 (推薦測試複雜結構)
```
https://www.bbc.com
https://www.cnbeta.com
```
**特點**: 複雜 HTML 結構，多媒體元素，測試清理效果

### 4️⃣ 技術文檔 (推薦測試代碼相關)
```
https://docs.python.org/3/tutorial/index.html
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide
```
**特點**: 技術內容，程式碼片段

### 5️⃣ 部落格文章 (推薦測試一般文本)
```
https://www.medium.com/
https://www.dev.to/
```
**特點**: 純文字內容為主

---

## 前端 UI 測試步驟

### 🎯 使用前端上傳 URL

1. **打開應用**
   ```
   http://localhost:5173
   ```

2. **建立新 Session**
   - 點擊 "New Chat" 或重新整理頁面

3. **切換到 URL 上傳模式**
   - 在 Upload Screen 看到兩個按鈕或選項卡:
     - "📁 File Upload" (檔案上傳)
     - "🌐 URL Upload" (URL 上傳)
   - 點擊 "🌐 URL Upload" 標籤

4. **輸入測試 URL**
   ```
   https://example.com
   ```

5. **提交並等待**
   - 點擊 "Upload" 或 "Fetch" 按鈕
   - 等待 Processing Screen 顯示進度:
     - ⏳ Extracting...
     - ⏳ Moderating...
     - ⏳ Chunking...
     - ⏳ Embedding...
     - ✅ Complete!

6. **驗證結果**
   - 在 ChatScreen 查看 Metrics:
     - Document Count: 1
     - Chunk Count: X
     - Token Usage: X
   - 提出相關查詢測試

---

## 後端 API 直接測試 (cURL)

### 步驟 1️⃣: 建立 Session

```bash
curl -X POST http://localhost:8000/api/v1/session/create \
  -H "Content-Type: application/json"
```

**回應 (範例)**:
```json
{
  "session_id": "123e4567-e89b-12d3-a456-426614174000",
  "state": "IDLE",
  "created_at": "2025-12-17T10:00:00Z",
  "expires_at": "2025-12-17T10:30:00Z",
  "language": "en"
}
```

### 步驟 2️⃣: 上傳 URL

```bash
curl -X POST "http://localhost:8000/api/v1/upload/{SESSION_ID}/url" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**回應 (202 Accepted)**:
```json
{
  "document_id": "987e6543-a21b-34d5-e678-901234567890",
  "session_id": "123e4567-e89b-12d3-a456-426614174000",
  "source_type": "URL",
  "source_reference": "https://example.com",
  "upload_timestamp": "2025-12-17T10:01:00Z",
  "extraction_status": "PENDING",
  "moderation_status": "PENDING"
}
```

### 步驟 3️⃣: 查詢處理狀態

```bash
curl -X GET "http://localhost:8000/api/v1/upload/{SESSION_ID}/status/{DOCUMENT_ID}" \
  -H "Content-Type: application/json"
```

**回應 (完成)**:
```json
{
  "document_id": "987e6543-a21b-34d5-e678-901234567890",
  "source_type": "URL",
  "source_reference": "https://example.com",
  "extraction_status": "COMPLETED",
  "moderation_status": "APPROVED",
  "chunk_count": 8,
  "processing_progress": 100,
  "summary": "Example Domain is a domain for use in examples...",
  "error_code": null,
  "error_message": null
}
```

### 步驟 4️⃣: 查詢所有文件

```bash
curl -X GET "http://localhost:8000/api/v1/upload/{SESSION_ID}/documents" \
  -H "Content-Type: application/json"
```

### 步驟 5️⃣: 測試 RAG 查詢

```bash
curl -X POST "http://localhost:8000/api/v1/chat/{SESSION_ID}/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is this about?"}'
```

---

## 常見問題排查

### ❌ 問題 1: "Invalid URL format" 錯誤

**原因**: 
- URL 格式不正確 (缺少 http:// 或 https://)
- URL 包含空格或特殊字符

**解決**:
```bash
# ❌ 錯誤
https://example.com/path with space

# ✅ 正確
https://example.com/path-with-hyphen
```

---

### ❌ 問題 2: URL 抓取超時 (30 秒)

**原因**:
- 網站響應速度太慢
- 網路連接不穩定
- 網站要求身份驗證

**解決**:
- 嘗試其他 URL
- 檢查網路連接
- 使用 ping 測試: `ping example.com`

---

### ❌ 問題 3: "Content exceeds maximum size" 錯誤

**原因**:
- 網頁內容超過 10MB 限制
- 網站包含大量圖片/媒體

**解決**:
- 該 URL 不支援 (設計限制)
- 嘗試其他更輕量的網站

---

### ❌ 問題 4: "No text content found" 錯誤

**原因**:
- 網站是動態內容 (JavaScript 渲染)
- 網站只有多媒體內容 (影片、圖片)
- 網站被阻擋

**解決**:
- 該 URL 不適合 (不支援 JavaScript 渲染)
- 嘗試其他網站

---

### ❌ 問題 5: 內容被安全審核阻擋

**原因**:
- 網頁內容包含不安全信息
- Gemini Safety API 標記為危害內容

**解決**:
- 這是設計行為 (Constitutional Principle VI)
- 嘗試其他網站

---

## 推薦的完整測試流程

### ✅ 測試序列 (按順序)

1. **基本測試** (5 分鐘)
   ```
   https://example.com
   ```

2. **文章測試** (10 分鐘)
   ```
   https://en.wikipedia.org/wiki/Machine_learning
   ```

3. **長內容測試** (15 分鐘)
   ```
   https://en.wikipedia.org/wiki/Artificial_intelligence
   ```

4. **複雜結構測試** (20 分鐘)
   ```
   https://www.bbc.com
   ```

5. **錯誤情況測試** (5 分鐘)
   ```
   https://example.com/nonexistent  # 404 錯誤
   https://invalid-url              # 無效 URL
   ```

---

## 預期行為

### ✅ 成功上傳

```
1. 提交 URL
   ↓
2. 後端回傳 202 Accepted + Document ID
   ↓
3. 背景處理開始:
   - Extract (提取 HTML → 純文字)
   - Moderate (安全審核)
   - Chunk (文字分塊)
   - Embed (向量嵌入)
   - Store (存儲到 Qdrant)
   ↓
4. 轉換狀態為 COMPLETED
   ↓
5. 前端查詢進度顯示 100%
   ↓
6. 可以進行 RAG 查詢
```

### ⏱️ 預期時間

- **簡單 URL** (example.com): ~10-20 秒
- **文章 URL** (Wikipedia): ~20-40 秒
- **複雜 URL** (新聞網站): ~30-60 秒

---

## 測試資料統計

### 📊 典型提取結果

| URL | 內容長度 | 分塊數 | 處理時間 |
|-----|---------|-------|---------|
| example.com | ~1KB | 1 | 5-10s |
| Wikipedia 文章 | ~50KB | 8-12 | 15-25s |
| 新聞網站 | ~100KB | 15-25 | 30-60s |

---

## 下一步

✅ 選擇一個推薦的 URL
✅ 按照「前端 UI 測試步驟」進行測試
✅ 記錄是否成功
✅ 如果失敗，檢查「常見問題排查」

如有問題，請檢查:
- 後端日誌: `docker logs rag-chabot-backend`
- 前端控制台: F12 → Console 標籤
- 網路請求: F12 → Network 標籤
