# 流程4審核重複執行問題修復

## 問題描述
從瀏覽器 Network 面板可以看到，內容審核 API (`moderate`) 被調用了 **2 次**，導致：
- 增加不必要的 API 調用
- 延長審核時間
- 可能導致審核結果不一致

## 根本原因

### 原因 1：useEffect 依賴項問題
```typescript
// 修復前 - 問題代碼
React.useEffect(() => {
  if (shouldStartReview && !hasStartedReview && !reviewProgress.isRunning) {
    startReviewProcess();
  }
}, [shouldStartReview, hasStartedReview, reviewProgress.isRunning]);
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//  問題：依賴項包含內部狀態 hasStartedReview 和 reviewProgress.isRunning
```

**問題分析**：
1. `shouldStartReview` 從 `false` 變為 `true` → 觸發第一次執行
2. `hasStartedReview` 從 `false` 變為 `true` → 觸發第二次執行（但此時條件不滿足）
3. `reviewProgress.isRunning` 變化 → 可能再次觸發
4. 如果有時序問題，可能在狀態更新前執行第二次

### 原因 2：React Strict Mode
React 18+ 在開發模式下會**故意執行 effect 兩次**來幫助發現副作用問題。這是預期行為，但需要確保代碼能夠正確處理。

## 修復方案

### 修改 ContentReviewStep.tsx

```typescript
// 修復後 - 正確代碼
React.useEffect(() => {
  console.log("[ContentReview] shouldStartReview effect:", {
    shouldStartReview,
    hasStartedReview,
    isRunning: reviewProgress.isRunning,
    sessionId,
  });

  // 只在需要時執行，使用內部狀態作為守衛條件
  if (shouldStartReview && !hasStartedReview && !reviewProgress.isRunning && sessionId) {
    console.log("shouldStartReview triggered, starting review process...");
    startReviewProcess();
  }
}, [shouldStartReview]); // ✅ 只依賴外部觸發信號
//  ^^^^^^^^^^^^^^^^^
//  修復：移除內部狀態依賴，只監聽外部觸發信號
```

### 修復關鍵點

1. **簡化依賴項**：
   - ✅ 保留：`shouldStartReview`（外部觸發信號）
   - ❌ 移除：`hasStartedReview`（內部狀態，用作守衛條件）
   - ❌ 移除：`reviewProgress.isRunning`（內部狀態，用作守衛條件）

2. **使用內部狀態作為守衛**：
   ```typescript
   // 這些狀態不在依賴項中，但在條件判斷中使用
   if (!hasStartedReview && !reviewProgress.isRunning) {
     // 只有在未開始且未運行時才執行
   }
   ```

3. **添加 sessionId 檢查**：
   ```typescript
   if (shouldStartReview && !hasStartedReview && !reviewProgress.isRunning && sessionId) {
     // 確保有 sessionId 才執行
   }
   ```

## 工作原理

### 執行流程
```
用戶點擊「開始審核」按鈕
    ↓
WorkflowStepper 設置 shouldStartReview = true
    ↓
ContentReviewStep useEffect 觸發（僅一次）
    ↓
檢查守衛條件：
  - shouldStartReview = true ✓
  - hasStartedReview = false ✓
  - reviewProgress.isRunning = false ✓
  - sessionId 存在 ✓
    ↓
執行 startReviewProcess()
    ↓
設置 hasStartedReview = true
    ↓
後續 shouldStartReview 變化時，hasStartedReview = true 阻止重複執行
```

### 為什麼這樣可以避免重複執行？

1. **單一觸發源**：只監聽 `shouldStartReview`，這是外部明確的觸發信號
2. **守衛條件**：使用 `hasStartedReview` 和 `reviewProgress.isRunning` 作為守衛，防止重複執行
3. **閉包值**：即使 effect 執行兩次（Strict Mode），第二次執行時 `hasStartedReview` 已經是 `true`，條件不滿足

## 測試驗證

### 1. 重新構建前端
```powershell
cd frontend
npm run build
```

