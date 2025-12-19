# 🎉 使用者測試準備完成！

**日期**: 2025-12-19 14:30 UTC  
**環境狀態**: ✅ **完全就緒**

---

## 📊 環境驗證摘要

### ✅ 已驗證的組件

| 組件 | 版本 | 狀態 | 備註 |
|------|------|------|------|
| Docker | 29.1.2 | ✅ | 容器引擎就緒 |
| Docker Compose | 2.40.3 | ✅ | 編排工具就緒 |
| Node.js | 24.11.1 | ✅ | 前端執行環境 |
| npm | 最新 | ✅ | 114 包已安裝 |
| 後端容器 | 健康 | ✅ | Port 8000 |
| Qdrant 容器 | 健康 | ✅ | Port 6333-6334 |
| Vite 開發伺服器 | 5.4.21 | ✅ | Port 5174 (已配置) |

### ✅ 已部署的服務

```
🖥️  後端 (FastAPI)
   └─ URL: http://localhost:8000
   └─ 健康檢查: http://localhost:8000/health → ✅ Healthy
   └─ Swagger UI: http://localhost:8000/docs
   └─ 功能: Session 管理、文檔處理、RAG 查詢、網站爬蟲

💾 向量資料庫 (Qdrant)
   └─ URL: http://localhost:6333
   └─ 儀表板: http://localhost:6333/dashboard
   └─ 容量: 無限制 (本地儲存)
   └─ 功能: 向量嵌入存儲和檢索

🎨 前端 (React + Vite)
   └─ URL: http://localhost:5174
   └─ 框架: React 18.2.0 + TypeScript
   └─ UI 庫: Bootstrap 5.3.2
   └─ i18n: 7 種語言支援
   └─ 功能: 完整的 RAG 聊天機器人 UI
```

---

## 🚀 快速啟動

### 步驟 1: 驗證所有服務都在運行

```powershell
# 檢查 Docker 容器
docker ps

# 預期輸出:
# NAMES                STATUS           PORTS
# rag-chatbot-backend  Up (healthy)     0.0.0.0:8000->8000/tcp
# rag-chatbot-qdrant   Up               0.0.0.0:6333-6334->6333-6334/tcp
```

### 步驟 2: 打開應用

**在瀏覽器中訪問**:
- **主應用**: http://localhost:5174
- **後端 API 文檔**: http://localhost:8000/docs
- **Qdrant 儀表板**: http://localhost:6333/dashboard

### 步驟 3: 開始測試

1. **建立新 Session**
2. **選擇語言** (英文、繁體中文等)
3. **上傳文件或爬蟲網站**
4. **提出問題並驗證答案**

---

## 🧪 推薦的測試場景

### 🟢 綠色通道 - 基本功能測試 (15 分鐘)

```
1. ✅ 打開應用
   → 驗證 UI 正確加載
   
2. ✅ 建立 Session
   → 選擇語言 (例如: 繁體中文)
   
3. ✅ 上傳文件
   → 上傳簡單文本文件 (TXT)
   → 驗證上傳成功
   
4. ✅ 提出問題
   → 輸入簡單問題 (例如: "這個文件講的是什麼?")
   → 驗證系統返回相關答案
   
5. ✅ 檢查 Metrics
   → 查看查詢時間、Token 使用等
```

### 🟡 黃色通道 - 高級功能測試 (30 分鐘)

```
1. ✅ 網站爬蟲功能
   → 進入 Upload → Crawler 標籤
   → 輸入 URL (例如: https://example.com)
   → 調整 Token 滑塊
   → 啟動爬蟲
   → 驗證結果顯示
   
2. ✅ 多語言切換
   → 在 UI 中切換語言
   → 驗證所有文本都更新
   → 特別檢查網站爬蟲面板翻譯
   
3. ✅ 多 Session 管理
   → 建立第二個 Session
   → 驗證狀態獨立
   → 在 Session 之間切換
   
4. ✅ 錯誤處理
   → 嘗試無效 URL (爬蟲)
   → 驗證友好的錯誤訊息
```

### 🔴 紅色通道 - 性能和邊界測試 (45 分鐘)

