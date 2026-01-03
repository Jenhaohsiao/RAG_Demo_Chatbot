# 使用者測試環境設置指南

**日期**: 2025-12-19  
**環境狀態**: ✅ 就緒

---

## 📋 系統檢查清單

### ✅ 系統依賴
- ✅ Docker Desktop: v29.1.2 (已安裝)
- ✅ Docker Compose: v2.40.3 (已安裝)
- ✅ Node.js: v24.11.1 (已安裝)
- ✅ npm: 已安裝且依賴已更新

### ✅ 前端環境
- ✅ `frontend/` 中所有 npm 依賴已安裝 (114 packages)
- ✅ Vite 開發伺服器配置就緒
- ✅ React 18.2.0 + TypeScript + Bootstrap UI
- ✅ i18n 配置完成 (7 種語言)
- ✅ WebsiteCrawlerPanel 組件已集成

### ✅ 後端環境
- ✅ Docker 容器已啟動並運行:
  - `rag-chatbot-qdrant`: Port 6333-6334 (向量資料庫)
  - `rag-chatbot-backend`: Port 8000 (FastAPI 伺服器)
- ✅ 健康檢查: `GET /health` → 200 OK (healthy)
- ✅ Qdrant 向量儲存已連接
- ✅ Gemini API 密鑰已配置 (.env.local)

### ✅ 功能驗證

#### 基本功能 (MVP - Phase 1-9)
- [x] Session 管理 (建立、切換語言、重啟、關閉)
- [x] 文件上傳 (PDF、TXT、CSV)
- [x] URL 上傳 (網頁內容提取)
- [x] 文檔處理 (自動萃取、審核、分塊、嵌入)
- [x] 向量儲存 (Qdrant 持久化)
- [x] RAG 查詢 (語義搜索)
- [x] 多語言支援 (7 種語言)
- [x] Metrics 儀表板 (實時監控)

#### 新功能 (Phase 9.5 - WebCrawler)
- [x] 網站爬蟲面板 (WebsiteCrawlerPanel)
- [x] URL 驗證和預覽
- [x] Token 限制滑塊 (最大 100K)
- [x] 網站爬取 (`POST /upload/{session_id}/website`)
- [x] 錯誤處理和加載狀態
- [x] i18n 支援 (爬蟲面板)
- [x] 單元測試 (後端 + 前端)
- [x] 測試文檔和 API 示例

---

## 🚀 快速開始

### 方式 1: 使用 Docker Compose (推薦用於完整測試)

```bash
# 進入專案目錄
cd c:\Projects\AI_projects\RAG_Demo_Chatbot

# 啟動所有服務 (Qdrant + 後端)
docker-compose up -d

# 驗證服務狀態
docker ps

# 檢查後端健康狀況
Invoke-WebRequest -Uri http://localhost:8000/health

# 在單獨的終端開啟前端開發伺服器
cd frontend
npm run dev

# 前端應在 http://localhost:5173 可用
```

### 方式 2: 檢查服務狀態

```bash
# 查看所有運行容器
docker ps

# 查看容器日誌 (診斷問題)
docker logs rag-chatbot-backend
docker logs rag-chatbot-qdrant

# 停止服務
docker-compose down

# 完全清理 (包含卷和網路)
docker-compose down -v
```

---

## 🧪 測試場景

### 場景 1: 基本 Chat 流程 ✅

1. **打開應用**: http://localhost:5173
2. **建立 Session**:
   - 點擊 "New Session"
   - 選擇語言 (例如: 英文)
3. **上傳文件**:
   - 進入 "Upload" 標籤
   - 選擇 "File" 或 "URL" 標籤
   - 上傳測試文件 (PDF/TXT)
4. **提出問題**:
   - 在聊天框輸入問題
   - 驗證系統返回相關答案

### 場景 2: 網站爬蟲測試 ✅

1. **打開應用**: http://localhost:5173
2. **建立或選擇 Session**
3. **進入 Upload 標籤**:
   - 點擊 "Crawler" 標籤
4. **測試網站爬取**:
   - 輸入 URL (例如: `https://example.com`)
   - 調整 Token 滑塊 (測試限制)
   - 點擊 "Start Crawling"
   - 驗證結果顯示
5. **測試邊界情況**:
   - 無效 URL → 顯示錯誤訊息
   - Token 超限 → 顯示警告
   - 網站不可達 → 顯示相應錯誤

### 場景 3: 多語言測試 ✅

1. **切換語言**:
   - 點擊語言選擇器
   - 選擇不同語言 (英文、繁體中文等)
2. **驗證 UI 更新**:
   - 按鈕和標籤應以選定語言顯示
   - WebCrawler 面板應支援選定語言
3. **測試 RTL 語言** (如阿拉伯文):
   - 驗證 UI 布局是否正確反轉

### 場景 4: Metrics 儀表板 ✅

