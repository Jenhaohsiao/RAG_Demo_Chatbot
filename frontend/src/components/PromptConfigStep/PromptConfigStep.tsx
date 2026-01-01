/**
 * Step 2: Prompt Configuration Component
 * Prompt設定步驟 - 從PromptVisualization中提取Prompt相關參數
 */

import React from "react";
import { useTranslation } from "react-i18next";

export interface PromptConfigStepProps {
  parameters: {
    token_threshold: number;
    response_style: "concise" | "standard" | "detailed"; // 保留但不再單獨顯示
    professional_level: "casual" | "professional" | "academic"; // 保留但不再單獨顯示
    creativity_level: "conservative" | "balanced" | "creative"; // 保留但不再單獨顯示
    persona?: string; // 角色/語氣設定 (例如: "國中老師", "專業顧問", "朋友")
    // 新增參數
    response_format?: "auto" | "bullet" | "paragraph" | "step_by_step"; // 回應格式
    citation_style?: "none" | "inline" | "footnote"; // 引用格式
    combined_style?: string; // 合併的風格選擇
  };
  onParameterChange: (parameter: string, value: any) => void;
  onComplete?: () => void;
  disabled?: boolean; // 當流程3完成後，禁用所有配置
}

// 合併風格選項
const COMBINED_STYLE_OPTIONS = [
  {
    value: "casual_concise",
    label: "簡潔通俗",
    description: "日常語言，簡短回答，適合快速了解",
  },
  {
    value: "casual_detailed",
    label: "詳細通俗",
    description: "日常語言，詳細解釋，適合初學者",
  },
  {
    value: "professional_standard",
    label: "專業標準",
    description: "專業術語，平衡詳細度，適合工作場合",
  },
  {
    value: "professional_detailed",
    label: "專業詳細",
    description: "專業術語，全面解釋，適合深入了解",
  },
  {
    value: "academic_detailed",
    label: "學術嚴謹",
    description: "學術語言，嚴謹準確，適合研究用途",
  },
  {
    value: "creative_casual",
    label: "創意活潑",
    description: "輕鬆語氣，允許聯想，適合腦力激盪",
  },
];

