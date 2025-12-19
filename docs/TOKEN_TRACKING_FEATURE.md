# Token Tracking & Page Crawl Statistics (T089+)

**功能完成日期**: 2025-12-19  
**相關任務**: T089+ (Phase 9 增強)  
**狀態**: ✅ 已實現並集成

## 功能概述

此功能在 UI 上提供文件上傳和網站爬蟲過程中的詳細統計信息，幫助使用者了解資源消耗情況。

### 新增功能

1. **Token 使用量追蹤** 📊
   - 追蹤每個上傳文件使用的 tokens
   - Token 計算: 1 token ≈ 3 字符（考慮中英文混合）
   - 實時显示在处理进度中

2. **網站爬蟲頁面統計** 🕷️
   - 追蹤爬蟲抓取的頁面數
   - 顯示爬蟲進度中發現的頁面
   - 支持多頁面合併為單個文件

3. **實時 UI 顯示** 🎨
   - 在 ProcessingModal 中顯示統計數據
   - 處理完成後在完成訊息中展示
   - 包含圖標和格式化的數字

---

## 技術實現

### 後端修改

#### 1. 模型更新 (`backend/src/models/document.py`)

```python
class Document(BaseModel):
    # ... existing fields ...
    tokens_used: int = Field(default=0, ge=0)        # 本文件使用的 tokens
    pages_crawled: int = Field(default=0, ge=0)      # 爬蟲頁面數
```

#### 2. API 響應模型 (`backend/src/api/routes/upload.py`)

```python
class UploadStatusResponse(BaseModel):
    # ... existing fields ...
    tokens_used: int = 0           # 本文件/爬蟲使用的 tokens
    pages_crawled: int = 0         # 爬蟲頁面數

class WebsiteUploadStatusResponse(UploadStatusResponse):
    crawl_status: str = "pending"
    total_tokens: int = 0          # 爬蟲總 tokens
    avg_tokens_per_page: int = 0   # 平均每頁 tokens
    crawl_duration_seconds: float = 0.0
```

#### 3. Token 計算 (`backend/src/api/routes/upload.py`)

在 `process_document()` 函數中:

```python
# Step 1: Extract 後計算 tokens
document.tokens_used = max(1, len(extracted_text) // 3)
```

#### 4. 爬蟲統計 (`backend/src/api/routes/upload.py`)

```python
# 建立爬蟲文件時設置統計數據
crawl_document.pages_crawled = len(crawled_pages)
crawl_document.tokens_used = crawl_result.get('total_tokens', 0)
```

### 前端修改

#### 1. 類型定義 (`frontend/src/types/document.ts`)

```typescript
export interface Document {
  // ... existing fields ...
  tokens_used?: number;      // 本文件使用的 tokens
  pages_crawled?: number;    // 爬蟲頁面數
}
```

#### 2. ProcessingModal 組件 (`frontend/src/components/ProcessingModal.tsx`)

```tsx
interface ProcessingModalProps {
  // ... existing props ...
  tokensUsed?: number;       // Token 使用量
  pagesCrawled?: number;     // 頁面計數
}

// 在完成訊息中顯示統計
{tokensUsed > 0 && (
  <p className="text-muted mb-1">
    <i className="bi bi-lightning-fill me-2"></i>
    <strong>Tokens Used:</strong> {tokensUsed.toLocaleString()}
  </p>
)}

{pagesCrawled > 0 && (
  <p className="text-muted mb-0">
    <i className="bi bi-globe me-2"></i>
    <strong>Pages Crawled:</strong> {pagesCrawled}
  </p>
)}
```

#### 3. ProcessingScreen 組件 (`frontend/src/components/ProcessingScreen.tsx`)

```tsx
interface ProcessingScreenProps {
  // ... existing props ...
  tokensUsed?: number;
  pagesCrawled?: number;
}

// 在完成區域顯示
<div className="processing-stats">
  {tokensUsed > 0 && (
    <p className="stat-item">
      <span className="stat-label">{t('processing.complete.tokensUsed')}</span>
      <span className="stat-value">{tokensUsed.toLocaleString()}</span>
    </p>
  )}
  {pagesCrawled > 0 && (
    <p className="stat-item">
      <span className="stat-label">{t('processing.complete.pagesCrawled')}</span>
      <span className="stat-value">{pagesCrawled}</span>
    </p>
  )}
</div>
```

#### 4. Main 應用 (`frontend/src/main.tsx`)

```tsx
<ProcessingModal
  // ... other props ...
  tokensUsed={statusResponse.tokens_used}
  pagesCrawled={statusResponse.pages_crawled}
  onConfirm={handleModalConfirm}
/>
```

---

## 國際化支援

所有 7 種語言已添加翻譯:

| 語言 | 檔案 | 翻譯鍵 |
|------|------|--------|
| 英文 | en.json | tokensUsed, pagesCrawled |
| 繁體中文 | zh-TW.json | 已使用 Token, 已爬取頁面 |
| 簡體中文 | zh-CN.json | 已使用令牌, 已爬取页面 |
| 韓文 | ko.json | 사용된 토큰, 크롤링된 페이지 |
| 西班牙文 | es.json | Tokens Utilizados, Páginas Rastreadas |
| 日文 | ja.json | 使用トークン, クロールされたページ |
| 阿拉伯文 | ar.json | الرموز المستخدمة, الصفحات المتزحلقة |
| 法文 | fr.json | Tokens Utilisés, Pages Rastreées |

