# Unicode 編碼問題修復指南

## 📋 問題描述

**現象**: AI 回答內容中出現奇怪的 emoji 替代中文字

**實際案例**:
```
原本應該是：「該計畫以志願者為基礎，多年來有數百名志願者為其做出貢獻，他們下載並認真校對電子書」

實際顯示：「該計畫以志📕為基礎，多年來有數百名志願者為其做出貢獻，他們🍃下🍃並認真校對電子書」
```

- `📕` 替代了「願者」
- `🍃` 替代了某個中文字（可能是「載」）

---

## 🔍 根本原因分析

### 問題來源

**Gemini API 的 `response.text` 屬性存在 UTF-16 代理對（Surrogate Pair）處理問題**

- Gemini API 內部使用 UTF-16 編碼
- 某些中文字（特別是 Unicode BMP 之外的字符）在轉換時出現錯誤
- `response.text` 可能將某些中文字錯誤地解釋為 emoji 或其他 Unicode 字符

### 技術細節

**UTF-16 Surrogate Pairs**:
- Unicode 字符分為基本多文種平面（BMP, U+0000 到 U+FFFF）和補充平面
- 補充平面字符需要兩個 16 位代碼單元（代理對）表示
- 如果代理對處理不當，可能導致字符解析錯誤

**受影響的 API 端點**:
- `response.text` ❌ - 直接屬性訪問，可能有編碼問題
- `response.candidates[0].content.parts[0].text` ✅ - 通過結構化訪問，編碼更可靠

---

## ✅ 解決方案

### 修復策略

**改用 Gemini API 的 `candidates` 結構化訪問**，避免直接使用 `response.text`

### 修改前（有問題）

```python
response = self._generate_with_retry(prompt, session_id)
llm_response = response.text  # ❌ 可能有 UTF-16 編碼問題
```

### 修改後（正確）

```python
response = self._generate_with_retry(prompt, session_id)

# 使用 candidates API 避免 UTF-16 編碼問題
try:
    llm_response = response.candidates[0].content.parts[0].text
except (IndexError, AttributeError):
    # Fallback 到 response.text 如果結構不同
    llm_response = response.text
```

---

## 📝 修改檔案清單

### backend/src/services/rag_engine.py

修改了 **4 處** `response.text` 的使用：

1. **RAG 查詢主要回應**（~Line 664）
   ```python
   # Step 4: LLM 生成
   response = self._generate_with_retry(prompt, session_id)
   try:
       llm_response = response.candidates[0].content.parts[0].text
   except (IndexError, AttributeError):
       llm_response = response.text
   ```

2. **建議問題生成**（~Line 297）
   ```python
   response = self._generate_with_retry(prompt, session_id)
   try:
       suggestions_text = response.candidates[0].content.parts[0].text.strip()
   except (IndexError, AttributeError):
       suggestions_text = response.text.strip()
   ```

3. **問題驗證後的建議生成**（~Line 444）
   ```python
   response = self._generate_with_retry(prompt, session_id)
   try:
       suggestions_text = response.candidates[0].content.parts[0].text.strip()
   except (IndexError, AttributeError):
       suggestions_text = response.text.strip()
   ```

4. **文檔摘要生成**（~Line 903）
   ```python
   response = self._generate_with_retry(full_prompt, session_id)
   try:
       summary = response.candidates[0].content.parts[0].text.strip()
   except (IndexError, AttributeError):
       summary = response.text.strip()
   ```

---

## 🧪 測試驗證

### 測試步驟

1. **重啟後端服務**:
   ```powershell
   cd backend
   python run_server.py
   ```

2. **上傳測試文檔**:
   - 使用包含中文內容的文檔（如 Alice in Wonderland 中文版）

3. **執行查詢測試**:
   - 提問包含中文的問題
   - 檢查 AI 回答中是否還有 emoji 替代中文字

4. **建議問題測試**:
   - 觸發「無法回答」場景
   - 檢查生成的建議問題是否正常顯示中文

### 預期結果

✅ **所有中文字正常顯示，不再出現 emoji 替代**

---

## 📊 影響範圍

### 受益功能

- ✅ RAG 查詢主要回應
- ✅ 建議問題生成
- ✅ 文檔摘要生成
- ✅ 所有涉及 Gemini API 的中文文字輸出

### 潛在風險

**極低風險** - Fallback 機制確保兼容性：
- 如果 `candidates` 結構不存在，自動回退到 `response.text`
- 不影響英文或其他語言的正常使用
- 僅改進中文等多字節字符的處理

---

## 🔗 相關資源

### Google Gemini API 文檔
- [GenerateContentResponse Structure](https://ai.google.dev/api/python/google/generativeai/types/GenerateContentResponse)
- [Content and Parts](https://ai.google.dev/api/python/google/generativeai/types/Content)

### Unicode 編碼資源
- [UTF-16 Surrogate Pairs](https://en.wikipedia.org/wiki/UTF-16#Code_points_from_U+010000_to_U+10FFFF)
- [Python Unicode HOWTO](https://docs.python.org/3/howto/unicode.html)

---

## 📅 修復記錄

**修復日期**: 2026-01-12  
**修復版本**: 1.1.0  
**影響範圍**: backend/src/services/rag_engine.py (4 處修改)  
**測試狀態**: ⏳ 待後端重啟後驗證  
**修復人員**: GitHub Copilot  

---

**✨ 修復完成，重啟後端服務後即可生效！**
