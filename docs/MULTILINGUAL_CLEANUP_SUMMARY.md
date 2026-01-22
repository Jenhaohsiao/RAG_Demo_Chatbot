# 多語言程式碼清理總結

**日期**: 2026-01-20  
**目的**: 簡化專案為英文單一語言 UI，移除不必要的多語言程式碼

## 📋 執行項目

### ✅ 已完成的清理工作

#### 1. 刪除非英文翻譯檔案
- **移除檔案**:
  - `frontend/src/i18n/locales/zh-TW.json` (繁體中文)
  - `frontend/src/i18n/locales/zh-CN.json` (簡體中文)
  - `frontend/src/i18n/locales/fr.json` (法文)
- **保留檔案**:
  - `frontend/src/i18n/locales/en.json` (英文)

#### 2. 簡化 i18n 配置
- **檔案**: `frontend/src/i18n/config.ts`
- **變更**:
  - 移除多語言支援配置
  - 移除 `i18next-browser-languagedetector` 使用
  - 移除 `supportedLanguages` 導出
  - 固定語言為英文 (`lng: 'en'`)
  - 移除語言方向監聽器
  - 簡化初始化配置

**修改前**:
```typescript
import LanguageDetector from 'i18next-browser-languagedetector';
// 支援 4 種語言: en, fr, zh-TW, zh-CN
export const supportedLanguages = { ... };
```

**修改後**:
```typescript
// English-only UI (LLM conversation language is unrestricted)
i18n.init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
});
```

#### 3. 刪除 LanguageSelector 組件
- **移除整個目錄**: `frontend/src/components/LanguageSelector/`
- **包含檔案**:
  - `LanguageSelector.tsx`
  - `LanguageSelector.scss`

#### 4. 移除語言切換相關 Hook
- **確認**: `useLanguage.ts` 不存在（之前已移除）
- **移除**: SupportedLanguage 類型定義的相關導入

#### 5. 更新 main.tsx
- **變更**:
  - 移除 `SupportedLanguage` 類型導入
  - 移除 `i18n` 實例導入
  - 移除 `language` 和 `updateLanguage` 從 useSession
  - 移除 `handleLanguageChange` 函數
  - 移除 `onLanguageChange` prop 傳遞給 Header
  - 移除語言方向設置的 useEffect

#### 6. 更新 Header 組件
- **檔案**: `frontend/src/components/Header/Header.tsx`
- **變更**:
  - 移除 `SupportedLanguage` 類型導入
  - 移除 `onLanguageChange` prop
  - 移除 `i18n` 從 useTranslation destructuring
  - 簡化為只使用 `t` 函數進行翻譯

#### 7. 更新 useSession Hook
- **檔案**: `frontend/src/hooks/useSession.ts`
- **變更**:
  - 移除 `useTranslation` 導入
  - 移除 `language` state
  - 移除 `updateLanguage` 函數
  - 移除 `language` 從返回值
  - 在 `createSession` 中硬編碼語言為 `'en'`
  - 移除 `setLanguage` 調用
  - 簡化 UseSessionReturn 介面

#### 8. 更新 package.json
- **變更**:
  - 更新 description: "RAG-Powered Chatbot - Frontend (English-only UI)"
  - 移除依賴: `i18next-browser-languagedetector`
  - 保留依賴: `i18next`, `react-i18next` (用於文本管理)

## 🎯 設計決策

### 為何保留 i18next?
雖然 UI 只使用英文，但我們選擇保留 `i18next` 和 `react-i18next`：

1. **文本管理**: 集中管理所有 UI 文本在 `en.json` 中
2. **代碼一致性**: 所有組件已使用 `t()` 函數，無需大規模重構
3. **未來擴展**: 如需添加多語言支持，架構已就位
4. **最小侵入**: 移除這些庫需要重構所有組件，風險較高

### 移除的內容
- `i18next-browser-languagedetector`: 不需要檢測用戶語言偏好
- 多語言翻譯檔案: 只保留英文
- 語言切換 UI: LanguageSelector 組件
- 語言相關邏輯: updateLanguage 等函數

## 📊 構建結果

### ✅ 構建成功
```bash
npm run build
```

**結果**:
- ✅ TypeScript 編譯: 無錯誤
- ✅ Vite 構建: 成功
- ⚠️ Sass 警告: Legacy JS API deprecation (非關鍵)

**輸出**:
- `dist/index.html`: 0.48 kB
- `dist/assets/index-*.css`: 548.87 kB
- `dist/assets/index-*.js`: 462.98 kB

## 🔍 測試建議

### 1. 前端功能測試
- [ ] 啟動開發服務器: `npm run dev`
- [ ] 確認所有頁面正常顯示英文文本
- [ ] 測試所有 UI 組件功能
- [ ] 確認 Header 按鈕正常工作

### 2. Session 管理測試
- [ ] 創建新 session
- [ ] 確認 session 使用英文語言
- [ ] 測試 session 重啟功能
- [ ] 驗證 session 過期處理

### 3. 回歸測試
- [ ] 上傳文檔功能
- [ ] RAG 查詢功能
- [ ] Metrics 顯示
- [ ] 聯絡表單

## 📁 受影響的檔案

### 刪除的檔案 (4)
```
frontend/src/i18n/locales/zh-TW.json
frontend/src/i18n/locales/zh-CN.json
frontend/src/i18n/locales/fr.json
frontend/src/components/LanguageSelector/ (整個目錄)
```

### 修改的檔案 (5)
```
frontend/src/i18n/config.ts
frontend/src/main.tsx
frontend/src/components/Header/Header.tsx
frontend/src/hooks/useSession.ts
frontend/package.json
```

## 📝 重要提醒

### UI vs LLM 對話語言
- **UI 語言**: 固定為英文
- **LLM 對話語言**: **不受限制**
- 用戶可以用任何語言與 LLM 對話
- 後端仍支援多語言文檔處理

### 後端不受影響
- 後端 API 仍接受 language 參數
- 前端現在固定發送 `'en'`
- 如需恢復多語言支持，主要是前端修改

## ✨ 清理效果

### 程式碼簡化
- ❌ 移除 ~500 行翻譯數據 (3 個 JSON 檔案)
- ❌ 移除 ~150 行 LanguageSelector 組件
- 📉 減少 ~20% i18n 相關代碼
- 📦 減少 1 個 npm 依賴

### 維護性提升
- ✅ 單一語言降低複雜度
- ✅ 減少翻譯同步問題
- ✅ 簡化測試範圍
- ✅ 更清晰的代碼意圖

### 性能改善
- 📦 Bundle size 略微減少
- 🚀 移除語言檢測邏輯
- 💾 減少初始化開銷

## 🔄 如需恢復多語言

如果未來需要恢復多語言 UI 支持：

1. 恢復翻譯檔案從 git 歷史
2. 恢復 `i18n/config.ts` 的完整配置
3. 恢復 `LanguageSelector` 組件
4. 在 `useSession` 中恢復 `updateLanguage`
5. 在 Header 中添加 LanguageSelector
6. 重新安裝 `i18next-browser-languagedetector`

## ✅ 總結

成功將前端 UI 簡化為英文單一語言，同時：
- ✅ 保留 i18next 架構以便文本管理
- ✅ 移除所有非必要的多語言代碼
- ✅ 構建測試通過
- ✅ 沒有編譯錯誤
- ✅ LLM 對話語言仍不受限制

**狀態**: 🟢 清理完成，可以進行測試
