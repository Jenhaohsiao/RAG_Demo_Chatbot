# 🚀 部署指南 - RAG Demo Chatbot

**最後更新**: 2026-01-18  
**部署策略**: 混合部署（前端 A2 Hosting + 後端 Render/Railway）

---

## 📋 部署概覽

### 部署架構

```
使用者瀏覽器
    ↓
[前端] A2 Hosting (靜態網站)
    ↓ API 請求
[後端] Render.com (免費方案)
    ↓
[Qdrant Cloud] (免費 1GB)
```

### 成本分析

| 服務 | 方案 | 月費用 |
|------|------|--------|
| **前端託管** | A2 Hosting (已有) | $0 (已支付) |
| **後端服務** | Render.com 免費方案 | $0 |
| **向量資料庫** | Qdrant Cloud 免費方案 | $0 |
| **Gemini API** | 免費配額 | $0 (有每日限制) |
| **總計** | | **$0/月** |

### 免費方案限制

**Render.com 免費方案**:
- ✅ 750 小時/月運行時間
- ✅ 512MB RAM
- ⚠️ 15分鐘無活動自動休眠
- ⚠️ 冷啟動時間 30-60 秒

**Qdrant Cloud 免費方案**:
- ✅ 1GB 儲存空間
- ✅ 支援 ~50-200 個 demo 會話

**Gemini API 免費配額**:
- ⚠️ 每分鐘 15 次請求
- ⚠️ 每日約 1,500 次請求
- ✅ 支援用戶自帶 API Key

---

## 🔐 安全策略

### 1. 環境變數管理

**生產環境變數** (在 Render.com 設定):
```bash
# Gemini API (預設系統 Key)
GEMINI_API_KEY=your_system_gemini_key_here

# Qdrant Cloud
QDRANT_MODE=cloud
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_key_here

# Email SMTP (Gmail App Password)
SMTP_USERNAME=jenhao.hsiao2@gmail.com
SMTP_PASSWORD=your_16_char_app_password

# 會話配置
SESSION_TTL_MINUTES=30

# CORS (允許 A2 Hosting 網域)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 2. API Key 三層保護

```
第一層：系統 API Key (環境變數)
  ↓ 配額用完時
第二層：用戶輸入 API Key (Session 存儲)
  ↓ 使用後
第三層：立即清除，不存入資料庫
```

### 3. 敏感資訊保護

**本地開發** (.env.local - 不上傳):
```dotenv
GEMINI_API_KEY=AIzaSy...
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
```

**生產環境** (Render.com 環境變數):
- ✅ 通過 Render Dashboard 設定
- ✅ 加密存儲
- ✅ 不會出現在代碼庫中

---

## 📦 部署步驟

### Phase 1: 準備 Qdrant Cloud

#### 1.1 創建免費 Qdrant Cloud 帳號

1. 訪問: https://cloud.qdrant.io/
2. 註冊免費帳號
3. 創建新 Cluster (選擇最近的區域)
4. 獲取:
   - Cluster URL: `https://xxxx-xxxx.qdrant.io`
   - API Key: 從設定中獲取

#### 1.2 測試連接

```powershell
# 測試 Qdrant Cloud 連接
curl https://your-cluster.qdrant.io:6333/collections `
  -H "api-key: your_qdrant_api_key"
```

---

### Phase 2: 部署後端到 Render.com

#### 2.1 準備 Render 配置文件

在專案根目錄創建 `render.yaml`:

```yaml
services:
  - type: web
    name: rag-chatbot-backend
    env: python
    region: oregon
    plan: free
    buildCommand: pip install -r backend/requirements.txt
    startCommand: cd backend && uvicorn src.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11
      - key: QDRANT_MODE
        value: cloud
      - key: QDRANT_URL
        sync: false
      - key: QDRANT_API_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: SMTP_USERNAME
        sync: false
      - key: SMTP_PASSWORD
        sync: false
      - key: SESSION_TTL_MINUTES
        value: 30
      - key: SIMILARITY_THRESHOLD
        value: 0.6
    healthCheckPath: /health
