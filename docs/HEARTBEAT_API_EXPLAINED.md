# Heartbeat API 說明與修復

## Heartbeat API 是什麼？

### 用途
Heartbeat API 是一個**會話保活機制**（Session Keep-Alive），用於：

1. **延長會話有效期**
   - 後端會話 TTL（Time To Live）是 **20 分鐘**
   - 如果用戶持續活動，需要定期發送 heartbeat 來延長會話

2. **更新活動時間戳**
   - 追蹤用戶最後活動時間
   - 幫助系統判斷會話是否過期

3. **防止會話自動過期**
   - 避免用戶正在使用時突然被登出
   - 提供更好的用戶體驗

### 執行頻率

**兩種觸發方式**：

1. **定時觸發**（每 5 分鐘）
   ```typescript
   // 定時器：每 5 分鐘自動發送
   const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 分鐘
   ```

2. **活動觸發**（用戶操作時，限流 1 分鐘）
   ```typescript
   // 用戶活動：點擊、輸入等操作會觸發
   const ACTIVITY_THROTTLE = 60 * 1000; // 1 分鐘限流
   ```

### 設計邏輯
- **會話 TTL = 20 分鐘**
- **Heartbeat 間隔 = 5 分鐘**
- **安全邊際 = 4 次 heartbeat 機會**

如果 5 分鐘後還沒有發送 heartbeat，後端會在 20 分鐘後自動刪除會話。

## 問題分析

### 錯誤現象
從 Network 面板截圖可以看到：
- ❌ 狀態碼：**415 Unsupported Media Type**
- ❌ 錯誤信息：**"Content-Type must be application/json for API endpoints"**
- ❌ 頻率：每 5 分鐘重複出錯

### 根本原因
前端 `heartbeat()` 函數調用 API 時**沒有設置 Content-Type header**：

```typescript
// 問題代碼
export const heartbeat = async (sessionId: string): Promise<SessionResponse> => {
  const response = await api.post<SessionResponse>(`/session/${sessionId}/heartbeat`);
  //                                                                         ↑
  //                                                                         缺少 headers
  return response.data;
};
```

後端中間件要求所有 POST 請求必須有 `Content-Type: application/json`：

```python
# 後端 middleware.py
@app.middleware("http")
async def validate_content_type(request: Request, call_next):
    if request.method in ["POST", "PUT", "PATCH"]:
        content_type = request.headers.get("content-type", "")
        if not content_type.startswith("application/json"):
            return JSONResponse(
                status_code=415,
                content={
                    "error": {
                        "code": "ERR_INVALID_CONTENT_TYPE",
                        "message": "Content-Type must be application/json for API endpoints"
                    }
                }
            )
```

## 修復方案

### 修改文件
**文件**：`frontend/src/services/sessionService.ts`

```typescript
// 修復前
export const heartbeat = async (sessionId: string): Promise<SessionResponse> => {
  const response = await api.post<SessionResponse>(`/session/${sessionId}/heartbeat`);
  return response.data;
};

// 修復後
export const heartbeat = async (sessionId: string): Promise<SessionResponse> => {
  const response = await api.post<SessionResponse>(
    `/session/${sessionId}/heartbeat`,
    {}, // 空的 body（POST 請求需要 body）
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};
```

### 修復關鍵點
1. ✅ 添加第二個參數：`{}`（空 body）
2. ✅ 添加第三個參數：headers 配置
3. ✅ 設置 `Content-Type: application/json`

## 測試驗證

### 1. 重新構建前端
```powershell
cd frontend
npm run build
```

### 2. 刷新瀏覽器頁面
清除瀏覽器緩存並重新加載：
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### 3. 觀察 Network 面板
打開開發者工具 → Network 標籤：

**修復前**：
```
POST /api/v1/session/{id}/heartbeat
Status: 415 Unsupported Media Type ❌
Error: "Content-Type must be application/json"
```

**修復後**：
```
POST /api/v1/session/{id}/heartbeat
Status: 200 OK ✅
Response: {
  "session_id": "...",
  "state": "INITIALIZED",
  "expires_at": "..."
}
```

### 4. 等待 5 分鐘
觀察是否有自動的 heartbeat 請求：
- ✅ 每 5 分鐘自動發送
- ✅ 狀態碼 200
- ✅ 沒有錯誤

### 5. 測試用戶活動觸發
進行任何操作（點擊按鈕、輸入文字等）：
- ✅ 觸發一次 heartbeat（限流 1 分鐘）
- ✅ 會話時間被延長

