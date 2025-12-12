# RAG Demo Chatbot - 測試指南

## 🎯 當前系統狀態

✅ **Qdrant**: 運行中 (Docker container: rag-chatbot-qdrant)
✅ **Backend**: 運行中 (http://127.0.0.1:8000)
✅ **Phase 4**: 文件上傳功能已完成並通過測試

---

## 📋 您可以進行的測試

### 1. **基本健康檢查** (1 分鐘)

驗證系統各個端點是否正常運作。

```powershell
# 在 backend 目錄執行
cd C:\Projects\AI_projects\RAG_Demo_Chatbot\backend
py -3.12 test_routes_live.py
```

**預期結果**:
- ✅ GET / → 200
- ✅ GET /health → 200
- ✅ GET /api/v1/status → 200
- ✅ POST /api/v1/session/create → 201
- ✅ POST /api/v1/upload/{session_id}/file → 202

---

### 2. **完整文件上傳流程測試** (15-30 秒)

測試完整的 Extract → Moderate → Chunk → Embed → Store 流程。

```powershell
# 設置編碼並執行測試
$env:PYTHONIOENCODING='utf-8'
py -3.12 -m pytest tests/test_phase4_e2e.py::test_phase4_upload_flow -v --no-cov
```

**測試流程**:
1. 建立 Session
2. 上傳測試文件 (test_document.txt)
3. 文字萃取 (Extraction)
4. 內容審核 (Moderation - Gemini Safety API)
5. 文字分塊 (Chunking - 2000 chars, 500 overlap)
6. 向量嵌入 (Embedding - text-embedding-004)
7. 儲存到 Qdrant (Vector Store)
8. 狀態查詢與驗證

**預期結果**: `1 passed in ~14s`

---

### 3. **手動 API 測試** (互動式)

#### 3.1 瀏覽 API 文件

在瀏覽器開啟: http://127.0.0.1:8000/api/docs

這是自動生成的 Swagger UI，可以直接測試所有 API 端點。

#### 3.2 測試 Session 管理

```powershell
# 建立 Session
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/session/create" -Method POST
$sessionId = $response.session_id
Write-Host "Session ID: $sessionId"
Write-Host "State: $($response.state)"
Write-Host "Collection: $($response.qdrant_collection_name)"

# 查詢 Session 狀態
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/session/$sessionId" | ConvertTo-Json
```

#### 3.3 測試文件上傳

```powershell
# 建立測試文件
$testContent = @"
Artificial Intelligence Overview

Artificial intelligence (AI) is intelligence demonstrated by machines.
AI research has been highly successful in developing effective techniques.
Applications include advanced web search engines, recommendation systems,
and autonomous vehicles.
"@
$testContent | Out-File -FilePath "test_upload.txt" -Encoding UTF8

# 上傳文件
$boundary = [System.Guid]::NewGuid().ToString()
$headers = @{
    "Content-Type" = "multipart/form-data; boundary=$boundary"
}

$fileBytes = [System.IO.File]::ReadAllBytes("test_upload.txt")
$fileEnc = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)

$body = @"
--$boundary
Content-Disposition: form-data; name="file"; filename="test_upload.txt"
Content-Type: text/plain

$fileEnc
--$boundary--
"@

$uploadResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/upload/$sessionId/file" -Method POST -Headers $headers -Body $body
$documentId = $uploadResponse.document_id
Write-Host "Document ID: $documentId"

# 查詢處理狀態 (輪詢直到完成)
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 2
    $status = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/upload/$sessionId/status/$documentId"
    Write-Host "Progress: $($status.processing_progress)% | Extraction: $($status.extraction_status) | Moderation: $($status.moderation_status)"
    
    if ($status.extraction_status -eq "COMPLETED" -and $status.moderation_status -eq "APPROVED") {
        Write-Host "`n✅ 處理完成!"
        Write-Host "Chunks: $($status.chunk_count)"
        Write-Host "Summary: $($status.summary)"
        break
    }
}

# 列出所有文件
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/upload/$sessionId/documents" | ConvertTo-Json

