/**
 * LanguageSelector Component
 * Cycling animation through 7 languages, click to select
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

// Cycle interval: 1 second
const CYCLE_INTERVAL = 1000;

interface LanguageSelectorProps {
  onLanguageChange?: (language: SupportedLanguage) => void;
}

/**
 * Language selector with cycling animation
 * 
 * Features:
 * - Auto-cycle through languages every 1 second
 * - Click to select and stop cycling
 * - Shows current language label
 * - Syncs with session language preference
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  onLanguageChange 
}) => {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isSelected, setIsSelected] = useState(false);

  /**
   * Cycling animation effect
   */
  useEffect(() => {
    if (isSelected) return;

    const timer = setInterval(() => {
      setCycleIndex(prev => (prev + 1) % supportedLanguages.length);
    }, CYCLE_INTERVAL);

    return () => clearInterval(timer);
  }, [isSelected, supportedLanguages.length]);

  /**
   * Handle language selection
   */
  const handleClick = () => {
    const selectedLanguage = supportedLanguages[cycleIndex];
    
    // Update language
    setLanguage(selectedLanguage);
    
    // Stop cycling
    setIsSelected(true);
    
    // Notify parent component
    if (onLanguageChange) {
      onLanguageChange(selectedLanguage);
    }
    
    // Resume cycling after 3 seconds
    setTimeout(() => {
      setIsSelected(false);
    }, 3000);
  };

  const currentLanguage = isSelected 
    ? language 
    : supportedLanguages[cycleIndex];
  
  const displayLabel = LANGUAGE_LABELS[currentLanguage];

  return (
    <div 
      className="language-selector"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={t('labels.selectLanguage')}
      style={{
        cursor: 'pointer',
        padding: '8px 16px',
        borderRadius: '4px',
        border: '1px solid #dee2e6',
        backgroundColor: isSelected ? '#0d6efd' : 'transparent',
        color: isSelected ? 'white' : 'inherit',
        transition: 'all 0.3s ease',
        userSelect: 'none',
        minWidth: '120px',
        textAlign: 'center'
      }}
    >
      <span style={{ 
        fontSize: '14px',
        fontWeight: isSelected ? 'bold' : 'normal'
      }}>
        {displayLabel}
      </span>
    </div>
  );
};

export default LanguageSelector;
