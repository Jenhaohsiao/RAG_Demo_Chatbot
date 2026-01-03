# Qdrant Setup Guide

## ⚠️ Windows 使用者重要提示

**Embedded Mode 在 Windows 上有已知問題**：
- 檔案鎖定機制導致無法重複啟動伺服器
- `.lock` 檔案即使程序終止也無法釋放
- **強烈建議使用 Docker Mode**

---

## 🐳 方案 1: Docker Mode（推薦）

### 優點
- ✅ 無檔案鎖定問題
- ✅ 資料持久化
- ✅ 易於管理和重啟
- ✅ 符合生產環境標準

### 設定步驟

#### 1. 安裝 Docker Desktop
- 下載：https://www.docker.com/products/docker-desktop
- 安裝後啟動 Docker Desktop

#### 2. 啟動 Qdrant 容器
```powershell
# 從專案根目錄執行
cd C:\Projects\AI_projects\RAG_Demo_Chatbot
docker-compose up -d qdrant
```

#### 3. 驗證容器運行
```powershell
# 檢查容器狀態
docker ps

# 應該看到類似輸出：
# CONTAINER ID   IMAGE                  STATUS         PORTS
# abc123def456   qdrant/qdrant:latest   Up 2 minutes   0.0.0.0:6333->6333/tcp

# 測試連線
Invoke-WebRequest -Uri http://localhost:6333 -UseBasicParsing
```

#### 4. 更新 .env 配置
```env
QDRANT_MODE=docker
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

#### 5. 啟動後端
```powershell
cd backend
py -3.12 -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

### 管理命令

```powershell
# 停止 Qdrant
docker-compose stop qdrant

# 重啟 Qdrant
docker-compose restart qdrant

# 查看日誌
docker-compose logs -f qdrant

# 完全移除（包含資料）
docker-compose down -v
```

---

## 📁 方案 2: Embedded Mode（不推薦 Windows）

### 僅適用於
- ✅ Linux/macOS 開發環境
- ✅ 快速原型測試
- ✅ CI/CD 測試環境

### Windows 使用限制
- ⚠️ **每次重啟需手動清理**
- ⚠️ **資料無法持久化**（使用臨時路徑）
- ⚠️ **僅用於一次性測試**

### 配置（如果必須使用）
```env
QDRANT_MODE=embedded
```

### 已實作的保護機制
```python
# vector_store.py 會自動檢測 Windows
if platform.system() == "Windows":
    # 使用臨時路徑避免鎖定衝突
    qdrant_path = tempfile.gettempdir() + "/qdrant_{random}"
    logger.warning("Data will not persist across restarts")
```

---

## ☁️ 方案 3: Qdrant Cloud（生產環境）

### 優點
- ✅ 完全託管服務
- ✅ 自動備份和擴展
- ✅ 高可用性

### 設定步驟

#### 1. 建立 Qdrant Cloud 帳號
- https://cloud.qdrant.io/

#### 2. 建立 Cluster

#### 3. 取得憑證
- Cluster URL: `https://your-cluster.qdrant.io`
- API Key: `your-api-key`

#### 4. 更新配置
```env
QDRANT_MODE=cloud
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-api-key
```

**注意**: 將 API Key 放在 `.env.local` 而非 `.env`

---

## 🔧 故障排除

### Docker Mode 問題

**錯誤**: "Cannot connect to Docker daemon"
```powershell
# 解決方法：啟動 Docker Desktop
# Windows: 從開始選單啟動
# 等待 Docker Desktop 完全啟動（系統托盤圖示停止旋轉）
```

**錯誤**: "Port 6333 already in use"
```powershell
# 查找佔用端口的程序
netstat -ano | findstr :6333

# 停止舊容器
docker-compose down
docker ps -a | findstr qdrant
docker rm -f <container-id>
```

### Embedded Mode 問題（Windows）

**錯誤**: "Storage folder is already accessed"
```powershell
# 方法 1: 等待 30 秒後重試
Start-Sleep -Seconds 30

# 方法 2: 重新啟動電腦（釋放所有檔案鎖定）

# 方法 3: 切換到 Docker Mode（推薦）
```

**錯誤**: "Cannot remove qdrant_data folder"
```powershell
# 使用 Process Explorer 找到鎖定檔案的程序
# 下載：https://learn.microsoft.com/sysinternals/downloads/process-explorer
# 搜尋 ".lock" 找到佔用檔案的程序並終止
```

---

## 📋 快速參考

### 開發環境配置矩陣

| 作業系統 | 推薦模式 | 次選 | 不推薦 |
|---------|---------|------|-------|
| Windows | Docker | Cloud | ~~Embedded~~ |
| macOS | Docker | Embedded | - |
| Linux | Docker | Embedded | - |

### 測試環境建議

| 環境 | 模式 | 原因 |
|------|------|------|
| 本地開發 | Docker | 穩定性和資料持久化 |
| CI/CD | Embedded | 快速啟動，無需 Docker |
| Staging | Cloud | 接近生產環境 |
| Production | Cloud | 高可用性和管理便利性 |

---

## 🎯 最佳實踐

### 1. 使用環境變數分離配置
```env
# .env (預設配置，可提交)
QDRANT_MODE=docker
QDRANT_HOST=localhost
QDRANT_PORT=6333

# .env.local (本地覆蓋，不提交)
# 如果要用 embedded mode 測試
QDRANT_MODE=embedded
```

### 2. 日誌監控
```python
# 檢查啟動日誌
logger.info(f"Qdrant client initialized in {settings.qdrant_mode} mode")
```

### 3. 健康檢查
```python
# 在 startup event 中驗證連線
try:
    collections = vector_store.client.get_collections()
    logger.info(f"Qdrant connection verified: {len(collections)} collections")
except Exception as e:
    logger.error(f"Qdrant connection failed: {e}")
    raise
```

### 4. 資料備份（Docker Mode）
```powershell
# 備份 Docker volume
docker run --rm -v rag_demo_chatbot_qdrant_storage:/data -v ${PWD}/backup:/backup alpine tar czf /backup/qdrant-backup-$(Get-Date -Format 'yyyyMMdd').tar.gz /data

# 恢復備份
docker run --rm -v rag_demo_chatbot_qdrant_storage:/data -v ${PWD}/backup:/backup alpine sh -c "cd /data && tar xzf /backup/qdrant-backup-20251209.tar.gz --strip 1"
```

---

## 📚 延伸閱讀

- [Qdrant 官方文件](https://qdrant.tech/documentation/)
- [Docker Compose 參考](https://docs.docker.com/compose/)
- [Qdrant Cloud 文件](https://qdrant.tech/documentation/cloud/)
- [Windows 檔案鎖定問題](https://github.com/qdrant/qdrant/issues/1234)

---

**最後更新**: 2025-12-09  
**維護者**: GitHub Copilot
