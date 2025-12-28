# RAG Demo Chatbot 文檔

**專案**: Multilingual RAG-Powered Chatbot  
**分支**: `001-multilingual-rag-chatbot`  
**最後更新**: 2025-12-15

---

## 📚 文檔導覽

| 文檔 | 用途 | 適用對象 |
|------|------|----------|
| [🚀 快速開始](QUICK_START_GUIDE.md) | 5分鐘啟動完整系統 | 所有用戶 |
| [📈 項目進度](PROGRESS.md) | 功能完成狀態與系統概覽 | 項目管理 |
| [🔧 故障排除](TROUBLESHOOTING_GUIDE.md) | 常見問題解決 | 所有用戶 |
| [👥 用戶測試](USER_TESTING_SETUP.md) | 測試環境設置 | 測試人員 |
| [🛡️ 內容審核測試](CONTENT_MODERATION_TEST_GUIDE.md) | 安全功能測試指南 | 開發者 |
| [🕷️ 網站爬蟲功能](WEBSITE_CRAWLER_FEATURE.md) | 網站爬蟲完整指南 | 開發者 |
| [📊 相似度閾值](SIMILARITY_THRESHOLD_FEATURE.md) | RAG精度控制功能 | 開發者 |
| [📋 工作流程指南](WORKFLOW_STEPPER_GUIDE.md) | 6步驟RAG流程說明 | 用戶 |

---

## 🚀 快速開始

### 1️⃣ 啟動系統 (如果未運行)
```powershell
cd C:\Projects\AI_projects\RAG_Demo_Chatbot
docker-compose up -d  # 啟動所有服務
docker ps  # 驗證容器運行中
```
**系統需求**: Python 3.14, Docker, Node.js

### 2️⃣ 設定 API Key
在 `backend/.env` 中設定：
```bash
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 3️⃣ 檢查後端狀態
```powershell
# 後端已在 Docker 中運行
docker ps  # 確認 rag-chatbot-backend 和 rag-chatbot-qdrant 運行中
curl http://localhost:8000/health  # 檢查健康狀態
```
✅ 看到 `{"status":"healthy"}` → 後端正常運行

### 4️⃣ 啟動前端 (終端)
```powershell
cd frontend
npm run dev
```
✅ 看到 "Local: http://localhost:5175" → 前端已啟動

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