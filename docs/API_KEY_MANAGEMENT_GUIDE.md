# API Key 管理功能實施指南

## 📋 概述

本文檔說明如何在專案中實施完整的 API Key 管理功能，解決正式環境部署和 API Key 失效的問題。

## 🎯 解決的問題

### 問題 1: 正式環境中的 Google API Key 安全管理

**最佳實踐建議**:

#### 方案 A: 環境變數 (推薦用於正式部署)

**部署平台設定方式**:

1. **Docker Compose** (適用於 VPS/自架伺服器)
   ```yaml
   # docker-compose.prod.yml
   services:
     backend:
       environment:
         - GEMINI_API_KEY=${GEMINI_API_KEY}  # 從 .env 檔案讀取
   ```
   
   ```bash
   # .env (不要提交到 Git)
   GEMINI_API_KEY=AIzaSy...your_key_here
   ```

2. **Cloud Platform 環境變數**:
   - **Azure App Service**: Configuration → Application settings
   - **AWS ECS/Lambda**: Environment variables
   - **Google Cloud Run**: Environment variables
   - **Heroku**: Settings → Config Vars
   - **Together.ai**: Environment variables in deployment settings

3. **密鑰管理服務** (企業級方案):
   - **Azure Key Vault**: 從 Key Vault 讀取密鑰
   - **AWS Secrets Manager**: 透過 SDK 獲取密鑰
   - **Google Secret Manager**: 使用 Secret Manager API

**安全檢查清單**:
- ✅ 永遠不要將 `.env` 檔案提交到 Git
- ✅ 在 `.gitignore` 中添加 `.env`, `.env.local`, `.env.production`
- ✅ 使用 `.env.example` 提供範本（不含真實金鑰）
- ✅ 生產環境使用 CI/CD 系統注入環境變數
- ✅ 定期輪換 API Key
- ✅ 監控 API Key 使用量和配額

#### 方案 B: 使用者提供 API Key (已實施)

當環境變數中沒有 API Key 或 Key 失效時，讓使用者提供自己的 Key。

**優點**:
- 無需管理共享 API Key
- 每個使用者使用自己的配額
- 適合 Demo/Portfolio 專案

**缺點**:
- 使用者需要自己申請 API Key
- 可能降低使用體驗

---

## 🛠️ 實施方案

### 1. 後端實施

#### 已完成的檔案:

##### `backend/src/core/api_validator.py`
- ✅ `validate_gemini_api_key()` - 驗證 API Key
- ✅ `get_default_api_key_status()` - 檢查預設 Key 狀態
- ✅ `set_default_api_key_status()` - 設定狀態

##### `backend/src/api/routes/session.py`
新增的端點:

```python
# 1. 檢查 API Key 狀態（應用啟動時）
GET /api/v1/session/api-key/status
Response: {
  "status": "valid" | "missing" | "invalid",
  "source": "env" | "user" | "none",
  "has_valid_api_key": boolean
}

# 2. 驗證使用者提供的 API Key
POST /api/v1/session/api-key/validate
Request: { "api_key": "AIzaSy..." }
Response: {
  "valid": boolean,
  "message": string
}

# 3. 為特定 session 設定 API Key
POST /api/v1/session/{session_id}/api-key
Request: { "api_key": "AIzaSy..." }
Response: {
  "status": "valid",
  "source": "user",
  "has_valid_api_key": true
}
```

##### `backend/src/core/config.py`
```python
class Settings(BaseSettings):
    # API Key 現在是可選的
    gemini_api_key: str | None = None  # 允許 None
```

##### `backend/src/main.py`
- 啟動時檢查 API Key 狀態
- 如果無效，記錄警告但繼續運行
- 設定全局狀態供端點使用

### 2. 前端實施

#### 新增的檔案:

##### `frontend/src/components/ApiKeyInput/ApiKeyInput.tsx`
完整的 API Key 輸入組件:
- 檢查後端 API Key 狀態
- 顯示說明和取得 Key 的連結
- 驗證使用者輸入的 Key
- 安全地儲存在 sessionStorage
- 支援顯示/隱藏密碼功能

##### `frontend/src/components/ApiKeyInput/ApiKeyInput.scss`
美觀的 UI 樣式:
- 置中全屏佈局
- 漸層背景
- 卡片式設計
- 響應式支援

##### `frontend/src/services/apiKeyService.ts`
API Key 服務函數:
- `checkApiKeyStatus()` - 檢查狀態
- `validateUserApiKey()` - 驗證 Key
- `getUserApiKey()` - 從 sessionStorage 獲取
- `clearUserApiKey()` - 清除 Key
- `addApiKeyHeader()` - 添加到 HTTP header

#### 修改的檔案:

##### `frontend/src/main.tsx`
整合 ApiKeyInput 組件:

```tsx
import ApiKeyInput from "./components/ApiKeyInput/ApiKeyInput";
import { checkApiKeyStatus } from "./services/apiKeyService";

const App = () => {
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(false);

  // 應用啟動時檢查 API Key
  useEffect(() => {
    async function checkKey() {
      const status = await checkApiKeyStatus();
      if (!status.has_valid_api_key) {
        setShowApiKeyInput(true);
      } else {
        setApiKeyValid(true);
      }
    }
    checkKey();
  }, []);

  const handleApiKeyValidated = (apiKey: string) => {
    setApiKeyValid(true);
    setShowApiKeyInput(false);
    // 可選：創建 session
  };

  // 如果需要 API Key，顯示輸入介面
  if (showApiKeyInput && !apiKeyValid) {
    return (
      <ApiKeyInput
        onApiKeyValidated={handleApiKeyValidated}
        allowSkip={false}  // 不允許跳過
      />
    );
  }

  // 正常的應用介面
  return (
    <ErrorBoundary>
      {/* 你的應用組件 */}
    </ErrorBoundary>
  );
};
```

