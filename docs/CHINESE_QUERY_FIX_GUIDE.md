# 中文查詢問題修復指南

## 🔍 問題總結

根據您的報告，系統出現了三個主要問題：

1. **AI 無法回答自己生成的問題** ❌
2. **無法回答時沒有顯示 RAG 參數建議和預設問題** ❌  
3. **中文「愛麗絲是誰」查不到，但英文「Alice」可以** ❌

---

## ✅ 已確認的配置

經過代碼檢查，以下配置已經是優化的狀態：

| 參數 | 當前值 | 狀態 |
|------|--------|------|
| `similarity_threshold` | 0.3 | ✅ 已優化 |
| `retry_threshold` (無結果) | 0.1 | ✅ 已優化 |
| `retry_threshold` (少於3個) | 0.2 | ✅ 已優化 |
| `max_chunks` | 5 | ✅ 合理 |
| `temperature` | 0.1 | ✅ 合理 |

---

## 🎯 根本原因分析

### 問題 1 & 2: 生成的問題無法回答 + 沒有顯示建議

**可能原因：**

1. **LLM 生成的問題與文檔內容語義距離較遠**
   - AI 生成問題時可能用了文檔中沒有的詞彙
   - 例如：生成「為什麼醫生創了了手？」，但文檔可能說「國王和皇后在等妙」

2. **CANNOT_ANSWER 檢測邏輯過嚴**
   - 系統檢測 32 種「無法回答」模式 (lines 732-748)
   - 可能 LLM 用了其他表達方式，導致沒被檢測到

3. **Suggestions 生成失敗**
   - 如果連 fallback search (threshold=0.05) 都找不到結果
   - 或者 LLM 生成建議時失敗

**檢查方法：**
```bash
# 查看後端日誌
tail -f backend/logs/app.log | grep "Response type"
tail -f backend/logs/app.log | grep "Generating suggestions"
```

### 問題 3: 中文查詢效果差

**根本原因：**

1. **Embedding Model 對中文的處理**
   - Gemini `text-embedding-004` 是多語言模型
   - 但對中文的語義理解可能不如英文
   - 特別是短查詢（如「愛麗絲是誰」）

2. **翻譯名稱問題**
   - 原文是 "Alice"
   - 中文翻譯是「愛麗絲」
   - Embedding 可能無法很好地關聯這兩個詞

3. **查詢太簡短**
   - 「愛麗絲是誰」只有5個字
   - 語義信息不足，難以匹配

---

## 💊 解決方案

### 方案 A: 立即測試（推薦）⭐

1. **使用診斷工具**
   ```bash
   python diagnose_chinese_query.py
   ```
   
   輸入您的 session_id，測試不同的查詢

2. **嘗試更好的中文查詢**
   ```
   ❌ 不佳: 愛麗絲是誰
   ✅ 更好: Alice 是一個什麼樣的角色
   ✅ 更好: 故事的主角 Alice 有什麼特點
   ✅ 更好: 請介紹一下 Alice 這個角色
   ```

3. **混合中英文查詢**
   ```
   Alice 的冒險
   Alice 遇到了什麼奇怪的事
   白兔先生和 Alice 的故事
   ```

### 方案 B: 檢查文檔質量

1. **確認文檔內容**
   ```bash
   # 檢查上傳的文檔
   cd docs
   cat "Alices Adventures in wonderland.txt" | head -50
   ```

2. **檢查編碼**
   ```bash
   file -bi "Alices Adventures in wonderland.txt"
   # 應該是: text/plain; charset=utf-8
   ```

3. **檢查是否有亂碼**
   ```python
   with open("docs/Alices Adventures in wonderland.txt", "r", encoding="utf-8") as f:
       content = f.read(1000)
       print(content)
   ```

### 方案 C: 優化系統配置

如果以上方案都無效，可以調整：

#### 1. 降低 Session 的 similarity_threshold

在前端創建 session 時：

```typescript
// frontend/src/services/sessionService.ts
export const createSession = async (language: string = "en"): Promise<Session> => {
  const response = await apiClient.post("/api/sessions", { 
    language,
    similarity_threshold: 0.2  // 🔧 降低閾值
  });
  return response.data;
};
```

#### 2. 增加檢索數量

```python
# backend/src/services/rag_engine.py
self.max_chunks = max_chunks  # 從 5 改為 8 或 10
```

#### 3. 改善 CANNOT_ANSWER 檢測

在 `rag_engine.py` 第 732 行附近，添加更多模式：

```python
cannot_answer_patterns = [
    # 現有模式...
    # 新增更寬鬆的模式
    "不清楚", "不確定", "沒有明確", "不太確定",
    "not clear", "not sure", "unclear", "uncertain"
]
```

### 方案 D: 改善 Prompt Engineering

