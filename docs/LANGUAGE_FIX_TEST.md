# LLM 語言回應修復測試指南

## 問題描述
在流程6（AI對談）中，LLM 沒有根據 UI 語言設定來回應，總是使用英文回答。

## 修復內容
修改了 `frontend/src/components/AiChatStep/AiChatStep.tsx` 第 161 行，在調用 `submitQuery()` 時傳遞當前語言：

```typescript
// 修改前
return await submitQuery(sessionId, query);

// 修改後
return await submitQuery(sessionId, query, i18n.language);
```

## 測試步驟

### 1. 重啟前端服務
修改了前端代碼後，需要重啟前端開發服務器：

```powershell
# 如果前端正在運行，先停止 (Ctrl+C)
cd frontend
npm run dev
```

### 2. 測試不同語言的 LLM 回應

#### 測試繁體中文
1. 打開瀏覽器訪問 http://localhost:5174
2. 在右上角切換語言為「繁體中文」
3. 完成流程 1-5（上傳文檔、設定參數等）
4. 到達流程 6（AI 對談）
5. 輸入中文問題，例如：「Humble Bundle 有什麼？」
6. **預期結果**：LLM 應該用繁體中文回答

#### 測試英文
1. 切換語言為「English」
2. 輸入英文問題，例如："What is Humble Bundle?"
3. **預期結果**：LLM 應該用英文回答

#### 測試韓文
1. 切換語言為「한국어」
2. 輸入韓文問題，例如："Humble Bundle은 무엇입니까?"
3. **預期結果**：LLM 應該用韓文回答

#### 測試其他語言
支援的語言包括：
- 繁體中文 (zh-TW)
- 簡體中文 (zh-CN)
- English (en)
- 한국어 (ko)
- Español (es)
- 日本語 (ja)
- العربية (ar)
- Français (fr)

### 3. 驗證要點

✅ **成功標準**：
- LLM 回應的語言與 UI 顯示的語言一致
- 切換語言後，新的對話應使用新語言回應
- 瀏覽器控制台中應顯示正確的語言代碼：
  ```
  [chatService] Submitting query with language: zh
  ```

❌ **失敗標準**：
- LLM 回應的語言與 UI 語言不一致
- 無論 UI 語言如何，LLM 都只用英文回答

## 技術說明

### 前端流程
1. 用戶選擇 UI 語言 → `i18n.language` 更新
2. 用戶發送聊天訊息 → `AiChatStep` 調用 `submitQuery(sessionId, query, i18n.language)`
3. `chatService.submitQuery()` 發送 POST 請求到 `/api/v1/chat/${sessionId}/query`，包含 `language` 參數

### 後端流程
1. `chat.py` 接收請求，提取 `language` 參數（預設為 "en"）
2. 調用 `rag_engine.query()`，傳遞 `language` 參數
3. RAG 引擎根據語言代碼構建多語言 prompt
4. LLM 根據 prompt 中的語言指示生成回應

### 語言映射
```python
language_names = {
    "zh": "Traditional Chinese (繁體中文)",
    "en": "English",
    "ko": "Korean (한국어)",
    "es": "Spanish (Español)",
    "ja": "Japanese (日本語)",
    "ar": "Arabic (العربية)",
    "fr": "French (Français)"
}
```

## 故障排除

### 問題：LLM 仍然只用英文回答
**可能原因**：
1. 前端未重啟，使用舊代碼
2. 瀏覽器緩存未清除

**解決方法**：
```powershell
# 重啟前端
cd frontend
npm run dev

# 清除瀏覽器緩存並重新載入頁面 (Ctrl+Shift+R)
```

### 問題：某些語言效果不好
**可能原因**：
1. LLM 對某些語言的支援程度不同
2. 自定義 prompt 未正確支援該語言

**解決方法**：
- 檢查 `backend/src/services/rag_engine.py` 中的語言映射
- 確認 LLM 模型（Gemini 2.0 Flash）支援該語言

### 問題：控制台顯示語言代碼錯誤
**檢查**：
```javascript
// 在瀏覽器控制台執行
console.log(i18n.language);
```

應該顯示正確的語言代碼（zh, en, ko, es, ja, ar, fr）。

## 相關文件
- `frontend/src/components/AiChatStep/AiChatStep.tsx` - AI 對談組件
- `frontend/src/services/chatService.ts` - 聊天服務 API 客戶端
- `backend/src/api/routes/chat.py` - 聊天 API 路由
- `backend/src/services/rag_engine.py` - RAG 引擎（prompt 構建）

## 測試完成確認
- [ ] 繁體中文測試通過
- [ ] 英文測試通過
- [ ] 韓文測試通過
- [ ] 其他語言測試通過（至少測試一種）
- [ ] 語言切換功能正常
- [ ] 控制台無錯誤訊息
