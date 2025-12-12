# 完整手動測試清單

## ✅ Phase 3: Session Management (7 個 API)

### 1. POST /api/v1/session/create
- [ ] 建立 Session 成功 (201)
- [ ] 返回 session_id
- [ ] 返回正確的狀態 (READY_FOR_UPLOAD)
- [ ] 建立了 Qdrant collection

### 2. GET /api/v1/session/{session_id}
- [ ] 查詢存在的 Session (200)
- [ ] 查詢不存在的 Session (404)

### 3. GET /api/v1/session/{session_id}/metrics
- [ ] 返回 Session 詳細資訊 (200)
- [ ] 包含 metrics 資訊

### 4. POST /api/v1/session/{session_id}/heartbeat
- [ ] 心跳成功 (200)
- [ ] 更新 last_activity 時間

### 5. POST /api/v1/session/{session_id}/close
- [ ] 關閉 Session 成功 (204)
- [ ] Qdrant collection 被刪除

### 6. POST /api/v1/session/{session_id}/restart
- [ ] 重啟 Session 成功 (201)
- [ ] 返回新的 session_id
- [ ] 舊的 collection 被刪除，新的被建立

### 7. PUT /api/v1/session/{session_id}/language
- [ ] 更新語言成功 (200)
- [ ] 語言值被正確更新

---

## ✅ Phase 4: Document Upload (4 個 API)

### 1. POST /api/v1/upload/{session_id}/file

#### 測試 1.1: TXT 檔案上傳
- [ ] 上傳成功 (202)
- [ ] 返回 document_id
- [ ] source_type = "TEXT"
- [ ] extraction_status = "PENDING"

#### 測試 1.2: PDF 檔案上傳
- [ ] 上傳成功 (202)
- [ ] 返回 document_id
- [ ] source_type = "PDF"
- [ ] extraction_status = "PENDING"

#### 測試 1.3: 錯誤情況
- [ ] 無效的 session_id → 404
- [ ] 檔案太大 (>10MB) → 422
- [ ] 不支援的格式 (.exe) → 422

### 2. POST /api/v1/upload/{session_id}/url

#### 測試 2.1: URL 上傳
- [ ] 上傳成功 (202)
- [ ] 返回 document_id
- [ ] source_type = "URL"

#### 測試 2.2: 錯誤情況
- [ ] 無效的 URL 格式 → 422
- [ ] 無法訪問的 URL → 處理失敗

### 3. GET /api/v1/upload/{session_id}/status/{document_id}

#### 測試 3.1: 處理中狀態
- [ ] 查詢狀態成功 (200)
- [ ] processing_progress 逐步增加
- [ ] extraction_status 變化：PENDING → EXTRACTING → EXTRACTED
- [ ] moderation_status 變化：PENDING → CHECKING → APPROVED

#### 測試 3.2: 處理完成
- [ ] processing_progress = 100
- [ ] extraction_status = "COMPLETED"
- [ ] moderation_status = "APPROVED"
- [ ] chunk_count > 0
- [ ] 有 summary 內容

#### 測試 3.3: 處理失敗
- [ ] extraction_status = "FAILED" 或
- [ ] moderation_status = "BLOCKED"
- [ ] 有 error_code 和 error_message

### 4. GET /api/v1/upload/{session_id}/documents
- [ ] 列出所有文件 (200)
- [ ] 返回正確的文件數量
- [ ] 每個文件包含完整資訊

---

## ✅ Phase 5: RAG Query (3 個 API)

### 1. POST /api/v1/chat/{session_id}/query

#### 測試 1.1: 正常查詢
- [ ] 查詢成功 (200)
- [ ] 返回 answer
- [ ] 返回 retrieved_chunks
- [ ] 返回 token_usage

#### 測試 1.2: 錯誤情況
- [ ] Session 未上傳文件 → 錯誤
- [ ] Session 狀態不是 READY_FOR_CHAT → 錯誤
- [ ] 空查詢 → 422

### 2. GET /api/v1/chat/{session_id}/history
- [ ] 取得歷史記錄 (200)
- [ ] 包含之前的查詢和回答
- [ ] 分頁正常運作 (limit/offset)

### 3. DELETE /api/v1/chat/{session_id}/history
- [ ] 清除歷史成功 (204)
- [ ] 再次查詢歷史為空

---

## 🔄 完整端對端流程測試

### 流程 1: 完整上傳與查詢流程 (TXT)
1. [ ] 建立 Session
2. [ ] 上傳 TXT 檔案
3. [ ] 輪詢狀態直到完成
4. [ ] 驗證處理結果
   - [ ] 文字正確萃取
   - [ ] 內容審核通過
   - [ ] 分塊數量合理
   - [ ] 向量已儲存到 Qdrant
5. [ ] 執行 RAG 查詢
6. [ ] 驗證查詢結果
7. [ ] 關閉 Session

### 流程 2: 完整上傳與查詢流程 (PDF)
1. [ ] 建立 Session
2. [ ] 上傳 PDF 檔案
3. [ ] 輪詢狀態直到完成
4. [ ] 驗證處理結果
5. [ ] 執行 RAG 查詢
6. [ ] 驗證查詢結果
7. [ ] 關閉 Session

### 流程 3: 完整上傳與查詢流程 (URL)
1. [ ] 建立 Session
2. [ ] 上傳 URL
3. [ ] 輪詢狀態直到完成
4. [ ] 驗證處理結果
5. [ ] 執行 RAG 查詢
6. [ ] 驗證查詢結果
7. [ ] 關閉 Session

### 流程 4: Session TTL 測試
1. [ ] 建立 Session
2. [ ] 等待超過 TTL 時間 (10分鐘)
3. [ ] 驗證 Session 被自動清理
4. [ ] 驗證 Qdrant collection 被刪除

---

## 🐛 錯誤處理測試

### 邊界條件測試
- [ ] 空檔案上傳
- [ ] 非常大的檔案 (接近 10MB)
- [ ] 特殊字元檔名
- [ ] 沒有擴展名的檔案
- [ ] 損壞的 PDF
- [ ] 無效的 URL

### 並發測試
- [ ] 同一 Session 上傳多個檔案
- [ ] 多個 Session 同時上傳
- [ ] 上傳時關閉 Session

---

## 📋 測試工具

### 自動化測試
```powershell
# E2E 測試（完整流程）
py -3.12 -m pytest tests/test_phase4_e2e.py -v -s

# 所有測試
py -3.12 -m pytest tests/ -v
```

### 手動測試
- Swagger UI: http://127.0.0.1:8000/api/docs
- 測試腳本: `py -3.12 test_routes_live.py`

---

## ✅ 測試完成標準

- [ ] 所有 API 端點測試通過
- [ ] 所有端對端流程測試通過
- [ ] 所有錯誤處理測試通過
- [ ] Qdrant 資料正確儲存
- [ ] 沒有記憶體洩漏
- [ ] 日誌沒有 ERROR (WARNING 可接受)
