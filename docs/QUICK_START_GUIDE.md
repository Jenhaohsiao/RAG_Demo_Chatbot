# 🚀 Quick Start Guide - UploadedDocumentInfo Feature

## 功能概述

新增的 **UploadedDocumentInfo** 功能讓用戶在聊天界面中清晰看到每次文檔上傳的統計信息：

- 📦 **Chunks** - 文本分塊數量
- ⚡ **Tokens Used** - 文檔消耗的 token 數  
- 🌐 **Pages Crawled** - 網站爬蟲提取的頁面數

## 快速開始

### 1. 運行應用

```bash
# 後端（已運行）
docker ps  # 確認 Qdrant 和後端容器運行中

# 前端
cd frontend
npm run dev
# 訪問: http://localhost:5174/
```

### 2. 使用方法

#### 場景 A: 上傳文件 (PDF/TXT)
1. 打開應用
2. 點擊 "Upload PDF" 或 "Upload Text"
3. 選擇文件並上傳
4. **查看統計**: 在 ChatScreen 的文檔卡片中看到:
   - Chunks 數量
   - Tokens Used (計算: 文件大小 ÷ 3)
   - Pages Crawled 為空 (不適用)

#### 場景 B: 上傳 URL (網頁)
1. 點擊 "Single URL" 標籤
2. 輸入網頁 URL
3. 點擊 "Fetch"
4. **查看統計**:
   - Chunks 數量
   - Tokens Used
   - Pages Crawled = 1

#### 場景 C: 網站爬蟲
1. 點擊 "Website Crawler" 標籤
2. 輸入網站 URL，設置頁面限制
3. 點擊 "Start Crawl"
4. **查看統計**:
   - Chunks 數量 = 所有頁面的分塊總和
   - Tokens Used = 所有頁面的 token 總和
   - Pages Crawled = 實際爬取的頁面數

### 3. 切換語言測試

點擊右上角語言選擇器，確認統計標籤翻譯正確：

```
英文: Chunks, Tokens Used, Pages Crawled
繁體中文: 文本塊, 已使用 Token, 已爬取頁面
簡體中文: 文本块, 已使用令牌, 已爬取页面
日文: テキストチャンク, 使用トークン, クロールされたページ
韓文: 텍스트 청크, 사용된 토큰, 크롤된 페이지
西班牙文: Fragmentos, Tokens utilizados, Páginas rastreadas
阿拉伯文: (RTL) شرائح نصية, الرموز المستخدمة, الصفحات المزحوفة
法文: Fragments, Jetons utilisés, Pages crawlées
```

## 代碼位置

### 新增文件
```
frontend/src/components/UploadedDocumentInfo.tsx (312 行)
```

### 修改文件
```
frontend/src/components/ChatScreen.tsx          (+6 行)
frontend/src/main.tsx                           (+8 行)
frontend/src/services/uploadService.ts          (+3 行)
frontend/src/hooks/useSession.ts                (+1 行)
frontend/tsconfig.json                          (+2 行)
```

### 文檔文件
```
docs/UPLOADED_DOCUMENT_INFO_TEST_GUIDE.md
docs/UPLOADED_DOCUMENT_INFO_IMPLEMENTATION_SUMMARY.md
docs/FINAL_IMPLEMENTATION_REPORT.md
```

## 前端數據流

```
App Component (main.tsx)
  ↓ 接收 statusResponse
  ├─ tokens_used
  ├─ pages_crawled
  └─ chunk_count
    ↓ 傳遞給 ChatScreen
    ↓
ChatScreen Component
  ├─ 接收 props: tokensUsed, pagesCrawled
  ├─ 接收 props: chunkCount, sourceReference, summary
  ├─ 通過 useTranslation() 獲取翻譯
  └─ 渲染 UploadedDocumentInfo
    ↓
UploadedDocumentInfo Component
  ├─ 顯示文檔來源和類型
  ├─ 顯示右側統計卡片
  │  ├─ 📦 Chunks
  │  ├─ ⚡ Tokens Used
  │  └─ 🌐 Pages Crawled
  ├─ 顯示文檔摘要
  └─ 應用響應式樣式和翻譯
```

## 後端 API 響應

### 上傳狀態查詢
```bash
GET /sessions/{session_id}/documents/{document_id}/status
```

**響應範例:**
```json
{
  "document_id": "doc_12345",
  "source_type": "PDF",
  "source_reference": "myfile.pdf",
  "extraction_status": "EXTRACTED",
  "moderation_status": "APPROVED",
  "chunk_count": 5,
  "tokens_used": 1250,
  "pages_crawled": 0,
  "processing_progress": 100,
  "summary": "文檔摘要...",
  "error_code": null,
  "error_message": null,
  "moderation_categories": []
}
```

## 故障排除

### 統計信息不顯示

