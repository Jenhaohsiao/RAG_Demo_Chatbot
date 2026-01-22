# 前端部署配置指南

## 🎯 環境變數配置

### 本地開發
前端使用 Vite proxy，無需配置 API URL：
```bash
# frontend/.env.local (可選)
# 不需要設定，會自動 proxy 到 localhost:8000
```

### 生產部署

當前端部署到靜態託管服務（如 A2 Hosting, Netlify, Vercel）時，需要配置 API URL：

```bash
# frontend/.env.production
VITE_API_URL=https://rag-demo-chatbot-1.onrender.com/api/v1
```

---

## 📦 建置前端

### 步驟 1: 設定環境變數

複製範例文件並修改：
```bash
cd frontend
cp .env.production.example .env.production
```

編輯 `.env.production`：
```env
VITE_API_URL=https://rag-demo-chatbot-1.onrender.com/api/v1
```

### 步驟 2: 建置

```bash
npm run build
```

建置產物會在 `frontend/dist/` 目錄。

### 步驟 3: 部署

將 `dist/` 目錄的內容上傳到：
- A2 Hosting (cPanel File Manager)
- Netlify (拖放)
- Vercel (Git 連接)
- GitHub Pages

---

## 🔧 API URL 配置說明

### 方案 1: 使用完整 URL（推薦）

適用於前後端分離部署：

```env
VITE_API_URL=https://rag-demo-chatbot-1.onrender.com/api/v1
```

**優點**:
- ✅ 前後端完全獨立
- ✅ 可以部署在不同域名
- ✅ 前端可以是純靜態託管

**注意**: 需要後端配置 CORS 允許前端域名

### 方案 2: 使用相對路徑

適用於前後端同域部署（需要反向代理）：

```env
VITE_API_URL=/api/v1
```

**要求**: 需要 Nginx/Apache 配置反向代理：
```nginx
location /api/ {
    proxy_pass https://rag-demo-chatbot-1.onrender.com/api/;
}
```

---

## 🌐 CORS 配置

確保後端 CORS 設定包含前端域名：

```python
# backend/src/core/config.py
cors_origins: str = "http://localhost:5173,https://your-frontend-domain.com"
```

或在 Render Dashboard 設定環境變數：
```
CORS_ORIGINS=http://localhost:5173,https://your-frontend-domain.com
```

---

## ✅ 驗證配置

### 1. 檢查建置產物

```bash
cat dist/assets/index-*.js | grep "rag-demo-chatbot-1.onrender.com"
```

應該能看到 API URL 被正確嵌入。

### 2. 測試 API 連線

部署後，打開瀏覽器開發者工具 Network 標籤：
- ✅ API 請求指向正確的 URL
- ✅ 回應狀態 200 或 2xx
- ⚠️ 如果看到 CORS 錯誤，檢查後端 CORS 設定

### 3. 健康檢查

訪問：
```
https://your-frontend-domain.com/
```

應該能：
- ✅ 創建 Session
- ✅ 上傳文件
- ✅ 進行問答

---

## 🔒 安全注意事項

### 環境變數管理

1. **不要提交 .env.production 到 Git**
   ```gitignore
   # .gitignore
   .env.production
   .env.local
   ```

2. **使用 CI/CD 設定環境變數**
   - Netlify: Environment Variables
   - Vercel: Environment Variables
   - GitHub Actions: Secrets

### API 安全

1. **後端 CORS 設定要明確**
   - ❌ 不要使用 `*`（允許所有來源）
   - ✅ 明確列出允許的前端域名

2. **敏感資料不要放前端**
   - ❌ Gemini API Key
   - ❌ Qdrant API Key
   - ✅ 只放後端 URL

---

## 📚 部署平台指南

### A2 Hosting (cPanel)

1. 建置專案：`npm run build`
2. 登入 cPanel File Manager
3. 導航到 `public_html/`
4. 上傳 `dist/` 目錄的所有內容
5. 訪問您的域名

### Netlify

1. 連接 GitHub repository
2. 設定建置命令：
   ```
   Build command: npm run build
   Publish directory: dist
   ```
3. 設定環境變數：
   ```
   VITE_API_URL=https://rag-demo-chatbot-1.onrender.com/api/v1
   ```
4. 部署

### Vercel

1. 連接 GitHub repository
2. Framework Preset: Vite
3. 設定環境變數（同 Netlify）
4. 部署

---

## 🧪 本地測試生產建置

```bash
# 建置
npm run build

# 本地預覽生產建置
npm run preview

# 或使用 serve
npx serve dist -p 4173
```

然後訪問 http://localhost:4173

---

**最後更新**: 2026-01-21  
**後端 API**: https://rag-demo-chatbot-1.onrender.com/
