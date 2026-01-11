# API Key 管理功能 - 快速整合指南

## 🎯 目標

將 ApiKeyInput 組件整合到主應用，在 API Key 失效或缺失時提示使用者輸入。

## 📝 修改步驟

### 步驟 1: 修改 `frontend/src/main.tsx`

在 App 組件中添加 API Key 檢查邏輯：

```tsx
// 在檔案頂部添加 import
import { useState, useEffect } from "react";
import ApiKeyInput from "./components/ApiKeyInput/ApiKeyInput";
import { checkApiKeyStatus } from "./services/apiKeyService";

// 在 App 組件中添加狀態
const [showApiKeyInput, setShowApiKeyInput] = useState(false);
const [apiKeyValid, setApiKeyValid] = useState(false);
const [isCheckingKey, setIsCheckingKey] = useState(true);

// 在組件初始化時檢查 API Key
useEffect(() => {
  async function checkKey() {
    try {
      const status = await checkApiKeyStatus();
      console.log("API Key Status:", status);
      
      if (status.has_valid_api_key && status.source === "env") {
        // 環境變數有有效的 Key
        setApiKeyValid(true);
        setShowApiKeyInput(false);
      } else {
        // 需要使用者提供 Key
        setApiKeyValid(false);
        setShowApiKeyInput(true);
      }
    } catch (error) {
      console.error("Failed to check API key:", error);
      // 發生錯誤時也顯示輸入介面
      setShowApiKeyInput(true);
    } finally {
      setIsCheckingKey(false);
    }
  }
  
  checkKey();
}, []);

// 處理 API Key 驗證成功
const handleApiKeyValidated = useCallback((apiKey: string) => {
  console.log("API Key validated successfully");
  setApiKeyValid(true);
  setShowApiKeyInput(false);
  
  // 創建新 session（如果還沒有）
  if (!sessionId) {
    createSession();
  }
}, [sessionId, createSession]);

// 在 return 之前添加條件渲染
if (isCheckingKey) {
  // 顯示載入畫面
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted">Initializing application...</p>
      </div>
    </div>
  );
}

if (showApiKeyInput && !apiKeyValid) {
  // 顯示 API Key 輸入介面
  return (
    <ErrorBoundary>
      <ApiKeyInput
        onApiKeyValidated={handleApiKeyValidated}
        allowSkip={false}  // 不允許跳過（必須提供 Key）
      />
    </ErrorBoundary>
  );
}

// 正常的應用內容
return (
  <ErrorBoundary>
    {/* 你現有的應用組件 */}
  </ErrorBoundary>
);
```

### 步驟 2: 修改 `frontend/src/services/api.ts`

添加攔截器以自動附加 API Key：

