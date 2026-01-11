/**
 * Header Component
 * App title, language selector, session controls
 */
import React from "react";
import { useTranslation } from "react-i18next";
import type { SupportedLanguage } from "../../hooks/useLanguage";
import ToastMessage from "../ToastMessage/ToastMessage";
import "./Header.scss";

interface HeaderProps {
  sessionId: string | null;
  onLanguageChange?: (language: SupportedLanguage) => void;
  onLeave?: () => void;
  onRestart?: () => void;
  onAboutClick?: () => void;
  systemMessage?: {
    type: "error" | "warning" | "info" | "success";
    message: string;
  } | null;
  onDismissMessage?: () => void;
  onRestartSession?: () => void;
}

const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string }[] = [
  { code: "en", name: "English" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "ja", name: "日本語" },
  { code: "es", name: "Español" },
  { code: "ko", name: "한국어" },
  { code: "fr", name: "Français" },
  { code: "zh-CN", name: "简体中文" },
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
  onDismissMessage,
  onRestartSession,
}) => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] =
    React.useState<SupportedLanguage>(
      (i18n.language as SupportedLanguage) || "en"
    );
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // 點擊外部關閉下拉選單
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  React.useEffect(() => {
    // Update state when i18n language changes
    setCurrentLanguage((i18n.language as SupportedLanguage) || "en");
  }, [i18n.language]);

  const handleLanguageChange = (langCode: SupportedLanguage) => {
    setCurrentLanguage(langCode);
    setDropdownOpen(false);
    i18n.changeLanguage(langCode);
    onLanguageChange?.(langCode);
  };

  const currentLangName =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === currentLanguage)?.name ||
    "Language";

  return (
    <header>
      <nav className="navbar navbar-expand-lg  navbar-bg ">
        <div className="container container-fluid">
          {/* App Title */}
          <a className="navbar-brand" href="/">
            <h3 className="mb-0 fw-bold app-title">{t("app.title")}</h3>
            <div className="small app-subtitle-container">
              <h6 className="mb-0 mt-1 text-white">
                <b>用視覺說明RAG運行的原理跟流程</b>
              </h6>
            </div>
          </a>

          {/* Right-side controls */}
          <div className="ms-auto d-flex align-items-center gap-2">
            {/* About Project Button */}
            {onAboutClick && (
              <button
                className="btn btn-sm btn-outline-light border "
                type="button"
                onClick={onAboutClick}
                title="關於本專案"
              >
                <span className="d-none d-sm-inline">關於本專案</span>
              </button>
            )}

            {/* Session Controls - Restart Button Only */}
            {sessionId && onRestart && (
              <button
                type="button"
                className="btn btn-sm btn-outline-light border"
                onClick={onRestart}
                title={t("buttons.restart")}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                <span className="d-none d-sm-inline">
                  {t("buttons.restart")}
                </span>
              </button>
            )}

            {/* Language Dropdown Selector - Moved to rightmost */}
            <div className="dropdown" ref={dropdownRef}>
              <button
                className="btn btn-sm btn-outline-light border dropdown-toggle"
                type="button"
                data-testid="language-selector-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                title={t("labels.selectLanguage")}
              >
                <i className="bi bi-globe me-2"></i>
                <span className="d-none d-sm-inline text-truncate language-selector-text">
                  {currentLangName}
                </span>
              </button>
              {dropdownOpen && (
                <ul className="dropdown-menu dropdown-menu-end show">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <li key={lang.code}>
                      <button
                        className={`dropdown-item language-option ${
                          currentLanguage === lang.code ? "active" : ""
                        }`}
                        data-testid={`language-option-${lang.code}`}
                        onClick={() => handleLanguageChange(lang.code)}
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
      {/* Toast Message */}
      {systemMessage && onDismissMessage && (
        <ToastMessage
          type={systemMessage.type}
          message={systemMessage.message}
          onDismiss={onDismissMessage}
          showConfirmButton={
            // Session錯誤只顯示更新Session按鈕，不顯示確定按鈕
            !(
              systemMessage.type === "error" &&
              (systemMessage.message.includes("會話已過期") ||
                systemMessage.message.includes("無法維持會話"))
            ) &&
            // Session更新成功的消息不需要確定按鈕
            !(
              systemMessage.type === "success" &&
              systemMessage.message.includes("Session 更新成功")
            )
          }
          showExtraButtonOnly={
            // Session錯誤只顯示更新Session按鈕
            systemMessage.type === "error" &&
            (systemMessage.message.includes("會話已過期") ||
              systemMessage.message.includes("無法維持會話"))
          }
          extraButton={
            systemMessage.type === "error" &&
            (systemMessage.message.includes("會話已過期") ||
              systemMessage.message.includes("無法維持會話")) &&
            onRestartSession
              ? {
                  text: "更新 Session",
                  onClick: onRestartSession,
                  className: "btn btn-sm btn-warning",
                }
              : undefined
          }
        />
      )}
    </header>
  );
};

export default Header;
