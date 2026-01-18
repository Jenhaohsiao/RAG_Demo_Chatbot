/**
 * Settings Modal Component
 * Similarity threshold settings dialog
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./SettingsModal.scss";

interface SettingsModalProps {
  show: boolean;
  onConfirm: (threshold: number, customPrompt?: string) => void;
  onCancel: () => void;
  defaultThreshold?: number;
  defaultCustomPrompt?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onConfirm,
  onCancel,
  defaultThreshold = 0.5,
  defaultCustomPrompt = "",
}) => {
  const { t } = useTranslation();
  const [threshold, setThreshold] = useState(defaultThreshold);
  const [customPrompt, setCustomPrompt] = useState(defaultCustomPrompt);
  const [showPromptHelp, setShowPromptHelp] = useState(false);

  if (!show) return null;

  const handleConfirm = () => {
    onConfirm(threshold, customPrompt);
  };

  const getThresholdLabel = (value: number): string => {
    if (value >= 0.7) return t("settings.threshold.strict", "Strict");
    if (value >= 0.5) return t("settings.threshold.balanced", "Balanced");
    return t("settings.threshold.lenient", "Lenient");
  };

  const getThresholdColor = (value: number): string => {
    if (value >= 0.7) return "danger";
    if (value >= 0.5) return "warning";
    return "success";
  };

  return (
    <div className="modal show d-block settings-modal-backdrop">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-sliders me-2"></i>
              {t("settings.title", "Settings")}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onCancel}
            ></button>
          </div>
          <div className="modal-body">
            <div className="mb-4">
              <label className="form-label fw-bold">
                {t("settings.threshold.label", "Similarity Threshold")}
                <span
                  className="badge bg-secondary ms-2"
                >
                  {getThresholdLabel(threshold)}
                </span>
              </label>
              <input
                type="range"
                className="form-range"
                min="0.3"
                max="0.9"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
              />
              <div className="d-flex justify-content-between text-muted small">
                <span>{t("settings.threshold.low", "Low")} (0.3)</span>
                <span className="fw-bold text-primary">
                  {threshold.toFixed(1)}
                </span>
                <span>{t("settings.threshold.high", "High")} (0.9)</span>
              </div>
            </div>

            <div className="alert alert-info small">
              <i className="bi bi-info-circle me-2"></i>
              {t("settings.threshold.description", "Higher threshold retrieves more relevant but fewer chunks.")}
            </div>

            <div className="card bg-light">
              <div className="card-body">
                <h6 className="card-subtitle mb-2">
                  {t("settings.threshold.recommendations", "Recommendations:")}
                </h6>
                <ul className="small mb-0">
                  <li>
                    <strong>0.3-0.4:</strong>{" "}
                    {t("settings.threshold.rec_lenient", "General queries, creative tasks")}
                  </li>
                  <li>
                    <strong>0.5-0.6:</strong>{" "}
                    {t("settings.threshold.rec_balanced", "Standard queries, balanced results")}
                  </li>
                  <li>
                    <strong>0.7-0.9:</strong>{" "}
                    {t("settings.threshold.rec_strict", "Specific queries, precise answering")}
                  </li>
                </ul>
              </div>
            </div>

            {/* Custom Prompt Section */}
            <div className="mt-4">
              <label className="form-label fw-bold d-flex align-items-center justify-content-between">
                <span>
                  <i className="bi bi-chat-left-text me-2"></i>
                  Custom Prompt Template
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  onClick={() => setShowPromptHelp(!showPromptHelp)}
                >
                  <i
                    className="bi bi-question-circle"
                  ></i>
                </button>
              </label>

              {showPromptHelp && (
                <div className="alert alert-info small mb-2">
                  <strong>Available Variables:</strong>
                  <ul className="mb-0 mt-1">
                    <li>
                      <code>{`{{language}}`}</code> - Response language (Chinese, English, etc.)
                    </li>
                    <li>
                      <code>{`{{context}}`}</code> - Retrieved document chunks
                    </li>
                    <li>
                      <code>{`{{query}}`}</code> - User's question
                    </li>
                  </ul>
                  <div className="mt-2">
                    <strong>Tips:</strong> Leave empty to use default prompt.
                    Custom prompt is great for demos to show prompt engineering
                    skills!
                  </div>
                </div>
              )}

              <textarea
                className="form-control font-monospace small custom-prompt-textarea"
                rows={6}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t("settings.customPrompt.placeholder", "Enter custom system prompt...")}
              />

              {customPrompt && (
                <div className="mt-2 d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    {customPrompt.length} characters
                  </small>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setCustomPrompt("")}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                    Reset to Default
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
            >
              {t("common.confirm", "Confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
