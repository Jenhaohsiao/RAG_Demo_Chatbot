# Phase 8 & Phase 9: 完整使用者測試計劃

**日期**: 2025-12-19  
**範圍**: Phase 8 (Leave/Restart) + Phase 9 (邊界情況)  
**總測試數**: 18 個測試用例

---

## Phase 8 測試用例 (9 TC) - Session Controls

詳見 `docs/PHASE8_USER_TESTING.md`

| # | 測試 | 描述 | 狀態 |
|---|------|------|------|
| TC-01 | Leave 對話框 | 點擊 Leave 按鈕顯示確認對話框 | ⏳ |
| TC-02 | Leave Cancel | 取消 Leave 不刪除 Session | ⏳ |
| TC-03 | Leave Confirm | Confirm Leave 刪除 Session + Qdrant | ⏳ |
| TC-04 | Restart 對話框 | 點擊 Restart 按鈕顯示確認對話框 | ⏳ |
| TC-05 | Restart Cancel | 取消 Restart 保持狀態 | ⏳ |
| TC-06 | Restart Confirm | Confirm Restart 建立新 Session | ⏳ |
| TC-07 | 多語言對話框 | 7 種語言對話框顯示正確 | ⏳ |
| TC-08 | Qdrant 清理驗證 | Qdrant collection 正確刪除 | ⏳ |
| TC-09 | 並發操作 | 快速 Leave/Restart 不崩潰 | ⏳ |

---

## Phase 9 測試用例 (9 TC) - 邊界情況與錯誤處理

### 部分 A: 檔案驗證邊界情況 (3 TC)

**TC-10: 超大檔案拒絕 (T096)**
```
步驟:
1. 創建 11 MB 的文字檔 (> 10 MB 限制)
2. 嘗試上傳檔案
3. 預期: 顯示錯誤訊息 "File too large (max 10 MB)"

驗證:
- 瀏覽器控制台: console.log(error.code) → "ERR_FILE_TOO_LARGE"
- HTTP 狀態碼: 400
- 訊息: "FILE_TOO_LARGE"
```

**TC-11: 不支援格式拒絕 (T095)**
```
步驟:
1. 準備 .jpg 圖片檔案
2. 嘗試上傳圖片
3. 預期: 顯示錯誤訊息 "Unsupported format. Only PDF and TXT allowed"

驗證:
- 瀏覽器控制台: console.log(error.code) → "ERR_UNSUPPORTED_FORMAT"
- HTTP 狀態碼: 400
- 訊息: "UNSUPPORTED_FORMAT"
```

**TC-12: 空 PDF 檔案處理 (T097)**
```
步驟:
1. 建立空白 PDF (無文字)
2. 或上傳掃描 PDF (無可提取文字)
3. 嘗試上傳
4. 預期: 顯示錯誤訊息 "File is empty or contains no extractable text"

驗證:
- 瀏覽器控制台: console.log(error.code) → "ERR_EMPTY_FILE"
- HTTP 狀態碼: 400
- 訊息: "EMPTY_FILE"
```

### 部分 B: 網路與超時邊界情況 (2 TC)

**TC-13: URL 超時處理 (T098)**
```
步驟:
1. 準備無響應的 URL (例: http://10.255.255.1 - 不存在的伺服器)
2. 使用 URL 上傳模式
3. 輸入 URL
4. 預期: 等待 30 秒後顯示超時錯誤

驗證:
- 瀏覽器控制台: console.log(error.code) → "ERR_URL_TIMEOUT"
- HTTP 狀態碼: 408 或 500
- 訊息: "Request timed out after 30 seconds"
- 時間: 應該等待至少 30 秒
```

**TC-14: 無效 URL 格式拒絕**
```
步驟:
1. 輸入無效 URL (例: "not a url")
2. 嘗試上傳
3. 預期: 立即顯示驗證錯誤

驗證:
- 瀏覽器控制台: console.log(error.code) → "ERR_INVALID_URL"
- HTTP 狀態碼: 400
- 訊息: "INVALID_URL"
```

### 部分 C: API 與系統邊界情況 (3 TC)

**TC-15: Gemini API 速率限制 (T099)**
```
步驟:
1. 成功上傳文件後
2. 在 10 秒內連續發送 5 個查詢
3. 預期: 速率限制被觸發，自動重試

驗證:
- 瀏覽器控制台: 檢查重試邏輯
- HTTP 狀態碼: 429 (Too Many Requests) → 自動重試
- 訊息應包含: "Rate limited, retrying..."
- 最終應成功 (after retry)
```

**TC-16: Qdrant 連線錯誤恢復 (T100)**
```
步驟:
1. 停止 Docker 的 Qdrant 容器
2. 嘗試執行查詢
3. 預期: 顯示友善錯誤訊息，不崩潰

驗證命令 (Terminal 1 - 停止 Qdrant):
$ docker stop rag-chatbot-qdrant

瀏覽器驗證:
- 應顯示訊息: "Database connection error. Please try again later."
- HTTP 狀態碼: 503 Service Unavailable
- 訊息: "VECTOR_STORE_FAILED"

恢復 Qdrant (Terminal 1):
$ docker start rag-chatbot-qdrant
```