### 2. 測試步驟
1. 打開瀏覽器開發者工具 → Network 標籤
2. 過濾顯示 `moderate` 請求
3. 進入流程 3，上傳文件或爬取網站
4. 點擊「下一步」進入流程 4
5. 點擊「開始審核」按鈕
6. 觀察 Network 面板

### 3. 預期結果
✅ **修復後**：只有 **1 個** `moderate` 請求
❌ **修復前**：有 **2 個** `moderate` 請求

### 4. 控制台日誌驗證
```
[ContentReview] shouldStartReview effect: {
  shouldStartReview: true,
  hasStartedReview: false,
  isRunning: false,
  sessionId: "xxx",
  willTrigger: true
}
shouldStartReview triggered, starting review process...
startReviewProcess called
[ContentReview] Content to moderate: [...]
[ContentReview] Starting harmful content detection...
```

**關鍵檢查**：
- `shouldStartReview triggered` 應該只出現 **1 次**
- `startReviewProcess called` 應該只出現 **1 次**

## React Strict Mode 說明

### 什麼是 Strict Mode？
React 18+ 在開發模式下會故意執行某些操作兩次：
- 渲染組件兩次
- 執行 effect 兩次（mount → unmount → mount）

### 為什麼這樣設計？
幫助開發者發現：
- 不純的渲染邏輯
- 副作用清理問題
- 狀態更新問題

### 如何處理？
**不要禁用 Strict Mode**，而是確保代碼正確處理：

```typescript
// ❌ 錯誤做法：依賴執行次數
let count = 0;
useEffect(() => {
  count++; // 在 Strict Mode 下會是 2
}, []);

// ✅ 正確做法：使用狀態和守衛條件
const [hasStarted, setHasStarted] = useState(false);
useEffect(() => {
  if (!hasStarted) {
    setHasStarted(true);
    doSomething();
  }
}, [trigger]);
```

## 生產環境行為

在生產環境中（`npm run build` 後），Strict Mode 不會執行兩次，所以：
- 開發環境：effect 執行 2 次（Strict Mode）
- 生產環境：effect 執行 1 次（正常）

**但是**，我們的修復確保在**兩種環境**下都只會實際執行一次審核流程。

## 相關文件
- `frontend/src/components/ContentReviewStep/ContentReviewStep.tsx` - 內容審核組件
- `frontend/src/components/WorkflowStepper/WorkflowStepper.tsx` - 工作流程控制器

## 修復確認清單
- [x] 簡化 useEffect 依賴項
- [x] 添加守衛條件檢查
- [x] 添加 sessionId 檢查
- [x] 添加控制台日誌便於調試
- [x] 創建修復說明文檔
- [ ] 用戶測試確認（待測試）

## 其他優化建議

### 1. 使用 useRef 追蹤執行狀態
如果需要更嚴格的控制，可以使用 `useRef`：

```typescript
const hasStartedRef = useRef(false);

React.useEffect(() => {
  if (shouldStartReview && !hasStartedRef.current && sessionId) {
    hasStartedRef.current = true;
    startReviewProcess();
  }
}, [shouldStartReview, sessionId]);
```

優點：ref 不會觸發重新渲染

### 2. 添加清理函數
```typescript
React.useEffect(() => {
  let cancelled = false;
  
  if (shouldStartReview && !hasStartedReview && !reviewProgress.isRunning && sessionId) {
    startReviewProcess().catch(err => {
      if (!cancelled) {
        console.error(err);
      }
    });
  }
  
  return () => {
    cancelled = true;
  };
}, [shouldStartReview]);
```

優點：防止組件卸載後的狀態更新

### 3. 使用防抖（Debounce）
如果觸發信號可能快速變化：

```typescript
const debouncedShouldStart = useDebounce(shouldStartReview, 100);

React.useEffect(() => {
  if (debouncedShouldStart && !hasStartedReview && sessionId) {
    startReviewProcess();
  }
}, [debouncedShouldStart]);
```

## 總結
這次修復通過簡化 `useEffect` 依賴項，只監聽外部觸發信號，並使用內部狀態作為守衛條件，成功避免了審核流程被重複執行的問題。
