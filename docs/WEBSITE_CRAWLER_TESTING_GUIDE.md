# 網站爬蟲功能測試指南

## 概述
本文檔提供了完整的網站爬蟲功能測試指南，涵蓋單元測試、集成測試和端到端測試。

---

## 第一部分：後端測試

### 1. 單元測試 - WebCrawler 服務

#### 運行測試
```bash
cd backend
pytest tests/test_web_crawler.py -v
```

#### 測試覆蓋項目

**初始化測試 (`TestWebCrawlerInitialization`)**
- ✅ 默認參數初始化
- ✅ 自定義參數初始化
- ✅ 域名提取正確性

**Token 估算測試 (`TestTokenEstimation`)**
- ✅ 英文 Token 估算準確性
- ✅ 中文 Token 估算準確性
- ✅ 混合語言 Token 估算準確性
- ✅ 最小 Token 限制（≥1）

**Token 限制測試 (`TestTokenLimit`)**
- ✅ 頁面在限制內
- ✅ 超過限制偵測
- ✅ 準確達到限制

**域名邊界測試 (`TestDomainBoundary`)**
- ✅ 同域名頁面允許
- ✅ 不同域名偵測

### 2. API 端點測試

#### 測試環境設置
```bash
# 啟動後端開發伺服器
cd backend
python run_server.py
```

#### 測試爬蟲端點

**1. 基本爬蟲請求**
```bash
curl -X POST http://localhost:8000/upload/{session_id}/website \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "max_tokens": 100000,
    "max_pages": 100
  }'
```

**期望回應 (202 Accepted):**
```json
{
  "document_id": "uuid-here",
  "session_id": "uuid-here",
  "source_type": "URL",
  "source_reference": "https://example.com",
  "pages_found": 15,
  "total_tokens": 45000,
  "crawl_status": "completed",
  "crawled_pages": [
    {
      "url": "https://example.com/page1",
      "title": "首頁",
      "tokens": 3000,
      "content": "Content preview..."
    }
  ],
  "extraction_status": "EXTRACTED",
  "moderation_status": "PENDING"
}
```

**2. Token 限制測試**
```bash
# 測試小 Token 限制
curl -X POST http://localhost:8000/upload/{session_id}/website \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://large-website.com",
    "max_tokens": 5000,
    "max_pages": 10
  }'
```

**期望行為：**
- 爬取 ~5 頁就停止
- `crawl_status` 返回 `"token_limit_reached"`

**3. 無效 URL 測試**
```bash
# 測試無效 URL
curl -X POST http://localhost:8000/upload/{session_id}/website \
  -H "Content-Type: application/json" \
  -d '{
    "url": "not-a-url",
    "max_tokens": 100000,
    "max_pages": 100
  }'
```

**期望結果：** 400 Bad Request（URL 驗證失敗）

**4. Token 範圍驗證**
```bash
# 測試超出最大 Token 限制
curl -X POST http://localhost:8000/upload/{session_id}/website \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "max_tokens": 2000000,
    "max_pages": 100
  }'
```

**期望結果：** 422 Unprocessable Entity（Token 超出範圍）

---

## 第二部分：前端測試

### 1. 單元測試 - WebsiteCrawlerPanel 組件

#### 運行測試
```bash
cd frontend
npm run test -- WebsiteCrawlerPanel.test.ts
```

#### 測試覆蓋項目

**渲染測試**
- ✅ 正確渲染所有 UI 元素
- ✅ 顯示正確的翻譯字符串
- ✅ 初始狀態正確

**URL 驗證測試**
- ✅ 拒絕空 URL
- ✅ 拒絕無效 URL 格式
- ✅ 接受 HTTPS URL
- ✅ 接受 HTTP URL
- ✅ 接受帶端口的 URL

**交互測試**
- ✅ Token 滑塊改變值
- ✅ 進階選項展開/收合
- ✅ 啟動按鈕提交

**狀態測試**
- ✅ 禁用時隱藏按鈕
- ✅ 加載中顯示加載狀態
- ✅ 顯示錯誤訊息
- ✅ 顯示爬蟲結果

**鍵盤測試**
- ✅ Enter 鍵提交表單

### 2. 手動測試 - UI 互動

#### 測試場景 1: 基本流程
1. 打開應用
2. 點擊「Website Crawler」選項卡
3. 輸入 URL：`https://example.com`
4. 點擊「Start Crawl」
5. **驗證：**
   - ✅ 看到加載動畫
   - ✅ 爬蟲完成後看到結果面板
   - ✅ 顯示頁面數和 Token 數

#### 測試場景 2: Token 限制
1. 輸入 URL：`https://large-website.com`
2. 將 Token 滑塊設置為 10K
3. 點擊「Start Crawl」
4. **驗證：**
   - ✅ 爬蟲在達到 10K Token 時停止
   - ✅ 顯示 `Token Limit Reached` 狀態

#### 測試場景 3: URL 驗證
1. 輸入無效 URL：`just-text`
2. 點擊「Start Crawl」
3. **驗證：**
   - ✅ 看到紅色錯誤訊息
   - ✅ 提交被阻止

#### 測試場景 4: 進階選項
1. 點擊「Advanced Options」展開
2. 調整「Max Pages」滑塊
3. **驗證：**
   - ✅ 選項平滑展開
   - ✅ 頁面限制值在結果中生效

#### 測試場景 5: 響應式設計
1. 在桌面、平板、手機上打開
2. 檢查佈局是否正確
3. **驗證：**
   - ✅ 桌面：兩列佈局
   - ✅ 平板：一列響應式佈局
   - ✅ 手機：堆疊佈局

