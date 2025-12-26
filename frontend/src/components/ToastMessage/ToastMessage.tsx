import React, { useState, useEffect } from "react";

interface ToastMessageProps {
  type: "error" | "warning" | "info" | "success";
  message: string;
  onDismiss: () => void;
  showConfirmButton?: boolean;
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
  extraButton,
}) => {
  const [show, setShow] = useState(true);

  const getBootstrapClass = () => {
    switch (type) {
      case "error":
        return "bg-danger text-white";
      case "warning":
        return "bg-warning text-dark";
      case "info":
        return "bg-info text-white";
      case "success":
        return "bg-success text-white";
      default:
        return "bg-secondary text-white";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return "bi-exclamation-triangle-fill";
      case "warning":
        return "bi-exclamation-triangle-fill";
      case "info":
        return "bi-info-circle-fill";
      case "success":
        return "bi-check-circle-fill";
      default:
        return "bi-info-circle-fill";
    }
  };

  const handleConfirm = () => {
    setShow(false);
    // 延迟调用 onDismiss，让动画完成
    setTimeout(() => {
      onDismiss();
    }, 150);
  };

  const handleClose = () => {
    if (!showConfirmButton) {
      handleConfirm();
    }
  };

  // Toast 定位样式
  const toastContainerStyle: React.CSSProperties = {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 9999,
    maxWidth: "400px",
    width: "100%",
  };

  if (!show) {
    return null;
  }

  return (
    <div style={toastContainerStyle}>
      <div className={`toast show ${getBootstrapClass()}`} role="alert">
        <div className="toast-header">
          <i className={`bi ${getIcon()} me-2`}></i>
          <strong className="me-auto">
            {type === "error" && "錯誤"}
            {type === "warning" && "警告"}
            {type === "info" && "信息"}
            {type === "success" && "成功"}
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
          {showConfirmButton && (
            <div className="mt-3 d-flex gap-2 justify-content-end">
              {extraButton && (
                <button
                  type="button"
                  className={
                    extraButton.className ||
                    `btn btn-sm ${
                      type === "warning"
                        ? "btn-outline-dark"
                        : "btn-outline-light"
                    }`
                  }
                  onClick={extraButton.onClick}
                >
                  {extraButton.text}
                </button>
              )}
              <button
                type="button"
                className={`btn btn-sm ${
                  type === "warning" ? "btn-dark" : "btn-light"
                }`}
                onClick={handleConfirm}
              >
                確定
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToastMessage;
