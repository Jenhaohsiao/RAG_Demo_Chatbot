# Docker 部署指南

本指南說明如何使用 Docker 部署 RAG Demo Chatbot，包含本地開發和雲端部署兩種模式。

## 🎯 兩種部署模式

### 模式比較

| 模式 | Qdrant 位置 | 適用場景 | 指令 |
|------|------------|---------|------|
| **本地開發** | Docker 容器 | 開發測試、離線環境 | `docker-compose --profile local up` |
| **雲端部署** | Qdrant Cloud | 生產環境、Render/AWS/GCP | `docker-compose up backend` |

---

## 🐳 模式 1: 本地開發（使用本地 Qdrant）

適合完全離線的開發環境。

### 配置

1. **更新 .env 文件**：
```env
QDRANT_MODE=docker
QDRANT_HOST=qdrant
QDRANT_PORT=6333
```

2. **啟動完整堆疊**：
```powershell
# 啟動 Qdrant + Backend
docker-compose --profile local up

# 或背景執行
docker-compose --profile local up -d
```

3. **驗證服務**：
```powershell
# 檢查容器狀態
docker-compose ps

# 測試 Qdrant
Invoke-WebRequest -Uri http://localhost:6333 -UseBasicParsing

# 測試 Backend
Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing
```

### 管理命令

```powershell
# 查看日誌
docker-compose logs -f backend
docker-compose logs -f qdrant

# 重啟服務
docker-compose restart backend

# 停止所有服務
docker-compose down

# 停止並清除資料
docker-compose down -v
```

---

## ☁️ 模式 2: 雲端部署（使用 Qdrant Cloud）

適合生產環境部署，**推薦用於 Render.com 等雲端平台**。

### 配置

1. **設定 Qdrant Cloud**（參考 [QDRANT_CLOUD_SETUP.md](QDRANT_CLOUD_SETUP.md)）

2. **更新 .env 文件**：
```env
QDRANT_MODE=cloud
QDRANT_URL=https://your-cluster-id.region.cloud.qdrant.io
QDRANT_API_KEY=your_api_key_here
```

3. **只啟動 Backend**：
```powershell
# 不啟動 Qdrant 容器
docker-compose up backend

# 或背景執行
docker-compose up -d backend
```

### 優點

- ✅ 不需要管理本地 Qdrant 容器
- ✅ 資料自動備份和高可用性
- ✅ 適合微服務架構
- ✅ 減少容器資源使用

---

## 🔨 建置 Docker Image

### 建置 Backend Image

```powershell
# 建置映像檔
docker build -t rag-chatbot-backend:latest ./backend

# 測試建置的映像檔
docker run -p 8000:8000 --env-file ./backend/.env rag-chatbot-backend:latest
```

### 建置並推送到 Registry（用於生產部署）

```powershell
# 標記映像檔
docker tag rag-chatbot-backend:latest your-registry/rag-chatbot-backend:v1.0

# 推送到 Docker Hub
docker push your-registry/rag-chatbot-backend:v1.0

# 推送到 GitHub Container Registry
docker tag rag-chatbot-backend:latest ghcr.io/jenhaohsiao/rag-chatbot:latest
echo $GITHUB_TOKEN | docker login ghcr.io -u jenhaohsiao --password-stdin
docker push ghcr.io/jenhaohsiao/rag-chatbot:latest
```

---

## 🚀 部署到 Render.com

Render.com 會自動從 GitHub 建置 Docker 映像檔，**不需要 docker-compose.yml**。

### 使用 Dockerfile 部署

Render 會自動偵測 `backend/Dockerfile` 並建置。

### Render 環境變數設定

在 Render Dashboard 設定：

```env
# Qdrant Cloud
QDRANT_MODE=cloud
QDRANT_URL=https://your-cluster-id.europe-west3-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=your_api_key

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash-exp

# 其他配置
ENABLE_CONTENT_MODERATION=true
```

### render.yaml 配置

```yaml
services:
  - type: web
    name: rag-chatbot-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    envVars:
      - key: QDRANT_MODE
        value: cloud
      - key: QDRANT_URL
        sync: false  # 在 Dashboard 設定
      - key: QDRANT_API_KEY
        sync: false  # 在 Dashboard 設定
```

---

## 📊 資源使用

### 本地開發模式

| 服務 | 記憶體 | CPU | 儲存 |
|------|-------|-----|------|
| Qdrant | ~200MB | 0.1-0.5 | 取決於資料量 |
| Backend | ~150MB | 0.1-0.3 | 最小 |
| **總計** | **~350MB** | **0.2-0.8** | |

### 雲端部署模式

| 服務 | 記憶體 | CPU | 儲存 |
|------|-------|-----|------|
| Backend | ~150MB | 0.1-0.3 | 最小 |

> 💡 雲端模式節省約 200MB 記憶體

---

## 🔄 從本地切換到雲端

### 步驟

1. **設定 Qdrant Cloud**
   ```powershell
   # 參考 QDRANT_CLOUD_SETUP.md
   ```

2. **更新環境變數**
   ```env
   # .env
   QDRANT_MODE=cloud
   QDRANT_URL=https://...
   QDRANT_API_KEY=...
   ```

3. **停止本地服務**
   ```powershell
   docker-compose down
   ```

4. **啟動雲端模式**
   ```powershell
   docker-compose up backend
   ```

5. **重新上傳文件**
   - 本地 Qdrant 的資料不會自動遷移
   - 需要透過前端重新上傳文件

---

## 🛠️ 疑難排解

### 問題 1: Qdrant 容器無法啟動

**解決方法**：
```powershell
# 檢查日誌
docker-compose logs qdrant

# 重新建立容器
docker-compose down -v
docker-compose --profile local up
```

### 問題 2: Backend 無法連線到 Qdrant Cloud

**檢查清單**：
- [ ] `QDRANT_MODE=cloud`
- [ ] `QDRANT_URL` 正確（包含 `https://` 和 port）
- [ ] `QDRANT_API_KEY` 正確
- [ ] Qdrant Cluster 狀態為 "Running"

### 問題 3: Docker 映像檔太大

**優化建議**：
```dockerfile
# 使用更小的基礎映像檔
FROM python:3.11-slim

# 清理快取
RUN pip install --no-cache-dir -r requirements.txt
```

---

## 📚 相關文件

- [QDRANT_CLOUD_SETUP.md](QDRANT_CLOUD_SETUP.md) - Qdrant Cloud 設定
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 完整部署指南
- [qdrant-setup-guide.md](qdrant-setup-guide.md) - Qdrant 設定總覽

---

## ✅ 檢查清單

### 本地開發

- [ ] Docker Desktop 已安裝並運行
- [ ] `.env` 設定為 `QDRANT_MODE=docker`
- [ ] 執行 `docker-compose --profile local up`
- [ ] 訪問 http://localhost:8000/health 確認運行

### 雲端部署

- [ ] Qdrant Cloud Cluster 已創建
- [ ] `.env` 設定為 `QDRANT_MODE=cloud`
- [ ] 執行 `docker-compose up backend`
- [ ] 測試連線成功

---

**最後更新**: 2026-01-21  
**適用版本**: RAG Demo Chatbot v1.0+