#### 測試場景 6: 國際化
1. 改變語言為「中文」
2. 打開爬蟲面板
3. **驗證：**
   - ✅ 所有標籤顯示中文
   - ✅ 錯誤訊息顯示中文
   - ✅ 提示文本顯示中文

#### 測試場景 7: URL 列表預覽
1. 爬取網站成功後
2. 查看 URL 列表
3. **驗證：**
   - ✅ 每個 URL 顯示頁面標題
   - ✅ 每個頁面顯示 Token 計數
   - ✅ 顯示內容預覽（前 200 字）
   - ✅ 列表可滾動

---

## 第三部分：端到端測試

### 集成流程測試

#### 完整工作流
```
1. 用戶輸入網站 URL
   ↓
2. 前端調用 uploadWebsite() API
   ↓
3. 後端初始化 WebCrawler
   ↓
4. 爬蟲自動發現頁面
   ↓
5. 返回 URL 列表和統計
   ↓
6. 前端顯示結果預覽
   ↓
7. 用戶確認後自動處理（後台）
   ↓
8. 內容通過審核 → 分塊 → 嵌入 → 存儲
   ↓
9. 用戶可以提問內容
```

#### 測試命令
```bash
# 1. 啟動後端
cd backend
python run_server.py

# 2. 啟動前端（另一個終端）
cd frontend
npm run dev

# 3. 打開瀏覽器
http://localhost:5173

# 4. 測試流程
```

### 性能測試

**測試目標**
- 小網站（10 頁）：應在 10-20 秒內完成
- 中網站（50 頁）：應在 30-60 秒內完成
- 大網站（100 頁）：應在 60-120 秒內完成

**測試代碼**
```typescript
// 在前端控制台執行
console.time('crawler');
await uploadWebsite(sessionId, url, 100000, 100);
console.timeEnd('crawler');
```

---

## 第四部分：測試數據

### 推薦測試網站

| 網站 | 頁面數 | 用途 | 爬蟲時間 |
|------|--------|------|---------|
| https://example.com | 10 | 快速測試 | 10s |
| https://example.org | 20 | 基本測試 | 20s |
| https://docs.python.org | 50 | 中等測試 | 40s |
| https://en.wikipedia.org/wiki/Web_crawler | 30 | 鏈接密集 | 25s |

### 測試用例數據

**小型網站爬蟲**
```json
{
  "url": "https://example.com",
  "max_tokens": 20000,
  "max_pages": 10
}
```

**中型網站爬蟲**
```json
{
  "url": "https://docs.python.org",
  "max_tokens": 100000,
  "max_pages": 50
}
```

**大型網站爬蟲**
```json
{
  "url": "https://github.com",
  "max_tokens": 300000,
  "max_pages": 100
}
```

---

## 第五部分：故障排查

### 常見問題

**1. 爬蟲卡住（超時）**
- 原因：網站響應慢
- 解決：增加 `CRAWLER_TIMEOUT` 或減少 `max_pages`

**2. Token 估算不準確**
- 原因：混合語言內容
- 解決：預留 20% 緩衝

**3. 無法爬取某些頁面**
- 原因：需要認證或 JavaScript 渲染
- 解決：檢查 `token_limit_reached` 或錯誤日誌

**4. 前端無法連接後端**
- 原因：CORS 設置
- 解決：檢查 `vite.config.ts` 代理設置

### 調試模式

**後端調試**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
# 查看詳細的爬蟲日誌
```

**前端調試**
```typescript
// 在 WebsiteCrawlerPanel 中啟用日誌
console.log('Crawler state:', { crawlerLoading, crawlerResults });
```

---

## 檢查清單

### 準備工作
- [ ] 後端已啟動 (port 8000)
- [ ] 前端已啟動 (port 5173)
- [ ] 網絡連接正常
- [ ] 瀏覽器開發工具已打開

### 功能測試
- [ ] ✅ 基本爬蟲流程正常
- [ ] ✅ Token 限制生效
- [ ] ✅ URL 驗證正常
- [ ] ✅ 結果預覽顯示
- [ ] ✅ 錯誤處理正確
- [ ] ✅ 國際化翻譯正確

### 性能測試
- [ ] ✅ 小網站 < 20s
- [ ] ✅ 中網站 < 60s
- [ ] ✅ 大網站 < 120s

### 集成測試
- [ ] ✅ 內容通過審核
- [ ] ✅ 分塊正確
- [ ] ✅ 嵌入成功
- [ ] ✅ 可以進行 QA

---

## 測試報告模板

```markdown
# 網站爬蟲功能測試報告

**測試日期：** YYYY-MM-DD
**測試人員：** [Name]
**測試環境：** Windows/Mac/Linux

## 測試結果概要
- 單元測試：X/Y 通過
- 集成測試：X/Y 通過
- 端到端測試：X/Y 通過

## 問題記錄
| 編號 | 問題描述 | 嚴重性 | 狀態 |
|------|---------|--------|------|
| 1 | ... | High | Open |

## 建議
- ...
- ...

## 簽核
- 測試人員：_______________
- 開發人員：_______________
- 項目經理：_______________
```

---

## 結論

完整的測試工作流程包括：
1. ✅ 單元測試（後端和前端）
2. ✅ API 測試（HTTP 端點）
3. ✅ UI 測試（手動互動）
4. ✅ 集成測試（完整流程）
5. ✅ 性能測試（時間測量）

**所有測試通過後，功能即可部署到生產環境。**
