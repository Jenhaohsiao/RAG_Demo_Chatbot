import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./ToastMessage.scss";

interface ToastMessageProps {
  type: "error" | "warning" | "info" | "success";
  message: string;
  onDismiss: () => void;
  showConfirmButton?: boolean;
  showExtraButtonOnly?: boolean;
  extraButton?: {
    text: string;
    onClick: () => void;
    className?: string;
  };
}

const ToastMessage: React.FC<ToastMessageProps> = ({
  type,
  message,
  onDismiss,
  showConfirmButton = true,
  showExtraButtonOnly = false,
  extraButton,
}) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(true);
  const [animationState, setAnimationState] = useState<
    "initial" | "animating" | "static"
  >("initial");

  // Trigger animation after mount, but only once
  useEffect(() => {
    if (animationState === "initial") {
      const timer = setTimeout(() => {
        setAnimationState("animating");
      }, 50); // Short delay to ensure DOM is rendered

      // Set to static state after animation completes
      const animationTimer = setTimeout(() => {
        setAnimationState("static");
      }, 400); // 300ms animation + 100ms buffer

      return () => {
        clearTimeout(timer);
        clearTimeout(animationTimer);
      };
    }
  }, []); // Empty dependency array ensures this runs only once

  // If no confirm button, close automatically after 3 seconds
  useEffect(() => {
    if (!showConfirmButton) {
      const timer = setTimeout(() => {
        handleConfirm();
      }, 3000); // Close automatically after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [showConfirmButton]);

  const handleConfirm = () => {
    setShow(false);
    // Delay calling onDismiss to let animation finish
    setTimeout(() => {
      onDismiss();
    }, 150);
  };

  const handleClose = () => {
    if (!showConfirmButton) {
      handleConfirm();
    }
  };

  // Toast positioning style
  if (!show) {
    return null;
  }

  return (
    <div className="toast-container">
      <div
        className={`toast show ${
          animationState === "animating" ? "toast-animated" : ""
        } ${animationState === "static" ? "toast-static" : ""}`}
        role="alert"
      >
        <div className="toast-header">
          <i
            className={`bi ${
              type === "success"
                ? "bi-check-circle-fill text-success"
                : type === "error"
                  ? "bi-x-circle-fill text-danger"
                  : type === "warning"
                    ? "bi-exclamation-triangle-fill text-warning"
                    : "bi-info-circle-fill text-primary"
            } me-2`}
          ></i>
          <strong className="me-auto">
            {type === "error" && t("toast.error", "Error")}
            {type === "warning" && t("toast.warning", "Warning")}
            {type === "info" && t("toast.info", "Info")}
            {type === "success" && t("toast.success", "Success")}
          </strong>
          {!showConfirmButton && (
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={handleClose}
            ></button>
          )}
        </div>
        <div className="toast-body">
          <div className="d-flex align-items-start">
            <div className="flex-grow-1">{message}</div>
          </div>
          {(showConfirmButton || showExtraButtonOnly) && (
            <div className="mt-3 d-flex gap-2 justify-content-end">
              {extraButton && (
                <button
                  type="button"
                  className={
                    extraButton.className ||
                    "btn btn-sm btn-outline-secondary me-2"
                  }
                  onClick={extraButton.onClick}
                >
                  {extraButton.text}
                </button>
              )}
              {showConfirmButton && !showExtraButtonOnly && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleConfirm}
                >
                  {t("buttons.ok", "OK")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToastMessage;
