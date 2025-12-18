# 問題診斷與修復報告

**日期**: 2025-12-15  
**問題編號**: #001  
**狀態**: ✅ 已修復  

---

## 📋 問題描述

### 問題 1: 資料可能沒有進入 Vector DB
用戶報告上傳 PDF 後，資料似乎沒有正確寫入 Qdrant 向量數據庫。

### 問題 2: PDF 摘要生成問題
上傳 PDF 後，系統顯示的簡介只是完全照搬 PDF 的部分內容，沒有進行分析和整理，不符合「500字以內的簡介」的需求。

---

## 🔍 根本原因分析

### 問題 1 根本原因：缺乏寫入驗證

**位置**: `backend/src/api/routes/upload.py` Line 203-210

**原始代碼問題**：
```python
# Upsert 到 Qdrant
vector_store.upsert_chunks(
    collection_name=collection_name,
    chunks=points
)

logger.info(f"[{document.document_id}] Storage complete: {len(points)} points uploaded")
```

**問題分析**：
1. ❌ 沒有檢查 `upsert_chunks()` 的返回值（返回 `bool`）
2. ❌ 即使寫入失敗，也會繼續執行並顯示「Storage complete」
3. ❌ 沒有驗證數據是否真的寫入到 Qdrant
4. ❌ 如果寫入失敗，用戶無法得知

**影響**：
- 用戶可能認為數據已上傳，但實際上向量數據庫是空的
- RAG 查詢時找不到相關內容
- 難以診斷問題（日誌顯示成功但實際失敗）

---

### 問題 2 根本原因：Prompt 設計不當

**位置**: `backend/src/api/routes/upload.py` Line 216-241

**原始代碼問題**：
```python
# 使用 LLM 生成摘要（最多 500 字）
prompt = f"""請用繁體中文為以下內容生成一個簡潔的摘要（500字以內）：

{document.raw_content[:3000]}

摘要："""

# 使用同步方式生成摘要
model = genai.GenerativeModel(settings.gemini_model)
response = model.generate_content(prompt)
document.summary = response.text

# Fallback
except Exception as e:
    document.summary = document.raw_content[:200] + "..."
```

**問題分析**：
1. ❌ **Prompt 太簡單**：只要求「摘要」，沒有要求「分析和整理」
2. ❌ **內容截取不足**：只使用前 3000 字符，對長文檔可能不夠
3. ❌ **缺乏明確指示**：沒有告訴 LLM 要「理解」、「提煉」、「結構化」
4. ❌ **temperature = 0（預設）**：太低會導致過於保守的輸出
5. ❌ **max_output_tokens 預設值**：可能不夠生成完整摘要
6. ❌ **Fallback 過於簡單**：直接截取前 200 字，這就是「照搬」的來源

**影響**：
- LLM 傾向於直接複製原文而非分析整理
- 用戶看到的是「照搬」而非「簡介」
- 失敗時的 fallback 更加劇了「照搬」的問題

---

## ✅ 修復方案

### 修復 1: 增強向量寫入驗證

**改進代碼**：
```python
# Upsert 到 Qdrant（增強錯誤處理）
upsert_success = vector_store.upsert_chunks(
    collection_name=collection_name,
    chunks=points
)

if not upsert_success:
    raise Exception(f"Failed to upsert {len(points)} chunks to Qdrant")

# 驗證資料已成功寫入
collection_info = vector_store.get_collection_info(collection_name)
if collection_info:
    actual_count = collection_info.get('vectors_count', 0)
    logger.info(f"Storage verified: {actual_count} vectors in collection")
    if actual_count < len(points):
        logger.warning(f"Vector count mismatch! Expected {len(points)}, got {actual_count}")
else:
    logger.error("Cannot verify storage - collection info unavailable")
```

**改進要點**：
1. ✅ 檢查 `upsert_chunks()` 返回值
2. ✅ 寫入失敗時拋出異常（觸發錯誤處理流程）
3. ✅ 驗證實際寫入的向量數量
4. ✅ 記錄詳細的驗證信息
5. ✅ 檢測數量不匹配的情況

---

### 修復 2: 改進摘要生成 Prompt

