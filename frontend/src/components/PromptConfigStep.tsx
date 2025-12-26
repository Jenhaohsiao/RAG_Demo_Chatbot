/**
 * Step 2: Prompt Configuration Component
 * Prompt設定步驟 - 從PromptVisualization中提取Prompt相關參數
 */

import React from "react";
import { useTranslation } from "react-i18next";

export interface PromptConfigStepProps {
  parameters: {
    token_threshold: number;
    response_style: "concise" | "standard" | "detailed";
    professional_level: "casual" | "professional" | "academic";
    creativity_level: "conservative" | "balanced" | "creative";
  };
  onParameterChange: (parameter: string, value: any) => void;
  onComplete?: () => void;
}

const PromptConfigStep: React.FC<PromptConfigStepProps> = ({
  parameters,
  onParameterChange,
  onComplete,
}) => {
  const { t } = useTranslation();

  return (
    <div className="prompt-config-step">
      {/* 設定項目卡片網格 */}
      <div className="row g-3">
        {/* Token限制卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-info">
            <div className="card-header bg-info text-white">
              <h6 className="card-title mb-0">Token限制</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  回應長度上限:{" "}
                  <span className="text-info fw-bold">
                    {parameters.token_threshold.toLocaleString()}
                  </span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="1000"
                  max="10000"
                  step="1000"
                  value={parameters.token_threshold}
                  onChange={(e) =>
                    onParameterChange(
                      "token_threshold",
                      parseInt(e.target.value)
                    )
                  }
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>1K (簡短)</span>
                  <span>10K (詳細)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 回應詳細程度卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-info">
            <div className="card-header bg-info text-white">
              <h6 className="card-title mb-0">回應詳細程度</h6>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={parameters.response_style}
                onChange={(e) =>
                  onParameterChange("response_style", e.target.value)
                }
              >
                <option value="concise">簡潔</option>
                <option value="standard">標準</option>
                <option value="detailed">詳細</option>
              </select>
              <div className="form-text small">
                {parameters.response_style === "concise" &&
                  "提供簡短、要點式的回答"}
                {parameters.response_style === "standard" &&
                  "平衡詳細度和簡潔性的回答"}
                {parameters.response_style === "detailed" &&
                  "提供詳細、全面的解釋"}
              </div>
            </div>
          </div>
        </div>

        {/* 專業程度卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-info">
            <div className="card-header bg-info text-white">
              <h6 className="card-title mb-0">專業程度</h6>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={parameters.professional_level}
                onChange={(e) =>
                  onParameterChange("professional_level", e.target.value)
                }
              >
                <option value="casual">通俗</option>
                <option value="professional">專業</option>
                <option value="academic">學術</option>
              </select>
              <div className="form-text small">
                {parameters.professional_level === "casual" &&
                  "使用日常語言，易於理解"}
                {parameters.professional_level === "professional" &&
                  "使用專業術語，適合工作場合"}
                {parameters.professional_level === "academic" &&
                  "使用學術語言，嚴謹準確"}
              </div>
            </div>
          </div>
        </div>

        {/* 創意程度卡片 */}
        <div className="col-lg-4 col-xl-3">
          <div className="card h-100 border-info">
            <div className="card-header bg-info text-white">
              <h6 className="card-title mb-0">創意程度</h6>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={parameters.creativity_level}
                onChange={(e) =>
                  onParameterChange("creativity_level", e.target.value)
                }
              >
                <option value="conservative">保守</option>
                <option value="balanced">平衡</option>
                <option value="creative">創新</option>
              </select>
              <div className="form-text small">
                {parameters.creativity_level === "conservative" &&
                  "嚴格按照文檔內容回答，最小化推測"}
                {parameters.creativity_level === "balanced" &&
                  "平衡事實與合理推論"}
                {parameters.creativity_level === "creative" &&
                  "允許創新思考和相關聯想"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptConfigStep;
