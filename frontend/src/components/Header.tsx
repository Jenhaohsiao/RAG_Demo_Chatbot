/**
 * Header Component
 * App title, language selector, session controls
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import type { SupportedLanguage } from '../hooks/useLanguage';

interface HeaderProps {
  sessionId: string | null;
  onLanguageChange?: (language: SupportedLanguage) => void;
  onLeave?: () => void;
  onRestart?: () => void;
}

/**
 * Application header with navigation and controls
 * 
 * Features:
 * - App title with i18n
 * - Language selector with cycling animation
 * - Session ID display
 * - Leave/Restart buttons
 */
export const Header: React.FC<HeaderProps> = ({
  sessionId,
  onLanguageChange,
  onLeave,
  onRestart
}) => {
  const { t } = useTranslation();

  return (
    <header>
      <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
        <div className="container-fluid">
          {/* App Title */}
          <a className="navbar-brand" href="/">
            <strong>{t('app.title')}</strong>
          </a>

          {/* Right-side controls */}
          <div className="d-flex align-items-center gap-3">
            {/* Language Selector */}
            <LanguageSelector onLanguageChange={onLanguageChange} />

            {/* Session ID Display */}
            {sessionId && (
              <div className="text-muted small">
                <span className="badge bg-secondary">
                  {t('labels.sessionId')}: {sessionId.substring(0, 8)}...
                </span>
              </div>
            )}

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
                    {t('buttons.restart')}
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
                    {t('buttons.leave')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
