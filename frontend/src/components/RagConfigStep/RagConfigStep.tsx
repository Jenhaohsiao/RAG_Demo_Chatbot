import React from "react";
import { useTranslation } from "react-i18next";
import "./RagConfigStep.scss";
interface RagConfigStepProps {
  parameters: {
    similarity_threshold: number;
    rag_context_window: number;
    rag_retrieval_strategy: string;
    rag_fallback_mode: string;
    rag_top_k: number;
    chunk_max_size: number;
    chunk_min_size: number;
    chunk_overlap_size: number;
    rag_citation_style: string;
  };
  onParameterChange: (key: string, value: any) => void;
  onComplete?: () => void;
  disabled?: boolean; // Disable all configs when step 3 is complete
}

const RagConfigStep: React.FC<RagConfigStepProps> = ({
  parameters,
  onParameterChange,
  onComplete,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const statusLabel = disabled ? "Locked" : "Adjustable";
  const statusTone = disabled
    ? "Locked after data upload to ensure retrieval consistency"
    : "Applied immediately to retrieval results";

  const chunkMaxPercent = Math.min(
    100,
    Math.max(0, ((parameters.chunk_max_size - 500) / (4000 - 500)) * 100)
  );
  const chunkMinPercent = Math.min(
    100,
    Math.max(0, ((parameters.chunk_min_size - 100) / (1000 - 100)) * 100)
  );
  const chunkOverlapPercent = Math.min(
    100,
    Math.max(0, ((parameters.chunk_overlap_size - 50) / (500 - 50)) * 100)
  );

  return (
    <div className={`rag-config-step ${disabled ? "disabled-step" : ""}`}>
      {/* Disabled state notice */}
      {disabled && (
        <div className="alert alert-info mb-2 py-2">
          <i className="bi bi-info-circle me-2"></i>
          {t("workflow.steps.ragConfig.dataLocked")}
        </div>
      )}
      <div className="row g-2">
        {/* Similarity Threshold Card */}
        <div className="col-lg-6">
          <div
            className={`card h-100 config-card ${
              disabled ? "border-secondary" : "active-card-border"
            }`}
          >
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="card-title mb-0 fw-bold">
                  {t("workflow.steps.ragConfig.similarityThreshold.title")}
                </h5>
                <div className="value-badge">
                  {parameters.similarity_threshold.toFixed(1)}
                </div>
              </div>
              <p className="small text-muted mb-2">
                {t("workflow.steps.ragConfig.similarityThreshold.description")}
              </p>
              <input
                type="range"
                className="form-range glossy-range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={parameters.similarity_threshold}
                disabled={disabled}
                onChange={(e) =>
                  onParameterChange(
                    "similarity_threshold",
                    parseFloat(e.target.value)
                  )
                }
              />
              <div className="d-flex justify-content-between small text-muted">
                <span>
                  0.1 (
                  {t("workflow.steps.ragConfig.similarityThreshold.lenient")})
                </span>
                <span>
                  0.9 (
                  {t("workflow.steps.ragConfig.similarityThreshold.strict")})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top-K Retrieval Card */}
        <div className="col-lg-6">
          <div
            className={`card h-100 config-card ${
              disabled ? "border-secondary" : "active-card-border"
            }`}
          >
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="card-title mb-0 fw-bold">
                  {t("workflow.steps.ragConfig.topK.title")}
                </h5>
                <div className="value-badge">{parameters.rag_top_k}</div>
              </div>
              <p className="small text-muted mb-2">
                {t("workflow.steps.ragConfig.topK.description")}
              </p>
              <input
                type="range"
                className="form-range glossy-range"
                min="1"
                max="20"
                step="1"
                value={parameters.rag_top_k}
                disabled={disabled}
                onChange={(e) =>
                  onParameterChange("rag_top_k", parseInt(e.target.value, 10))
                }
              />
              <div className="d-flex justify-content-between small text-muted">
                <span>1 ({t("workflow.steps.ragConfig.topK.minimal")})</span>
                <span>
                  20 ({t("workflow.steps.ragConfig.topK.comprehensive")})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2 mt-2">
        <div className="col-12">
          <div className="card border-secondary bg-light">
            <div className="card-body p-3">
              <div className="d-flex align-items-center mb-2">
                <span className="badge bg-warning text-dark me-2">
                  {t("workflow.steps.ragConfig.textChunking.optimized")}
                </span>
                <h6 className="mb-0 fw-bold">
                  {t("workflow.steps.ragConfig.textChunking.title")}
                </h6>
              </div>

              <div className="row g-2">
                <div className="col-md-4">
                  <div className="text-center p-2 bg-white rounded">
                    <div className="small text-muted">
                      {t("workflow.steps.ragConfig.textChunking.maxChunk")}
                    </div>
                    <div className="fw-bold text-dark">
                      {parameters.chunk_max_size || 2000}
                    </div>
                    <div className="small text-muted">
                      {t("workflow.steps.ragConfig.textChunking.characters")}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="text-center p-2 bg-white rounded">
                    <div className="small text-muted">
                      {t("workflow.steps.ragConfig.textChunking.minChunk")}
                    </div>
                    <div className="fw-bold text-dark">
                      {parameters.chunk_min_size || 500}
                    </div>
                    <div className="small text-muted">
                      {t("workflow.steps.ragConfig.textChunking.characters")}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="text-center p-2 bg-white rounded">
                    <div className="small text-muted">
                      {t("workflow.steps.ragConfig.textChunking.overlap")}
                    </div>
                    <div className="fw-bold text-dark">
                      {parameters.chunk_overlap_size || 200}
                    </div>
                    <div className="small text-muted">
                      {t("workflow.steps.ragConfig.textChunking.characters")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RagConfigStep;
