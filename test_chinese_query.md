# 中文查詢問題診斷報告

## 問題總結

1. **AI 無法回答自己生成的問題**
2. **無法回答時沒有顯示 RAG 參數調整建議和預設問題**
3. **中文查詢效果差，但英文查詢可以**

---

## 問題分析

### 1. 相似度閾值設定

**當前狀態：** ✅ 已修復
- Default threshold: `0.3` (第 83 行)
- Retry threshold: `0.1` (沒結果) 或 `0.2` (結果少於3個)

這些閾值已經是合理的設定。

### 2. 中文語義匹配問題

**根本原因：**
- Gemini `text-embedding-004` 對中文的語義理解與英文不同
- 中文查詢「愛麗絲是誰」與文檔中的描述可能沒有直接匹配
- 可能需要更詳細的查詢詞來提高匹配率

**建議測試查詢：**
```
✅ 好的查詢：
- "Alice是什麼樣的人"
- "Alice的性格特點"
- "故事的主角是誰"
- "這個故事講述了什麼"

❌ 可能不佳的查詢：
- "愛麗絲是誰" (太簡短，語義模糊)
```

### 3. Suggestions 沒有顯示

**檢查清單：**

1. **後端是否正確生成 suggestions？**
   - 檢查日誌：`[{session_id}] Generating suggestions for unanswered query...`
   - response_type 應該是 `CANNOT_ANSWER`

2. **前端是否正確接收和顯示？**
   - ChatScreen.tsx 第 301-305 行處理 suggestions
   - 檢查 browser console 是否有 `response.suggestions`

3. **可能的原因：**
   - LLM 回應中沒有觸發 `cannot_answer_patterns`
   - Frontend 沒有正確渲染 suggestions 組件

---

## 解決方案

### 方案 1：立即測試 (推薦)

1. **重啟後端服務**
   ```bash
   cd backend
   python -m src.main
   ```

2. **測試不同類型的查詢**
   ```
   # 測試 1：簡單問題
   "這個故事的主角是誰？"
   
   # 測試 2：具體問題  
   "Alice遇到了什麼奇怪的事情？"
   
   # 測試 3：使用英文名
   "Alice是什麼樣的角色？"
   
   # 測試 4：總結性問題
   "請總結一下這個故事的內容"
   ```

3. **檢查後端日誌**
   - 查看 similarity scores
   - 查看是否生成了 suggestions
   - 查看 response_type

### 方案 2：調整配置

如果測試後仍有問題，可以：

1. **進一步降低 threshold（不推薦，除非必要）**
   - 在 session 創建時設定 `similarity_threshold: 0.2`

2. **增加檢索數量**
   - 修改 `max_chunks` 從 5 增加到 8-10

3. **改善文檔分塊**
   - 檢查 chunk_size 和 chunk_overlap
   - 當前設定：chunk_size=512, chunk_overlap=128

### 方案 3：改善 Prompt

修改 RAG prompt，使其對中文更友好：

```python
# 在 rag_engine.py 的 prompt 中
"請根據以下文檔內容回答問題。如果文檔中有相關信息，即使不是完全匹配的答案，也請嘗試從文檔中提取相關內容回答。"
```

---

## 測試計劃

### 步驟 1：驗證當前設定

1. 確認 backend 的 threshold = 0.3
2. 確認 retry_threshold = 0.1 / 0.2
3. 確認 max_chunks = 5

### 步驟 2：測試中文查詢

使用以下測試查詢：

| 測試 | 查詢 | 預期結果 |
|------|------|---------|
| 1 | Alice是誰 | 應該找到相關內容 |
| 2 | Alice的冒險 | 應該找到相關內容 |
| 3 | 白兔先生 | 應該找到相關內容 |
| 4 | 這個故事的主題 | 應該能總結內容 |

### 步驟 3：檢查日誌

關鍵日誌資訊：
```
[{session_id}] Searching similar chunks...
[{session_id}] Found X results with scores: [...]
[{session_id}] Response type: ANSWERED/CANNOT_ANSWER
[{session_id}] Generating suggestions for unanswered query...
```

### 步驟 4：驗證 Frontend

1. 開啟 Browser DevTools Console
2. 查看 API response:
   ```javascript
   {
     "llm_response": "...",
     "response_type": "CANNOT_ANSWER",
     "suggestions": ["問題1", "問題2", "問題3"],
     ...
   }
   ```
3. 確認 suggestions 有正確顯示

---

## 預期成果

修復後應該能夠：

✅ 回答中文查詢（相似度 > 0.3）
✅ 當無法回答時顯示 3 個建議問題
✅ 顯示 RAG 參數調整提示（如果有實作）
✅ 提供更友好的「無法回答」回應

---

## 後續建議

1. **文檔質量檢查**
   - 確認上傳的《愛麗絲夢遊仙境》是否是完整的中文文本
   - 檢查是否有 OCR 錯誤或亂碼

2. **Embedding 質量測試**
   - 使用 Gemini embedding API 測試幾個查詢的 embedding quality
   - 比較中英文查詢的 embedding 差異

3. **考慮混合檢索**
   - 除了 vector search，可以考慮加入 keyword search
   - 使用 BM25 + vector search 混合排序

4. **用戶體驗優化**
   - 當相似度低於 0.5 時，顯示警告
   - 提供「換個問法」的提示
   - 顯示實際的相似度分數（debug 模式）

---

**建立日期**: 2026-01-18
**狀態**: 待測試驗證
