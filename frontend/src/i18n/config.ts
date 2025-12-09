/**
 * i18n (internationalization) configuration
 * Supports 7 languages: en, zh, ko, es, ja, ar, fr
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import ar from './locales/ar.json';
import fr from './locales/fr.json';

// Supported languages configuration
export const supportedLanguages = {
  en: { nativeName: 'English', dir: 'ltr' },
  zh: { nativeName: '中文', dir: 'ltr' },
  ko: { nativeName: '한국어', dir: 'ltr' },
  es: { nativeName: 'Español', dir: 'ltr' },
  ja: { nativeName: '日本語', dir: 'ltr' },
  ar: { nativeName: 'العربية', dir: 'rtl' }, // Arabic is RTL
  fr: { nativeName: 'Français', dir: 'ltr' },
};

// i18next initialization
i18n
  .use(LanguageDetector) // Detect user language from browser
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      ko: { translation: ko },
      es: { translation: es },
      ja: { translation: ja },
      ar: { translation: ar },
      fr: { translation: fr },
    },
    fallbackLng: 'en', // Fallback to English if translation not found
    supportedLngs: Object.keys(supportedLanguages),
    debug: import.meta.env.DEV, // Enable debug in development mode
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