```tsx
import axios from "axios";
import { getUserApiKey } from "./apiKeyService";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 請求攔截器：自動添加使用者的 API Key
apiClient.interceptors.request.use(
  (config) => {
    const userApiKey = getUserApiKey();
    if (userApiKey) {
      config.headers["X-Gemini-API-Key"] = userApiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 回應攔截器：處理 API Key 失效的情況
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // API Key 可能失效
      const errorMessage = error.response?.data?.detail || "";
      if (errorMessage.includes("API key") || errorMessage.includes("API_KEY_INVALID")) {
        // 清除失效的 Key
        sessionStorage.removeItem("user_gemini_api_key");
        
        // 提示使用者重新輸入
        window.location.reload();  // 簡單做法：重新載入頁面
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 步驟 3: 更新後端以支援 X-Gemini-API-Key header

在 `backend/src/api/routes/*.py` 中添加 API Key 提取邏輯：

```python
from fastapi import Header
from typing import Optional

def get_api_key_from_request(
    x_gemini_api_key: Optional[str] = Header(None)
) -> str:
    """
    從請求 header 或環境變數獲取 API Key
    
    Args:
        x_gemini_api_key: 從 header 提取的 API Key
        
    Returns:
        str: 可用的 API Key
        
    Raises:
        HTTPException: 如果沒有可用的 API Key
    """
    from src.core.config import settings
    from src.core.api_validator import get_default_api_key_status
    
    # 優先使用使用者提供的 Key
    if x_gemini_api_key:
        return x_gemini_api_key
    
    # 其次使用環境變數的 Key
    if settings.gemini_api_key and get_default_api_key_status():
        return settings.gemini_api_key
    
    # 沒有可用的 Key
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No valid Gemini API key provided. Please provide an API key."
    )

# 在需要 API Key 的端點中使用
@router.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    api_key: str = Depends(get_api_key_from_request)
):
    # 使用 api_key 調用 Gemini API
    genai.configure(api_key=api_key)
    # ...
```

### 步驟 4: 添加翻譯

將以下內容添加到所有語言的翻譯檔案中：

**`frontend/src/i18n/locales/zh-TW.json`** (在檔案末尾 `}` 之前)：
```json
,
"apiKey": {
  "title": "需要 Gemini API Key",
  "what_is_it": "什麼是 Gemini API Key？",
  "description": "Gemini API key 讓此應用程式能夠存取 Google 的 AI 模型，用於內容審核、文字嵌入和聊天回應。您的金鑰僅安全地儲存在您的瀏覽器工作階段中。",
  "get_key_link": "從 Google AI Studio 取得免費 API 金鑰",
  "input_label": "輸入您的 Gemini API Key",
  "validate": "驗證並繼續",
  "validating": "驗證中...",
  "skip": "暫時略過",
  "security_note": "您的 API 金鑰永遠不會儲存在伺服器上。它只會保留在您的瀏覽器工作階段中。",
  "status": {
    "missing": "環境變數中找不到 API 金鑰。請提供您自己的金鑰以繼續。",
    "invalid": "預設 API 金鑰無效或已過期。請提供有效的金鑰。"
  },
  "error": {
    "empty": "請輸入 API 金鑰",
    "invalid": "無效的 API 金鑰。請檢查後重試。",
    "validation_failed": "驗證 API 金鑰失敗。請重試。"
  }
}
```

對其他語言檔案 (`en.json`, `zh-CN.json`, `ja.json` 等) 重複相同的步驟（使用對應語言）。

## 🧪 測試流程

### 測試 1: 有環境變數 API Key
```bash
# 1. 確保 .env.local 中有有效的 API Key
echo "GEMINI_API_KEY=your_valid_key" > backend/.env.local

# 2. 重啟後端
docker-compose restart backend

# 3. 重新載入前端
# 應該直接進入應用，不顯示 API Key 輸入畫面
```

### 測試 2: 沒有環境變數 API Key
```bash
# 1. 移除環境變數中的 API Key
# 註解掉或刪除 .env.local 中的 GEMINI_API_KEY

# 2. 重啟後端
docker-compose restart backend

# 3. 重新載入前端
# 應該顯示 API Key 輸入畫面
# 輸入有效的 Key 後應該能正常使用
```

### 測試 3: API Key 失效
```bash
# 1. 輸入無效的 API Key
# 2. 嘗試使用功能（如上傳文件）
# 3. 應該顯示錯誤並提示重新輸入 Key
```

## 🚨 常見問題

### Q1: API Key 存在哪裡？
A: 使用者提供的 Key 儲存在 `sessionStorage` 中，關閉瀏覽器後會自動清除。

### Q2: 如何在正式環境設定環境變數？
A: 參考 `API_KEY_MANAGEMENT_GUIDE.md` 中的部署流程。

### Q3: 可以跳過 API Key 輸入嗎？
A: 目前設定為 `allowSkip={false}`，不允許跳過。如需允許，改為 `true`。

### Q4: 如何處理 API Key 輪換？
A: 更新環境變數後重啟服務，使用者端的 Key 會在 session 結束後自動清除。

## ✅ 檢查清單

部署前確認：
- [ ] 後端 API Key 端點正常運作
- [ ] 前端可以檢查 API Key 狀態
- [ ] API Key 輸入介面顯示正常
- [ ] 驗證功能正常工作
- [ ] 所有語言的翻譯都已添加
- [ ] sessionStorage 正確儲存和讀取 Key
- [ ] HTTP 攔截器正確附加 Key
- [ ] 錯誤處理正常（如 Key 失效）
- [ ] 生產環境環境變數已設定
- [ ] `.gitignore` 包含 `.env*` 檔案

完成後，您的應用將具備完整的 API Key 管理功能！
