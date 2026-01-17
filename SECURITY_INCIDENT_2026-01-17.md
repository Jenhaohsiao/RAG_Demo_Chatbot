# 安全事件報告 - SMTP 憑證暴露

**日期**: 2026-01-17  
**嚴重程度**: 🔴 高  
**狀態**: ✅ 已修復

## 事件描述

GitGuardian 偵測到 SMTP 憑證（Gmail App Password）被推送到 GitHub repository。

## 暴露的資訊

- **類型**: SMTP credentials
- **Repository**: Jenhaohsiao/RAG_Demo_Chatbot
- **檔案**: `backend/.env` (已在提交歷史中)
- **暴露時間**: 2026-01-17 05:50:12 UTC
- **暴露內容**:
  - SMTP_USERNAME: jenhao.hsiao2@gmail.com
  - SMTP_PASSWORD: dgcm tttq whbm ieto (Gmail App Password)

## 已採取的修復措施

### 1. 立即修復 (已完成 ✅)

- [x] 從 `backend/.env` 移除敏感憑證
- [x] 將憑證移至 `backend/.env.local`（已在 .gitignore 中）
- [x] 更新 `backend/.env.example` 移除實際憑證
- [x] 確認 `.gitignore` 正確設定（`.env.local` 已忽略）

### 2. 必須立即執行 (🚨 用戶行動)

**⚠️ 請立即撤銷並重新生成 Gmail App Password：**

1. 前往 Google 帳戶安全設定：https://myaccount.google.com/apppasswords
2. 登入 Google 帳戶（jenhao.hsiao2@gmail.com）
3. 找到「RAG Chatbot」應用程式密碼
4. **點擊「撤銷」刪除舊密碼**
5. 重新生成新的 16 位應用程式密碼
6. 更新 `backend/.env.local` 中的 `SMTP_PASSWORD`
7. 重啟 Docker 容器：`docker-compose restart backend`

### 3. Git 歷史清理 (建議執行)

由於敏感資訊已在 Git 歷史中，建議清理提交記錄：

```powershell
# 方法 1: 使用 git filter-repo (推薦)
pip install git-filter-repo
git filter-repo --path backend/.env --invert-paths --force

# 方法 2: 使用 BFG Repo-Cleaner
# 下載 bfg.jar 從 https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files backend/.env

# 強制推送清理後的歷史
git push origin --force --all
```

**注意**: 強制推送會改寫 Git 歷史，請確保沒有其他協作者或先通知他們。

## 安全最佳實踐

### 正確的配置檔案結構

```
backend/
├── .env              # 公開的預設值（可提交）
├── .env.local        # 敏感憑證（不提交，在 .gitignore 中）
└── .env.example      # 範本檔案（可提交）
```

### .gitignore 配置

```gitignore
# Environment files with secrets
.env.local
.env.*.local
*.env.local

# But allow example files
!.env.example
!*.env.example
```

### 環境變數優先順序

1. `.env.local` - 最高優先級（敏感資料）
2. `.env` - 一般設定（安全的預設值）
3. 系統環境變數

## 影響評估

### 潛在風險

- ✅ **已緩解**: 憑證已從追蹤檔案中移除
- ⚠️ **待處理**: Gmail App Password 仍有效，需要撤銷
- ⚠️ **歷史記錄**: Git 歷史可能仍包含敏感資訊

### 受影響系統

- Gmail SMTP 服務（jenhao.hsiao2@gmail.com）
- RAG Demo Chatbot 聯絡表單功能

### 不受影響

- Gemini API Key（存儲在 .env.local，未暴露）
- Qdrant 資料庫（本地 Docker，無憑證）
- 其他系統功能

## 預防措施

### 已實施

1. ✅ 環境變數分離（.env vs .env.local）
2. ✅ .gitignore 正確配置
3. ✅ 文檔更新（CONTACT_FORM_SETUP.md）

### 建議新增

1. **Pre-commit Hook**: 掃描敏感資訊
   ```bash
   # 安裝 git-secrets
   git secrets --install
   git secrets --register-aws
   ```

2. **GitHub Secret Scanning**: 啟用 GitHub Advanced Security（如果使用 Pro/Enterprise）

3. **定期審查**: 每月檢查 .gitignore 和環境變數配置

## 時間線

| 時間 (UTC) | 事件 |
|-----------|------|
| 2026-01-17 05:50:12 | SMTP 憑證被推送到 GitHub |
| 2026-01-17 12:55:00 | GitGuardian 發送警告郵件 |
| 2026-01-17 13:00:00 | 開始修復：移除 .env 中的憑證 |
| 2026-01-17 13:05:00 | 憑證移至 .env.local |
| 2026-01-17 13:10:00 | 更新文檔和範例檔案 |
| 待處理 | 用戶撤銷並重新生成 Gmail App Password |
| 待處理 | 清理 Git 歷史（可選） |

## 後續追蹤

- [ ] 確認新的 Gmail App Password 已設定
- [ ] 測試聯絡表單功能正常運作
- [ ] 決定是否清理 Git 歷史
- [ ] 審查其他可能的敏感資訊暴露

## 參考資源

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [GitGuardian Documentation](https://docs.gitguardian.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

**建立者**: GitHub Copilot  
**審查者**: 待審查  
**狀態**: 待用戶執行撤銷密碼步驟
