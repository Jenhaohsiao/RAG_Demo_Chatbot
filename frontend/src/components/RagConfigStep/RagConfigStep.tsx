import React from "react";
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
  disabled?: boolean; // 當流程3完成後，禁用所有配置
}

const RagConfigStep: React.FC<RagConfigStepProps> = ({
  parameters,
  onParameterChange,
  onComplete,
  disabled = false,
}) => {
  const statusLabel = disabled ? "已鎖定" : "即時可調";
  const statusTone = disabled
    ? "資料上傳後鎖定，確保檢索一致性"
    : "調整後立即套用於檢索結果";

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
      {/* 禁用狀態提示 */}
      {disabled && (
        <div className="alert alert-info mb-2 py-2">
          <i className="bi bi-info-circle me-2"></i>
          資料已上傳，參數已鎖定
        </div>
      )}
      <div className="row g-2">
        {/* 相似度閾值卡片 */}
        <div className="col-lg-6">
          <div
            className={`card h-100 config-card ${
              disabled ? "border-secondary" : "active-card-border"
            }`}
          >
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="card-title mb-0 fw-bold">
                  相似度閾值 (Similarity Threshold)
                </h5>
                <div className="value-badge">
                  {parameters.similarity_threshold.toFixed(1)}
                </div>
              </div>
              <p className="small text-muted mb-2">
                控制引用內容的信心門檻，越高越嚴謹
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
                <span>0.1 (寬鬆)</span>
                <span>0.9 (嚴格)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top-K檢索卡片 */}
        <div className="col-lg-6">
          <div
            className={`card h-100 config-card ${
              disabled ? "border-secondary" : "active-card-border"
            }`}
          >
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="card-title mb-0 fw-bold">
                  檢索數量 (Top-K Retrieval Count)
                </h5>
                <div className="value-badge">{parameters.rag_top_k}</div>
              </div>
              <p className="small text-muted mb-2">
                控制每次拉取的段落數，平衡資訊量與精準度
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
                <span>1 (精簡)</span>
                <span>20 (詳盡)</span>
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
                <span className="badge bg-warning text-dark me-2">已優化</span>
                <h6 className="mb-0 fw-bold">自動文本分塊處理</h6>
              </div>

              <div className="row g-2">
                <div className="col-md-4">
                  <div className="text-center p-2 bg-white rounded">
                    <div className="small text-muted">最大分塊</div>
                    <div className="fw-bold text-dark">
                      {parameters.chunk_max_size || 2000}
                    </div>
                    <div className="small text-muted">字元</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="text-center p-2 bg-white rounded">
                    <div className="small text-muted">最小分塊</div>
                    <div className="fw-bold text-dark">
                      {parameters.chunk_min_size || 500}
                    </div>
                    <div className="small text-muted">字元</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="text-center p-2 bg-white rounded">
                    <div className="small text-muted">重疊區域</div>
                    <div className="fw-bold text-dark">
                      {parameters.chunk_overlap_size || 200}
                    </div>
                    <div className="small text-muted">字元</div>
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