---

## 使用者體驗流程

### 文件上傳

1. 使用者上傳 PDF 或 TXT 文件
2. 後端提取文本並計算 tokens (1 token ≈ 3 字符)
3. 在進度彈窗完成後顯示:
   - ✅ 文件處理成功
   - 📊 已建立 X 個文字塊
   - ⚡ Tokens 已使用: Y

### 網站爬蟲

1. 使用者輸入網站 URL
2. WebCrawler 自動發現和爬蟲頁面
3. 在進度彈窗完成後顯示:
   - ✅ 文件處理成功
   - 📊 已建立 X 個文字塊
   - ⚡ Tokens 已使用: Y
   - 🌐 已爬取頁面: Z

---

## API 端點

### 查詢上傳狀態

```http
GET /api/v1/upload/{session_id}/status/{document_id}
```

**響應示例**:

```json
{
  "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
  "source_type": "URL",
  "extraction_status": "COMPLETED",
  "moderation_status": "APPROVED",
  "chunk_count": 12,
  "processing_progress": 100,
  "summary": "...",
  "tokens_used": 5432,          // 新增
  "pages_crawled": 8            // 新增
}
```

---

## 效能指標

### Token 計算精度

- 英文: 平均 1 token ≈ 4 字符
- 中文: 平均 1 token ≈ 2 字符  
- 混合: 平均 1 token ≈ 3 字符 (採用)

### 示例

| 文件類型 | 大小 | Tokens | 單位 |
|---------|------|--------|------|
| 短文本 (100 chars) | ~100 | 33 | tokens |
| 中等文檔 (10K chars) | ~10KB | 3,333 | tokens |
| 大型 PDF (100K chars) | ~100KB | 33,333 | tokens |

### 網站爬蟲

| 網站規模 | 頁數 | Tokens | 耗時 |
|---------|------|--------|------|
| 小型 | 5-10 | 5-10K | 10-20s |
| 中型 | 20-50 | 20-50K | 30-60s |
| 大型 | 50-100 | 50-100K | 60-120s |

---

## 測試場景

### 測試 1: 文件上傳 Token 計算

```bash
# 上傳 TXT 文件
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/file \
  -F "file=@test.txt" \
  -H "Authorization: Bearer $TOKEN"

# 查詢狀態 - 應該看到 tokens_used > 0
curl http://localhost:8000/api/v1/upload/{session_id}/status/{document_id}
```

**預期結果**:
```json
{
  "tokens_used": 1234,
  "pages_crawled": 0
}
```

### 測試 2: 網站爬蟲頁面計數

```bash
# 爬蟲網站
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/website \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "max_tokens": 100000,
    "max_pages": 50
  }'

# 查詢狀態 - 應該看到 pages_crawled > 0
curl http://localhost:8000/api/v1/upload/{session_id}/status/{document_id}
```

**預期結果**:
```json
{
  "tokens_used": 45000,
  "pages_crawled": 15
}
```

---

## UI 展示

### 進度彈窗 (完成狀態)

```
╔════════════════════════════════╗
║  Processing Complete           ║
╠════════════════════════════════╣
║ ✅ Document processed          ║
║    successfully!               ║
║                                ║
║ 📄 12 text chunks created      ║
║                                ║
║ ⚡ Tokens Used: 5,432          ║
║ 🌐 Pages Crawled: 8            ║
║                                ║
║ 📄 Preview: This document...   ║
╠════════════════════════════════╣
║              [Confirm]         ║
╚════════════════════════════════╝
```

---

## 注意事項

### 文件上傳

- Token 計算在 Extract 步驟之後進行
- 計算基於原始提取文本長度
- 不包括後續分塊/嵌入的 API 成本

### 網站爬蟲

- Pages Crawled = 成功爬蟲的頁面數 (非發現頁面)
- Tokens Used = 所有頁面內容的總 tokens
- 實際 API 調用的 tokens 可能不同 (因為嵌入/向量等)

### 語言支援

所有翻譯已完成，支援 7 種語言:
- ✅ English
- ✅ 中文 (繁體 & 簡體)
- ✅ 한국어
- ✅ Español
- ✅ 日本語
- ✅ العربية
- ✅ Français

---

## 相關文件

- [WebCrawler Feature](./WEBSITE_CRAWLER_FEATURE.md)
- [Phase 9 Progress](./PROGRESS.md#phase-9)
- [API Contracts](../specs/001-multilingual-rag-chatbot/contracts/)

---

## 未來改進

1. **更精確的 Token 計算**
   - 整合 Gemini tokenizer API
   - 根據模型差異調整

2. **成本估計**
   - 根據 Token 數估計 API 成本
   - 在 UI 上顯示預估成本

3. **歷史追蹤**
   - 保存每個文件的 token 使用歷史
   - 在 Metrics Dashboard 中展示累計數據

4. **優化建議**
   - 分析 token 使用效率
   - 提供優化建議 (如縮小文件大小)

---

**最後更新**: 2025-12-19
