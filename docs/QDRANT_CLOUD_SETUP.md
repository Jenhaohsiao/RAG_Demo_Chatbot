# Qdrant Cloud 設定指南

本指南將協助您設定 Qdrant Cloud 免費版，用於部署 RAG Demo Chatbot。

## 📋 前置準備

- 有效的電子郵件帳號
- GitHub 帳號（可選，用於快速註冊）

---

## 🚀 步驟 1: 註冊 Qdrant Cloud 帳號

### 方法 1: 使用 GitHub 快速註冊

1. 前往 [Qdrant Cloud](https://cloud.qdrant.io/)
2. 點擊 **"Sign up with GitHub"**
3. 授權 Qdrant 存取您的 GitHub 帳號
4. 完成註冊

### 方法 2: 使用電子郵件註冊

1. 前往 [Qdrant Cloud](https://cloud.qdrant.io/)
2. 點擊 **"Sign up"**
3. 輸入您的電子郵件和密碼
4. 驗證電子郵件
5. 完成註冊

---

## 🗄️ 步驟 2: 創建 Cluster

1. 登入 Qdrant Cloud 後，點擊 **"Create Cluster"**

2. 選擇方案：
   - **Plan**: 選擇 **"Free"** (1 GB 儲存空間，足夠測試和小型專案)
   - **Region**: 選擇最接近您的區域（例如：`us-east-1`, `eu-west-1`, `asia-southeast-1`）
   - **Cluster Name**: 輸入有意義的名稱（例如：`rag-chatbot-cluster`）

3. 點擊 **"Create"** 並等待 Cluster 啟動（通常需要 1-2 分鐘）

---

## 🔑 步驟 3: 取得連線資訊

### 3.1 取得 Cluster URL

1. 在 Cluster 列表中，點擊您剛創建的 Cluster
2. 複製 **"Cluster URL"**（格式類似：`https://xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.us-east-1-0.aws.cloud.qdrant.io:6333`）
3. **儲存此 URL**，稍後需要設定在環境變數中

### 3.2 創建 API Key

1. 在 Cluster 詳情頁面，點擊 **"API Keys"** 分頁
2. 點擊 **"Create API Key"**
3. 輸入 API Key 名稱（例如：`rag-chatbot-key`）
4. 設定權限：
   - ✅ **Read** (必須)
   - ✅ **Write** (必須)
5. 點擊 **"Create"**
6. **立即複製並儲存 API Key**（只會顯示一次！）

> ⚠️ **重要**: API Key 只會在創建時顯示一次，請務必儲存在安全的地方

---

## ⚙️ 步驟 4: 配置本地環境

### 4.1 更新 `.env` 檔案

在專案的 `backend/` 目錄下創建或更新 `.env` 檔案：

```env
# Qdrant Cloud Configuration
QDRANT_MODE=cloud
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your_api_key_here

# 其他必要配置
GEMINI_API_KEY=your_gemini_api_key_here
```

> 💡 **提示**: 將 `QDRANT_URL` 和 `QDRANT_API_KEY` 替換為您在步驟 3 取得的實際值

### 4.2 驗證連線

啟動後端伺服器並檢查日誌：

```powershell
cd backend
python run_server.py
```

您應該看到：
```
INFO: Qdrant client initialized in cloud mode (https://xxxxx.cloud.qdrant.io:6333)
```

---

## 🚢 步驟 5: 配置部署平台（Render.com）

如果您使用 Render.com 部署：

1. 登入 [Render Dashboard](https://dashboard.render.com/)
2. 選擇您的服務
3. 前往 **"Environment"** 設定
4. 添加以下環境變數：

| Key | Value | 說明 |
|-----|-------|------|
| `QDRANT_MODE` | `cloud` | 使用雲端模式 |
| `QDRANT_URL` | `https://your-cluster-id...` | 您的 Cluster URL |
| `QDRANT_API_KEY` | `your_api_key` | 您的 API Key |

5. 點擊 **"Save Changes"** 並重新部署

---

## ✅ 步驟 6: 測試連線

### 6.1 透過 API 測試

```powershell
# 測試健康檢查端點
Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing

# 應該返回：
# {"status": "healthy", ...}
```

### 6.2 上傳測試文件

透過前端介面上傳一個測試文件，確認：
- ✅ 文件成功上傳
- ✅ 可以進行問答
- ✅ 回答基於上傳的文件內容

---

## 📊 免費版限制

Qdrant Cloud 免費版提供：

| 項目 | 限制 |
|------|------|
| **儲存空間** | 1 GB |
| **記憶體** | 0.5 GB |
| **向量數量** | 約 100,000 個向量 (取決於維度) |
| **請求數** | 無限制 |
| **Cluster 數量** | 1 個 |

> 💡 對於測試和小型專案來說，免費版已經足夠使用

---

## 🔄 從 Docker 遷移到雲端

如果您之前使用 Docker 本地版，需要重新上傳所有文件：

1. **停止本地 Docker 容器**：
   ```powershell
   docker-compose down
   ```

2. **清除本地向量資料**（可選）：
   ```powershell
   docker volume rm rag_demo_chatbot_qdrant_storage
   ```

3. **更新 `.env` 配置為雲端模式**（如步驟 4）

4. **重新啟動應用程式**並上傳文件

> ⚠️ **注意**: Docker 本地資料無法直接遷移到雲端，需要重新上傳文件

---

## 🛠️ 疑難排解

### 問題 1: 連線失敗

**錯誤訊息**:
```
Failed to connect to Qdrant Cloud: Connection timeout
```

**解決方法**:
- ✅ 確認 `QDRANT_URL` 格式正確（包含 `https://` 和端口 `:6333`）
- ✅ 確認 API Key 正確無誤
- ✅ 檢查 Cluster 狀態是否為 "Running"
- ✅ 確認網路連線正常

### 問題 2: API Key 無效

**錯誤訊息**:
```
Authentication failed: Invalid API key
```

**解決方法**:
- ✅ 重新創建 API Key
- ✅ 確認 API Key 有 Read 和 Write 權限
- ✅ 檢查環境變數是否正確設定

### 問題 3: 儲存空間不足

**錯誤訊息**:
```
Storage limit exceeded
```

**解決方法**:
- ✅ 刪除不必要的 Collection
- ✅ 減少文件數量或大小
- ✅ 考慮升級到付費方案

---

## 🔒 安全最佳實踐

1. **永遠不要將 API Key 提交到 Git**
   ```gitignore
   # .gitignore 應該包含
   .env
   .env.local
   .env.*.local
   ```

2. **使用環境變數**
   - 本地開發：使用 `.env` 檔案
   - 生產環境：使用平台的環境變數設定（如 Render Dashboard）

3. **定期輪換 API Key**
   - 每 3-6 個月更換一次
   - 懷疑洩露時立即更換

4. **限制 API Key 權限**
   - 只授予必要的權限（Read/Write）
   - 避免授予 Admin 權限

---

## 📚 相關資源

- [Qdrant Cloud 官方文件](https://qdrant.tech/documentation/cloud/)
- [Qdrant API 參考](https://qdrant.tech/documentation/api-reference/)
- [價格方案比較](https://qdrant.tech/pricing/)
- [Qdrant Discord 社群](https://discord.gg/qdrant)

---

## 📞 需要協助？

如果遇到任何問題：

1. 查看 [Qdrant 官方文件](https://qdrant.tech/documentation/)
2. 檢查 [GitHub Issues](https://github.com/Jenhaohsiao/RAG_Demo_Chatbot/issues)
3. 加入 [Qdrant Discord](https://discord.gg/qdrant) 尋求社群協助

---

**最後更新**: 2026-01-21  
**適用版本**: RAG Demo Chatbot v1.0+
