# Vercel 部署配置清單

## ✅ 已完成的配置

### 1. **vercel.json** ✅
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- SPA 路由配置（所有路徑重導向到 index.html）
- 靜態資源快取設定

### 2. **.env.production.example** ✅
- 包含生產環境 API URL 範例
- 需要在 Vercel Dashboard 設定實際值

### 3. **package.json** ✅
- Build script: `tsc && vite build`
- Preview script: `vite preview`
- 所有依賴都已正確配置

### 4. **vite.config.ts** ✅
- React plugin 已配置
- 路徑別名 `@` 指向 `./src`
- SCSS 預處理器已配置
- Dev server proxy（本地開發用）

---

## 🚀 Vercel 部署步驟

### 方法 1: 透過 Vercel Dashboard（推薦）

#### 步驟 1: 連接 GitHub Repository

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊 "Add New Project"
3. 選擇 "Import Git Repository"
4. 授權並選擇 `Jenhaohsiao/RAG_Demo_Chatbot`

#### 步驟 2: 配置專案

Vercel 會自動偵測到 Vite 專案，配置如下：

```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

#### 步驟 3: 設定環境變數

在 Vercel Dashboard 的 "Environment Variables" 區塊新增：

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_URL` | `https://rag-demo-chatbot-1.onrender.com/api/v1` | Production |

#### 步驟 4: 部署

點擊 "Deploy" 按鈕，等待建置完成（約 1-2 分鐘）。

---

### 方法 2: 透過 Vercel CLI

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署（在 frontend 目錄下）
cd frontend
vercel --prod

# 設定環境變數
vercel env add VITE_API_URL production
# 輸入: https://rag-demo-chatbot-1.onrender.com/api/v1
```

---

## ⚙️ 後端 CORS 配置更新

部署完成後，需要更新後端 CORS 設定以允許 Vercel 域名。

### 在 Render Dashboard 更新環境變數

```env
CORS_ORIGINS=http://localhost:5173,https://your-project.vercel.app
```

**步驟**:
1. 前往 [Render Dashboard](https://dashboard.render.com/)
2. 選擇 `rag-demo-chatbot-1` 服務
3. 前往 "Environment" 標籤
4. 找到或新增 `CORS_ORIGINS`
5. 更新為：
   ```
   http://localhost:5173,https://your-project.vercel.app
   ```
6. 儲存並重新部署

> 💡 **提示**: Vercel 部署後會提供域名，例如 `rag-chatbot-demo.vercel.app`

---

## 🧪 部署前測試

### 本地測試生產建置

```bash
cd frontend

# 1. 設定生產環境變數
cp .env.production.example .env.production
# 編輯 .env.production 確認 API URL

# 2. 建置
npm run build

# 3. 預覽
npm run preview
# 或
npx serve dist -p 4173
```

訪問 http://localhost:4173 測試：
- ✅ 所有頁面正常載入
- ✅ 可以創建 Session
- ✅ 可以上傳文件
- ✅ API 連線正常

---

## 📋 檢查清單

### 部署前

- [x] `vercel.json` 已創建
- [x] `.env.production.example` 已創建
- [x] `package.json` build script 正確
- [x] `vite.config.ts` 配置正確
- [ ] 本地測試生產建置成功
- [ ] 確認 API URL 正確

### 部署中

- [ ] 在 Vercel Dashboard 連接 GitHub
- [ ] 設定 Root Directory 為 `frontend`
- [ ] 設定環境變數 `VITE_API_URL`
- [ ] 首次部署成功

### 部署後

- [ ] 記錄 Vercel 分配的域名
- [ ] 更新後端 CORS 設定
- [ ] 測試前端功能：
  - [ ] 創建 Session
  - [ ] 上傳文件
  - [ ] 問答功能
  - [ ] 語言切換（如果保留多語言）
- [ ] 檢查瀏覽器 Console 無錯誤
- [ ] 檢查 Network 標籤 API 請求成功

---

## 🔧 常見問題

### Q1: 部署後出現 404 錯誤

**原因**: SPA 路由配置問題

**解決**: 確認 `vercel.json` 中的 rewrites 配置正確

### Q2: API 請求失敗（CORS 錯誤）

**原因**: 後端 CORS 未包含 Vercel 域名

**解決**: 更新 Render 的 `CORS_ORIGINS` 環境變數

### Q3: 環境變數沒有生效

**原因**: Vercel 需要重新部署才會套用環境變數

**解決**: 
```bash
# 在 Vercel Dashboard 觸發重新部署
# 或使用 CLI
vercel --prod --force
```

### Q4: 建置失敗

**原因**: TypeScript 錯誤或依賴問題

**解決**:
```bash
# 本地測試建置
npm run build

# 檢查 TypeScript 錯誤
npx tsc --noEmit
```

---

## 🌐 預期結果

部署成功後：

- **前端 URL**: https://your-project.vercel.app
- **後端 API**: https://rag-demo-chatbot-1.onrender.com/api/v1
- **自動部署**: Push 到 GitHub 後自動觸發部署
- **HTTPS**: Vercel 自動配置 SSL

---

## 📊 效能優化建議

### 1. 啟用 Edge Functions（可選）

如果有高流量需求，可以考慮使用 Vercel Edge Functions。

### 2. 圖片優化

使用 Vercel Image Optimization：
```tsx
import Image from 'next/image'
// 需要安裝 next 才能使用
```

### 3. 分析建置產物

```bash
npm run build -- --mode production

# 檢查 dist/ 大小
du -sh dist/
```

---

## 🔐 安全注意事項

1. **環境變數**:
   - ✅ 只在 Vercel Dashboard 設定
   - ❌ 不要提交 `.env.production` 到 Git

2. **API Key**:
   - ✅ Gemini API Key 保留在後端
   - ❌ 不要在前端暴露任何密鑰

3. **CORS**:
   - ✅ 只允許特定域名
   - ❌ 不要使用 `*`（所有來源）

---

**準備好了嗎？開始部署！** 🚀

如遇到任何問題，請參考：
- [Vercel 文件](https://vercel.com/docs)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
