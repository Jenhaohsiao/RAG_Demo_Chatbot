/**
 * LanguageSelector Component
 * Cycling animation through 7 languages, click to select
 * 
 * Features:
 * - Auto-cycle button text through 7 language names every 1 second
 * - Click button to toggle dropdown menu
 * - Language text animates with smooth transition
 * - Shows checkmark for currently selected language
 * - Supports RTL (Arabic) layout
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage, type SupportedLanguage } from '../hooks/useLanguage';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: '中文',
  ko: '한국어',
  es: 'Español',
  ja: '日本語',
  ar: 'العربية',
  fr: 'Français'
};

const LANGUAGE_ORDER: SupportedLanguage[] = ['en', 'zh', 'ko', 'es', 'ja', 'ar', 'fr'];

// Cycle interval: 1 second
const CYCLE_INTERVAL = 1000;

interface LanguageSelectorProps {
  onLanguageChange?: (language: SupportedLanguage) => void;
}

/**
 * Language selector with cycling animation
 * 
 * Features:
 * - Auto-cycle button text through 7 languages every 1 second (when dropdown closed)
 * - Click button to toggle dropdown menu
 * - Click to select language from dropdown
 * - Shows checkmark for currently selected language
 * - Syncs with session language preference
 * - Supports RTL layout for Arabic
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  onLanguageChange 
}) => {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  /**
   * Cycling animation effect - cycles through language names
   * Only cycles when dropdown is closed
   */
  useEffect(() => {
    if (isDropdownOpen) return;

    const timer = setInterval(() => {
      setCycleIndex(prev => (prev + 1) % LANGUAGE_ORDER.length);
    }, CYCLE_INTERVAL);

    return () => clearInterval(timer);
  }, [isDropdownOpen]);

  /**
   * Handle language selection from dropdown
   * T075: Connect to backend language update endpoint
   */
  const handleSelectLanguage = async (selectedLanguage: SupportedLanguage) => {
    try {
      // Update language (with optional backend sync via sessionId in parent)
      await setLanguage(selectedLanguage);
      
      // Close dropdown
      setIsDropdownOpen(false);
      
      // Notify parent component
      if (onLanguageChange) {
        onLanguageChange(selectedLanguage);
      }
    } catch (error) {
      console.error('[LanguageSelector] Error changing language:', error);
      // Don't close dropdown on error so user can retry
    }
  };

  // Get the cycling language name for button display
  const cyclingLanguage = LANGUAGE_ORDER[cycleIndex];
  const cyclingLabel = LANGUAGE_LABELS[cyclingLanguage];
  
  // Get current selected language for dropdown
  const currentLanguageName = LANGUAGE_LABELS[language];

  return (
    <div className="language-selector position-relative">
      {/* Language Button with Cycling Animation */}
      <button
        data-testid="language-selector-button"
        className="btn btn-sm btn-light border"
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-expanded={isDropdownOpen}
        title={t('labels.selectLanguage', 'Select Language')}
        style={{
          minWidth: '140px',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <i className="bi bi-globe me-2"></i>
        
        {/* Cycling text animation */}
        <span
          style={{
            display: 'inline-block',
            transition: 'opacity 0.3s ease',
            opacity: 1,
            minWidth: '100px',
            textAlign: 'center'
          }}
        >
          {cyclingLabel}
        </span>
      </button>

      {/* Language Dropdown Menu */}
      {isDropdownOpen && (
        <div 
          className="dropdown-menu dropdown-menu-end show"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            zIndex: 1000,
            minWidth: '180px'
          }}
        >
          {/* Language Options */}
          {LANGUAGE_ORDER.map((lang) => (
            <button
              key={lang}
              data-testid="language-option"
              className={`dropdown-item ${language === lang ? 'active' : ''}`}
              onClick={() => handleSelectLanguage(lang)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                width: '100%',
                fontSize: '14px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>{LANGUAGE_LABELS[lang]}</span>
              {language === lang && (
                <i className="bi bi-check-lg ms-2" style={{ color: '#0d6efd' }}></i>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default LanguageSelector;
