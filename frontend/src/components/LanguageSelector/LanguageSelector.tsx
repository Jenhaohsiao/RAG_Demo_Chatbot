/**
 * LanguageSelector Component
 * Cycling animation through 7 languages, click to select
 *
 * Features:
 * - Auto-cycle button text through 7 language names every 1 second
 * - Click button to toggle dropdown menu
 * - Language text animates with smooth transition
 * - Shows checkmark for currently selected language
 */
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage, type SupportedLanguage } from "../../hooks/useLanguage";
import "./LanguageSelector.scss";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  "zh-TW": "繁體中文",
  ko: "한국어",
  es: "Español",
  ja: "日本語",
  fr: "Français",
  "zh-CN": "简体中文",
};

const LANGUAGE_ORDER: SupportedLanguage[] = [
  "en",
  "zh-TW",
  "ko",
  "es",
  "ja",
  "fr",
  "zh-CN",
];

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
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  onLanguageChange,
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
      setCycleIndex((prev) => (prev + 1) % LANGUAGE_ORDER.length);
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
        className="btn btn-sm btn-light border btn-language-selector"
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-expanded={isDropdownOpen}
        title={t("labels.selectLanguage", "Select Language")}
      >
        <i className="bi bi-globe me-2"></i>

        {/* Cycling text animation */}
        <span className="btn-label">{cyclingLabel}</span>
      </button>

      {/* Language Dropdown Menu */}
      {isDropdownOpen && (
        <div className="dropdown-menu dropdown-menu-end show language-dropdown-menu">
          {/* Language Options */}
          {LANGUAGE_ORDER.map((lang) => (
            <button
              key={lang}
              data-testid="language-option"
              className={`dropdown-item ${language === lang ? "active" : ""}`}
              onClick={() => handleSelectLanguage(lang)}
            >
              <span>{LANGUAGE_LABELS[lang]}</span>
              {language === lang && (
                <i className="bi bi-check-lg ms-2 check-icon"></i>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div
          className="language-selector-backdrop"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default LanguageSelector;
