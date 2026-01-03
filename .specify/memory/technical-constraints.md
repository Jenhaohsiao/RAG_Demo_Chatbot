# 技術限制與環境要求

## 版本歷史
- **v1.0.0** (2025-12-09): 初始建立，記錄 Python 版本限制

---

## 環境要求

### Python 版本限制

#### ❌ 不支援的版本
- **Python 3.14.x**: pydantic-core 尚未提供預編譯版本 (需要 Rust 編譯器)
  - **發生日期**: 2025-12-09
  - **影響**: `pip install -r requirements.txt` 失敗
  - **錯誤訊息**: "Rust not found, installing into a temporary directory"
  - **解決方案**: 降級至 Python 3.11.x 或 3.12.x

#### ✅ 建議版本
- **Python 3.11.x** (推薦)
- **Python 3.12.x** (支援)

#### 📦 相關依賴
- `pydantic==2.10.4` → 需要 `pydantic-core==2.27.2`
- `pydantic-core` 需要預編譯 wheel 或 Rust 編譯器

---

## Docker 配置

### Qdrant 向量資料庫模式

#### 開發環境 (當前配置)
```env
QDRANT_MODE=embedded
```
- ✅ **不需要 Docker**
- ✅ 使用檔案系統儲存 (`backend/qdrant_data/`)
- ✅ 適合本地測試
- ⚠️ 效能較 Docker 模式低

#### 生產環境選項

**選項 1: Docker Compose**
```env
QDRANT_MODE=docker
```
- 需要 Docker Desktop
- Qdrant 在容器中運行
- 適合雲端部署 (Azure Container Apps / AWS ECS)

**選項 2: 雲端 Qdrant**
```env
QDRANT_MODE=cloud
QDRANT_URL=https://xxx.qdrant.io
QDRANT_API_KEY=your_cloud_key
```
- 使用 Qdrant Cloud 服務
- 不需要 Docker
- 適合 Serverless 部署 (Azure App Service / AWS Lambda)

---

## Node.js / npm 要求

### 前端開發
- **Node.js**: 18.x 或更高版本 (推薦 20.x LTS)
- **npm**: 9.x 或更高版本

---

## 已知相容性問題

### 1. Python 3.14 + pydantic-core
- **問題**: pydantic-core 2.27.2 需要從源碼編譯
- **需求**: Rust 1.70+ 編譯器
- **影響範圍**: 所有使用 Pydantic v2 的專案
- **建議**: 使用 Python 3.11 或 3.12

### 2. Windows PowerShell 相容性
- **docker-compose**: 使用 `docker compose` (V2) 而非 `docker-compose` (V1)
- **Python 執行**: 使用 `py` launcher 而非 `python` 或 `python3`

---

## 測試環境設定檢查清單

### 必備工具
- [x] Python 3.11 或 3.12 (執行 `py --version`)
- [x] pip 最新版本 (執行 `py -m pip install --upgrade pip`)
- [x] Node.js 18+ (執行 `node --version`)
- [x] npm 9+ (執行 `npm --version`)

### 可選工具
- [ ] Docker Desktop (僅生產環境或 `QDRANT_MODE=docker` 需要)
- [ ] Git (版本控制)

### 環境變數
- [x] `backend/.env` 檔案存在
- [x] `GEMINI_API_KEY` 已設定 (或使用 test key)
- [x] `QDRANT_MODE=embedded` (開發環境)

---

## 疑難排解

### 問題: pip install 失敗 (pydantic-core)
**症狀**:
```
error: metadata-generation-failed
Rust not found, installing into a temporary directory
```

**解決方案**:
1. 檢查 Python 版本: `py --version`
2. 如果是 3.14.x，降級至 3.11 或 3.12:
   ```powershell
   # 下載並安裝 Python 3.11 或 3.12
   # https://www.python.org/downloads/
   ```
3. 重新安裝依賴:
   ```powershell
   cd C:\Projects\AI_projects\RAG_Demo_Chatbot\backend
   py -m pip install -r requirements.txt
   ```

### 問題: Docker 指令找不到
**症狀**:
```
docker : 無法辨識 'docker' 詞彙
```

**解決方案**:
- 確認 `.env` 設定為 `QDRANT_MODE=embedded`
- 開發環境不需要 Docker
- 生產部署時再安裝 Docker Desktop

---

## 更新記錄

| 日期 | 版本 | 變更內容 |
|------|------|----------|
| 2025-12-09 | 1.0.0 | 初始建立，記錄 Python 3.14 限制 |

---

**維護者**: GitHub Copilot  
**最後更新**: 2025-12-09
