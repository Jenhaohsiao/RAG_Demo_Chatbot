# 轉換到 Qdrant Cloud - 快速參考

本專案已成功設定為使用 Qdrant Cloud 雲端免費版進行部署。

## ✅ 已完成的變更

### 1. 配置文件更新
- ✅ [backend/.env.example](../backend/.env.example) - 將雲端模式設為預設範例
- ✅ [backend/src/core/config.py](../backend/src/core/config.py) - 預設模式改為 `cloud`
- ✅ [docs/qdrant-setup-guide.md](qdrant-setup-guide.md) - 更新為優先推薦雲端模式

### 2. 新增文件
- ✅ [docs/QDRANT_CLOUD_SETUP.md](QDRANT_CLOUD_SETUP.md) - 完整的雲端設定指南

## 🚀 下一步操作

### 步驟 1: 設定 Qdrant Cloud

1. **註冊帳號**
   - 前往 https://cloud.qdrant.io/
   - 使用 GitHub 或 Email 註冊

2. **創建 Cluster**
   - Plan: 選擇 **Free** (1 GB)
   - Region: 選擇最近的區域
   - Name: `rag-chatbot-cluster`

3. **取得連線資訊**
   - 複製 **Cluster URL**
   - 創建並複製 **API Key**

📖 詳細步驟請參考: [QDRANT_CLOUD_SETUP.md](QDRANT_CLOUD_SETUP.md)

### 步驟 2: 配置本地環境

創建或更新 `backend/.env` 檔案：

```env
# Qdrant Cloud Configuration
QDRANT_MODE=cloud
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your_api_key_here

# 其他必要配置
GEMINI_API_KEY=your_gemini_api_key_here
ENABLE_CONTENT_MODERATION=True
```

### 步驟 3: 測試本地連線

```powershell
# 啟動後端
cd backend
python run_server.py

# 檢查日誌確認連線成功
# 應該看到: "Qdrant client initialized in cloud mode"
```

### 步驟 4: 配置部署平台（Render.com）

在 Render Dashboard 中設定環境變數：

| 變數名稱 | 值 |
|---------|---|
| `QDRANT_MODE` | `cloud` |
| `QDRANT_URL` | 您的 Cluster URL |
| `QDRANT_API_KEY` | 您的 API Key |
| `GEMINI_API_KEY` | 您的 Gemini API Key |

## 📋 配置對照表

### 開發環境 vs 生產環境

| 環境 | 模式 | 配置檔案 | 資料儲存 |
|------|------|---------|---------|
| **本地開發** | `docker` | `.env` | 本機 Docker Volume |
| **生產部署** | `cloud` | Render Dashboard | Qdrant Cloud |

### 模式切換

**本地開發 (Docker)**:
```env
QDRANT_MODE=docker
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

**生產部署 (Cloud)**:
```env
QDRANT_MODE=cloud
QDRANT_URL=https://xxxxx.cloud.qdrant.io:6333
QDRANT_API_KEY=xxxxx
```

## 🔄 遷移注意事項

### 從 Docker 遷移到 Cloud

⚠️ **重要**: Docker 本地資料無法直接遷移到雲端

您需要：
1. ✅ 在雲端環境重新上傳所有文件
2. ✅ 使用相同的文件進行測試
3. ✅ 驗證問答功能正常

### 資料保留

- **Docker Mode**: 資料儲存在本機 Docker Volume (`qdrant_storage`)
- **Cloud Mode**: 資料儲存在 Qdrant Cloud (1 GB 免費空間)

## 🔒 安全檢查清單

- [ ] `.env` 和 `.env.local` 已加入 `.gitignore`
- [ ] API Keys 不在版本控制中
- [ ] 生產環境使用 Render Dashboard 設定環境變數
- [ ] API Key 僅授予必要權限 (Read + Write)

## 📊 免費版限制

Qdrant Cloud 免費版提供：
- ✅ 1 GB 儲存空間
- ✅ 0.5 GB 記憶體
- ✅ 約 100,000 個向量
- ✅ 無限請求數
- ✅ 1 個 Cluster

> 💡 對於測試和小型專案已經足夠使用

## 🆘 疑難排解

### 常見問題

**Q1: 連線失敗 - Connection timeout**
- 檢查 `QDRANT_URL` 格式（需包含 `https://` 和 `:6333`）
- 確認 Cluster 狀態為 "Running"
- 檢查網路連線

**Q2: API Key 無效**
- 重新創建 API Key
- 確認權限設定 (Read + Write)
- 檢查環境變數拼寫

**Q3: 之前的資料消失了**
- 這是正常的，Docker 和 Cloud 是不同的資料庫
- 需要重新上傳文件

## 📚 相關文件

- [QDRANT_CLOUD_SETUP.md](QDRANT_CLOUD_SETUP.md) - 完整雲端設定指南
- [qdrant-setup-guide.md](qdrant-setup-guide.md) - Qdrant 設定總覽
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 完整部署指南
- [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) - 快速開始指南

## 🎯 驗證清單

完成以下檢查確保設定正確：

- [ ] 已註冊 Qdrant Cloud 帳號
- [ ] 已創建免費 Cluster
- [ ] 已取得 Cluster URL 和 API Key
- [ ] 已更新 `backend/.env` 配置
- [ ] 本地測試連線成功
- [ ] 已在 Render Dashboard 設定環境變數
- [ ] 部署後測試成功

---

**最後更新**: 2026-01-21  
**相關 PR**: #3 - 001 multilingual rag chatbot