1. **打開應用**
2. **進行查詢**:
   - 上傳文件
   - 提出問題
3. **查看 Metrics**:
   - 驗證實時指標 (查詢時間、Token 使用等)
   - 檢查圖表和統計

### 場景 5: Session 管理 ✅

1. **管理 Sessions**:
   - 建立多個 Session
   - 切換 Session (驗證狀態獨立)
   - 重啟 Session (驗證文檔保留)
   - 關閉 Session (驗證清理)

---

## 📊 測試數據

### 推薦的測試文件

#### 小型測試 (5-10 頁)
```
- Lorem Ipsum 文本 (10KB)
- 簡單 PDF 文檔
- 預期: <30 秒處理時間
```

#### 中型測試 (20-50 頁)
```
- 技術文檔 (100-500KB)
- 維基百科文章
- 預期: 30-120 秒處理時間
```

#### 大型測試 (100+ 頁)
```
- 完整書籍 (1-5MB)
- 產品文檔集合
- 預期: 2-5 分鐘處理時間
```

### 推薦的測試 URL

```
# 簡單網站
https://example.com

# 技術文檔
https://docs.python.org/3/

# 新聞網站
https://news.ycombinator.com

# 知識庫
https://en.wikipedia.org/wiki/Artificial_intelligence
```

---

## 🔍 故障排除

### 問題 1: 後端無法連接 (Port 8000)

**症狀**: `Connection refused` 或 `无法連接到 localhost:8000`

**解決方案**:
```bash
# 驗證容器是否運行
docker ps

# 檢查後端日誌
docker logs rag-chatbot-backend

# 重啟服務
docker-compose restart backend

# 完全重建
docker-compose down -v && docker-compose up -d
```

### 問題 2: Qdrant 連接失敗

**症狀**: `Error connecting to Qdrant` 或向量操作失敗

**解決方案**:
```bash
# 驗證 Qdrant 容器狀態
docker logs rag-chatbot-qdrant

# 測試直接連接
Invoke-WebRequest -Uri http://localhost:6333/health

# 如有必要重啟
docker-compose restart qdrant
```

### 問題 3: 前端構建失敗

**症狀**: npm 錯誤或編譯失敗

**解決方案**:
```bash
cd frontend

# 清理依賴
rm -r node_modules package-lock.json

# 重新安裝
npm install --prefer-offline --no-audit

# 重新啟動開發伺服器
npm run dev
```

### 問題 4: Gemini API 配額已滿

**症狀**: `429 Too Many Requests` 或 `quota exceeded`

**解決方案**:
1. 等待配額重置 (通常 1 小時)
2. 檢查 `.env.local` 中的 API 密鑰
3. 確保 `ENABLE_CONTENT_MODERATION=false` (節省配額)

### 問題 5: 網站爬蟲超時

**症狀**: 爬蟲請求超時或返回錯誤

**解決方案**:
```bash
# 嘗試爬取更小的網站
# 減少 Token 限制 (較少要爬取的頁面)
# 檢查 DNS 配置 (docker-compose.yml)

# 查看日誌
docker logs rag-chatbot-backend | grep -i crawler
```

---

## 📱 瀏覽器兼容性

| 瀏覽器 | 版本 | 狀態 |
|--------|------|------|
| Chrome | 最新 | ✅ 完整支援 |
| Firefox | 最新 | ✅ 完整支援 |
| Safari | 最新 | ✅ 完整支援 |
| Edge | 最新 | ✅ 完整支援 |

---

## 📝 測試檢查清單

### 前置檢查
- [ ] 所有容器運行正常
- [ ] 後端健康檢查通過
- [ ] 前端開發伺服器啟動
- [ ] 瀏覽器可以訪問 http://localhost:5173

### 功能測試
- [ ] 建立新 Session
- [ ] 上傳文件
- [ ] 提出查詢並獲得答案
- [ ] 切換語言
- [ ] 查看 Metrics
- [ ] 測試網站爬蟲
- [ ] 測試多個 Session

### 性能測試
- [ ] 小型文件處理 (<30s)
- [ ] 中型文件處理 (<2min)
- [ ] 網站爬蟲性能
- [ ] 查詢響應時間

### 錯誤處理測試
- [ ] 無效 URL 顯示錯誤
- [ ] 網絡超時處理
- [ ] Token 限制提示
- [ ] Session 清理

---

## 🎯 下一步

1. **開始使用者測試**
   - 按照上面的場景進行測試
   - 記錄任何問題或改進建議

2. **性能基準測試** (可選)
   - 時間小、中、大型文件
   - 記錄 Token 使用情況

3. **語言覆蓋測試** (可選)
   - 測試所有 7 種語言
   - 驗證 RTL 語言的 UI

4. **提交反饋**
   - 記錄 bug 和功能請求
   - 改進 UX 和性能

---

**準備完成！** 🎉 你現在可以開始使用者測試了！

