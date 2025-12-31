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
}

const RagConfigStep: React.FC<RagConfigStepProps> = ({
  parameters,
  onParameterChange,
  onComplete,
}) => {
  return (
    <div className="rag-config-step">
      {/* 設定項目卡片網格 */}
      <div className="row g-3">
        {/* 相似度閾值卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white">
              <h6 className="card-title mb-0">相似度閾值</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  檢索精確度{" "}
                  <span className="text-primary fw-bold">
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

        {/* 上段數卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white">
              <h6 className="card-title mb-0">上段數</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  每次檢索數量:{" "}
                  <span className="text-primary fw-bold">
                    {parameters.rag_context_window}
                  </span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="1"
                  max="10"
                  step="1"
                  value={parameters.rag_context_window}
                  onChange={(e) =>
                    onParameterChange(
                      "rag_context_window",
                      parseInt(e.target.value)
                    )
                  }
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>1個</span>
                  <span>10個</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 引用策略卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white">
              <h6 className="card-title mb-0">引用策略</h6>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={parameters.rag_citation_style}
                onChange={(e) =>
                  onParameterChange("rag_citation_style", e.target.value)
                }
              >
                <option value="numbered">編號引用 (如1, 2...)</option>
                <option value="inline">行內引用 (如作者...)</option>
                <option value="none">不顯示</option>
              </select>
            </div>
          </div>
        </div>

        {/* 重排策略卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white">
              <h6 className="card-title mb-0">重排策略</h6>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={parameters.rag_fallback_mode}
                onChange={(e) =>
                  onParameterChange("rag_fallback_mode", e.target.value)
                }
              >
                <option value="strict">嚴格模式 (僅基於檔案)</option>
                <option value="flexible">彈性模式 (允許一般知識)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Top-K檢索卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white">
              <h6 className="card-title mb-0">Top-K檢索</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  檢索段落{" "}
                  <span className="text-secondary fw-bold">
                    {parameters.rag_top_k}
                  </span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="3"
                  max="20"
                  step="1"
                  value={parameters.rag_top_k}
                  onChange={(e) =>
                    onParameterChange("rag_top_k", parseInt(e.target.value))
                  }
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>3(精確)</span>
                  <span>20(寬泛)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chunk大小卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white">
              <h6 className="card-title mb-0">Chunk大小</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  最大:{" "}
                  <span className="text-danger">
                    {parameters.chunk_max_size}
                  </span>{" "}
                  字
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="500"
                  max="4000"
                  step="500"
                  value={parameters.chunk_max_size}
                  onChange={(e) =>
                    onParameterChange(
                      "chunk_max_size",
                      parseInt(e.target.value)
                    )
                  }
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>500</span>
                  <span>4K</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chunk最小值卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white">
              <h6 className="card-title mb-0">Chunk最小</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  最小:{" "}
                  <span className="text-warning">
                    {parameters.chunk_min_size}
                  </span>{" "}
                  字
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="100"
                  max="1000"
                  step="100"
                  value={parameters.chunk_min_size}
                  onChange={(e) =>
                    onParameterChange(
                      "chunk_min_size",
                      parseInt(e.target.value)
                    )
                  }
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>100</span>
                  <span>1000(2500)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chunk重疊卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white">
              <h6 className="card-title mb-0">Chunk重疊</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  重疊段落數:{" "}
                  <span className="text-info">
                    {parameters.chunk_overlap_size}
                  </span>{" "}
                  字
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="50"
                  max="500"
                  step="50"
                  value={parameters.chunk_overlap_size}
                  onChange={(e) =>
                    onParameterChange(
                      "chunk_overlap_size",
                      parseInt(e.target.value)
                    )
                  }
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>50 (少)</span>
                  <span>500 (多)</span>
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
