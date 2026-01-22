/**
 * Header Component
 * App title, language selector, session controls
 */
import React from "react";
import { useTranslation } from "react-i18next";
import ToastMessage from "../ToastMessage/ToastMessage";
import "./Header.scss";

interface HeaderProps {
  sessionId: string | null;
  onLeave?: () => void;
  onRestart?: () => void;
  onAboutClick?: () => void;
  onContactClick?: () => void;
  systemMessage?: {
    type: "error" | "warning" | "info" | "success";
    message: string;
  } | null;
  onDismissMessage?: () => void;
  onRestartSession?: () => void;
}

/**
 * Application header with navigation and controls
 *
 * Features:
 * - App title with i18n
 * - Session controls
 */
export const Header: React.FC<HeaderProps> = ({
  sessionId,
  onLeave,
  onRestart,
  onAboutClick,
  onContactClick,
  systemMessage,
  onDismissMessage,
  onRestartSession,
}) => {
  const { t } = useTranslation();

  return (
    <header>
      <nav className="navbar navbar-expand-lg  navbar-bg ">
        <div className="container container-fluid">
          {/* App Title */}
          <a className="navbar-brand" href="/">
            <h3 className="mb-0 fw-bold app-title">{t("app.title")}</h3>
            <div className="small app-subtitle-container">
              <h6 className="mb-0 mt-1 text-white">
                <b>{t("app.tagline")}</b>
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
                title={t("buttons.about")}
              >
                <span className="d-none d-sm-inline">{t("buttons.about")}</span>
              </button>
            )}

            {/* Contact Button */}
            {onContactClick && (
              <button
                className="btn btn-sm btn-outline-light border"
                type="button"
                onClick={onContactClick}
                title={t("buttons.contact")}
              >
                <span className="d-none d-sm-inline">
                  {t("buttons.contact")}
                </span>
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
                <span className="d-none d-sm-inline">
                  {t("buttons.restart")}
                </span>
              </button>
            )}
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
            // Show confirm button for session errors except expired/connection issues
            !(
              systemMessage.type === "error" &&
              (systemMessage.message.includes(t("session.expiredTitle")) ||
                systemMessage.message.includes(
                  t("messages.sessionMaintainError"),
                ))
            ) &&
            // Session update success message doesn't need confirm button
            !(
              systemMessage.type === "success" &&
              systemMessage.message.includes(t("system.sessionUpdateSuccess"))
            )
          }
          showExtraButtonOnly={
            // Only show update session button for session errors
            systemMessage.type === "error" &&
            (systemMessage.message.includes(t("session.expiredTitle")) ||
              systemMessage.message.includes(
                t("messages.sessionMaintainError"),
              ))
          }
          extraButton={
            systemMessage.type === "error" &&
            (systemMessage.message.includes(t("session.expiredTitle")) ||
              systemMessage.message.includes(
                t("messages.sessionMaintainError"),
              )) &&
            onRestartSession
              ? {
                  text: t("buttons.updateSession"),
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