**TC-17: 伺服器內部錯誤 (T089)**
```
步驟:
1. 觀察邊界情況測試中的伺服器日誌
2. 檢查所有錯誤是否正確記錄
3. 預期: 所有錯誤都有正確的 HTTP 狀態碼和訊息

驗證:
- 後端日誌應顯示 ERROR 級別的日誌
- 每個錯誤對應 HTTP 400-500 狀態碼
- 前端顯示使用者友善的訊息
```

### 部分 D: 完整流程測試 (1 TC)

**TC-18: 邊界情況恢復與完整流程 (T102-T103)**
```
步驟:
1. 重複執行 TC-10 到 TC-17 的所有失敗情況
2. 確認應用在每個失敗後都能恢復
3. 成功上傳文件並執行查詢
4. 執行 Phase 8 的 Leave/Restart
5. 預期: 所有操作都應該成功或顯示適當的錯誤

驗證:
- 應用不應崩潰
- 每個操作都應有適當的反饋 (成功訊息或錯誤訊息)
- UI 應始終保持反應性
- 所有錯誤都應可恢復
```

---

## 🧪 測試執行流程

### 前置準備 (10 分鐘)

```bash
# 終端 1: 啟動 Qdrant
docker-compose up -d qdrant
docker ps  # 驗證 qdrant 運行

# 終端 2: 啟動後端
cd backend
py -3.12 -m uvicorn src.main:app --reload

# 終端 3: 啟動前端
cd frontend
npm run dev

# 瀏覽器: 開啟 http://localhost:5173
```

### 執行順序

1. **Phase 8 測試** (20 分鐘)
   - TC-01 到 TC-09
   - 詳見 `PHASE8_USER_TESTING.md`

2. **Phase 9 邊界情況** (40 分鐘)
   - TC-10 到 TC-17 (依次執行)
   - 每個失敗情況後驗證錯誤訊息

3. **完整流程測試** (10 分鐘)
   - TC-18: 所有情況恢復測試
   - 最終驗證

### 總測試時間: **70 分鐘**

---

## 📊 測試結果記錄表

| TC # | 測試名稱 | 預期結果 | 實際結果 | 狀態 | 備註 |
|------|---------|---------|---------|------|------|
| TC-01 | Leave 對話框 | 顯示對話框 | ⏳ | ⏳ | |
| TC-02 | Leave Cancel | 保持狀態 | ⏳ | ⏳ | |
| TC-03 | Leave Confirm | Session 刪除 | ⏳ | ⏳ | |
| TC-04 | Restart 對話框 | 顯示對話框 | ⏳ | ⏳ | |
| TC-05 | Restart Cancel | 保持狀態 | ⏳ | ⏳ | |
| TC-06 | Restart Confirm | 新 Session | ⏳ | ⏳ | |
| TC-07 | 多語言對話框 | 7 語言顯示 | ⏳ | ⏳ | |
| TC-08 | Qdrant 清理 | Collection 刪除 | ⏳ | ⏳ | |
| TC-09 | 並發操作 | 不崩潰 | ⏳ | ⏳ | |
| TC-10 | 超大檔案拒絕 | 400 error | ⏳ | ⏳ | |
| TC-11 | 不支援格式 | 400 error | ⏳ | ⏳ | |
| TC-12 | 空 PDF 檔案 | 400 error | ⏳ | ⏳ | |
| TC-13 | URL 超時 | 408 error | ⏳ | ⏳ | |
| TC-14 | 無效 URL | 400 error | ⏳ | ⏳ | |
| TC-15 | Gemini 速率限制 | 自動重試 | ⏳ | ⏳ | |
| TC-16 | Qdrant 連線錯誤 | 503 error | ⏳ | ⏳ | |
| TC-17 | 伺服器錯誤 | HTTP 500 | ⏳ | ⏳ | |
| TC-18 | 完整恢復流程 | 所有恢復 | ⏳ | ⏳ | |

---

## ✅ 成功準則 (SC-001 到 SC-010)

| # | 準則 | 驗證方式 | 狀態 |
|----|------|---------|------|
| SC-001 | Session 自動建立 | 訪問應用創建 Session ID | ⏳ |
| SC-002 | Qdrant 創建 Collection | 查詢 Qdrant 檢查 | ⏳ |
| SC-003 | 文件上傳與處理 | 上傳文件至完成 | ⏳ |
| SC-004 | RAG 查詢回應 | 查詢返回有關答案 | ⏳ |
| SC-005 | 多語言支援 | 切換語言檢查 UI | ⏳ |
| SC-006 | Metrics 儀表板 | 檢查 token 計算 | ⏳ |
| SC-007 | Leave 按鈕功能 | Session 刪除驗證 | ⏳ |
| SC-008 | Restart 按鈕功能 | 新 Session 建立驗證 | ⏳ |
| SC-009 | 錯誤處理 | 邊界情況顯示錯誤 | ⏳ |
| SC-010 | 系統穩定性 | 無崩潰執行所有測試 | ⏳ |

---

## 📝 完成檢查清單

- [ ] TC-01 到 TC-18 全部執行
- [ ] SC-001 到 SC-010 全部驗證
- [ ] 所有錯誤訊息顯示正確
- [ ] 後端日誌記錄完整
- [ ] 系統無崩潰
- [ ] 最後提交測試報告

---

**最終驗收標準**: 18/18 測試通過 + 10/10 成功準則達成 = ✅ **MVP 完全就緒**