```
1. ✅ 大型文件上傳
   → 上傳 100KB+ 文件
   → 測量處理時間
   → 驗證系統穩定性
   
2. ✅ Token 限制
   → 設置爬蟲 Token 限制為低值 (5K)
   → 爬蟲應該停止於限制
   → 驗證警告訊息
   
3. ✅ 複雜查詢
   → 提出多部分問題
   → 驗證上下文理解
   → 檢查查詢時間
   
4. ✅ 負載測試 (可選)
   → 快速打開多個標籤
   → 同時進行多個查詢
   → 驗證系統響應能力
```

---

## 📝 測試檢查清單

### 核心功能檢查清單

- [ ] **Session 管理**
  - [ ] 建立新 Session
  - [ ] 更改 Session 語言
  - [ ] 切換 Session
  - [ ] 重啟 Session
  - [ ] 關閉 Session

- [ ] **文件上傳**
  - [ ] 上傳 PDF 文件
  - [ ] 上傳 TXT 文件
  - [ ] 上傳 CSV 文件
  - [ ] 驗證上傳進度
  - [ ] 取消上傳

- [ ] **URL 上傳**
  - [ ] 輸入有效 URL
  - [ ] 驗證 URL 預覽
  - [ ] 上傳網頁內容
  - [ ] 驗證提取結果

- [ ] **RAG 查詢**
  - [ ] 提出簡單問題
  - [ ] 提出複雜問題
  - [ ] 驗證答案相關性
  - [ ] 檢查來源引用
  - [ ] 測試多輪對話

- [ ] **Metrics 儀表板**
  - [ ] 查看查詢時間
  - [ ] 查看 Token 使用
  - [ ] 查看文檔統計
  - [ ] 驗證實時更新

### 網站爬蟲功能檢查清單

- [ ] **基本爬蟲**
  - [ ] 進入爬蟲標籤
  - [ ] 輸入有效 URL
  - [ ] 啟動爬蟲
  - [ ] 驗證結果顯示
  - [ ] 檢查提取的內容

- [ ] **Token 控制**
  - [ ] 調整 Token 滑塊
  - [ ] 驗證滑塊值更新
  - [ ] 設置低限制並驗證停止
  - [ ] 驗證警告訊息

- [ ] **URL 驗證**
  - [ ] 輸入無效 URL → 顯示錯誤
  - [ ] 輸入 HTTP URL → 接受
  - [ ] 輸入 HTTPS URL → 接受
  - [ ] 空 URL → 驗證錯誤訊息

- [ ] **錯誤處理**
  - [ ] 不可達的網站 → 顯示錯誤
  - [ ] 超時 → 顯示超時訊息
  - [ ] 無效 HTML → 優雅處理
  - [ ] 網絡錯誤 → 顯示重試選項

### 多語言檢查清單

- [ ] **語言切換**
  - [ ] 切換到英文 → UI 更新
  - [ ] 切換到繁體中文 → UI 更新
  - [ ] 切換到簡體中文 → UI 更新 (如果可用)
  - [ ] 切換到其他語言 → 驗證翻譯完整性

- [ ] **爬蟲面板國際化**
  - [ ] 英文: "Website URL", "Start Crawling" 等
  - [ ] 繁體中文: "網站 URL", "開始爬蟲" 等
  - [ ] 驗證錯誤訊息翻譯
  - [ ] 驗證幫助文本翻譯

### 性能檢查清單

- [ ] **小型文件** (<10KB)
  - [ ] 上傳時間: <10 秒
  - [ ] 處理時間: <30 秒
  - [ ] 查詢響應: <2 秒

- [ ] **中型文件** (100-500KB)
  - [ ] 上傳時間: <30 秒
  - [ ] 處理時間: 30-120 秒
  - [ ] 查詢響應: 2-5 秒

- [ ] **網站爬蟲** (簡單網站)
  - [ ] 爬蟲時間: <30 秒
  - [ ] 內容提取: 完整
  - [ ] Token 估計: 準確

---

## 📊 性能基準

### 預期的處理時間