修改 RAG prompt，使其對短查詢更友好：

```python
# backend/src/services/rag_engine.py 約第 1100 行
prompt = f"""Based on the following document content, answer the user's question.

**IMPORTANT RULES:**
1. If the documents contain information that can help answer the question, even partially, try to provide an answer.
2. For questions like "Who is X?", look for any mentions of X in the documents and describe what you find.
3. Use both exact matches and semantically related content.
4. It's okay to say "According to the documents, X is mentioned as..." even if not all details are clear.

Documents:
{context}

Question: {user_query}

Answer (in {language}):
"""
```

---

## 🧪 測試計劃

### 1. 準備測試數據

使用以下測試查詢（從易到難）：

| 難度 | 查詢 | 預期相似度 |
|------|------|-----------|
| ⭐ | Alice 的故事 | > 0.4 |
| ⭐⭐ | Alice 是什麼樣的角色 | > 0.3 |
| ⭐⭐⭐ | 愛麗絲的冒險 | > 0.25 |
| ⭐⭐⭐⭐ | 愛麗絲是誰 | > 0.2 |

### 2. 執行測試

```bash
# 1. 啟動後端（確保有日誌輸出）
cd backend
python -m src.main

# 2. 在另一個終端運行診斷工具
python diagnose_chinese_query.py

# 3. 記錄每個查詢的:
#    - similarity scores
#    - 找到的結果數量
#    - LLM 回應
#    - response_type
#    - 是否有 suggestions
```

### 3. 驗證 Frontend

1. 開啟 Browser DevTools (F12)
2. 切換到 Network tab
3. 發送查詢
4. 檢查 `/api/sessions/{session_id}/query` 的回應:

```json
{
  "llm_response": "...",
  "response_type": "CANNOT_ANSWER",  // 應該出現
  "suggestions": [                    // 應該有3個建議
    "建議問題 1",
    "建議問題 2", 
    "建議問題 3"
  ],
  "retrieved_chunks": [...],
  "similarity_scores": [0.25, 0.23, 0.21]
}
```

5. 確認 suggestions 有顯示在 UI 上

---

## 📊 預期結果

完成以上步驟後，應該能夠：

✅ **系統能回答中文查詢**
   - 相似度 > 0.2 的查詢應該能找到結果
   - 即使不完全匹配，也能提供相關信息

✅ **顯示 Suggestions**
   - 當 `response_type === "CANNOT_ANSWER"` 時
   - 應該顯示 3 個建議問題
   - 建議問題應該是可回答的

✅ **更好的用戶體驗**
   - 明確告知用戶為什麼無法回答
   - 提供調整參數的建議
   - 引導用戶問更好的問題

---

## 🐛 如果問題持續

### Debug Checklist

- [ ] 後端日誌顯示 `Response type: CANNOT_ANSWER`？
- [ ] 後端日誌顯示 `Generating suggestions for unanswered query...`？
- [ ] Frontend 收到 `suggestions` 陣列？
- [ ] ChatMessage 組件有渲染 suggestion-bubbles？
- [ ] Similarity scores 都 < 0.3？
- [ ] 文檔確實包含相關內容？

### 收集診斷信息

```bash
# 1. 後端版本和配置
cat backend/src/core/config.py | grep -E "(GEMINI|SIMILARITY|CHUNK)"

# 2. 最近的錯誤日誌
tail -100 backend/logs/app.log | grep -E "(ERROR|WARNING)"

# 3. Session 詳細信息
curl http://localhost:8000/api/sessions/{session_id}

# 4. Collection 信息
python -c "
from backend.src.services.vector_store import VectorStore
vs = VectorStore()
info = vs.get_collection_info('session_xxx')
print(f'Vectors: {info.vectors_count}')
"
```

---

## 💡 長期改善建議

1. **混合檢索策略**
   - Vector search (語義)
   - Keyword search (BM25)
   - 混合排序

2. **Query Expansion**
   - 自動擴展短查詢
   - 添加同義詞
   - 使用 LLM 重寫查詢

3. **文檔預處理**
   - 添加關鍵詞索引
   - 生成文檔摘要
   - 提取實體（人名、地名等）

4. **用戶指導**
   - 顯示範例問題
   - 提供查詢建議
   - 顯示相似度分數（debug 模式）

5. **A/B Testing**
   - 測試不同的 threshold 設定
   - 比較不同的 prompt 模板
   - 評估用戶滿意度

---

## 📞 需要協助？

如果以上方案都無法解決問題，請提供：

1. **後端日誌**（最近 100 行）
2. **診斷工具輸出**
3. **具體的查詢和回應**
4. **Session ID**
5. **文檔名稱和大小**

我會進一步協助您診斷和修復問題。

---

**建立日期**: 2026-01-18  
**版本**: 1.0.0  
**維護者**: Development Team
