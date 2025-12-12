# 前後端整合測試指南

**更新日期**: 2025-12-11  
**測試環境**: Windows 10/11 + Python 3.12 + Node.js 18+

---

## 📋 前置條件檢查清單

### 系統需求
- [ ] Python 3.12 已安裝 (`py -3.12 --version`)
- [ ] Node.js 18+ 已安裝 (`node --version`)
- [ ] npm 已安裝 (`npm --version`)
- [ ] Docker Desktop 已安裝且運行中
- [ ] Gemini API key 已設置在 `.env.local`

### Docker Qdrant 檢查
```powershell
# 檢查 Docker 容器狀態
docker ps | findstr qdrant

# 如果沒有運行，啟動 Qdrant
cd C:\Projects\AI_projects\RAG_Demo_Chatbot
docker-compose up -d qdrant

# 驗證連接
curl.exe http://localhost:6333/health
```

### 環境文件檢查
```powershell
# 檢查後端環境變數是否正確
cd C:\Projects\AI_projects\RAG_Demo_Chatbot\backend
type .env.local  # 應包含 GEMINI_API_KEY=sk-...

# 檢查 Docker Qdrant 已配置
findstr QDRANT_MODE .env
# 應顯示: QDRANT_MODE=docker
```

---

## 🚀 啟動程序 (3 個終端)

### 終端 1: 後端伺服器

```powershell
cd C:\Projects\AI_projects\RAG_Demo_Chatbot\backend

# 確保依賴已安裝
py -3.12 -m pip install -r requirements.txt -q

# 啟動伺服器
py -3.12 -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload

# 預期輸出:
# INFO:     Started server process [XXXX]
# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

**重要**: 不要關閉或中斷此終端。保持伺服器運行。

### 終端 2: 前端開發伺服器

```powershell
cd C:\Projects\AI_projects\RAG_Demo_Chatbot\frontend

# 確保依賴已安裝
npm install

# 啟動開發伺服器
npm run dev

# 預期輸出:
# VITE v5.X.X  ready in XXX ms
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

### 終端 3: 監視/測試 (保持備用)

```powershell
# 用於執行額外命令，例如手動測試
# 參見下方「手動測試場景」
```

---

## 🧪 手動測試場景

### 場景 1: 檢查後端健康狀態

```powershell
# 在終端 3 中執行
curl.exe -s http://localhost:8000/health | ConvertFrom-Json | Format-Table

# 預期結果:
# status      gemini_model
# ------      ---------
# healthy     gemini-1.5-flash
```

### 場景 2: 完整的使用者流程測試

#### 2A. 開啟前端應用
1. 打開瀏覽器訪問 http://localhost:5173/
2. 應該看到:
   - ✅ Header with "RAG Demo Chatbot" 標題
   - ✅ Language Selector (下拉菜單)
   - ✅ "Create Session" 提示或自動建立 session

#### 2B. 建立 Session
- 點擊「Create Session」或自動建立
- 預期: 獲得 Session ID（在標題欄或狀態中顯示）

#### 2C. 測試語言切換
1. 點擊 Language Selector
2. 選擇不同語言（英文、中文、日文等）
3. 驗證:
   - ✅ UI 文本立即更新
   - ✅ 後端接收到 `PUT /api/v1/session/{session_id}/language` 請求
   - ✅ 狀態碼 204

#### 2D. 測試文件上傳 (Phase 4)
1. 應該看到 Upload Screen
2. 測試檔案上傳:

```
選擇模式: "Upload File"
選擇檔案: 任何 .txt 或 .pdf 檔案
檔案大小: < 10MB
預期結果:
  ✅ 檔案上傳進度條顯示
  ✅ 處理階段指示 (Extract → Moderate → Chunk → Embed)
  ✅ 進度從 0% → 100%
  ✅ 完成時顯示 "Upload Complete"
```

3. 驗證後端日誌:
   - ✅ 看到 extraction 日誌
   - ✅ 看到 moderation 日誌
   - ✅ 看到 chunking 日誌
   - ✅ 看到 embedding 日誌
   - ✅ 看到 Qdrant upsert 日誌

#### 2E. 測試 URL 上傳
1. 切換模式到 "Upload URL"
2. 輸入 URL: `https://example.com`
3. 預期: 同樣的處理流程

#### 2F. 測試聊天功能 (Phase 5)
> **注意**: 僅當文件已上傳且 session 狀態為 `READY_FOR_CHAT` 時可用

1. 上傳檔案後，應該自動轉到 Chat Screen
2. 測試查詢:

```
輸入查詢: 根據上傳的文件提出相關問題
範例: "What are the main topics covered?"
預期結果:
  ✅ 查詢被提交
  ✅ 收到 RAG Engine 生成的回應
  ✅ 回應包含引用的文件片段
  ✅ 如無相關文件，返回 "Cannot answer" 訊息
  ✅ 聊天歷史保存
```