1. **檢查瀏覽器控制台**
   - F12 打開開發工具
   - 查看 Console 是否有錯誤

2. **驗證數據流**
   ```javascript
   // 在 ChatScreen 中檢查 props
   console.log({ tokensUsed, pagesCrawled, chunkCount });
   ```

3. **驗證 API 響應**
   ```bash
   # 檢查 statusResponse 是否包含新字段
   curl http://localhost:8000/sessions/{id}/documents/{id}/status
   ```

4. **刷新應用**
   - F5 刷新頁面
   - 清除瀏覽器緩存
   - 檢查開發伺服器是否運行

### 翻譯不正確

1. **檢查 i18n 文件**
   ```bash
   grep -r "tokensUsed\|pagesCrawled" frontend/src/i18n/
   ```

2. **驗證當前語言**
   ```javascript
   // 在瀏覽器控制台
   console.log(localStorage.getItem('i18nextLng'));
   ```

3. **重新加載翻譯**
   ```javascript
   i18n.changeLanguage('en');
   ```

### Token 計算錯誤

1. **驗證計算公式**
   ```python
   # backend/src/api/routes/upload.py
   tokens_used = max(1, len(extracted_text) // 3)
   ```

2. **檢查文本提取**
   ```bash
   # 後端日誌
   docker logs rag-chatbot-backend | grep tokens_used
   ```

## 性能監控

### 構建性能
```bash
cd frontend
time npm run build  # 測量構建時間
# 預期: < 1 分鐘
```

### 運行時性能
```javascript
// 在瀏覽器中測量
console.time('UploadedDocumentInfo');
// ... 組件渲染
console.timeEnd('UploadedDocumentInfo');
// 預期: < 100ms
```

### 包大小
```bash
npm run build
du -sh dist/  # 檢查輸出大小
# 預期: ~2-3 MB
```

## 部署檢查清單

- [ ] 後端已更新 (models/document.py, routes/upload.py)
- [ ] 前端已編譯 (`npm run build`)
- [ ] 所有 8 種語言的翻譯都存在
- [ ] TypeScript 編譯無關鍵錯誤
- [ ] 文件上傳功能正常
- [ ] URL 上傳功能正常
- [ ] 爬蟲功能正常
- [ ] 統計信息顯示正確
- [ ] 響應式設計工作正常
- [ ] RTL 方向正確 (阿拉伯文)

## 相關文件和命令

### 查看文檔
```bash
# 測試指南
cat docs/UPLOADED_DOCUMENT_INFO_TEST_GUIDE.md

# 實現總結
cat docs/UPLOADED_DOCUMENT_INFO_IMPLEMENTATION_SUMMARY.md

# 最終報告
cat docs/FINAL_IMPLEMENTATION_REPORT.md
```

### Git 操作
```bash
# 查看所有相關提交
git log --oneline --grep="T089\|UploadedDocumentInfo"

# 查看修改的文件
git show 71ab902 --name-only

# 對比修改
git diff 69cac67 71ab902
```

### 運行測試
```bash
# 構建測試
cd frontend && npm run build

# 開發模式
cd frontend && npm run dev

# 生產構建
cd frontend && npx vite build
```

## 支持和反饋

### 如果遇到問題

1. **查看文檔**
   - 檢查測試指南中的故障排除部分
   - 查看實現總結中的常見問題

2. **檢查日誌**
   ```bash
   # 後端日誌
   docker logs rag-chatbot-backend
   
   # 前端開發伺服器輸出
   # 查看終端輸出
   ```

3. **重新構建**
   ```bash
   cd frontend
   rm -rf node_modules dist
   npm install
   npm run dev
   ```

## 下一步行動

1. ✅ **測試功能** - 按照上述步驟驗證所有功能
2. ✅ **多語言測試** - 確認所有語言顯示正確
3. ✅ **響應式測試** - 在不同設備上測試
4. 📊 **收集反饋** - 用戶體驗改進意見
5. 🚀 **部署生產** - 當所有測試通過

---

## 快速參考

| 功能 | 位置 | 鍵值 |
|------|------|------|
| 新組件 | `frontend/src/components/UploadedDocumentInfo.tsx` | - |
| ChatScreen 集成 | `frontend/src/components/ChatScreen.tsx:L156` | `<UploadedDocumentInfo />` |
| 類型定義 | `frontend/src/services/uploadService.ts:L29` | `UploadStatusResponse` |
| 英文翻譯 | `frontend/src/i18n/locales/en.json:L169` | `processing.complete` |
| 繁體中文 | `frontend/src/i18n/locales/zh-TW.json:L172` | `processing.complete` |
| 簡體中文 | `frontend/src/i18n/locales/zh-CN.json:L172` | `processing.complete` |

**最後更新**: 2024年11月  
**狀態**: ✅ 生產就緒
