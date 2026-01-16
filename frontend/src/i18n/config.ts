/**
 * i18n (internationalization) configuration
 * Supports 4 languages: en, fr, zh-TW, zh-CN
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import fr from './locales/fr.json';
import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';

// Supported language configuration
export const supportedLanguages = {
  en: { nativeName: 'English', dir: 'ltr' },
  fr: { nativeName: 'Français', dir: 'ltr' },
  'zh-TW': { nativeName: '繁體中文', dir: 'ltr' },
  'zh-CN': { nativeName: '简体中文', dir: 'ltr' },
};

// i18next initialization
i18n
  .use(LanguageDetector) // Detect user language from browser
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      'zh-TW': { translation: zhTW },
      'zh-CN': { translation: zhCN },
    },
    fallbackLng: 'en', // Fallback to English if translation not found
    supportedLngs: Object.keys(supportedLanguages),
    debug: false, // Disable debug mode to suppress console warnings
    interpolation: {
      escapeValue: false, // React already escapes values
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
