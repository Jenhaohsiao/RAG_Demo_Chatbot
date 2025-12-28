import React, { useState, useEffect } from "react";
import "./ToastMessage.css";

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
  const [show, setShow] = useState(true);
  const [animationState, setAnimationState] = useState<
    "initial" | "animating" | "static"
  >("initial");

  // 組件掛載後觸發動畫，但只執行一次
  useEffect(() => {
    if (animationState === "initial") {
      const timer = setTimeout(() => {
        setAnimationState("animating");
      }, 50); // 短暫延遲確保DOM已渲染

      // 動畫完成後設為靜態狀態
      const animationTimer = setTimeout(() => {
        setAnimationState("static");
      }, 400); // 300ms動畫 + 100ms緩衝

      return () => {
        clearTimeout(timer);
        clearTimeout(animationTimer);
      };
    }
  }, []); // 空依賴陣列，確保只執行一次

  // 如果沒有確定按鈕，自動在3秒後關閉
  useEffect(() => {
    if (!showConfirmButton) {
      const timer = setTimeout(() => {
        handleConfirm();
      }, 3000); // 3秒後自動關閉

      return () => clearTimeout(timer);
    }
  }, [showConfirmButton]);

  const handleConfirm = () => {
    setShow(false);
    // 延迟调用 onDismiss，让动画完成
    setTimeout(() => {
      onDismiss();
    }, 150);
  };

  const getBootstrapClass = () => {
    switch (type) {
      case "error":
        return "bg-danger text-white";
      case "warning":
        return "bg-warning text-dark"; // 使用深色文字，適合黃色背景
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

  const handleClose = () => {
    if (!showConfirmButton) {
      handleConfirm();
    }
  };

  // Toast 定位样式
  if (!show) {
    return null;
  }

  return (
    <div className="toast-container">
      <div
        className={`toast show ${getBootstrapClass()} ${
          animationState === "animating"
            ? "toast-animated"
            : animationState === "static"
            ? "toast-static"
            : ""
        }`}
        role="alert"
      >
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
          {(showConfirmButton || showExtraButtonOnly) && (
            <div className="mt-3 d-flex gap-2 justify-content-end">
              {extraButton && (
                <button
                  type="button"
                  className={
                    extraButton.className ||
                    `btn btn-sm ${
                      type === "warning"
                        ? "btn-outline-dark" // 警告類型使用深色輪廓按鈕
                        : "btn-outline-light"
                    }`
                  }
                  onClick={extraButton.onClick}
                >
                  {extraButton.text}
                </button>
              )}
              {showConfirmButton && !showExtraButtonOnly && (
                <button
                  type="button"
                  className={`btn btn-sm ${
                    type === "warning" ? "btn-dark" : "btn-light" // 警告類型使用深色按鈕
                  }`}
                  onClick={handleConfirm}
                >
                  確定
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
