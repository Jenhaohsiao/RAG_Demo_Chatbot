# RAG Demo Chatbot 文檔

**專案**: Multilingual RAG-Powered Chatbot  
**分支**: `001-multilingual-rag-chatbot`  
**最後更新**: 2025-12-15

---

## 📚 文檔導覽

| 文檔 | 用途 | 適用對象 |
|------|------|----------|
| [🚀 快速開始](#快速開始) | 5分鐘啟動完整系統 | 所有用戶 |
| [⚙️ 環境設置](#環境設置) | 詳細設置說明 | 開發者 |
| [📊 功能說明](#功能說明) | Metrics Dashboard 指南 | 用戶 |
| [🔧 故障排除](#故障排除) | 常見問題解決 | 所有用戶 |
| [📈 進度追蹤](#進度追蹤) | 專案開發進度 | 項目管理 |

---

## 🚀 快速開始

### 1️⃣ 啟動 Qdrant (如果未運行)
```powershell
cd C:\Projects\AI_projects\RAG_Demo_Chatbot
docker-compose up -d qdrant
docker ps | findstr qdrant  # 驗證運行中
```

### 2️⃣ 設定 API Key
在 `backend/.env` 中設定：
```bash
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 3️⃣ 啟動後端 (終端 1)
```powershell
cd backend
py -3.12 -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```
✅ 看到 "Application startup complete" → 後端已啟動

### 4️⃣ 啟動前端 (終端 2)
```powershell
cd frontend
npm install  # 第一次需要
npm run dev
```
✅ 看到 "Local: http://localhost:5173" → 前端已啟動

### 5️⃣ 開始使用
- 瀏覽器打開: **http://localhost:5173**
- 系統會自動建立新 session
- 點擊「開始」按鈕開始使用

---

## ⚙️ 環境設置

### Qdrant 設置
- **推薦**: Docker Mode (避免 Windows 檔案鎖定問題)
- **端口**: 6333
- **健康檢查**: `http://localhost:6333/health`

詳細說明: [qdrant-setup-guide.md](qdrant-setup-guide.md)

### 前後端整合測試
包含完整的故障排除指南和環境驗證步驟。

詳細說明: [FRONTEND_BACKEND_TESTING.md](FRONTEND_BACKEND_TESTING.md)

---

## 📊 功能說明

### Metrics Dashboard
實時顯示系統性能指標：
- 🔋 Token 使用量 (總計/輸入/輸出/平均)
- 📊 查詢統計 (總數/已回答/未回答)
- 📄 文檔狀態 (數量/處理狀態)
- ⏱️ 性能指標 (平均響應時間)

詳細說明: [METRICS_DASHBOARD_GUIDE.md](METRICS_DASHBOARD_GUIDE.md)

---

## 🔧 故障排除

### 常見問題
1. **後端 404 錯誤** → 檢查 Python 依賴和路由註冊
2. **Qdrant 連接失敗** → 確認 Docker 容器運行中
3. **前端代理錯誤** → 檢查 Vite 配置和後端狀態
4. **API Key 錯誤** → 確認 `.env` 檔案設置

詳細說明: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)

---

## 📈 進度追蹤

### 已完成階段
- ✅ **Phase 1**: 專案初始化 (10/10)
- ✅ **Phase 2**: 基礎架構 (20/20) - 測試通過 11/11
- ✅ **Phase 3**: Session Management (17/17) - 測試通過 1/1  
- ✅ **Phase 4**: Document Upload (16/16) - 測試通過 1/1
- ✅ **Phase 5**: RAG Query (12/12) - 測試部分通過 4/15

### 測試狀態
- **自動化測試**: Phase 2-4 全部通過 (100%)
- **Phase 5**: 需要修復 11 個測試案例
- **前後端整合**: ✅ 可正常使用

詳細說明: [PROGRESS.md](PROGRESS.md)

---

## 🎯 使用流程

1. **建立 Session** → 自動創建並分配 UUID
2. **上傳文檔** → 支援 PDF、文字檔、URL
3. **文檔處理** → 自動萃取、審核、分塊、嵌入
4. **RAG 查詢** → 基於文檔內容的語義搜索和回答
5. **多語言支援** → 7 種語言無縫切換
6. **Metrics 監控** → 實時查看系統性能

---

**聯絡**: 如有問題請查看故障排除指南或檢查相關文檔。