```

#### 2.2 創建 Render 服務

1. 訪問: https://render.com/
2. 使用 GitHub 登入
3. 點擊 "New +" → "Web Service"
4. 連接您的 GitHub repository: `Jenhaohsiao/RAG_Demo_Chatbot`
5. 配置:
   - **Name**: `rag-chatbot-backend`
   - **Region**: Oregon (或最近的區域)
   - **Branch**: `001-multilingual-rag-chatbot`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`

#### 2.3 設定環境變數

在 Render Dashboard → Environment:

```
GEMINI_API_KEY = [您的 Gemini API Key]
QDRANT_MODE = cloud
QDRANT_URL = [您的 Qdrant Cluster URL]
QDRANT_API_KEY = [您的 Qdrant API Key]
SMTP_USERNAME = jenhao.hsiao2@gmail.com
SMTP_PASSWORD = [您的 Gmail App Password]
SESSION_TTL_MINUTES = 30
SIMILARITY_THRESHOLD = 0.6
CORS_ORIGINS = https://yourdomain.com
```

#### 2.4 部署並測試

```powershell
# 部署後測試健康檢查
curl https://rag-chatbot-backend.onrender.com/health

# 預期回應:
{
  "status": "healthy",
  "gemini_model": "gemini-2.0-flash-exp",
  "qdrant_mode": "cloud",
  "session_ttl_minutes": 30
}
```

---

### Phase 3: 部署前端到 A2 Hosting

#### 3.1 本地構建前端

```powershell
cd frontend

# 更新 API 端點為生產環境
# 編輯 src/services/api.ts
# baseURL: "https://rag-chatbot-backend.onrender.com/api/v1"

npm run build
```

#### 3.2 連接 A2 Hosting

```powershell
# 使用 SFTP 連接 (推薦使用 FileZilla)
Host: ftp.yourdomain.com
Username: [您的 A2 Hosting 用戶名]
Password: [您的 A2 Hosting 密碼]
Port: 21 (FTP) 或 22 (SFTP)
```

#### 3.3 上傳文件

1. 連接到 A2 Hosting SFTP
2. 導航至 `public_html/` (或您的網站根目錄)
3. 上傳 `frontend/dist/` 內的所有文件:
   ```
   frontend/dist/
   ├── index.html
   ├── assets/
   │   ├── index-[hash].js
   │   ├── index-[hash].css
   │   └── ...
   ```

#### 3.4 配置 .htaccess (單頁應用路由)

在 `public_html/` 創建 `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable CORS for API requests
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

#### 3.5 測試部署

訪問: `https://yourdomain.com`

---

## 🔍 API 配額管理

### 配額檢測機制

當系統 API Key 達到每日限制時:

1. **自動檢測**: 後端捕獲 `429 Too Many Requests` 錯誤
2. **用戶通知**: 前端顯示對話框提示配額用完
3. **用戶輸入**: 允許用戶輸入自己的 API Key
4. **Session 存儲**: Key 僅存儲在當前 Session (不存入資料庫)
5. **自動清除**: 會話結束後立即清除

### 實現細節

**後端錯誤處理** (`backend/src/services/embedder.py`):
```python
try:
    response = genai.embed_content(...)
except Exception as e:
    if "429" in str(e) or "quota" in str(e).lower():
        raise QuotaExceededError("Daily API quota exceeded")
    raise
```

**前端配額對話框** (`frontend/src/components/QuotaExceededModal.tsx`):
```tsx
{quotaExceeded && (
  <Modal show={true}>
    <Modal.Header>
      <Modal.Title>{t('quota.exceeded.title')}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>{t('quota.exceeded.message')}</p>
      <ApiKeyInput 
        onApiKeyValidated={(key) => {
          // 存儲在 Session，繼續請求
          sessionStorage.setItem('user_api_key', key);
        }}
      />
    </Modal.Body>
  </Modal>
)}
```

