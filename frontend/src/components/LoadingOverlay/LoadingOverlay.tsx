/**
 * Loading Overlay Component
 * Global loading overlay - Semi-transparent background covering the page with centered spinner
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
