/**
 * Processing Modal Component
 * Processing progress dialog
 */

import React from "react";
import { useTranslation } from "react-i18next";
import "./ProcessingModal.scss";

export interface ProcessingModalProps {
  isOpen: boolean;
  sourceType: string;
  sourceReference: string;
  processingProgress: number; // 0-100
  processingStage: string;
  isError?: boolean;
  errorMessage?: string;
  isCompleted?: boolean;
  summary?: string;
  chunkCount?: number;
  // T089+ Token and page info
  tokensUsed?: number;
  pagesCrawled?: number;
  onConfirm: () => void;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  sourceType,
  sourceReference,
  processingProgress,
  processingStage,
  isError = false,
  errorMessage,
  isCompleted = false,
  summary,
  chunkCount,
  tokensUsed = 0,
  pagesCrawled = 0,
  onConfirm,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block processing-modal-overlay"
      tabIndex={-1}
      role="dialog"
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isError
                ? t("processing.error.processingFailed")
                : isCompleted
                  ? t("processing.stage.complete")
                  : t("processing.title")}
            </h5>
          </div>

          <div className="modal-body">
            {/* Source Info */}
            <div className="mb-3">
              <p className="text-muted mb-1">
                <strong>{t("labels.documents")}:</strong>
              </p>
              <p className="mb-0">
                {sourceType === "PDF" && "📄"} {sourceType === "TEXT" && "📝"}{" "}
                {sourceType === "URL" && "🌐"} {sourceReference}
              </p>
            </div>

            {/* Error Message */}
            {isError && errorMessage && (
              <div className="alert alert-danger mb-3" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {errorMessage}
              </div>
            )}

            {/* Success Message */}
            {isCompleted && !isError && (
              <div>
                <div className="alert alert-success mb-3" role="alert">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {t("processing.complete.message")}
                </div>

                {chunkCount && (
                  <p className="text-muted mb-2">
                    <i className="bi bi-file-text me-2"></i>
                    {t("processing.complete.chunks", {
                      count: chunkCount,
                    })}
                  </p>
                )}

                {/* Display token and page information */}
                <div className="processing-stats mb-3">
                  {tokensUsed > 0 && (
                    <p className="text-muted mb-1">
                      <i className="bi bi-lightning-fill me-2 stat-icon-tokens"></i>
                      <strong>{t("processing.complete.tokensUsed")}:</strong>{" "}
                      {tokensUsed.toLocaleString()}
                    </p>
                  )}
                  {pagesCrawled > 0 && (
                    <p className="text-muted mb-0">
                      <i className="bi bi-globe me-2 stat-icon-pages"></i>
                      <strong>
                        {t("processing.complete.pagesCrawled", "Pages Crawled")}
                        :
                      </strong>{" "}
                      {pagesCrawled}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Processing in progress */}
            {!isError && !isCompleted && (
              <div>
                <p className="text-muted mb-2">{processingStage}</p>

                {/* 進度條 */}
                <div className="progress mb-3">
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${processingProgress}%` }}
                    aria-valuenow={processingProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    {processingProgress}%
                  </div>
                </div>

                <p className="small text-muted text-center">
                  {t("processing.pleaseWait")}
                </p>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {(isError || isCompleted) && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirm}
              >
                {t("buttons.confirm")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingModal;
