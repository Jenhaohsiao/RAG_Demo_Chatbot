/**
 * useLanguage Hook
 * Manages i18n language state with localStorage persistence and backend sync
 * 
 * T075: Language Change Handler Implementation
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import sessionService from '../services/sessionService';

const LANGUAGE_STORAGE_KEY = 'rag-chatbot-language';

const SUPPORTED_LANGUAGES = ['en', 'zh-TW', 'zh-CN', 'ko', 'es', 'ja', 'ar', 'fr'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface UseLanguageReturn {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage, sessionId?: string) => Promise<void>;
  supportedLanguages: readonly SupportedLanguage[];
  isUpdating: boolean;
  error: string | null;
}

/**
 * Custom hook for language management
 * 
 * Features:
 * - Sync with i18next
 * - Persist to localStorage
 * - Backend API sync (PUT /session/{sessionId}/language)
 * - Type-safe language codes
 * - RTL support for Arabic
 * - Error handling for backend sync
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

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Change language with persistence and backend sync
   * 
   * T075: Implement language change handler
   * - Updates i18next
   * - Persists to localStorage
   * - Syncs with backend API if sessionId provided
   * - Updates RTL layout
   * - Handles errors gracefully
   */
  const setLanguage = useCallback(async (lang: SupportedLanguage, sessionId?: string) => {
    try {
      setIsUpdating(true);
      setError(null);

      console.log('[useLanguage] Changing language to:', lang, 'with sessionId:', sessionId);

      // Update i18n (this also triggers RTL update via config listener)
      await i18n.changeLanguage(lang);
      
      // Update state
      setLanguageState(lang);
      
      // Persist to localStorage
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

      // Sync with backend if sessionId provided
      if (sessionId) {
        try {
          console.log('[useLanguage] Syncing language to backend for session:', sessionId);
          const response = await sessionService.updateLanguage(sessionId, lang);
          console.log('[useLanguage] Backend language update successful:', response);
        } catch (backendError) {
          // Log error but don't fail - frontend language is already changed
          const errorMsg = backendError instanceof Error ? backendError.message : 'Failed to sync with backend';
          console.warn('[useLanguage] Backend sync error (non-blocking):', errorMsg);
          setError(errorMsg);
          // Don't throw - language change succeeded locally
        }
      }

      console.log('[useLanguage] Language successfully changed to:', lang);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error changing language';
      console.error('[useLanguage] Error changing language:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [i18n]);

  /**
   * Sync with i18n changes from external sources
   */
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if (SUPPORTED_LANGUAGES.includes(lng as SupportedLanguage)) {
        setLanguageState(lng as SupportedLanguage);
        console.log('[useLanguage] i18n language changed to:', lng);
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
    supportedLanguages: SUPPORTED_LANGUAGES,
    isUpdating,
    error
  };
};

export default useLanguage;
