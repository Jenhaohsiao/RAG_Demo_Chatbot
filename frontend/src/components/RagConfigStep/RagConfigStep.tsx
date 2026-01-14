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
        <div className="alert alert-info mb-3">
          <i className="bi bi-info-circle me-2"></i>
          資料已上傳處理，RAG 參數配置已鎖定，無法修改。
        </div>
      )}
      <div className="row g-3">
        {/* 相似度閾值卡片 */}
        <div className="col-lg-6">
          <div
            className={`card h-100 config-card ${
              disabled ? "border-secondary" : "active-card-border"
            }`}
          >
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div className="flex-grow-1">
                  <h4 className="card-title mb-1">
                    相似度閾值 (Similarity Threshold)
                  </h4>
                </div>
                <div className="value-badge">
                  {parameters.similarity_threshold.toFixed(1)}
                </div>
              </div>
              <p className="small mb-3">
                搜索嚴謹度，控制模型引用內容的信心門檻。越高越嚴謹，越低越包容。
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
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div className="flex-grow-1">
                  　
                  <h4 className="card-title mb-1">
                    檢索數量 (Top-K Retrieval Count)
                  </h4>
                </div>
                <div className="value-badge">{parameters.rag_top_k}</div>
              </div>
              <p className="small mb-3">
                檢索覆蓋度，控制每次回應拉取的段落數，平衡「資訊量」與「精準度」。
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

      <div className="section-heading d-flex align-items-center justify-content-between mt-4 mb-3">
        <div>
          <h4 className="eyebrow text-uppercase m-0">文本分塊策略</h4>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12">
          <div className="card border-secondary bg-light">
            <div className="card-body">
              <div className="row align-items-center mb-3">
                <div className="col-auto">
                  <span className="pill pill-warning">
                    目前調整至最佳，不開放修改
                  </span>
                </div>
                <div className="col">
                  <h6 className="mb-1 fw-bold">自動文本分塊處理</h6>
                  <p className="text-muted small mb-0">
                    系統會將上傳的文檔自動切分為適當大小的片段並存入向量資料庫，確保檢索的準確性與效率
                  </p>
                </div>
              </div>

              <hr className="my-3" />

              <div className="row g-4">
                <div className="col-md-4">
                  <div className="d-flex align-items-start">
                    <div className="flex-grow-1">
                      <div className="small text-muted mb-1">最大分塊大小</div>
                      <div className="fs-5 fw-bold  text-muted ">
                        {parameters.chunk_max_size || 2000}
                      </div>
                      <div className="small text-muted">
                        字元 (約 500 個中文字)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="d-flex align-items-start">
                    <div className="flex-grow-1">
                      <div className="small text-muted mb-1">最小分塊大小</div>
                      <div className="fs-5 fw-bold   text-muted">
                        {parameters.chunk_min_size || 500}
                      </div>
                      <div className="small text-muted">
                        字元 (約 125 個中文字)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="d-flex align-items-start">
                    <div className="flex-grow-1">
                      <div className="small text-muted mb-1">重疊區域大小</div>
                      <div className="fs-5 fw-bold text-muted">
                        {parameters.chunk_overlap_size || 200}
                      </div>
                      <div className="small text-muted">
                        字元 (約 50 個中文字)
                      </div>
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