| 場景 | 文件大小 | 處理時間 | 備註 |
|------|---------|---------|------|
| 小型 TXT | <10KB | 10-15 秒 | 簡單文本 |
| 小型 PDF | 50-100KB | 20-30 秒 | 結構化文件 |
| 中型文檔 | 100-500KB | 30-120 秒 | 多頁文檔 |
| 大型文檔 | 1-5MB | 2-5 分鐘 | 完整書籍 |
| 簡單網站 | <50 頁 | 15-30 秒 | 小型網站 |
| 中型網站 | 50-200 頁 | 30-120 秒 | 標準網站 |
| 大型網站 | 200+ 頁 | 2-5 分鐘 | 大型站點 |

### Query 性能

| 查詢類型 | 響應時間 | 結果質量 |
|---------|---------|--------|
| 簡單 | <2 秒 | 優秀 |
| 複雜 | 2-5 秒 | 良好 |
| 多輪對話 | <3 秒/輪 | 優秀 |

---

## 🐛 常見問題

### Q1: 前端無法訪問
**A**: 檢查 http://localhost:5174 (注意不是 5173)

### Q2: 後端返回 500 錯誤
**A**: 檢查後端日誌:
```bash
docker logs rag-chatbot-backend
```

### Q3: 爬蟲返回空結果
**A**: 驗證 URL 有效且網站可訪問

### Q4: 查詢沒有返回答案
**A**: 確保文件已上傳並處理完成

### Q5: Token 超過限制
**A**: 減少 Token 限制滑塊值或上傳較小的文檔

---

## 📲 API 測試

### 快速 API 測試 (使用 Swagger UI)

1. 訪問: http://localhost:8000/docs
2. 展開 API 端點
3. 點擊 "Try it out"
4. 填入參數
5. 點擊 "Execute"

### 手動 API 測試示例

```powershell
# 1. 建立 Session
$response = Invoke-WebRequest -Uri "http://localhost:8000/session" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body '{"language": "en"}'
$sessionId = ($response.Content | ConvertFrom-Json).session_id
Write-Host "Session ID: $sessionId"

# 2. 上傳文件
$filePath = "C:\path\to\document.pdf"
$uri = "http://localhost:8000/upload/$sessionId/file"
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
# 使用 multipart/form-data 上傳

# 3. 查詢
$queryBody = @{
    query = "Tell me about the document"
    top_k = 3
} | ConvertTo-Json

$queryResponse = Invoke-WebRequest -Uri "http://localhost:8000/query/$sessionId" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $queryBody
```

---

## 🎯 測試報告模板

創建 `TEST_REPORT.md` 來記錄你的測試結果:

```markdown
# 使用者測試報告

**測試日期**: [日期]  
**測試人員**: [你的名字]  
**環境**: Windows, Docker, Node.js 24.11.1  
**總體評分**: [5/5 ⭐]

## ✅ 通過的測試
- [ ] 基本功能
- [ ] 網站爬蟲
- [ ] 多語言

## ⚠️ 發現的問題
1. [問題描述]
   - 嚴重程度: 低/中/高
   - 重現步驟: ...
   - 預期行為: ...

## 💡 改進建議
1. [建議 1]
2. [建議 2]

## 📊 性能測試結果
- 小型文件: 實際 [X] 秒 vs 預期 <30 秒 ✅
- 查詢響應: 實際 [X] 秒 vs 預期 <5 秒 ✅

## 整體反饋
[你的反饋...]
```

---

## 📞 獲取幫助

### 診斷信息

如果遇到問題，收集診斷信息:

```bash
# 1. 查看容器狀態
docker ps -a

# 2. 查看容器日誌
docker logs rag-chatbot-backend
docker logs rag-chatbot-qdrant

# 3. 測試連接
Invoke-WebRequest -Uri http://localhost:8000/health
Invoke-WebRequest -Uri http://localhost:6333

# 4. 查看系統資源
docker stats

# 5. 保存日誌用於報告
docker logs rag-chatbot-backend > backend.log 2>&1
docker logs rag-chatbot-qdrant > qdrant.log 2>&1
```

---

## ✨ 準備完成！

你的環境已完全就緒進行使用者測試。

### 下一步:
1. **打開瀏覽器**: http://localhost:5174
2. **建立第一個 Session**
3. **按照檢查清單進行測試**
4. **記錄任何問題或反饋**
5. **使用報告模板提交反饋**

**祝你測試愉快！** 🎉

---

**文檔建立時間**: 2025-12-19  
**最後更新**: 2025-12-19 14:30 UTC  
**版本**: 1.0

