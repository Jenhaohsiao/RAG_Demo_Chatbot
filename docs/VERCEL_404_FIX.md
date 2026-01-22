# Vercel 部署 404 錯誤修復指南

## 🔍 問題診斷

從錯誤訊息看到：
```
{error: {code: "404", message: "The page could not be found"}}
```

這表示前端無法連接到後端 API。

---

## 🛠️ 修復步驟

### 步驟 1: 確認 Vercel 環境變數

1. 前往 [Vercel Dashboard](https://dashboard.vercel.com/)
2. 選擇您的專案
3. 進入 "Settings" → "Environment Variables"
4. **確認已設定**：

```
Variable Name: VITE_API_URL
Value: https://rag-demo-chatbot-1.onrender.com/api/v1
Environment: Production
```

> ⚠️ **重要**: 變數名稱必須是 `VITE_API_URL`（不是 `VITE_API_BASE_URL`）

### 步驟 2: 重新部署

設定環境變數後，**必須重新部署**才會生效：

**方法 A: 在 Dashboard**
1. 前往 "Deployments" 標籤
2. 點擊最新部署旁的 "..." 按鈕
3. 選擇 "Redeploy"

**方法 B: 觸發新提交**
```bash
git commit --allow-empty -m "Trigger Vercel redeploy"
git push
```

---

### 步驟 3: 檢查 Render 後端狀態

確認後端服務正常運行：

**測試健康檢查**：
```bash
curl https://rag-demo-chatbot-1.onrender.com/health
```

應該返回：
```json
{
  "status": "healthy",
  ...
}
```

> ⚠️ **Render 冷啟動**: 免費方案會在 15 分鐘無活動後休眠，首次請求需要 30-60 秒喚醒

---

### 步驟 4: 更新 CORS 設定

後端必須允許 Vercel 域名的跨域請求。

1. 前往 [Render Dashboard](https://dashboard.render.com/)
2. 選擇 `rag-demo-chatbot-1` 服務
3. 進入 "Environment" 標籤
4. 找到或新增 `CORS_ORIGINS` 環境變數：

```env
CORS_ORIGINS=http://localhost:5173,https://rag-demo-chatbot.vercel.app
```

> 💡 將 `rag-demo-chatbot.vercel.app` 替換為您的實際 Vercel 域名

5. 點擊 "Save Changes"
6. 等待 Render 自動重新部署（約 1-2 分鐘）

---

## 🧪 驗證修復

### 1. 檢查環境變數是否生效

打開您的 Vercel 網站，在瀏覽器 Console 執行：

```javascript
console.log(import.meta.env.VITE_API_URL);
// 應該顯示: https://rag-demo-chatbot-1.onrender.com/api/v1
```

如果顯示 `undefined` 或 `/api/v1`，表示環境變數沒有生效，需要重新部署。

### 2. 檢查 API 請求

在 Network 標籤中查看：
- ✅ 請求 URL 應該是：`https://rag-demo-chatbot-1.onrender.com/api/v1/...`
- ❌ 如果是：`https://rag-demo-chatbot.vercel.app/api/v1/...`，表示環境變數未生效

### 3. 檢查 CORS

如果看到錯誤：
```
Access to XMLHttpRequest at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

表示後端 CORS 設定有問題，返回步驟 4 檢查。

### 4. 測試完整流程

1. 訪問您的 Vercel 網站
2. 點擊 "Start Chat" 或類似按鈕
3. 檢查是否能成功創建 Session
4. 嘗試上傳文件
5. 測試問答功能

---

## 🔧 快速診斷腳本

在瀏覽器 Console 執行此診斷腳本：

```javascript
// 診斷工具
const diagnose = async () => {
  console.log('=== Vercel 部署診斷 ===\n');
  
  // 1. 檢查環境變數
  const apiUrl = import.meta.env.VITE_API_URL;
  console.log('1. 環境變數:');
  console.log(`   VITE_API_URL = ${apiUrl || '未設定'}`);
  console.log(`   預期值: https://rag-demo-chatbot-1.onrender.com/api/v1\n`);
  
  // 2. 測試後端連線
  console.log('2. 測試後端健康檢查...');
  try {
    const response = await fetch('https://rag-demo-chatbot-1.onrender.com/health');
    const data = await response.json();
    console.log(`   ✅ 後端狀態: ${data.status}`);
  } catch (e) {
    console.log(`   ❌ 後端連線失敗: ${e.message}`);
  }
  
  // 3. 測試 CORS
  console.log('\n3. 測試 CORS...');
  try {
    const response = await fetch('https://rag-demo-chatbot-1.onrender.com/api/v1/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'en' })
    });
    if (response.ok) {
      console.log('   ✅ CORS 設定正確');
    } else {
      console.log(`   ⚠️ API 回應: ${response.status}`);
    }
  } catch (e) {
    console.log(`   ❌ CORS 錯誤: ${e.message}`);
  }
  
  console.log('\n=== 診斷完成 ===');
};

diagnose();
```

---

## 📋 常見問題排查

### Q1: 環境變數設定了但沒有生效

**原因**: Vercel 需要重新建置才會包含新的環境變數

**解決**:
```bash
# 觸發重新部署
git commit --allow-empty -m "Redeploy with env vars"
git push
```

### Q2: 仍然看到 404 錯誤

**可能原因**:
1. API URL 拼寫錯誤
2. 後端服務休眠（冷啟動）
3. CORS 未設定

**解決**:
- 直接訪問：https://rag-demo-chatbot-1.onrender.com/health
- 等待 30-60 秒讓後端喚醒
- 確認 CORS 包含 Vercel 域名

### Q3: CORS 錯誤

**錯誤訊息**:
```
Access-Control-Allow-Origin header is missing
```

**解決**: 確認 Render 的 `CORS_ORIGINS` 包含您的 Vercel 域名

### Q4: 環境變數名稱錯誤

**常見錯誤**:
- ❌ `VITE_API_BASE_URL`
- ❌ `API_URL`
- ❌ `REACT_APP_API_URL`
- ✅ `VITE_API_URL` （正確）

---

## 🎯 完整檢查清單

- [ ] Vercel 環境變數 `VITE_API_URL` 已設定
- [ ] 已觸發 Vercel 重新部署
- [ ] Render 後端服務運行中（health check 成功）
- [ ] Render CORS_ORIGINS 包含 Vercel 域名
- [ ] 瀏覽器 Console 無 CORS 錯誤
- [ ] Network 標籤顯示請求到正確的 URL
- [ ] 可以成功創建 Session
- [ ] 可以上傳文件並問答

---

## 💡 臨時解決方案

如果需要快速測試，可以暫時：

1. **使用本地後端**：
```env
# Vercel 環境變數
VITE_API_URL=http://localhost:8000/api/v1
```

2. **使用 Render 後端但跳過 CORS**（僅測試用）：
```bash
# 本地啟動 Chrome 並關閉 CORS 檢查（僅用於測試）
chrome.exe --disable-web-security --user-data-dir="C:/temp/chrome-cors"
```

---

**需要更多協助？**

請提供以下資訊：
1. Vercel 專案 URL
2. 瀏覽器 Console 的完整錯誤訊息
3. Network 標籤中失敗的 API 請求詳情