##### `frontend/src/services/api.ts`
添加攔截器，自動附加 API Key:

```tsx
import axios from "axios";
import { addApiKeyHeader } from "./apiKeyService";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
});

// 請求攔截器：自動添加使用者的 API Key
apiClient.interceptors.request.use((config) => {
  return addApiKeyHeader(config);
});

export default apiClient;
```

### 3. 翻譯檔案

#### 需要添加到所有語言檔案:

**英文 (en.json)**:
```json
{
  "apiKey": {
    "title": "Gemini API Key Required",
    "what_is_it": "What is a Gemini API Key?",
    "description": "The Gemini API key allows this application to access Google's AI models...",
    "get_key_link": "Get your free API key from Google AI Studio",
    "input_label": "Enter your Gemini API Key",
    "validate": "Validate & Continue",
    "validating": "Validating...",
    "skip": "Skip for now",
    "security_note": "Your API key is never stored on the server...",
    "status": {
      "missing": "No API key found in environment variables...",
      "invalid": "The default API key is invalid or has expired..."
    },
    "error": {
      "empty": "Please enter an API key",
      "invalid": "Invalid API key...",
      "validation_failed": "Failed to validate API key..."
    }
  }
}
```

**繁體中文 (zh-TW.json)**、**簡體中文 (zh-CN.json)**、**其他語言** 參考英文翻譯。

---

## 🚀 部署流程

### 開發環境
```bash
# 1. 創建 .env.local 檔案（不提交到 Git）
echo "GEMINI_API_KEY=your_dev_key_here" > backend/.env.local

# 2. 啟動服務
docker-compose up -d
cd frontend && npm run dev
```

### 生產環境 (Docker)
```bash
# 1. 在伺服器上設定環境變數
export GEMINI_API_KEY=your_production_key

# 2. 使用 docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### 生產環境 (Cloud Platform)

#### Azure App Service:
```bash
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name myAppName \
  --settings GEMINI_API_KEY=your_key_here
```

#### AWS ECS:
```json
{
  "containerDefinitions": [{
    "environment": [
      {
        "name": "GEMINI_API_KEY",
        "value": "your_key_here"
      }
    ]
  }]
}
```

#### Google Cloud Run:
```bash
gcloud run deploy my-app \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

---

## 🔒 安全最佳實踐

### 1. 環境變數隔離
```bash
# 開發
.env.local (不提交)

# 測試
.env.test (可以提交，使用測試 key)

# 生產
由 CI/CD 或 Cloud Platform 注入
```

### 2. .gitignore 設定
```gitignore
# 環境變數
.env
.env.local
.env.*.local
.env.production

# 但保留範本
!.env.example
```

### 3. API Key 輪換策略
- 每 3 個月輪換一次
- 輪換時使用無停機策略（同時支援新舊 Key）
- 記錄所有 Key 使用情況

### 4. 監控和告警
```python
# 監控 API 使用量
def track_api_usage():
    # 記錄每次 API 調用
    # 達到配額 80% 時發送告警
    pass
```

---

## 📝 使用者體驗流程

### 情境 1: 有效的環境變數 Key
1. 使用者訪問應用
2. 後端檢查環境變數，Key 有效
3. 直接進入應用，無需輸入

### 情境 2: 無效或缺失的環境變數 Key
1. 使用者訪問應用
2. 前端檢查狀態，發現需要 Key
3. 顯示 `ApiKeyInput` 組件
4. 使用者輸入自己的 Key
5. 驗證成功後進入應用
6. Key 儲存在 sessionStorage（僅當前瀏覽器 session）

### 情境 3: Key 在使用中失效
1. API 調用返回 401/403 錯誤
2. 顯示錯誤提示和重新輸入 Key 的選項
3. 使用者更新 Key 後繼續使用

---

## 🧪 測試

### 後端測試
```python
# test_api_key.py
def test_validate_valid_key():
    result = validate_gemini_api_key("valid_key")
    assert result == True

def test_validate_invalid_key():
    result = validate_gemini_api_key("invalid_key")
    assert result == False

def test_api_key_status_endpoint():
    response = client.get("/api/v1/session/api-key/status")
    assert response.status_code == 200
    assert "has_valid_api_key" in response.json()
```

### 前端測試
```typescript
// ApiKeyInput.test.tsx
describe("ApiKeyInput", () => {
  it("shows missing status when no key", async () => {
    // Mock API response
    render(<ApiKeyInput />);
    expect(screen.getByText(/No API key found/)).toBeInTheDocument();
  });

  it("validates key on submit", async () => {
    render(<ApiKeyInput onApiKeyValidated={mockCallback} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "AIzaSy..." }
    });
    fireEvent.click(screen.getByText("Validate & Continue"));
    await waitFor(() => expect(mockCallback).toHaveBeenCalled());
  });
});
```

---

## 📚 相關資源

- [Google AI Studio - Get API Key](https://aistudio.google.com/app/apikey)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Azure Key Vault](https://azure.microsoft.com/services/key-vault/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)

---

## 🎯 總結

這個實施方案提供了：

✅ **彈性**: 支援環境變數和使用者輸入兩種方式  
✅ **安全**: Key 不會暴露在程式碼中  
✅ **用戶友好**: 清晰的 UI 和說明  
✅ **生產就緒**: 適合各種部署平台  
✅ **可維護**: 模組化設計，易於更新  

您現在可以安全地部署到正式環境，同時支援使用者自己提供 API Key 的靈活性！
