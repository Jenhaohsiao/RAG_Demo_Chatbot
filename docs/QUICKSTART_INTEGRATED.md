# 快速開始 - 前後端整合測試

**日期**: 2025-12-11  
**複雜度**: 初級  
**耗時**: 5-10 分鐘設置 + 自由探索

---

## 📋 3 步快速啟動

### Step 1️⃣: 啟動後端伺服器 (終端 1)

```powershell
cd C:\Projects\AI_projects\RAG_Demo_Chatbot\backend
py -3.12 -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

✅ 看到 `Application startup complete` 表示成功

### Step 2️⃣: 啟動前端開發伺服器 (終端 2)

```powershell
cd C:\Projects\AI_projects\RAG_Demo_Chatbot\frontend
npm install   # 第一次需要
npm run dev
```

✅ 看到 `Local: http://localhost:5173/` 表示成功

### Step 3️⃣: 打開瀏覽器

在瀏覽器中訪問: **http://localhost:5173/**

---

## 🎮 用戶交互流程

### 初始畫面
```
RAG Demo Chatbot
[英文 ▼]  [Leave] [Restart]
```

### 自動 Session 建立
- 重新整理頁面或首次訪問時，系統自動建立新的 session
- Session ID 在導航欄中顯示（可選）

### 語言切換測試
- 點擊「英文」下拉菜單
- 選擇其他語言（中文、日文、西班牙文等）
- 所有文本應立即更新 ✅

### 文件上傳測試

#### 方式 1: 上傳檔案
1. 選擇「上傳檔案」模式
2. 點擊「選擇檔案」或拖放檔案
3. 選擇任何 `.txt` 或 `.pdf` 檔案（< 10MB）
4. 點擊「上傳」

#### 方式 2: 上傳 URL
1. 選擇「上傳 URL」模式
2. 貼上網址（例如： https://example.com）
3. 點擊「上傳」

#### 預期結果
```
處理進度: [████████░░░░░░░░░░] 40%

步驟:
✓ Extract
◐ Moderate
- Chunk
- Embed
```

進度應從 0% 增加到 100%

### 聊天測試 (文件上傳完成後)

1. **自動轉向**: 上傳完成後，應自動進入聊天界面
2. **提交查詢**: 
   - 在文本框中輸入問題
   - 按 Enter 或點擊發送按鈕
3. **獲得回應**: 
   - 系統會根據上傳的文件生成回答
   - 回答包含相關引用

### Session 管理

- **Leave**: 關閉當前 session，清除所有數據
- **Restart**: 重新開始，保留 session ID 但清除所有數據

---

## ✅ 成功指標

| 功能 | 預期行為 | 狀態 |
|------|---------|------|
| 後端啟動 | "Application startup complete" | ✅ |
| 前端載入 | http://localhost:5173 顯示界面 | ✅ |
| Session 建立 | Session 自動建立，收到 ID | ✅ |
| 語言切換 | 文本立即更新 | ✅ |
| 檔案上傳 | 進度條顯示 0-100% | ✅ |
| 進度計算 | Extract→Moderate→Chunk→Embed | ✅ |
| 上傳完成 | "Upload Complete" 訊息 | ✅ |
| 聊天功能 | 可以提交查詢並獲得回應 | ✅ |
| 多語言 | 所有 7 種語言界面切換正常 | ✅ |

---

## 🔧 常見問題

### Q: 前端看不到 Session ID
**A**: Session 已被建立（在背景），可以嘗試打開瀏覽器開發者工具 (F12) 查看 Network 請求。

### Q: 上傳檔案時卡住
**A**: 
1. 檢查檔案大小（< 10MB）
2. 檢查後端伺服器是否還在運行
3. 如果持續卡住，查看後端日誌中是否有錯誤

### Q: 聊天功能不可用
**A**: 
1. 確保文件上傳完成（顯示 "Upload Complete"）
2. 檢查 Session 狀態是否為 "READY_FOR_CHAT"
3. 查看後端日誌中是否有 Gemini API 錯誤

### Q: 語言切換不工作
**A**: 
1. 檢查前端控制台 (F12) 是否有 JavaScript 錯誤
2. 檢查後端是否收到 PUT 請求 (查看後端日誌)
3. 如果 API 返回 404，檢查 session ID 是否正確

---

## 📊 現在的功能完整度

**已實現並可測試**:
- ✅ Session 管理 (建立、關閉、重啟)
- ✅ 多語言支援 (7 種語言)
- ✅ 檔案上傳 (.txt, .pdf)
- ✅ URL 內容抓取
- ✅ 內容審核 (Gemini Safety API)
- ✅ 文本分塊 (2000 chars, 500 overlap)
- ✅ 向量嵌入 (text-embedding-004)
- ✅ 向量儲存 (Qdrant)
- ✅ RAG 查詢 (similarity >= 0.7)
- ✅ 聊天界面
- ✅ 對話歷史

**待完成**:
- ⏳ Metrics 計算 (Token 統計)
- ⏳ Memory 管理 (上下文窗口)
- ⏳ 聊天組件樣式修正
- ⏳ 額外的 UI 增強

---

## 🚀 高級測試 (可選)

### 測試場景 1: 多檔案上傳
1. 上傳第一個檔案，等待完成
2. 返回上傳界面
3. 上傳第二個檔案
4. 驗證聊天查詢可以從多個檔案中檢索信息

### 測試場景 2: 邊界測試
1. **超大檔案**: 嘗試上傳 > 10MB 的檔案 → 應被拒絕
2. **無效 URL**: 輸入無效 URL → 應顯示錯誤
3. **長查詢**: 提交 > 2000 字的查詢 → 應被限制
4. **特殊字符**: 使用各種語言特殊字符 → 應正常工作

### 測試場景 3: 負載測試
1. 快速切換語言 10 次 → 應保持穩定
2. 快速上傳和查詢 → 應無錯誤

---

## 📞 何時尋求幫助

如果遇到以下情況，請檢查 PROGRESS.md 中的「技術債務」部分:

- ❌ 後端伺服器無故關閉
- ❌ Qdrant 連接失敗
- ❌ Gemini API 調用錯誤
- ❌ 前端組件崩潰

詳細的故障排除步驟見: [前後端整合測試指南](./FRONTEND_BACKEND_TESTING.md)

---

**祝您測試愉快！** 🎉
