# 內容審核功能測試指南

## 功能概述

流程4的內容審核現在整合了真實的Gemini Safety API來檢測不當內容：

### 檢測類別：
- **色情內容** (HARM_CATEGORY_SEXUALLY_EXPLICIT)
- **暴力內容** (HARM_CATEGORY_DANGEROUS_CONTENT)  
- **仇恨言論** (HARM_CATEGORY_HATE_SPEECH)
- **騷擾內容** (HARM_CATEGORY_HARASSMENT)

### 安全設定：
- 阻擋等級：BLOCK_MEDIUM_AND_ABOVE（中等以上風險全部阻擋）
- API：Gemini 2.0 Flash with Safety Settings

## 測試方法

### 1. 正常內容測試
上傳包含以下內容的文件，應該**通過審核**：
- 技術文檔
- 學術文章  
- 新聞報導
- 教育材料

### 2. 不當內容測試
上傳包含以下內容的文件，應該**被阻擋**：
- 明顯的色情描述
- 暴力威脅內容
- 仇恨性言論
- 騷擾性內容

### 3. 測試流程
1. 進入RAG工作流程
2. 上傳測試文件（或輸入測試URL）
3. 進入流程4：內容審核
4. 點擊"開始內容審核"
5. 觀察"檢測敏感內容"步驟的結果：
   - ✅ 綠色勾選：內容安全，通過審核
   - ❌ 紅色X：檢測到不當內容，阻擋處理

### 4. 預期行為
- **安全內容**：所有檢查項目顯示綠色勾選，顯示"審核完成"提示
- **不當內容**：在"檢測敏感內容"步驟顯示紅色X，並說明阻擋原因
- **審核錯誤**：如果API調用失敗，會顯示"無法完成內容審核檢查"

## 技術實現

### 後端API
- 端點：`POST /api/upload/{session_id}/moderate`
- 使用：Gemini Safety API
- 配置：嚴格安全設定

### 前端整合
- 服務：`moderationService.ts`
- 組件：`ContentReviewStep.tsx`
- 實時調用後端審核API

### 錯誤處理
- API失敗時自動標記為阻擋
- 網絡錯誤有適當的錯誤提示
- 日誌記錄審核結果

## 配置控制

內容審核可以通過後端環境變數控制：
- `ENABLE_CONTENT_MODERATION=true`：啟用審核
- `GEMINI_API_KEY`：必須配置有效的Gemini API密鑰

如果關閉審核功能，系統會默認通過所有內容但會記錄警告日誌。