## Heartbeat 流程圖

```
用戶打開頁面
    ↓
創建會話 (TTL = 20 分鐘)
    ↓
啟動 Heartbeat 定時器 (每 5 分鐘)
    ↓
┌─────────────────────────────────┐
│                                 │
│  用戶操作（點擊/輸入等）         │
│         ↓                       │
│  觸發活動 Heartbeat              │
│  （限流 1 分鐘）                 │
│         ↓                       │
│  延長會話 TTL                    │
│         │                       │
└─────────┼───────────────────────┘
          ↓
    5 分鐘到期
          ↓
    自動發送 Heartbeat
          ↓
    延長會話 TTL
          ↓
    重置 5 分鐘計時器
          ↓
    （循環）
```

## 為什麼需要 Heartbeat？

### 場景 1：用戶持續使用（正常情況）
```
0 分鐘    → 創建會話（TTL = 20 分鐘）
5 分鐘    → Heartbeat → 延長至 25 分鐘
10 分鐘   → Heartbeat → 延長至 30 分鐘
15 分鐘   → Heartbeat → 延長至 35 分鐘
20 分鐘   → Heartbeat → 延長至 40 分鐘
（會話持續有效）✅
```

### 場景 2：用戶離開（沒有 Heartbeat）
```
0 分鐘    → 創建會話（TTL = 20 分鐘）
5 分鐘    → （沒有 heartbeat）
10 分鐘   → （沒有 heartbeat）
15 分鐘   → （沒有 heartbeat）
20 分鐘   → 會話過期，自動刪除 ❌
```

### 場景 3：沒有 Heartbeat 機制（問題）
```
0 分鐘    → 創建會話
...
19 分鐘   → 用戶正在輸入長問題
20 分鐘   → 會話過期，資料丟失 ❌
          → 用戶體驗極差！
```

**有了 Heartbeat**：
```
0 分鐘    → 創建會話
...
5 分鐘    → Heartbeat → 延長 TTL
10 分鐘   → Heartbeat → 延長 TTL
15 分鐘   → Heartbeat → 延長 TTL
19 分鐘   → 用戶正在輸入
20 分鐘   → Heartbeat → 延長 TTL ✅
          → 會話持續有效！
```

## 相關代碼位置

### 前端
- `frontend/src/services/sessionService.ts` - Heartbeat API 調用
- `frontend/src/hooks/useSession.ts` - Heartbeat 定時器管理
- `frontend/src/hooks/useUserActivity.ts` - 用戶活動監聽

### 後端
- `backend/src/api/routes/session.py` - Heartbeat API 端點
- `backend/src/api/middleware.py` - Content-Type 驗證中間件
- `backend/src/core/session_manager.py` - 會話 TTL 管理

## 常見問題

### Q1: 為什麼每 5 分鐘就要發送？
**A**: 平衡服務器負載和用戶體驗：
- 太頻繁（如每 1 分鐘）→ 增加服務器負載
- 太少（如每 15 分鐘）→ 接近 20 分鐘 TTL，風險太高

### Q2: 為什麼用戶操作也會觸發？
**A**: 提供更好的體驗：
- 用戶頻繁操作時，不需要等 5 分鐘
- 立即延長會話，降低過期風險
- 限流 1 分鐘避免過多請求

### Q3: 會話過期會發生什麼？
**A**: 資料清理：
- Qdrant 向量集合被刪除
- 聊天歷史被清除
- 上傳的文件資訊丟失
- 用戶需要重新開始

### Q4: 為什麼之前一直報錯？
**A**: Content-Type 缺失：
- 後端中間件嚴格驗證 POST 請求
- 前端沒有設置正確的 header
- 導致每 5 分鐘就出現 415 錯誤

### Q5: 修復後有什麼改善？
**A**: 完整的會話保活：
- ✅ Heartbeat 正常工作
- ✅ 會話不會意外過期
- ✅ 用戶可以長時間使用
- ✅ Network 面板乾淨無錯誤

## 修復確認清單
- [x] 添加 Content-Type header
- [x] 添加空 body 參數
- [x] 前端重新構建
- [x] 創建修復說明文檔
- [ ] 用戶測試驗證（待測試）

## 總結
Heartbeat API 是一個**關鍵的會話保活機制**，確保用戶在持續使用時不會因為會話過期而丟失資料。修復了 Content-Type 缺失的問題後，系統現在可以正常維持長時間會話，提供更好的用戶體驗。
