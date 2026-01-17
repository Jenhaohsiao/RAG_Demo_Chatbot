/**
 * Loading Overlay Component
 * 全局等候轉動圖示 - 半透明背景覆蓋整個頁面，轉動圖示居中顯示
 */

import React from "react";
import "./LoadingOverlay.scss";

export interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = "Processing, please wait...",
}) => {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <div
          className="spinner-border text-primary loading-spinner"
          role="status"
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="loading-message mt-3">{message}</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
