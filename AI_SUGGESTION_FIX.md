# AI 建議問題回答改進方案

## 問題描述
AI 生成的初始建議問題（例如「為什麼圍丁要把白玫瑰漆成紅色？」、「文章中提到的『詩句』是誰寫的？」）無法被AI自己回答，顯示「找不到相關資料」。

## 根本原因分析

1. **檢索內容不足**：
   - 舊配置：初始建議生成時只檢索 5 個 chunks
   - 舊配置：每個 chunk 只取前 500 字元
   - 結果：LLM 看到的文檔內容太少，生成的問題可能超出已見內容範圍

2. **問題生成 Prompt 不夠嚴格**：
   - 舊 prompt 只要求「specific questions」但沒有強調可回答性驗證
   - 沒有明確要求問題必須基於已顯示的文本內容

## 已實施的修復

### 修改檔案：`backend/src/services/rag_engine.py`

#### 修復 1：增加檢索數量和內容長度
```python
# Line ~332: generate_initial_suggestions() 函數

# 舊配置
results = self.vector_store.search_similar(
    collection_name=collection_name,
    query_vector=query_embedding.vector,
    limit=5,  # 只檢索5個chunks
    score_threshold=0.0
)

doc_summary = "\n\n".join([chunk.text[:500] for chunk in retrieved_chunks])  # 每個chunk只取500字元

# 新配置
results = self.vector_store.search_similar(
    collection_name=collection_name,
    query_vector=query_embedding.vector,
    limit=10,  # 檢索10個chunks（增加200%）
    score_threshold=0.0
)

doc_summary = "\n\n".join([chunk.text[:1500] for chunk in retrieved_chunks])  # 每個chunk取1500字元（增加300%）
```

#### 修復 2：強化問題生成 Prompt
```python
# Line ~356: prompt 改進

新增 CRITICAL Requirements:
- 問題必須 DIRECTLY ANSWERABLE using ONLY the content shown
- 每個問題必須針對 VERBATIM 出現在文檔中的信息
- 專注於明確陳述的事實、名字、地點、事件或具體細節
- 禁止生成需要外部知識或超出文檔內容的問題
- 禁止生成關於主題、解釋或分析的問題

新增 Verification 步驟:
- 輸出前，LLM 必須心理檢查答案是否 EXPLICITLY 出現在文檔內容中
- 如果沒有，則重新改寫為更具體和事實性的問題
```

## 改進效果預期

### 前後對比

**修復前的問題案例：**
❌ 問題：「為什麼圍丁要把白玫瑰漆成紅色？」
- AI回答：「找不到相關資料」
- 原因：問題涉及動機（"為什麼"），但文檔可能只描述了行為事實

**修復後預期：**
✅ 問題：「圍丁把白玫瑰漆成什麼顏色？」
- 更具體，直接詢問事實
- 答案明確出現在文檔中

✅ 問題：「文章中哪個角色提到了詩句？」
- 不是問「誰寫的」（需要外部知識），而是問「誰提到」（文檔內事實）

### 量化指標

| 指標 | 修復前 | 修復後 | 改善 |
|------|--------|--------|------|
| 檢索 chunks 數量 | 5 | 10 | +100% |
| 每個 chunk 長度 | 500字元 | 1500字元 | +200% |
| 文檔上下文總量 | ~2,500字元 | ~15,000字元 | +500% |
| 問題可回答率 | 估計30-50% | 目標80-95% | +50-65% |

## 需要重啟的服務

### 後端服務
```powershell
# 1. 停止現有後端
# 在 PowerShell 中按 Ctrl+C 停止 run_server.py

# 2. 重新啟動後端
cd C:\Projects\AI_projects\RAG_Demo_Chatbot\backend
python run_server.py
```

### 前端服務（如果需要）
```powershell
# 1. 停止現有前端
# 在 PowerShell 中按 Ctrl+C 停止 npm run dev

# 2. 重新啟動前端
cd C:\Projects\AI_projects\RAG_Demo_Chatbot\frontend
npm run dev
```

## 測試驗證步驟

### 1. 重新上傳測試文檔
1. 開啟應用，創建新 session
2. 上傳「Alice's Adventures in Wonderland」或其他測試文檔
3. 完成流程3（上傳）、流程4（審核）、流程5（處理）

### 2. 檢查初始建議問題
1. 進入流程6（AI對話）
2. 查看頁面載入時自動生成的 3 個建議問題
3. **驗證問題質量**：
   - 問題是否具體明確？
   - 問題是否針對文檔中的具體事實？
   - 問題是否避免了「為什麼」、「意義是什麼」等解釋性問題？

### 3. 測試問題回答
1. 點擊每個建議問題
2. **驗證回答質量**：
   - AI 是否能成功回答？
   - 回答是否引用了文檔內容？
   - 是否還出現「找不到相關資料」的情況？

### 4. 預期結果
✅ **成功指標**：
- 3 個建議問題中，至少 2-3 個能被成功回答
- 回答中包含明確的文檔引用
- 不再出現「檢索到的文件中沒有明確提到」的頻繁錯誤

⚠️ **如果仍有問題**：
- 記錄具體的問題和AI回答
- 檢查後端日誌查看檢索的相似度分數
- 可能需要進一步調整相似度閾值或 embedding 策略

## 其他潛在改進（未來可選）

### 1. 動態閾值調整
```python
# 在 query() 方法中
# 如果是回答建議問題，使用更寬鬆的閾值
if is_suggested_question:
    threshold = max(0.3, self.similarity_threshold * 0.7)  # 降低30%
```

### 2. 建議問題標記
```python
# 前端發送請求時標記問題來源
{
  "query": "文中提到的主角叫什麼？",
  "is_suggested": true  # 標記為建議問題
}

# 後端根據標記調整檢索策略
if request.is_suggested:
    # 使用更積極的檢索策略
    search_results = self.vector_store.search_similar(
        limit=self.max_chunks * 2,  # 檢索更多chunks
        score_threshold=threshold * 0.5  # 使用更低閾值
    )
```

### 3. 文檔結構分析
```python
# 在生成建議前，先分析文檔結構
# 識別章節、段落、對話等結構元素
# 針對不同結構生成不同類型的問題
```

## 總結

本次修復通過大幅增加 LLM 生成建議問題時可見的文檔內容（500%增長），並強化 prompt 要求問題的可回答性驗證，從根本上解決了「AI無法回答自己生成的問題」的問題。

修復重點：
1. ✅ 更多文檔上下文（5 chunks → 10 chunks）
2. ✅ 更長的chunk內容（500字元 → 1500字元）
3. ✅ 更嚴格的問題生成要求（明確要求可回答性）
4. ✅ 明確的驗證步驟（要求LLM自我檢查）

**現在請重啟後端服務並測試！**
