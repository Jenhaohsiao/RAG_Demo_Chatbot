/**
 * Processing Modal Component
 * 處理進度對話框
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

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
  onConfirm,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isError
                ? t('processing.error.processingFailed', 'Processing Failed')
                : isCompleted
                  ? t('processing.stage.complete', 'Processing Complete')
                  : t('processing.title', 'Processing Document')}
            </h5>
          </div>

          <div className="modal-body">
            {/* 來源資訊 */}
            <div className="mb-3">
              <p className="text-muted mb-1">
                <strong>{t('labels.documents', 'Documents')}:</strong>
              </p>
              <p className="mb-0">
                {sourceType === 'PDF' && '📄'} {sourceType === 'TEXT' && '📝'}{' '}
                {sourceType === 'URL' && '🌐'} {sourceReference}
              </p>
            </div>

            {/* 錯誤訊息 */}
            {isError && errorMessage && (
              <div className="alert alert-danger mb-3" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {errorMessage}
              </div>
            )}

            {/* 成功訊息 */}
            {isCompleted && !isError && (
              <div>
                <div className="alert alert-success mb-3" role="alert">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {t('processing.complete.message', 'Document processed successfully!')}
                </div>

                {chunkCount && (
                  <p className="text-muted mb-3">
                    <i className="bi bi-file-text me-2"></i>
                    {t('processing.complete.chunks', '{{count}} text chunks created', {
                      count: chunkCount,
                    })}
                  </p>
                )}
              </div>
            )}

            {/* 處理中 */}
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
                  {t('processing.pleaseWait', 'Please wait, this may take a few moments...')}
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
                {t('buttons.confirm', 'Confirm')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingModal;