3. 驗證後端日誌:
   - ✅ 查詢嵌入日誌
   - ✅ 向量搜尋日誌 (similarity threshold = 0.7)
   - ✅ Gemini API 呼叫日誌
   - ✅ Token 使用統計

---

## 🔍 監視後端日誌

後端伺服器會輸出詳細日誌。監視以下關鍵信息:

```
✅ 啟動成功
2025-12-11 XX:XX:XX - src.main - INFO - Backend startup complete
INFO:     Application startup complete.

✅ Session 建立
POST /api/v1/session/create 201

✅ 文件上傳
POST /api/v1/upload/{session_id}/file 202
Processing document: extract → moderate → chunk → embed → store

✅ 查詢處理
POST /api/v1/chat/{session_id}/query 200
Searching vectors with threshold >= 0.7
Retrieved N chunks from Qdrant
Calling Gemini LLM API

⚠️ 常見警告 (可忽略)
ImportError: sys.meta_path is None  (Python 關閉順序問題)

❌ 錯誤症狀 (需要調查)
- Connection refused to Qdrant (確保 docker-compose up -d qdrant)
- 無法找到 Gemini API key (檢查 .env.local)
- Session not found (確保在前端建立 session)
```

---

## 📊 預期的前後端協作流程

```
前端                              後端
 │                                 │
 ├─→ POST /session/create ────────→ ◆ 建立 session
 │   ◀─────────────────────────── ◀─ 返回 session_id
 │
 ├─→ POST /upload/{session_id}/file ─→ ◆ 檔案上傳
 │   ◀─────────────────────────────── ◀─ 202 Accepted
 │                                    (背景處理)
 │  [輪詢狀態]
 ├─→ GET /upload/{session_id}/status/{doc_id}
 │   ◀─────────────────────────────── ◀─ 進度: 0-100%
 │                                    
 │  [上傳完成]
 │
 ├─→ POST /chat/{session_id}/query ──→ ◆ 提交查詢
 │   ◀─────────────────────────────── ◀─ RAG 結果
 │
 ├─→ GET /chat/{session_id}/history ─→ ◆ 取得對話歷史
 │   ◀─────────────────────────────── ◀─ 訊息列表
 │
 └─→ POST /session/{session_id}/close ─→ ◆ 關閉 session
     ◀─────────────────────────────── ◀─ 資料已清理
```

---

## ⚙️ 故障排除

### 問題 1: 前端無法連接到後端

**症狀**: 
- 網頁無法載入
- 前端終端看不到 "Application startup complete"

**解決方案**:
```powershell
# 檢查後端伺服器是否真的在運行
netstat -an | findstr 8000

# 檢查防火牆
# Windows Defender 防火牆 → 允許應用通過防火牆 → 確保 Python 允許

# 手動測試連接
curl.exe http://localhost:8000/health
```

### 問題 2: 上傳檔案時卡住

**症狀**:
- 進度條停滯在某個百分比
- 後端伺服器停止回應

**解決方案**:
```powershell
# 檢查 Qdrant 連接
curl.exe http://localhost:6333/health

# 檢查後端是否因 Qdrant 超時而卡住
# 查看後端日誌是否有「Qdrant connection timeout」

# 重啟 Qdrant
docker restart rag-chatbot-qdrant
```

### 問題 3: Gemini API 調用失敗

**症狀**:
- 聊天查詢返回錯誤
- 後端日誌顯示「Invalid API key」

**解決方案**:
```powershell
# 驗證 API key
cat .env.local | findstr GEMINI_API_KEY

# 確保 key 有效
# 可以在 Gemini API 控制台測試: https://ai.google.dev/

# 如果 key 無效，更新它
$env:GEMINI_API_KEY = "your-new-key"
```

### 問題 4: 聊天功能不可用

**症狀**:
- Chat Screen 不顯示
- 按鈕被禁用

**檢查**:
```powershell
# 確保:
# 1. 檔案已成功上傳 (狀態 = COMPLETED)
# 2. Session 狀態 = READY_FOR_CHAT
# 3. 向量已存儲在 Qdrant 中

# 驗證 Qdrant 中的集合
curl.exe http://localhost:6333/collections
```

---

## 📝 測試檢查清單

使用此清單跟蹤測試進度:

```
□ 後端伺服器啟動成功
□ 前端應用載入成功
□ 能夠建立 session
□ 能夠更改語言
□ 能夠上傳 .txt 檔案
□ 能夠上傳 PDF 檔案
□ 能夠上傳 URL
□ 文件處理進度正確顯示
□ 文件完成後可見
□ 能夠提交聊天查詢
□ 聊天查詢返回正確結果
□ 能夠查看聊天歷史
□ 能夠關閉 session
□ 後端日誌無錯誤
□ 前端控制台無錯誤
```

---

## 📞 聯絡與支援

如遇到問題，請檢查:
1. **後端日誌**: 終端 1 輸出
2. **前端日誌**: 瀏覽器開發者工具 (F12) → Console
3. **網路請求**: 瀏覽器開發者工具 → Network 標籤

---

**祝測試順利！** 🎉
