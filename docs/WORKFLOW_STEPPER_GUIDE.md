# 6 步驟 RAG 工作流程使用指南

## 概覽

新的 6 步驟工作流程將原本複雜的 RAG 設定過程分解為清晰的步驟：

1. **RAG 設定** - 配置檢索增強生成參數
2. **Prompt 設定** - 設定 AI 回應風格和創意度  
3. **資訊上傳** - 上傳文件和系統設定
4. **內容審核** - 安全性檢查和內容審查
5. **文本切割 向量嵌入** - 分塊處理並生成向量
6. **AI 對談** - 開始智能問答對話

## 組件架構

### 主要組件

- `WorkflowStepper.tsx` - 主要的步驟導航組件
- `WorkflowMain.tsx` - 整合所有功能的主組件示例

### 步驟組件

1. `RagConfigStep.tsx` - RAG 參數配置
2. `PromptConfigStep.tsx` - Prompt 設定  
3. `DataUploadStep.tsx` - 資料上傳（整合系統設定、檔案類型、上傳功能）
4. `ContentReviewStep.tsx` - 內容審核
5. `TextProcessingStep.tsx` - 文本處理
6. `AiChatStep.tsx` - AI 對談

### 樣式文件

- `WorkflowStepper.css` - 完整的步驟器樣式

## 使用方法

### 1. 基本集成

```tsx
import React, { useState } from "react";
import WorkflowStepper from "./components/WorkflowStepper";

const App = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [parameters, setParameters] = useState(defaultParameters);
  
  return (
    <WorkflowStepper
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      sessionId="your-session-id"
      parameters={parameters}
      onParameterChange={(param, value) => {
        setParameters(prev => ({ ...prev, [param]: value }));
      }}
    />
  );
};
```

### 2. 參數配置

工作流程需要以下參數：

```typescript
interface Parameters {
  // RAG 參數
  similarity_threshold: number;
  rag_context_window: number;
  rag_citation_style: "numbered" | "inline" | "none";
  rag_fallback_mode: "strict" | "flexible";
  rag_top_k: number;
  rag_chunk_size: number;
  rag_chunk_overlap: number;
  rag_min_chunk_length: number;

  // Prompt 參數
  token_threshold: number;
  response_style: "concise" | "standard" | "detailed";
  professional_level: "casual" | "professional" | "academic";
  creativity_level: "conservative" | "balanced" | "creative";

  // 系統參數
  session_ttl_minutes: number;
  max_file_size_mb: number;
  crawler_max_tokens: number;
  crawler_max_pages: number;
  supported_file_types: string[];

  // 處理參數
  chunk_size: number;
  chunk_overlap: number;
}
```

## 步驟詳細說明

### 步驟 1: RAG 設定

- 配置相似度閾值（0.0 - 1.0）
- 設定上下文窗口大小
- 選擇引用風格
- 調整檢索參數

### 步驟 2: Prompt 設定

- 設定回應風格（簡潔/標準/詳細）
- 調整專業程度（休閒/專業/學術）
- 配置創意程度（保守/平衡/創意）
- 設定 Token 閾值

### 步驟 3: 資訊上傳

包含三個子標籤：
- **系統設定**: Session 時長、檔案大小限制、爬蟲參數
- **檔案類型**: 選擇支援的檔案格式
- **上傳資料**: 實際的檔案上傳界面

### 步驟 4: 內容審核

- 查看上傳文件列表
- 預覽文件內容
- 核准或拒絕文件
- 批次審核操作

### 步驟 5: 文本切割 向量嵌入

- 配置文本分塊參數
- 監控處理進度
- 查看處理統計
- 錯誤處理和重試

### 步驟 6: AI 對談

- 系統準備就緒檢查
- 配置摘要顯示
- 使用指南和示例
- 實際聊天界面

## 功能特性

### 進度追蹤

- 視覺化步驟指示器
- 完成狀態管理
- 進度條顯示

### 導航控制

- 步驟間跳轉（有限制）
- 上一步/下一步按鈕
- 自動完成跳轉

### 響應式設計

- 桌面和行動裝置適配
- 彈性網格佈局
- 觸控友好操作

### 用戶體驗

- 載入狀態指示
- 錯誤處理和提示
- 即時反饋和驗證

## 自定義和擴展

### 添加新步驟

1. 創建新的步驟組件
2. 在 `WorkflowStepper.tsx` 中添加步驟定義
3. 更新 `renderStepContent()` 方法
4. 添加必要的參數和回調

### 修改樣式

編輯 `WorkflowStepper.css` 文件來自定義：
- 顏色主題
- 間距和大小
- 動畫效果
- 響應式斷點

### 國際化

使用 `useTranslation` hook 來支援多語言：

```tsx
const { t } = useTranslation();
// 使用 t('key') 來翻譯文字
```

## 注意事項

1. 確保所有步驟組件都有正確的 props 類型定義
2. 處理載入狀態和錯誤情況
3. 測試各步驟間的數據傳遞
4. 驗證參數配置的有效性
5. 考慮性能優化（大文件上傳、長文本處理）

## 故障排除

### 常見問題

1. **步驟間數據丟失**: 檢查參數狀態管理
2. **樣式問題**: 確認 CSS 文件正確匯入
3. **組件渲染錯誤**: 檢查 props 類型和必需參數
4. **導航問題**: 驗證步驟邏輯和狀態同步

### 調試模式

在開發環境中啟用調試資訊：

```tsx
{process.env.NODE_ENV === 'development' && (
  <div className="debug-info">
    {/* 調試內容 */}
  </div>
)}
```