# 清理
Remove-Item "test_upload.txt"
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/session/$sessionId/close" -Method POST
```

---

### 4. **測試不同文件類型**

#### 4.1 文字檔 (.txt)
```powershell
# 已在上面的範例中涵蓋
```

#### 4.2 PDF 檔案 (.pdf)
```powershell
# 需要有 PDF 檔案
# 將 test_upload.txt 改成 test_upload.pdf
# 並確保 Content-Type 設為 application/pdf
```

#### 4.3 URL 內容抓取
```powershell
$urlBody = @{
    url = "https://en.wikipedia.org/wiki/Machine_learning"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/upload/$sessionId/url" `
    -Method POST `
    -ContentType "application/json" `
    -Body $urlBody
```

---

### 5. **壓力測試** (選擇性)

測試系統在多個並發請求下的表現。

```powershell
# 建立多個 Session 並上傳
1..5 | ForEach-Object -Parallel {
    $session = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/session/create" -Method POST
    Write-Host "Session $_ created: $($session.session_id)"
    
    # 上傳小文件
    # ... (使用上面的上傳邏輯)
}
```

---

### 6. **錯誤處理測試**

#### 6.1 測試檔案大小限制
```powershell
# 建立 > 10MB 的文件
$largeContent = "A" * (11 * 1024 * 1024)
$largeContent | Out-File -FilePath "large.txt"

# 嘗試上傳 (應該失敗)
# ... 上傳邏輯
```

#### 6.2 測試不支援的文件類型
```powershell
# 建立 .exe 或其他不支援的格式
# 嘗試上傳 (應該失敗)
```

#### 6.3 測試無效的 Session ID
```powershell
$fakeSessionId = "00000000-0000-0000-0000-000000000000"
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/upload/$fakeSessionId/file" -Method POST
# 應該返回 404 SESSION_NOT_FOUND
```

---

## 🔍 監控與偵錯

### 查看 Backend 日誌

Backend 正在另一個終端運行，您可以在那裡看到即時日誌：
- Session 建立日誌
- 上傳請求日誌
- 處理流程日誌 (Extract → Moderate → Chunk → Embed → Store)
- 錯誤訊息

### 檢查 Qdrant 資料

```powershell
# 查看 collections
Invoke-RestMethod -Uri "http://localhost:6333/collections" | ConvertTo-Json -Depth 10

# 查看特定 collection 的資訊
$collectionName = "session_xxxxx"  # 從 Session 回應中取得
Invoke-RestMethod -Uri "http://localhost:6333/collections/$collectionName" | ConvertTo-Json -Depth 10
```

---

## 📊 測試檢查清單

完成以下項目以確保系統完全正常：

- [ ] 基本健康檢查通過
- [ ] E2E 測試通過
- [ ] 可以成功建立 Session
- [ ] 可以上傳 TXT 文件
- [ ] 文件處理完成並生成 chunks
- [ ] 向量成功儲存到 Qdrant
- [ ] 可以查詢處理狀態
- [ ] 可以列出所有文件
- [ ] 可以關閉 Session
- [ ] 錯誤處理正常 (大文件、無效類型等)

---

## 🚀 下一步測試 (Phase 5 - RAG Query)

一旦 Phase 4 測試完成，可以開始測試 RAG 查詢功能：

```powershell
# 建立 Session → 上傳文件 → 查詢
$queryBody = @{
    user_query = "What is machine learning?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/$sessionId/query" `
    -Method POST `
    -ContentType "application/json" `
    -Body $queryBody
```

---

## ⚙️ 系統控制

### 停止 Backend
在 Backend 終端按 `Ctrl+C`

### 停止 Qdrant
```powershell
docker-compose down
```

### 重啟所有服務
```powershell
# Qdrant
docker-compose up -d qdrant

# Backend
cd backend
$env:PYTHONPATH = "C:\Projects\AI_projects\RAG_Demo_Chatbot\backend"
py -3.12 -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 📞 需要協助？

- 檢查 Backend 日誌看錯誤訊息
- 確認 Docker Desktop 正在運行
- 確認 Qdrant 容器正在運行: `docker ps`
- 確認 Gemini API Key 已設置: 檢查 `backend/.env.local`

祝測試順利！🎉
