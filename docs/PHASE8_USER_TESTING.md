# Phase 8: US6 - Session Controls 使用者測試指南

**測試日期**: 2025-12-18  
**測試範圍**: Leave/Restart 按鈕確認對話框、Session 清理驗證  
**前置條件**:
- ✅ Backend 正常運行 (`python -m uvicorn src.main:app --reload`)
- ✅ Frontend 開發服務器運行 (`npm run dev`)
- ✅ Docker Qdrant 容器運行 (`docker-compose up -d qdrant`)
- ✅ `.env.local` 配置正確 (GEMINI_API_KEY, QDRANT_HOST, QDRANT_PORT)

---

## 📋 測試用例

### TC-01: Leave 按鈕確認對話框顯示

**目的**: 驗證點擊 "Leave" 按鈕時，確認對話框正確顯示

**步驟**:
1. 在瀏覽器中打開應用 (http://localhost:5173)
2. 建立新 Session (頁面自動建立)
3. 在 Header 中找到 "Leave" 按鈕 (或根據語言顯示對應文字)
4. 點擊 "Leave" 按鈕

**預期結果**:
- ✅ Bootstrap Modal 對話框出現
- ✅ 對話框標題顯示 "Leave Session" (或對應語言文本)
- ✅ 對話框包含警告訊息: "Are you sure you want to leave? All session data will be deleted."
- ✅ 顯示紅色 "Confirm" 按鈕 (danger 樣式)
- ✅ 顯示灰色 "Cancel" 按鈕

**驗證命令** (瀏覽器開發者工具):
```javascript
// 檢查對話框是否存在
document.querySelector('[role="dialog"]')

// 檢查按鈕是否可見
document.querySelector('button.btn-danger') // Confirm 按鈕
document.querySelector('button.btn-secondary') // Cancel 按鈕
```

**通過條件**: ✅ 對話框完整顯示且所有元素可見

---

### TC-02: Leave 確認取消 (Cancel)

**目的**: 驗證點擊 Cancel 按鈕時對話框關閉，Session 保持活躍

**步驟**:
1. 從 TC-01 繼續，對話框已打開
2. 點擊 "Cancel" 按鈕

**預期結果**:
- ✅ 對話框關閉
- ✅ 頁面回到上傳或聊天畫面
- ✅ Session 仍然活躍 (可繼續使用)
- ✅ 頁面顯示原有內容不變

**驗證命令**:
```javascript
// 驗證對話框已關閉
!document.querySelector('[role="dialog"][class*="show"]')

// 驗證 Session ID 仍然存在
sessionStorage.getItem('sessionId')
```

**通過條件**: ✅ 對話框正常關閉，Session 未受影響

---

### TC-03: Leave 確認刪除 (Confirm)

**目的**: 驗證點擊 Confirm 按鈕時，Session 被刪除並返回首頁

**步驟**:
1. 從 TC-01 繼續，對話框已打開
2. 點擊 "Confirm" 按鈕 (紅色)
3. 等待 2-3 秒加載

**預期結果**:
- ✅ 對話框顯示加載狀態 (旋轉器動畫)
- ✅ 後端 API 呼叫: `POST /api/v1/session/{session_id}/close`
- ✅ 對話框關閉
- ✅ 頁面重置並返回到新 Session 建立 (刷新或導航)
- ✅ Session ID 改變 (新 Session 建立)
- ✅ Qdrant collection 被刪除

**驗證命令**:
```javascript
// 1. 檢查舊 Session ID (記下 TC-01 前的值)
const oldSessionId = sessionStorage.getItem('sessionId');

// 2. 點擊 Confirm 後等待，然後檢查新 Session ID
setTimeout(() => {
  const newSessionId = sessionStorage.getItem('sessionId');
  console.log('Old:', oldSessionId, 'New:', newSessionId);
  console.log('Sessions are different:', oldSessionId !== newSessionId);
}, 3000);

// 3. 檢查 API 響應 (Networks tab)
// 應該看到 POST /api/v1/session/{old-session-id}/close 返回 200
```

**後端驗證** (終端檢查日誌):
```
✅ "Session {old-session-id} closed successfully" in logs
✅ "Collection {collection-name} deleted" in logs
```

**通過條件**: ✅ Session 刪除，新 Session 建立，Qdrant 清理完成

---

### TC-04: Restart 按鈕確認對話框顯示

**目的**: 驗證點擊 "Restart" 按鈕時，確認對話框正確顯示

**步驟**:
1. 建立新 Session (返回首頁或刷新)
2. 上傳一個測試文件 (PDF 或 TXT)
3. 等待處理完成，進入聊天畫面
4. 在 Header 中找到 "Restart" 按鈕
5. 點擊 "Restart" 按鈕

**預期結果**:
- ✅ Bootstrap Modal 對話框出現
- ✅ 對話框標題顯示 "Restart Session"
- ✅ 對話框包含提示訊息: "Restart will create a new session. Current chat history will be lost."
- ✅ 顯示藍色 "Confirm" 按鈕
- ✅ 顯示灰色 "Cancel" 按鈕

**驗證命令**:
```javascript
// 檢查 Restart 對話框特定文本
document.body.textContent.includes('Restart will create a new session')
```

**通過條件**: ✅ Restart 對話框完整顯示

---

### TC-05: Restart 確認取消 (Cancel)

**目的**: 驗證取消 Restart 時聊天狀態保持不變

**步驟**:
1. 從 TC-04 繼續，Restart 對話框已打開
2. 點擊 "Cancel" 按鈕

**預期結果**:
- ✅ 對話框關閉
- ✅ 聊天畫面保持不變
- ✅ 聊天記錄仍然可見
- ✅ Session 仍然活躍

**驗證命令**:
```javascript
// 驗證聊天記錄仍然存在
document.querySelectorAll('.chat-message').length > 0
```

**通過條件**: ✅ 對話框關閉，聊天狀態保持

---

### TC-06: Restart 確認重啟 (Confirm)

**目的**: 驗證點擊 Confirm 時新 Session 建立，聊天歷史清除

**步驟**:
1. 從 TC-04 繼續，Restart 對話框已打開
2. 點擊 "Confirm" 按鈕
3. 等待 2-3 秒加載

**預期結果**:
- ✅ 對話框顯示加載狀態
- ✅ 後端 API 呼叫: `POST /api/v1/session/{old-session-id}/restart`
- ✅ 新 Session 建立，ID 改變
- ✅ 聊天記錄清除，返回到上傳畫面 (UploadScreen)
- ✅ Session 狀態為 READY_FOR_UPLOAD

**驗證命令**:
```javascript
// 1. 記錄舊 Session ID
const oldSessionId = sessionStorage.getItem('sessionId');

// 2. 點擊 Confirm 並等待
setTimeout(() => {
  const newSessionId = sessionStorage.getItem('sessionId');
  console.log('Restart successful:', oldSessionId !== newSessionId);
  
  // 3. 驗證回到上傳畫面
  console.log('In upload screen:', 
    document.querySelector('[data-phase="upload"]') !== null);
}, 3000);
```

**後端驗證**:
```
✅ Old session closed: "Session {old-id} closed successfully"
✅ New session created: "Session {new-id} created"
✅ Collection cleaned up for restart
```

**通過條件**: ✅ Restart 完成，新 Session 建立，UI 重置

---

### TC-07: 多語言確認對話框

**目的**: 驗證確認對話框在不同語言下顯示正確

**步驟**:
1. 打開應用，建立新 Session
2. 在 Header 中使用語言選擇器切換語言 (如改為中文)
3. 點擊 "Leave" 按鈕
4. 檢查對話框文本

**預期結果**:
- ✅ Leave 對話框標題: "離開會話" (中文)
- ✅ Leave 對話框訊息: "您確定要離開嗎？所有會話資料將被永久刪除。" (中文)
- ✅ Restart 對話框标题: "重啟會話" (中文)
- ✅ Restart 對話框訊息: "重啟將建立新會話。目前聊天記錄將會遺失。" (中文)

**測試語言** (推薦):
- 🇬🇧 English
- 🇨🇳 中文 (繁體/簡體)
- 🇯🇵 日本語
- 🇸🇦 العربية (RTL 布局測試)

**驗證命令**:
```javascript
// 檢查當前語言
document.documentElement.lang

// 檢查對話框文本語言
document.querySelector('[role="dialog"]').textContent
```

**通過條件**: ✅ 所有支持語言的對話框文本正確顯示

---

### TC-08: Qdrant Collection 刪除驗證

**目的**: 驗證 Session 關閉時 Qdrant collection 確實被刪除

**步驟**:
1. 建立 Session 並上傳文件
2. 在 Docker 中檢查 Qdrant collections
3. 點擊 Leave 並確認
4. 再次檢查 Qdrant collections

**Docker 命令** (終端執行):
```bash
# 查看現有 collections
curl http://localhost:6333/collections | python -m json.tool

# 記下 collection 名稱 (如: session_550e8400_e29b_41d4)
# 執行 Leave
# 再次查看
curl http://localhost:6333/collections | python -m json.tool
```

**預期結果**:
- ✅ 執行 Leave 前，collection 存在
- ✅ 執行 Leave 後，該 collection 不在列表中
- ✅ Qdrant 日誌顯示刪除操作成功

**通過條件**: ✅ Collection 確實被刪除

---

### TC-09: 並發請求處理

**目的**: 驗證快速連續操作（留/重啟）不會導致錯誤

**步驟**:
1. 建立 Session
2. 快速點擊 Leave (打開對話框後立即確認)
3. 立即在 Restart 對話框再次確認（如果仍有對話框）
4. 觀察頁面和控制台

**預期結果**:
- ✅ 無 JavaScript 錯誤
- ✅ API 請求正確序列化 (不會重疊)
- ✅ 最終狀態正確 (新 Session 建立)
- ✅ 控制台無 `500 Error`

**驗證命令**:
```javascript
// 打開開發者工具 Network tab
// 監控 POST 請求順序
// 應該看到:
// 1. POST .../close
// 2. POST .../restart (或重新建立)
// 無同時發送的請求
```

**通過條件**: ✅ 並發操作安全，無錯誤

---

## 📊 測試執行表

| TC# | 功能 | Pass | Fail | 備註 |
|-----|------|------|------|------|
| TC-01 | Leave 對話框顯示 | ☐ | ☐ | |
| TC-02 | Leave Cancel | ☐ | ☐ | |
| TC-03 | Leave Confirm | ☐ | ☐ | |
| TC-04 | Restart 對話框顯示 | ☐ | ☐ | |
| TC-05 | Restart Cancel | ☐ | ☐ | |
| TC-06 | Restart Confirm | ☐ | ☐ | |
| TC-07 | 多語言對話框 | ☐ | ☐ | |
| TC-08 | Qdrant 清理驗證 | ☐ | ☐ | |
| TC-09 | 並發操作 | ☐ | ☐ | |

**總通過率**: ___/9 (___%)

---

## 🔍 故障排除

### 問題 1: 對話框不出現

**可能原因**:
- ConfirmDialog 組件未正確導入到 main.tsx
- Bootstrap CSS 未載入

**解決方案**:
```bash
# 1. 檢查瀏覽器控制台是否有錯誤
# 2. 驗證 ConfirmDialog.tsx 存在
ls frontend/src/components/ConfirmDialog.tsx

# 3. 驗證 main.tsx 導入
grep "import ConfirmDialog" frontend/src/main.tsx

# 4. 檢查 Bootstrap 是否載入
document.querySelector('link[href*="bootstrap"]')
```

### 問題 2: Session 未清理

**可能原因**:
- 後端 API 未正確實現 close_session
- Qdrant 連接有問題

**解決方案**:
```bash
# 1. 檢查後端日誌
# 查看 close_session 是否被調用
grep "Session.*closed" backend/logs/

# 2. 驗證 Qdrant 運行
docker ps | grep qdrant

# 3. 手動測試 close API
curl -X POST http://localhost:8000/api/v1/session/{session_id}/close
```

### 問題 3: Qdrant Collection 未刪除

**可能原因**:
- vector_store.delete_collection() 未被調用
- Qdrant 連接失敗

**解決方案**:
```bash
# 1. 檢查 Qdrant API
curl http://localhost:6333/collections

# 2. 檢查後端 session.py 是否調用刪除
grep "delete_collection" backend/src/api/routes/session.py

# 3. 查看 Qdrant 容器日誌
docker logs rag-chatbot-qdrant | tail -50
```

---

## 📝 測試報告模板

**測試執行日期**: _______________  
**測試人員**: _______________  
**環境**: Windows / Mac / Linux  
**瀏覽器**: Chrome / Firefox / Safari  
**Python 版本**: _______________  
**Node 版本**: _______________

**整體結果**: ☐ 通過 ☐ 失敗

**通過的測試用例**:
- 

**失敗的測試用例**:
- 

**已知問題**:
- 

**建議**:
- 

**簽名**: _______________

---

## ✅ Phase 8 完成標準

Phase 8 被認為 **完成** 當且只當:
1. ✅ T084-T087: UI 確認對話框實現完成
2. ✅ T088: 後端 Qdrant 清理驗證完成
3. ✅ 自動化測試: `test_phase8.py` 全部通過
4. ✅ 使用者測試: 所有 9 個 TC 通過
5. ✅ 文檔: 此指南完成