const PromptConfigStep: React.FC<PromptConfigStepProps> = ({
  parameters,
  onParameterChange,
  onComplete,
  disabled = false,
}) => {
  const { t } = useTranslation();

  // 處理合併風格變化，同時更新底層參數
  const handleCombinedStyleChange = (value: string) => {
    onParameterChange("combined_style", value);

    // 根據選擇更新底層參數
    switch (value) {
      case "casual_concise":
        onParameterChange("professional_level", "casual");
        onParameterChange("response_style", "concise");
        onParameterChange("creativity_level", "conservative");
        break;
      case "casual_detailed":
        onParameterChange("professional_level", "casual");
        onParameterChange("response_style", "detailed");
        onParameterChange("creativity_level", "balanced");
        break;
      case "professional_standard":
        onParameterChange("professional_level", "professional");
        onParameterChange("response_style", "standard");
        onParameterChange("creativity_level", "balanced");
        break;
      case "professional_detailed":
        onParameterChange("professional_level", "professional");
        onParameterChange("response_style", "detailed");
        onParameterChange("creativity_level", "balanced");
        break;
      case "academic_detailed":
        onParameterChange("professional_level", "academic");
        onParameterChange("response_style", "detailed");
        onParameterChange("creativity_level", "conservative");
        break;
      case "creative_casual":
        onParameterChange("professional_level", "casual");
        onParameterChange("response_style", "standard");
        onParameterChange("creativity_level", "creative");
        break;
    }
  };

  // 獲取當前選中風格的描述
  const getSelectedStyleDescription = () => {
    const selected = COMBINED_STYLE_OPTIONS.find(
      (opt) => opt.value === parameters.combined_style
    );
    return selected?.description || "選擇一個回應風格";
  };

  return (
    <div className={`prompt-config-step ${disabled ? "disabled-step" : ""}`}>
      {/* 禁用狀態提示 */}
      {disabled && (
        <div className="alert alert-info mb-3">
          <i className="bi bi-info-circle me-2"></i>
          資料已上傳處理，Prompt 配置已鎖定，無法修改。
        </div>
      )}
      {/* 設定項目卡片網格 */}
      <div className="row g-3">
        {/* Token限制卡片 */}
        <div className="col-lg-6 col-xl-4">
          <div
            className={`card h-100 ${
              disabled ? "border-secondary" : "border-info"
            }`}
          >
            <div
              className={`card-header ${
                disabled ? "bg-secondary" : "bg-info"
              } text-white`}
            >
              <h6 className="card-title mb-0">
                <i className="bi bi-sliders me-2"></i>
                Token限制
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small">
                  回應長度上限:{" "}
                  <span
                    className={
                      disabled ? "text-secondary fw-bold" : "text-info fw-bold"
                    }
                  >
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
                  disabled={disabled}
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

        {/* 回應風格卡片 - 合併三個選項 */}
        <div className="col-lg-6 col-xl-4">
          <div
            className={`card h-100 ${
              disabled ? "border-secondary" : "border-info"
            }`}
          >
            <div
              className={`card-header ${
                disabled ? "bg-secondary" : "bg-info"
              } text-white`}
            >
              <h6 className="card-title mb-0">
                <i className="bi bi-chat-square-text me-2"></i>
                回應風格
              </h6>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={parameters.combined_style || "professional_standard"}
                disabled={disabled}
                onChange={(e) => handleCombinedStyleChange(e.target.value)}
              >
                {COMBINED_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="form-text small mt-2">
                <i className="bi bi-info-circle text-info me-1"></i>
                {getSelectedStyleDescription()}
              </div>
            </div>
          </div>
        </div>

        {/* 回應格式卡片 - 新增 */}
        <div className="col-lg-6 col-xl-4">
          <div
            className={`card h-100 ${
              disabled ? "border-secondary" : "border-info"
            }`}
          >
            <div
              className={`card-header ${
                disabled ? "bg-secondary" : "bg-info"
              } text-white`}
            >
              <h6 className="card-title mb-0">
                <i className="bi bi-list-ul me-2"></i>
                回應格式
              </h6>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={parameters.response_format || "auto"}
                disabled={disabled}
                onChange={(e) =>
                  onParameterChange("response_format", e.target.value)
                }
              >
                <option value="auto">自動判斷</option>
                <option value="bullet">條列式</option>
                <option value="paragraph">段落式</option>
                <option value="step_by_step">步驟式</option>
              </select>
              <div className="form-text small mt-2">
                {parameters.response_format === "auto" &&
                  "AI 根據問題自動選擇最合適的格式"}
                {parameters.response_format === "bullet" &&
                  "使用條列要點，清晰易讀"}
                {parameters.response_format === "paragraph" &&
                  "使用完整段落，適合詳細說明"}
                {parameters.response_format === "step_by_step" &&
                  "分步驟說明，適合教學或指南"}
              </div>
            </div>
          </div>
        </div>

        {/* 引用格式卡片 - 新增 */}
        <div className="col-lg-6 col-xl-4">
          <div
            className={`card h-100 ${
              disabled ? "border-secondary" : "border-info"
            }`}
          >
            <div
              className={`card-header ${
                disabled ? "bg-secondary" : "bg-info"
              } text-white`}
            >
              <h6 className="card-title mb-0">
                <i className="bi bi-quote me-2"></i>
                來源引用
              </h6>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={parameters.citation_style || "inline"}
                disabled={disabled}
                onChange={(e) =>
                  onParameterChange("citation_style", e.target.value)
                }
              >
                <option value="none">不顯示引用</option>
                <option value="inline">行內引用</option>
                <option value="footnote">文末註腳</option>
              </select>
              <div className="form-text small mt-2">
                {parameters.citation_style === "none" && "回答中不標註來源文件"}
                {parameters.citation_style === "inline" &&
                  "在相關內容後直接標註來源 [文件1]"}
                {parameters.citation_style === "footnote" &&
                  "在回答末尾統一列出引用來源"}
              </div>
            </div>
          </div>
        </div>

        {/* 語氣/角色設定卡片 */}
        <div className="col-lg-12 col-xl-8">
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
                <i className="bi bi-person-badge me-2"></i>
                語氣/角色設定（選填）
              </h6>
            </div>
            <div className="card-body">
              <input
                type="text"
                className="form-control"
                placeholder="例如：國中老師、專業顧問、親切的朋友、健身教練..."
                value={parameters.persona || ""}
                disabled={disabled}
                onChange={(e) => onParameterChange("persona", e.target.value)}
                maxLength={100}
              />
              <div className="form-text small mt-2">
                <i className="bi bi-lightbulb text-warning me-1"></i>
                自訂 AI 回覆的語氣和角色（可留空使用預設風格）。例如：
                <span className="ms-2">
                  <span className="badge bg-light text-dark me-1">
                    國中老師
                  </span>
                  <span className="badge bg-light text-dark me-1">
                    專業顧問
                  </span>
                  <span className="badge bg-light text-dark me-1">
                    親切朋友
                  </span>
                  <span className="badge bg-light text-dark me-1">
                    健身教練
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptConfigStep;