---

## 🧪 部署驗證清單

### 後端驗證

- [ ] 健康檢查: `GET /health` 回應 200
- [ ] Qdrant 連接: 能創建和刪除 collection
- [ ] Gemini API: 能生成 embedding 和回應
- [ ] SMTP: 能發送聯絡表單郵件
- [ ] CORS: 前端能正常呼叫 API

### 前端驗證

- [ ] 網站可訪問: `https://yourdomain.com`
- [ ] 單頁路由: 刷新頁面不顯示 404
- [ ] API 連接: 能創建會話
- [ ] 文件上傳: 能上傳 PDF 並處理
- [ ] 聊天功能: 能發送問題並獲得回答
- [ ] 多語言: 能切換語言

### 安全驗證

- [ ] 環境變數不在代碼中
- [ ] API Key 不在前端代碼中
- [ ] SMTP 密碼不在 Git 歷史中
- [ ] 用戶 API Key 不存入資料庫
- [ ] Session 結束後 Key 被清除

---

## 🚨 故障排除

### 問題 1: Render 服務休眠

**症狀**: 首次訪問響應時間 > 30 秒

**解決方案**:
```powershell
# 使用 UptimeRobot 每 5 分鐘 ping 一次
# 註冊: https://uptimerobot.com/ (免費)
# 添加監控: https://rag-chatbot-backend.onrender.com/health
```

### 問題 2: CORS 錯誤

**症狀**: 前端無法呼叫後端 API

**解決方案**:
1. 確認 Render 環境變數 `CORS_ORIGINS` 包含您的網域
2. 檢查 `backend/src/main.py` CORS 設定

### 問題 3: API 配額用完

**症狀**: 所有請求回應 429 錯誤

**解決方案**:
1. 等待 24 小時配額重置
2. 或使用用戶自帶 API Key 功能

---

## 📊 監控與維護

### 日誌檢查

```powershell
# Render Dashboard → Logs
# 查看即時日誌和錯誤

# 常見日誌過濾:
# - "ERROR" - 查看錯誤
# - "429" - 查看配額問題
# - "health" - 查看健康檢查
```

### 性能監控

- **Render Dashboard**: CPU/Memory 使用率
- **Qdrant Cloud**: 儲存空間使用情況
- **Google Cloud Console**: Gemini API 使用統計

### 定期維護

- **每週**: 檢查 Render 日誌是否有錯誤
- **每月**: 檢查 Qdrant 儲存空間 (< 1GB)
- **每月**: 檢查 Gemini API 使用量

---

## 💡 優化建議

### 性能優化

1. **CDN 加速**: 使用 Cloudflare 免費 CDN
2. **圖片壓縮**: 壓縮前端靜態資源
3. **Lazy Loading**: 延遲加載非關鍵組件

### 成本優化

1. **保持在免費配額內**: 
   - Render: < 750 小時/月
   - Qdrant: < 1GB
   - Gemini: 用戶自帶 Key

2. **監控使用量**: 設定警報通知

---

## 📝 檢查清單

### 部署前準備
- [ ] 創建 Qdrant Cloud 帳號並獲取 API Key
- [ ] 創建 Render.com 帳號
- [ ] 準備 A2 Hosting SFTP 憑證
- [ ] 備份所有 API Keys 和密碼

### 部署步驟
- [ ] 部署 Qdrant Cloud
- [ ] 部署 Render.com 後端
- [ ] 設定所有環境變數
- [ ] 構建前端靜態文件
- [ ] 上傳到 A2 Hosting
- [ ] 配置 .htaccess

### 部署後驗證
- [ ] 後端健康檢查通過
- [ ] 前端可正常訪問
- [ ] 完整功能測試通過
- [ ] 安全檢查通過

---

**完成！您的 RAG Chatbot 已成功部署到雲端，零月費用！** 🎉
