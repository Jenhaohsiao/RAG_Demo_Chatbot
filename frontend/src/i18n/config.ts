/**
 * i18n (internationalization) configuration
 * English-only UI (LLM conversation language is unrestricted)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import English translation file
import en from './locales/en.json';

// i18next initialization - English only
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    lng: 'en', // Fixed to English
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
