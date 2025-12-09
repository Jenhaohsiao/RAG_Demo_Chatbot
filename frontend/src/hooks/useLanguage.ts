/**
 * useLanguage Hook
 * Manages i18n language state with localStorage persistence
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGE_STORAGE_KEY = 'rag-chatbot-language';

const SUPPORTED_LANGUAGES = ['en', 'zh', 'ko', 'es', 'ja', 'ar', 'fr'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface UseLanguageReturn {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  supportedLanguages: readonly SupportedLanguage[];
}

/**
 * Custom hook for language management
 * 
 * Features:
 * - Sync with i18next
 * - Persist to localStorage
 * - Type-safe language codes
 */
export const useLanguage = (): UseLanguageReturn => {
  const { i18n } = useTranslation();
  
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    // Load from localStorage or use i18n default
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
      return stored as SupportedLanguage;
    }
    return (i18n.language || 'en') as SupportedLanguage;
  });

  /**
   * Change language with persistence
   */
  const setLanguage = useCallback((lang: SupportedLanguage) => {
    // Update i18n
    i18n.changeLanguage(lang);
    
    // Update state
    setLanguageState(lang);
    
    // Persist to localStorage
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    
    console.log('Language changed to:', lang);
  }, [i18n]);

  /**
   * Sync with i18n changes from external sources
   */
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if (SUPPORTED_LANGUAGES.includes(lng as SupportedLanguage)) {
        setLanguageState(lng as SupportedLanguage);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  return {
    language,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES
  };
};

export default useLanguage;
