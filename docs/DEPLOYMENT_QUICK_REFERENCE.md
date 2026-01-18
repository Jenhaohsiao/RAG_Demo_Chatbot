# 🚀 部署快速參考卡

**一頁紙部署指南** - 適合已讀過完整文檔的快速查閱

---

## 📋 部署前準備（5分鐘）

### 1. 獲取所需憑證
```
✓ Gemini API Key → https://aistudio.google.com/app/apikey
✓ Qdrant Cloud → https://cloud.qdrant.io/ (註冊 + 創建 Cluster)
✓ Gmail App Password → https://myaccount.google.com/apppasswords
✓ A2 Hosting SFTP 憑證 (您已有)
```

---

## 🎯 Phase 1: Render 後端（10分鐘）

### 步驟
```bash
1. https://render.com/ → 用 GitHub 登入
2. New + → Web Service
3. 選擇 repository: Jenhaohsiao/RAG_Demo_Chatbot
4. Branch: 001-multilingual-rag-chatbot
5. Root Directory: backend
6. Build: pip install -r requirements.txt
7. Start: uvicorn src.main:app --host 0.0.0.0 --port $PORT
```

### 環境變數設定
```bash
GEMINI_API_KEY=[您的 Gemini Key]
QDRANT_MODE=cloud
QDRANT_URL=[您的 Qdrant Cluster URL]
QDRANT_API_KEY=[您的 Qdrant Key]
SMTP_USERNAME=jenhao.hsiao2@gmail.com
SMTP_PASSWORD=[您的 Gmail App Password]
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 驗證
```bash
curl https://your-app.onrender.com/health
# 預期: {"status":"healthy","qdrant_mode":"cloud"}
```

---

## 🌐 Phase 2: A2 Hosting 前端（15分鐘）

### 本地構建
```bash
cd frontend

# 1. 更新 API URL (src/services/api.ts)
baseURL: "https://your-app.onrender.com/api/v1"

# 2. 構建
npm run build
# 輸出在 frontend/dist/
```

### 上傳到 A2 Hosting
```bash
SFTP 連接:
Host: ftp.yourdomain.com
Username: [您的 A2 用戶名]
Password: [您的 A2 密碼]
Port: 22

上傳 frontend/dist/* → public_html/
```

### 創建 .htaccess
```apache
# 在 public_html/.htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## ✅ 驗證檢查清單

```
[ ] https://yourdomain.com 可訪問
[ ] 能創建會話
[ ] 能上傳 PDF 並處理
[ ] 能進行聊天對話
[ ] 能切換語言
[ ] 聯絡表單能發送郵件
[ ] 配額超限時顯示對話框
```

---

## 🔥 常見問題速查

### Q: Render 服務 30 秒沒反應？
**A**: 冷啟動正常。使用 UptimeRobot 每 5 分鐘 ping `/health` 保持活躍。

### Q: CORS 錯誤？
**A**: 檢查 Render 環境變數 `CORS_ORIGINS` 包含您的網域。

### Q: 配額超限測試？
**A**: 
```bash
# 1. 暫時移除 Render 的 GEMINI_API_KEY
# 2. 訪問網站嘗試聊天
# 3. 應該顯示配額對話框
# 4. 輸入您的測試 API Key
# 5. 驗證能繼續使用
# 6. 關閉 tab，Key 被清除（檢查 sessionStorage）
```

---

## 📞 緊急聯絡

- **Render 日誌**: Dashboard → Logs → 查看即時錯誤
- **Qdrant 狀態**: Dashboard → Metrics → 儲存空間使用
- **Gemini API 配額**: Google Cloud Console → API & Services

---

## 🎯 效能優化（可選）

```bash
# 1. 設定 UptimeRobot
https://uptimerobot.com/ → 免費註冊
Monitor URL: https://your-app.onrender.com/health
Interval: 5 分鐘

# 2. Cloudflare CDN（可選）
https://cloudflare.com/ → 加入您的網域
→ 自動啟用 CDN 加速
```

---

## 💡 成本追蹤

```
當前 (免費方案):
├─ Render: 0 小時 / 750 小時/月
├─ Qdrant: 0 MB / 1024 MB
└─ Gemini: 0 次 / ~1,500 次/日

警告閾值:
├─ Render: > 700 小時/月
├─ Qdrant: > 900 MB
└─ Gemini: 配額用完時自動切換到用戶 Key
```

---

**完整文檔**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)  
**部署總結**: [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)

**祝部署順利！** 🚀
