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
  onAboutClick?: () => void;
  systemMessage?: {
    type: 'error' | 'warning' | 'info' | 'success';
    message: string;
  } | null;
  onDismissMessage?: () => void;
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
  onRestart,
  onAboutClick,
  systemMessage,
  onDismissMessage
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
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom">
        <div className="container-fluid">
          {/* App Title */}
          <a className="navbar-brand" href="/">
            <h3 className="mb-0 fw-bold" style={{ 
              background: 'linear-gradient(135deg, #ffffff, #e8f4fd)', 
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
              letterSpacing: '0.5px'
            }}>
              {t('app.title')}
            </h3>
          </a>

          {/* Right-side controls */}
          <div className="ms-auto d-flex align-items-center gap-2">
            {/* About Project Button */}
            {onAboutClick && (
              <button
                className="btn btn-sm btn-outline-light"
                type="button"
                onClick={onAboutClick}
                title="關於本專案"
              >
                <i className="bi bi-info-circle me-1"></i>
                <span className="d-none d-sm-inline">關於本專案</span>
              </button>
            )}

            {/* Session Controls - Restart Button Only */}
            {sessionId && onRestart && (
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
                onClick={onRestart}
                title={t('buttons.restart')}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                <span className="d-none d-sm-inline">{t('buttons.restart')}</span>
              </button>
            )}

            {/* Language Dropdown Selector - Moved to rightmost */}
            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-light border dropdown-toggle"
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
          </div>
        </div>
      </nav>

      {/* Session Info Footer with System Messages */}
      {(sessionId || systemMessage) && (
        <div className="bg-dark border-bottom py-2">
          <div className="container-fluid">
            {/* System Message */}
            {systemMessage && (
              <div className={`alert alert-${systemMessage.type === 'error' ? 'danger' : systemMessage.type} alert-dismissible fade show mb-2`} role="alert">
                <i className={`bi bi-${
                  systemMessage.type === 'error' ? 'exclamation-triangle' :
                  systemMessage.type === 'warning' ? 'exclamation-triangle' :
                  systemMessage.type === 'info' ? 'info-circle' :
                  'check-circle'
                } me-2`}></i>
                {systemMessage.message}
                {onDismissMessage && (
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={onDismissMessage}
                  ></button>
                )}
              </div>
            )}
            
            {/* Session Info */}
            {sessionId && (
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="text-light small">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>{t('labels.sessionId')}:</strong>{' '}
                  <code className="text-warning">{sessionId}</code>
                </div>
                <div className="text-light small">
                  <i className="bi bi-hourglass-split me-2"></i>
                  <span>{t('labels.sessionExpiresIn')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
