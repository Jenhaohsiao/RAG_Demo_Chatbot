# Metrics Dashboard 功能說明

## 🎯 概述

**Metrics Dashboard** 是一個實時顯示 RAG 聊天機器人運作狀況的可視化面板，讓用戶能夠**一眼看出系統的性能和資源使用情況**。

## 📊 顯示的指標

### 1. Token 使用量（🔋 Token Usage）

**實時追蹤 LLM API 的 Token 消耗**

| 指標 | 說明 | 用途 |
|-----|-----|------|
| **Total** | 已使用的總 Token 數 | 了解當前的 LLM 成本 |
| **Input** | 輸入給 LLM 的 Token 數 | 看提示詞的複雜度 |
| **Output** | LLM 生成的 Token 數 | 看回答的冗長程度 |
| **Avg/Query** | 每個查詢平均使用的 Token 數 | 評估查詢效率 |

**進度條**：
- 綠色：正常使用
- 橙色：使用量過高（>80%）
- 顯示百分比相對於 10,000 Token 的閾值

**警告**：當達到 10,000 Token 時會觸發「⚠️ High Usage」警告

### 2. 查詢統計（📊 Query Statistics）

**追蹤用戶與系統的互動情況**

| 指標 | 說明 | 用途 |
|-----|-----|------|
| **Total Queries** | 此 Session 中的查詢總數 | 了解用戶活躍程度 |
| **Answered** | 系統成功回答的查詢數 | 衡量 RAG 的有效性 |
| **Unanswered** | 系統無法回答的查詢數 | 找出文件覆蓋的不足 |
| **Avg Chunks** | 每次查詢平均檢索的文本塊數 | 評估搜索相關性 |

**無法回答率警告**：
- 當超過 80% 的查詢無法回答時，顯示「⚠️」
- 建議上傳更多相關的文件

### 3. Vector DB 使用（💾 Vector Database）

**顯示向量資料庫的使用情況** [未來功能]

## 🎮 如何使用

### 1. 顯示/隱藏 Metrics Dashboard

在聊天界面的右上角有一個**「📊 隱藏 / 📊 顯示」** 按鈕

```
點擊按鈕切換 Dashboard 的可見性
```

### 2. 實時更新

Dashboard 會**自動每 3 秒更新一次**，無需手動刷新

在每次發送查詢後，會立即更新 Token 使用和查詢統計

### 3. 警告提示

Dashboard 提供兩種警告：

#### ⚠️ Token 使用警告
- **觸發條件**：已使用 Token ≥ 10,000
- **表現形式**：
  - 進度條變為橙色
  - Badge 顯示「⚠️ High Usage」
  - Total Token 值變紅
- **含義**：LLM API 成本增加，可能需要考慮：
  - 優化查詢以減少輸入 Token
  - 選擇更經濟的 LLM 模型
  - 清除舊的對話歷史以管理成本

#### ⚠️ 無法回答率警告
- **觸發條件**：80% 或更多的查詢無法回答
- **表現形式**：
  - Unanswered 卡片背景變為黃色
  - 出現警告訊息欄位
- **含義**：上傳的文件可能與用戶查詢相關性不高
  - 建議上傳更多相關的文件
  - 或重新審視文件的內容

## 📱 響應式設計

Dashboard 在不同尺寸的設備上都能正常顯示：

| 設備 | 布局 |
|-----|-----|
| **桌面** | 每行 4 列指標卡片 |
| **平板** | 每行 2-3 列指標卡片 |
| **手機** | 每行 1-2 列指標卡片 |

## 🌍 多語言支援

Metrics Dashboard 支援所有 7 種語言：

- 🇬🇧 English
- 🇨🇳 中文 (繁體)
- 🇰🇷 한국어
- 🇪🇸 Español
- 🇯🇵 日本語
- 🇸🇦 العربية
- 🇫🇷 Français

所有標籤、標題和警告訊息都會自動翻譯

## 💡 使用場景

### 場景 1：監控 Token 成本

```
✅ 好的做法：
- 定期查看 Token 用量
- 當接近警告閾值時停止查詢
- 考慮換更便宜的模型或減少查詢複雜度

❌ 不好的做法：
- 忽視 Token 警告，無限發送查詢
- 上傳大量重複的文件導致過度嵌入
```

### 場景 2：優化 RAG 文件

```
現象：無法回答率達 75%

分析：
1. 檢查 Avg Chunks - 每次只檢索 0.5 個塊？
   → 文件可能不夠相關
2. 檢查 Avg/Query Token - 是否很高？
   → 可能需要簡化文件內容
3. 上傳相關性更高的文件重新測試

解決：
✅ 上傳更多專業相關的文件
✅ 移除不相關的文件
✅ 重新進行查詢測試
```

### 場景 3：性能基準測試

```
用 Dashboard 記錄一組標準查詢的指標：
- 平均 Avg/Query Token
- 平均 Answered Rate
- 平均 Avg Chunks

與不同配置或模型進行比較，找出最優設置
```

## 🔧 技術實現

### 後端

**新增 API 端點：**
```
GET /api/v1/chat/{session_id}/metrics
```

**回應格式：**
```json
{
  "session_id": "uuid",
  "total_queries": 5,
  "total_tokens": 2150,
  "total_input_tokens": 1200,
  "total_output_tokens": 950,
  "avg_tokens_per_query": 430.0,
  "avg_chunks_retrieved": 1.4,
  "unanswered_ratio": 0.2,
  "token_warning_threshold": 10000,
  "is_token_warning": false,
  "is_unanswered_warning": false
}
```

### 前端

**新增服務：**
- `frontend/src/services/metricsService.ts`
  - `getSessionMetrics(sessionId)` - 獲取指標
  - 格式化和計算輔助函數

**新增組件：**
- `frontend/src/components/MetricsDashboard.tsx`
  - 顯示所有指標卡片
  - 警告視覺化
  - 進度條動畫

**整合：**
- `ChatScreen.tsx` 添加 Metrics Dashboard
- 自動每 3 秒更新
- 每次查詢後立即更新

## 📈 未來增強

計畫中的功能：

- [ ] 歷史圖表 - 顯示 Token 使用的趨勢
- [ ] 導出報告 - 匯出 Session 的統計摘要
- [ ] 成本計算 - 顯示估算的 API 成本（美元）
- [ ] 性能榜單 - 比較不同 Session 的效率
- [ ] Vector DB 詳情 - 顯示已嵌入的文件、存儲大小等

## ✅ 檢查清單

使用 Metrics Dashboard 時：

- [ ] 定期檢查 Token 使用量，避免超支
- [ ] 監控無法回答率，適時優化文件
- [ ] 使用警告提示指導改進
- [ ] 在不同語言間驗證 Dashboard 的顯示
- [ ] 在手機和桌面設備上測試響應式設計