**改進代碼**：
```python
# 使用改進的 Prompt，要求 LLM 進行分析和整理
max_chars = min(len(document.raw_content), 8000)  # 增加到 8000 字符
content_sample = document.raw_content[:max_chars]

prompt = f"""你是一位專業的文檔分析助手。請仔細閱讀以下文檔內容，並生成一個專業的摘要。

**重要要求**：
1. **分析內容**：理解文檔的主題、核心觀點和關鍵信息
2. **整理結構**：用清晰的段落組織摘要，不要只是複製原文
3. **提煉重點**：突出最重要的概念、數據或結論
4. **控制長度**：摘要應在 300-500 字之間
5. **使用繁體中文**：確保輸出為繁體中文

**文檔內容**：
{content_sample}

**請生成摘要**："""

# 使用更高的 temperature 來獲得更有創造性的摘要
response = model.generate_content(
    prompt,
    generation_config=genai.GenerationConfig(
        temperature=0.3,  # 提高創造性
        max_output_tokens=1024,  # 增加輸出長度限制
    )
)
document.summary = response.text.strip()

# 智能截取到句子結尾
if len(document.summary) > 550:
    truncated = document.summary[:500]
    last_period = max(truncated.rfind('。'), truncated.rfind('.'))
    if last_period > 300:
        document.summary = truncated[:last_period + 1] + "..."
    else:
        document.summary = truncated + "..."

# 改進的 Fallback
except Exception as e:
    content_preview = document.raw_content[:300].strip()
    document.summary = f"文檔已上傳並處理完成。內容預覽：{content_preview}..."
```

**改進要點**：
1. ✅ **明確的角色定義**：「專業的文檔分析助手」
2. ✅ **詳細的要求清單**：5 點具體指示
3. ✅ **增加內容長度**：3000 → 8000 字符
4. ✅ **提高 temperature**：0 → 0.3（增加創造性）
5. ✅ **增加 max_output_tokens**：1024（確保完整輸出）
6. ✅ **智能截取**：在句子結尾截取，而非隨意截斷
7. ✅ **改進 Fallback**：提供更有意義的預覽信息

---

## 📊 預期效果

### 修復前 vs 修復後

| 方面 | 修復前 | 修復後 |
|-----|-------|-------|
| **向量寫入** | ❌ 可能失敗但無感知 | ✅ 失敗時立即報錯 |
| **寫入驗證** | ❌ 無驗證 | ✅ 驗證向量數量 |
| **錯誤診斷** | ❌ 困難 | ✅ 詳細日誌 |
| **摘要質量** | ❌ 照搬原文 | ✅ 分析整理 |
| **Prompt 指示** | ❌ 模糊 | ✅ 明確 5 點要求 |
| **內容長度** | ❌ 3000 字符 | ✅ 8000 字符 |
| **創造性** | ❌ temperature=0 | ✅ temperature=0.3 |
| **Fallback** | ❌ 簡單截取 | ✅ 有意義預覽 |

---

## 🧪 測試驗證

### 測試腳本

創建了 `backend/verify_fix.py` 來驗證修復：

**測試 1: 向量存儲驗證**
- 創建測試 session
- 寫入測試向量
- 驗證寫入數量
- 檢查數據完整性

**測試 2: 摘要生成驗證**
- 比對舊/新 Prompt
- 驗證改進要點
- 確認參數設置

**執行方式**：
```bash
cd backend
python verify_fix.py
```

---

## 📚 相關文件

### 修改的文件
- ✅ `backend/src/api/routes/upload.py` (Line 203-241)

### 新增的文件
- ✅ `backend/verify_fix.py` (測試腳本)
- ✅ `docs/ISSUE_001_FIX_REPORT.md` (本文件)

### 相關文檔
- `specs/001-multilingual-rag-chatbot/spec.md` - 功能規格
- `specs/001-multilingual-rag-chatbot/plan.md` - 實施計劃
- `docs/PROGRESS.md` - 專案進度
- `docs/TROUBLESHOOTING_GUIDE.md` - 故障排除

---

## 🚀 後續步驟

### 立即執行
1. ✅ 程式碼修復已完成
2. ⏳ 執行驗證腳本 `python backend/verify_fix.py`
3. ⏳ 重啟 Docker 服務測試實際效果
4. ⏳ 上傳測試 PDF 驗證摘要質量

### 建議改進（未來）
1. 📋 考慮將摘要生成抽取為獨立服務
2. 📋 添加摘要質量評分機制
3. 📋 支持用戶自定義摘要長度
4. 📋 提供摘要重新生成功能

---

## 🎯 憲法合規性檢查

### Principle V: Strict RAG
✅ **合規**：向量寫入驗證確保 RAG 能正常檢索到內容

### Principle VI: Moderation First
✅ **合規**：修復不影響審核流程（審核仍在分塊之前）

### Principle II: Testability
✅ **合規**：添加了獨立的驗證腳本

### Principle I: MVP-First
✅ **合規**：修復核心功能，不添加額外複雜性

---

**修復完成時間**: 2025-12-15  
**修復者**: GitHub Copilot  
**審核狀態**: 待測試驗證
