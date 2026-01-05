import React from "react";
import { useTranslation } from "react-i18next";

interface SessionExpiredModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onConfirm,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-warning text-dark border-0">
            <h5 className="modal-title fw-bold">
              {t("session.expiredTitle", "Session Expired")}
            </h5>
          </div>
          <div className="modal-body p-4">
            <p className="mb-0 fs-6">
              {t(
                "session.expiredMessage",
                "Session expired after 10 minutes of inactivity. Data has been cleared, returning to the initial screen."
              )}
            </p>
          </div>
          <div className="modal-footer border-0 bg-light rounded-bottom justify-content-center">
            <button
              type="button"
              className="btn btn-warning py-2 px-5 fw-bold"
              onClick={onConfirm}
            >
              {t("session.startNewSession", "OK")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
