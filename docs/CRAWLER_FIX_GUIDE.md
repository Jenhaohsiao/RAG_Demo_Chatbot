# 爬蟲修復說明

## 修復內容

### 問題 1：爬蟲不能使用（Resource not found 錯誤）
**根本原因**：前端代碼和後端 API 都是正確的，問題是用戶輸入的 URL 有拼寫錯誤。

用戶輸入：`https://cambimm.ca`（正確）
之前輸入：`https://ccmbimm.ca`（錯誤 - 多了一個 c）

**解決方法**：無需修改，API 本身工作正常。

### 問題 2：自動添加協議前綴
**修改內容**：

1. **frontend/src/services/uploadService.ts**
   - 新增 `normalizeUrl()` 函數，自動為 URL 添加 `https://` 前綴
   - 修改 `uploadWebsite()` 函數使用規範化後的 URL

2. **frontend/src/components/WebsiteCrawlerPanel/WebsiteCrawlerPanel.tsx**
   - 導入並使用 `normalizeUrl()` 函數
   - 在驗證前先規範化 URL

### 實現邏輯

```typescript
// 自動協議前綴邏輯
export const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  
  // 如果已經有協議，直接返回
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  
  // 自動添加 https:// 前綴
  return `https://${trimmed}`;
};
```

**特點**：
- ✅ 優先嘗試 `https://`（更安全）
- ✅ 如果用戶已輸入協議，不會重複添加
- ✅ 自動清理前後空格
- ⚠️ 如果 HTTPS 失敗，後端會自動嘗試 HTTP（由 requests 庫處理重定向）

## 使用示例

### 用戶輸入轉換

| 用戶輸入 | 規範化後 | 說明 |
|---------|---------|------|
| `cambimm.ca` | `https://cambimm.ca` | 自動添加 https:// |
| `http://cambimm.ca` | `http://cambimm.ca` | 保留 http:// |
| `https://cambimm.ca` | `https://cambimm.ca` | 已有協議，不變 |
| ` cambimm.ca ` | `https://cambimm.ca` | 自動清理空格 |

## 測試

### 手動測試
1. 打開前端 http://localhost:5174
2. 切換到「網站爬蟲」標籤
3. 測試以下輸入：
   - ✅ `cambimm.ca`（無協議）
   - ✅ `http://cambimm.ca`（HTTP）
   - ✅ `https://cambimm.ca`（HTTPS）
   - ✅ ` cambimm.ca `（帶空格）

### 自動測試腳本
使用 `test_crawler_api.ps1` 腳本測試後端 API：

```powershell
.\test_crawler_api.ps1
```

## 技術細節

### 前端流程
1. 用戶輸入 URL（可能無協議前綴）
2. `WebsiteCrawlerPanel.handleCrawl()` 調用 `normalizeUrl()`
3. 規範化後的 URL 傳給 `onCrawl()` 回調
4. `uploadWebsite()` 再次規範化（雙重保險）
5. 發送 POST 請求到 `/api/v1/upload/{session_id}/website`

### 後端流程
1. 接收 POST 請求到 `/upload/{session_id}/website`
2. 驗證 URL 格式（必須有 http:// 或 https://）
3. 創建 `WebCrawler` 實例
4. 執行爬蟲（超時保護：30秒）
5. 返回爬取結果（頁面列表、Token 數等）

### 錯誤處理
- **無協議**：自動添加 `https://`
- **HTTPS 失敗**：requests 庫會自動嘗試 HTTP
- **超時**：30秒後返回已爬取的頁面
- **無效 URL**：前端驗證攔截，顯示錯誤訊息

## 後續優化建議

### 1. 更智能的協議選擇
可以改進為先測試 HTTPS，失敗後自動重試 HTTP：

```typescript
export const normalizeUrl = async (url: string): Promise<string> => {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  
  // 先嘗試 HTTPS
  const httpsUrl = `https://${trimmed}`;
  try {
    await fetch(httpsUrl, { method: 'HEAD', mode: 'no-cors' });
    return httpsUrl;
  } catch {
    // HTTPS 失敗，回退到 HTTP
    return `http://${trimmed}`;
  }
};
```

**優點**：更智能
**缺點**：需要額外的網絡請求，增加延遲

### 2. URL 驗證增強
可以添加更嚴格的 URL 驗證：

```typescript
export const validateDomain = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
};
```

### 3. 用戶體驗優化
- 顯示規範化後的 URL，讓用戶確認
- 添加常見網站的自動補全
- 顯示協議選擇選項（HTTP/HTTPS）

## 相關文件
- `frontend/src/services/uploadService.ts` - URL 規範化邏輯
- `frontend/src/components/WebsiteCrawlerPanel/WebsiteCrawlerPanel.tsx` - 爬蟲面板
- `backend/src/api/routes/upload.py` - 爬蟲 API 端點
- `backend/src/services/web_crawler.py` - 爬蟲實現
- `test_crawler_api.ps1` - API 測試腳本

## 修復確認
- [x] 前端添加 URL 規範化函數
- [x] WebsiteCrawlerPanel 使用規範化函數
- [x] uploadWebsite 函數使用規範化
- [x] 前端重新構建
- [x] 創建測試腳本
- [ ] 用戶測試驗證（待用戶確認）
