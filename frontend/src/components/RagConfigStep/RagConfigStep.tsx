import React from "react";
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
  disabled?: boolean; // 當流程3完成後，禁用所有配置
}

const RagConfigStep: React.FC<RagConfigStepProps> = ({
  parameters,
  onParameterChange,
  onComplete,
  disabled = false,
}) => {
  return (
    <div className={`rag-config-step ${disabled ? "disabled-step" : ""}`}>
      {/* 禁用狀態提示 */}
      {disabled && (
        <div className="alert alert-info mb-3">
          <i className="bi bi-info-circle me-2"></i>
          資料已上傳處理，RAG 參數配置已鎖定，無法修改。
        </div>
      )}
      {/* 設定項目卡片網格 */}
      <div className="row g-3">
        {/* 相似度閾值卡片 */}
        <div className="col-lg-6">
          <div
            className={`card h-100 ${
              disabled ? "border-secondary" : "border-primary"
            }`}
          >
            <div
              className={`card-header ${
                disabled ? "bg-secondary" : "bg-primary"
              } text-white`}
            >
              <h6 className="card-title mb-0">
                Similarity Threshold (相似度閾值)
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  檢索精確度:{" "}
                  <span
                    className={
                      disabled
                        ? "text-secondary fw-bold"
                        : "text-primary fw-bold"
                    }
                  >
                    {parameters.similarity_threshold}
                  </span>
                </label>
                <input
                  type="range"
                  className="form-range"
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
                  <span>0.1 (寬鬆)</span>
                  <span>0.9 (嚴格)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top-K檢索卡片 (合併了 context_window 概念) */}
        <div className="col-lg-6">
          <div
            className={`card h-100 ${
              disabled ? "border-secondary" : "border-primary"
            }`}
          >
            <div
              className={`card-header ${
                disabled ? "bg-secondary" : "bg-primary"
              } text-white`}
            >
              <h6 className="card-title mb-0">
                Top-K Retrieval Count (檢索數量)
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  檢索段落數:{" "}
                  <span
                    className={
                      disabled
                        ? "text-secondary fw-bold"
                        : "text-primary fw-bold"
                    }
                  >
                    {parameters.rag_top_k}
                  </span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="1"
                  max="20"
                  step="1"
                  value={parameters.rag_top_k}
                  disabled={disabled}
                  onChange={(e) =>
                    onParameterChange("rag_top_k", parseInt(e.target.value))
                  }
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>1 (精簡)</span>
                  <span>20 (詳盡)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-4" />

      {/* Chunk Settings (Read-Only Defaults) */}
      <h6 className="text-muted mb-3">
        Chunking Strategy Defaults (Read-Only)
      </h6>
      <div className="row g-3">
        {/* Chunk大小卡片 */}
        <div className="col-lg-4">
          <div className="card h-100 bg-light border-secondary">
            <div className="card-header bg-secondary text-white">
              <h6 className="card-title mb-0">Chunk Start Size</h6>
            </div>
            <div className="card-body">
              <div className="mb-0">
                <label className="form-label small">
                  Max Size:{" "}
                  <span className="text-dark fw-bold">
                    {parameters.chunk_max_size}
                  </span>{" "}
                  chars
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="500"
                  max="4000"
                  step="500"
                  value={parameters.chunk_max_size}
                  disabled={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chunk最小值卡片 */}
        <div className="col-lg-4">
          <div className="card h-100 bg-light border-secondary">
            <div className="card-header bg-secondary text-white">
              <h6 className="card-title mb-0">Chunk Min Size</h6>
            </div>
            <div className="card-body">
              <div className="mb-0">
                <label className="form-label small">
                  Min Size:{" "}
                  <span className="text-dark fw-bold">
                    {parameters.chunk_min_size}
                  </span>{" "}
                  chars
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="100"
                  max="1000"
                  step="100"
                  value={parameters.chunk_min_size}
                  disabled={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chunk重疊卡片 */}
        <div className="col-lg-4">
          <div className="card h-100 bg-light border-secondary">
            <div className="card-header bg-secondary text-white">
              <h6 className="card-title mb-0">Chunk Overlap</h6>
            </div>
            <div className="card-body">
              <div className="mb-0">
                <label className="form-label small">
                  Overlap:{" "}
                  <span className="text-dark fw-bold">
                    {parameters.chunk_overlap_size}
                  </span>{" "}
                  chars
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="50"
                  max="500"
                  step="50"
                  value={parameters.chunk_overlap_size}
                  disabled={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RagConfigStep;
