/**
 * ConfirmDialog Component
 * Reusable confirmation modal dialog
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Reusable confirmation dialog component
 * 
 * Features:
 * - Bootstrap Modal styling
 * - Async confirm handler
 * - Loading state
 * - Customizable buttons and styling
 * - i18n support
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmText,
  cancelText,
  isDangerous = false,
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [confirming, setConfirming] = React.useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  const confirmBtnClass = isDangerous 
    ? 'btn-danger' 
    : 'btn-primary';

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="modal-backdrop fade show"
        onClick={onCancel}
        style={{ display: 'block' }}
      />

      {/* Modal */}
      <div
        className="modal fade show"
        style={{ display: 'block' }}
        role="dialog"
        aria-labelledby="confirmDialogTitle"
        aria-hidden="false"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            {/* Header */}
            <div className={`modal-header ${isDangerous ? 'border-danger' : ''}`}>
              <h5 className="modal-title" id="confirmDialogTitle">
                {isDangerous && (
                  <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                )}
                {title}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onCancel}
                disabled={confirming || isLoading}
                aria-label="Close"
              />
            </div>

            {/* Body */}
            <div className="modal-body">
              <p className="mb-0">{message}</p>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={confirming || isLoading}
              >
                {cancelText || t('buttons.cancel')}
              </button>
              <button
                type="button"
                className={`btn ${confirmBtnClass}`}
                onClick={handleConfirm}
                disabled={confirming || isLoading}
              >
                {confirming || isLoading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    {t('common.processing')}
                  </>
                ) : (
                  confirmText || t('buttons.confirm')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;
