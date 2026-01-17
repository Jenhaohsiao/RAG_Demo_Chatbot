# 聯絡表單功能設置指南

## 功能概述

RAG Demo Chatbot 現在包含一個聯絡表單功能，允許訪客直接通過網站發送訊息給您。當訪客提交表單時，系統會將訊息發送到您的電子郵件信箱。

## 安全性設計

- ✅ **信箱地址隱藏**：接收信箱地址存儲在後端環境變量中，前端代碼無法訪問
- ✅ **API保護**：所有表單提交通過後端API處理，前端只能調用API端點
- ✅ **數據驗證**：後端對所有輸入進行嚴格驗證，防止惡意輸入
- ✅ **憑證隔離**：SMTP 憑證存儲在 `.env.local`（不追蹤到 Git）

## 配置步驟

### 1. 設置Gmail應用密碼（推薦）

如果您使用Gmail作為發送郵箱，需要創建應用密碼：

1. 前往 [Google帳戶管理](https://myaccount.google.com/)
2. 點擊「安全性」
3. 啟用「兩步驗證」（如果尚未啟用）
4. 在「兩步驗證」下方，找到「應用程式密碼」
5. 選擇「郵件」和您的設備
6. 複製生成的16位密碼

### 2. 配置環境變量

⚠️ **重要安全提示**: 
- **絕對不要**將 SMTP 憑證寫在 `backend/.env` 中（該檔案可能被提交）
- **必須**將憑證寫在 `backend/.env.local` 中（已在 .gitignore 中，不會被提交）

在 `backend/.env.local` 文件中添加以下配置：

```bash
# SMTP Configuration for Contact Form
# ------------------------------------
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_16_digit_app_password_here
```

`backend/.env` 文件應該只包含非敏感的預設值：

```bash
# Email Configuration for Contact Form
# -------------------------------------
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### 3. 使用其他郵件服務商

如果不使用Gmail，可以配置其他SMTP服務：

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your_email@outlook.com
SMTP_PASSWORD=your_password
```

#### Yahoo Mail
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USERNAME=your_email@yahoo.com
SMTP_PASSWORD=your_app_password
```

### 4. 測試配置

1. 重啟後端服務器
2. 打開前端網站
3. 點擊「與我聯絡」按鈕
4. 填寫並提交測試留言
5. 檢查您的信箱是否收到通知郵件

## 表單欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| 留言者名字 | 必填 | 2-100字符 |
| 留言者信箱 | 選填 | 用於接收回覆 |
| 留言內容 | 必填 | 10-5000字符 |

## 郵件模板

發送的郵件包含以下信息：
- 留言者姓名
- 留言者信箱（如有提供）
- 留言時間
- 留言內容（保留原始格式）

郵件主題格式：`RAG Demo Chatbot - 新留言來自 [姓名]`

## 故障排除

### 郵件發送失敗

1. **檢查SMTP憑證**：確保用戶名和密碼正確
2. **確認應用密碼**：Gmail需使用應用密碼，而非帳戶密碼
3. **查看日誌**：檢查 `backend/logs/app.log` 中的錯誤信息
4. **防火牆設置**：確保587端口未被封鎖

### 前端無法提交

1. **確認後端運行**：確保後端服務器在 `localhost:8000` 運行
2. **檢查網絡請求**：打開瀏覽器開發者工具查看Console錯誤
3. **CORS設置**：確認前端URL在 `CORS_ORIGINS` 中

## API端點

```
POST /api/v1/contact/
```

請求體：
```json
{
  "name": "張三",
  "email": "optional@example.com",
  "message": "您好，我想詢問..."
}
```

回應：
```json
{
  "success": true,
  "message": "留言已成功送出！我們會盡快回覆您。"
}
```

## 開發模式

如果您在開發階段不想配置SMTP，系統會自動跳過郵件發送但仍接受表單提交。這樣可以測試前端功能而不需要實際的郵件服務器。

## 生產環境建議

1. 使用專門的交易郵件服務（如SendGrid, AWS SES, Mailgun）
2. 實施速率限制以防止垃圾郵件
3. 添加CAPTCHA驗證
4. 記錄所有提交到數據庫以備查
5. 設置郵件發送隊列以提高性能

## 相關文件

- 前端組件：`frontend/src/components/ContactModal/ContactModal.tsx`
- 後端路由：`backend/src/api/routes/contact.py`
- 配置文件：`backend/src/core/config.py`
- 環境變量示例：`backend/.env.example`
