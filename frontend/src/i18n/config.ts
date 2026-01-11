/**
 * i18n (internationalization) configuration
 * 支援 7 種語言: en, zh-TW, ko, es, ja, fr, zh-CN
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import fr from './locales/fr.json';
import zhCN from './locales/zh-CN.json';

// 支援的語言配置
export const supportedLanguages = {
  en: { nativeName: 'English', dir: 'ltr' },
  'zh-TW': { nativeName: '繁體中文', dir: 'ltr' },
  ko: { nativeName: '한국어', dir: 'ltr' },
  es: { nativeName: 'Español', dir: 'ltr' },
  ja: { nativeName: '日本語', dir: 'ltr' },
  fr: { nativeName: 'Français', dir: 'ltr' },
  'zh-CN': { nativeName: '简体中文', dir: 'ltr' },
};

// i18next initialization
i18n
  .use(LanguageDetector) // 從瀏覽器偵測使用者語言
  .use(initReactI18next) // 將 i18n 實例傳遞給 react-i18next
  .init({
    resources: {
      en: { translation: en },
      'zh-TW': { translation: zhTW },
      ko: { translation: ko },
      es: { translation: es },
      ja: { translation: ja },
      fr: { translation: fr },
      'zh-CN': { translation: zhCN },
    },
    fallbackLng: 'en', // 如果找不到翻譯則回退到英文
    supportedLngs: Object.keys(supportedLanguages),
    debug: import.meta.env.DEV, // 在開發模式啟用偵錯
    interpolation: {
      escapeValue: false, // React 已經會逸出值
    },
    detection: {
      // Order of language detection methods
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      // Keys to lookup language from
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      // Cache user language
      caches: ['localStorage'],
    },
  });

// Set HTML dir attribute based on language direction
i18n.on('languageChanged', (lng) => {
  const direction = supportedLanguages[lng as keyof typeof supportedLanguages]?.dir || 'ltr';
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;
});

export default i18n;
