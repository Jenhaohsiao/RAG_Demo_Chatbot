import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./AboutProjectModal.scss";

interface AboutProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "about" | "summary"; // Added: Initial view parameter
}

type ViewMode = "about" | "summary";

const AboutProjectModal: React.FC<AboutProjectModalProps> = ({
  isOpen,
  onClose,
  initialView = "about", // Default to "about"
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  // Update viewMode when initialView changes
  useEffect(() => {
    if (isOpen) {
      setViewMode(initialView);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block about-project-modal"
      tabIndex={-1}
      role="dialog"
    >
      <div
        className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
        role="document"
      >
        <div className="modal-content">
          <div className="modal-header py-2">
            <div className="header-content">
              <div>
                <h6 className="modal-title mb-0 fw-bold">
                  {viewMode === "about"
                    ? t("aboutModal.about")
                    : t("aboutModal.ragSummary")}
                </h6>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            {viewMode === "about" ? (
              // About project content
              <>
                <div className="intro-section mb-2">
                  <h5 className="header-subtitle mb-2 fw-bold">
                    {t("aboutModal.mainTitle")}
                  </h5>
                  <p className="small text-muted mb-0">
                    {t("aboutModal.subtitle")}
                  </p>
                </div>

                <div className="row g-2">
                  <div className="col-md-6">
                    <div className="card h-100 border-primary">
                      <div className="card-body p-2">
                        <div className="d-flex align-items-start">
                          <i className="bi bi-search text-primary me-2 fs-5"></i>
                          <div>
                            <h6 className="card-title mb-1 fw-bold">
                              {t("aboutModal.cards.mainGoal.title")}
                            </h6>
                            <p className="small text-muted mb-0">
                              {t("aboutModal.cards.mainGoal.description")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card h-100 border-info">
                      <div className="card-body p-2">
                        <div className="d-flex align-items-start">
                          <i className="bi bi-database text-info me-2 fs-5"></i>
                          <div>
                            <h6 className="card-title mb-1 fw-bold">
                              {t("aboutModal.cards.vectorDb.title")}
                            </h6>
                            <p className="small text-muted mb-0">
                              {t("aboutModal.cards.vectorDb.description")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card h-100 border-success">
                      <div className="card-body p-2">
                        <div className="d-flex align-items-start">
                          <i className="bi bi-gear text-success me-2 fs-5"></i>
                          <div>
                            <h6 className="card-title mb-1 fw-bold">
                              {t("aboutModal.cards.systemPrompt.title")}
                            </h6>
                            <p className="small text-muted mb-0">
                              {t("aboutModal.cards.systemPrompt.description")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card h-100 border-warning">
                      <div className="card-body p-2">
                        <div className="d-flex align-items-start">
                          <i className="bi bi-cpu text-warning me-2 fs-5"></i>
                          <div>
                            <h6 className="card-title mb-1 fw-bold">
                              {t("aboutModal.cards.applications.title")}
                            </h6>
                            <p className="small text-muted mb-0">
                              {t("aboutModal.cards.applications.description")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // RAG technology summary content
              <div className="row g-2">
                <div className="col-12">
                  <div className="card border-warning">
                    <div className="card-body p-2">
                      <div className="d-flex align-items-start">
                        <i className="bi bi-exclamation-triangle text-warning me-2 fs-5"></i>
                        <div>
                          <h6 className="card-title mb-1 fw-bold">
                            {t("aboutModal.cards.limitations.title")}
                          </h6>
                          <p className="small text-muted mb-0">
                            {t("aboutModal.cards.limitations.description")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="card border-info">
                    <div className="card-body p-2">
                      <div className="d-flex align-items-start">
                        <i className="bi bi-stars text-info me-2 fs-5"></i>
                        <div>
                          <h6 className="card-title mb-1 fw-bold">
                            {t("aboutModal.cards.evolution.title")}
                          </h6>
                          <p className="small text-muted mb-0">
                            {t("aboutModal.cards.evolution.description")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer py-2">
            <div className="footer-left">
              {viewMode === "about" ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setViewMode("summary")}
                >
                  <i className="bi bi-journal-text me-1"></i>
                  {t("aboutModal.ragSummary")}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setViewMode("about")}
                >
                  <i className="bi bi-info-circle me-1"></i>
                  {t("aboutModal.about")}
                </button>
              )}
            </div>
            <div className="footer-right">
              <div className="version-info small">
                <i className="bi bi-tag me-1"></i>
                {t("aboutModal.version")}: 1.0 · {t("aboutModal.updateDate")}:
                2026-01-11
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={onClose}
              >
                {t("buttons.understand")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutProjectModal;
