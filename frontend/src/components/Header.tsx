/**
 * Header Component
 * App title, language selector, session controls
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '../hooks/useLanguage';

interface HeaderProps {
  sessionId: string | null;
  onLanguageChange?: (language: SupportedLanguage) => void;
  onLeave?: () => void;
  onRestart?: () => void;
}

const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'ja', name: '日本語' },
  { code: 'es', name: 'Español' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'fr', name: 'Français' },
  { code: 'zh-CN', name: '简体中文' },
];

/**
 * Application header with navigation and controls
 * 
 * Features:
 * - App title with i18n
 * - Language dropdown selector
 * - Leave/Restart buttons
 */
export const Header: React.FC<HeaderProps> = ({
  sessionId,
  onLanguageChange,
  onLeave,
  onRestart
}) => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = React.useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || 'en'
  );
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    // Update state when i18n language changes
    setCurrentLanguage((i18n.language as SupportedLanguage) || 'en');
  }, [i18n.language]);

  const handleLanguageChange = (langCode: SupportedLanguage) => {
    setCurrentLanguage(langCode);
    setDropdownOpen(false);
    i18n.changeLanguage(langCode);
    onLanguageChange?.(langCode);
  };

  const currentLangName = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === currentLanguage
  )?.name || 'Language';

  return (
    <header>
      <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
        <div className="container-fluid">
          {/* App Title */}
          <a className="navbar-brand" href="/">
            <strong>{t('app.title')}</strong>
          </a>

          {/* Right-side controls */}
          <div className="ms-auto d-flex align-items-center gap-2">
            {/* Language Dropdown Selector */}
            <div className="dropdown">
              <button
                className="btn btn-sm btn-light border dropdown-toggle"
                type="button"
                data-testid="language-selector-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                title={t('labels.selectLanguage')}
              >
                <i className="bi bi-globe me-2"></i>
                <span className="d-none d-sm-inline text-truncate" style={{ maxWidth: '100px' }}>
                  {currentLangName}
                </span>
              </button>
              {dropdownOpen && (
                <ul className="dropdown-menu dropdown-menu-end show">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <li key={lang.code}>
                      <button
                        className={`dropdown-item ${currentLanguage === lang.code ? 'active' : ''}`}
                        data-testid={`language-option-${lang.code}`}
                        onClick={() => handleLanguageChange(lang.code)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="me-2">
                          {currentLanguage === lang.code && (
                            <i className="bi bi-check-lg"></i>
                          )}
                        </span>
                        {lang.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Session Controls */}
            {sessionId && (
              <div className="btn-group" role="group">
                {/* Restart Button */}
                {onRestart && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={onRestart}
                    title={t('buttons.restart')}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    <span className="d-none d-sm-inline">{t('buttons.restart')}</span>
                  </button>
                )}

                {/* Leave Button */}
                {onLeave && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={onLeave}
                    title={t('buttons.leave')}
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    <span className="d-none d-sm-inline">{t('buttons.leave')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Session Info Footer */}
      {sessionId && (
        <div className="bg-light border-bottom py-2">
          <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="text-muted small">
                <i className="bi bi-info-circle me-2"></i>
                <strong>{t('labels.sessionId')}:</strong>{' '}
                <code>{sessionId}</code>
              </div>
              <div className="text-muted small">
                <i className="bi bi-hourglass-split me-2"></i>
                <span>{t('labels.sessionExpiresIn')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
