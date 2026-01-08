/**
 * Step 2: AI 行為與回答規則設定
 * AI Behavior & Response Configuration
 * 分為 2 區塊：系統規則 / 回答政策
 */

import React from "react";
import { useTranslation } from "react-i18next";

export interface PromptConfigStepProps {
  parameters: {
    // A. 系統規則 (System Rules) - Session 固定
    allow_inference: boolean; // 允許推論
    answer_language: "zh-TW" | "en" | "auto"; // 回答語言
    strict_rag_mode: boolean; // 嚴格 RAG 模式
    // external_knowledge: false;       // 外部知識（永遠關閉，唯讀）

    // B. 回答政策 (Response Policy) - 對話中可調整
    response_style: "concise" | "standard" | "detailed" | "step_by_step";
    response_tone: "formal" | "friendly" | "casual" | "academic";
    persona: "professor" | "expert" | "educator" | "neighbor";
    citation_style: "inline" | "document" | "none"; // 引用方式

    // C. 執行限制 (Runtime Constraints) - 部分固定
    max_response_tokens: number; // 最大回應 Token (512-4096)
    context_warning_threshold: number; // Context 預警閾值 (50-90%)
    retrieval_top_k: number; // Retrieval Top-K (1-10)
    similarity_threshold: number; // 相似度閾值 (0-1)
    max_context_tokens: number; // 最大 Context Token (1000-8000)

    // 舊參數保留（供向後相容）
    token_threshold?: number;
    professional_level?: "casual" | "professional" | "academic";
    creativity_level?: "conservative" | "balanced" | "creative";
    response_format?: "auto" | "bullet" | "paragraph" | "step_by_step";
    combined_style?: string;
  };
  onParameterChange: (parameter: string, value: any) => void;
  onComplete?: () => void;
  disabled?: boolean;
}

// 回答語言選項
const ANSWER_LANGUAGE_OPTIONS = [
  { value: "zh-TW", label: "繁體中文", labelKey: "step2.system.lang.zhTW" },
  { value: "en", label: "English", labelKey: "step2.system.lang.en" },
  { value: "auto", label: "自動偵測", labelKey: "step2.system.lang.auto" },
];

// 回答風格選項
const RESPONSE_STYLE_OPTIONS = [
  {
    value: "concise",
    label: "簡潔扼要",
    labelKey: "step2.policy.style.concise",
    description: "精簡重點，快速理解",
  },
  {
    value: "standard",
    label: "標準詳細",
    labelKey: "step2.policy.style.standard",
    description: "平衡說明，適中詳細度",
  },
  {
    value: "detailed",
    label: "深入完整",
    labelKey: "step2.policy.style.detailed",
    description: "詳盡解釋，全面說明",
  },
  {
    value: "step_by_step",
    label: "步驟教學",
    labelKey: "step2.policy.style.stepByStep",
    description: "手把手引導，分步說明",
  },
];

// 回答語氣選項
const RESPONSE_TONE_OPTIONS = [
  {
    value: "formal",
    label: "正式專業",
    labelKey: "step2.policy.tone.formal",
    description: "專業術語，正式口吻",
  },
  {
    value: "friendly",
    label: "親切友善",
    labelKey: "step2.policy.tone.friendly",
    description: "溫暖親近，易於理解",
  },
  {
    value: "casual",
    label: "輕鬆活潑",
    labelKey: "step2.policy.tone.casual",
    description: "口語化，輕鬆有趣",
  },
  {
    value: "academic",
    label: "嚴謹學術",
    labelKey: "step2.policy.tone.academic",
    description: "學術語言，嚴謹準確",
  },
];

// Persona 選項
const PERSONA_OPTIONS = [
  {
    value: "professor",
    label: "大學教授",
    labelKey: "step2.persona.professor",
    description: "學術嚴謹、引用文獻",
  },
  {
    value: "expert",
    label: "職場專家",
    labelKey: "step2.persona.expert",
    description: "務實導向、重點明確",
  },
  {
    value: "educator",
    label: "兒童教育者",
    labelKey: "step2.persona.educator",
    description: "淺顯易懂、舉例說明",
  },
  {
    value: "neighbor",
    label: "市場大媽大伯",
    labelKey: "step2.persona.neighbor",
    description: "口語化、生活化比喻",
  },
];

// 引用方式選項
const CITATION_STYLE_OPTIONS = [
  {
    value: "inline",
    label: "行內引用",
    labelKey: "step2.policy.citation.inline",
    description: "在文字旁標註來源 [文件1]",
  },
  {
    value: "document",
    label: "文件引用",
    labelKey: "step2.policy.citation.document",
    description: "在結尾列出所有來源",
  },
  {
    value: "none",
    label: "不顯示",
    labelKey: "step2.policy.citation.none",
    description: "不顯示引用來源",
  },
];

const PromptConfigStep: React.FC<PromptConfigStepProps> = ({
  parameters,
  onParameterChange,
  onComplete,
  disabled = false,
}) => {
  const { t } = useTranslation();

  // 獲取選項描述
  const getStyleDescription = (value: string) => {
    const option = RESPONSE_STYLE_OPTIONS.find((opt) => opt.value === value);
    return option?.description || "";
  };

  const getToneDescription = (value: string) => {
    const option = RESPONSE_TONE_OPTIONS.find((opt) => opt.value === value);
    return option?.description || "";
  };

  const getPersonaDescription = (value: string) => {
    const option = PERSONA_OPTIONS.find((opt) => opt.value === value);
    return option?.description || "";
  };

  const getCitationDescription = (value: string) => {
    const option = CITATION_STYLE_OPTIONS.find((opt) => opt.value === value);
    return option?.description || "";
  };

  return (
    <div className={`prompt-config-step ${disabled ? "disabled-step" : ""}`}>
      {/* 禁用狀態提示 */}
      {disabled && (
        <div className="alert alert-info mb-3">
          <i className="bi bi-info-circle me-2"></i>
          {t("step2.disabledNotice", "資料已上傳處理，配置已鎖定，無法修改。")}
        </div>
      )}

      {/* 2x2 Grid 卡片佈局 */}
      <div className="row g-3">
        {/* A. 系統規則 (System Rules) - 左上 */}
        <div className="col-lg-6">
          <div
            className={`card h-100 ${
              disabled ? "border-secondary" : "border-warning"
            }`}
          >
            <div
              className={`card-header ${
                disabled ? "bg-secondary" : "bg-warning"
              } text-dark d-flex justify-content-between align-items-center`}
            >
              <h6 className="card-title mb-0">
                {t("step2.system.title", "系統規則")}
              </h6>
              <span className="badge bg-dark small">
                {t("step2.badge.sessionFixed", "Session 固定")}
              </span>
            </div>
            <div className="card-body">
              {/* 回答語言 */}
              <div className="mb-3">
                <label className="form-label small fw-bold">
                  {t("step2.system.answerLanguage", "回答語言")}
                </label>
                <select
                  className="form-select form-select-sm"
                  value={parameters.answer_language || "auto"}
                  disabled={disabled}
                  onChange={(e) =>
                    onParameterChange("answer_language", e.target.value)
                  }
                >
                  {ANSWER_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey, option.label)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 嚴格 RAG 模式 Toggle */}
              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="strictRagMode"
                    checked={parameters.strict_rag_mode !== false}
                    disabled={disabled}
                    onChange={(e) =>
                      onParameterChange("strict_rag_mode", e.target.checked)
                    }
                  />
                  <label className="form-check-label" htmlFor="strictRagMode">
                    {t("step2.system.strictRagMode", "嚴格 RAG 模式")}
                  </label>
                </div>
                <div className="form-text small">
                  <i className="bi bi-info-circle text-warning me-1"></i>
                  {parameters.strict_rag_mode !== false
                    ? t(
                        "step2.system.strictRagOn",
                        "開啟：當資料不足時 AI 將拒絕回答"
                      )
                    : t(
                        "step2.system.strictRagOff",
                        "關閉：AI 可能使用一般知識補充"
                      )}
                </div>
              </div>

              {/* 允許推論 Toggle */}
              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="allowInference"
                    checked={parameters.allow_inference || false}
                    disabled={disabled}
                    onChange={(e) =>
                      onParameterChange("allow_inference", e.target.checked)
                    }
                  />
                  <label className="form-check-label" htmlFor="allowInference">
                    {t("step2.system.allowInference", "允許推論")}
                  </label>
                </div>
                <div className="form-text small">
                  <i className="bi bi-info-circle text-warning me-1"></i>
                  {parameters.allow_inference
                    ? t(
                        "step2.system.inferenceOn",
                        "開啟：可在上傳資料範圍內合理推論"
                      )
                    : t(
                        "step2.system.inferenceOff",
                        "關閉：僅回答文件中明確記載的內容"
                      )}
                </div>
              </div>

              {/* 允許使用者的 Prompt 來調整 System Prompt (永遠關閉) */}
              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="allowUserOverride"
                    checked={false}
                    disabled={true}
                  />
                  <label
                    className="form-check-label text-muted"
                    htmlFor="allowUserOverride"
                  >
                    {t(
                      "step2.system.allowUserOverride",
                      "允許使用者的 Prompt 來調整 System Prompt"
                    )}
                    <span className="badge bg-secondary ms-2 small">
                      {t("step2.system.alwaysOff", "永遠關閉")}
                    </span>
                  </label>
                </div>
              </div>

              {/* 外部知識（永遠關閉，唯讀） */}
              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="externalKnowledge"
                    checked={false}
                    disabled={true}
                  />
                  <label
                    className="form-check-label text-muted"
                    htmlFor="externalKnowledge"
                  >
                    {t("step2.system.externalKnowledge", "外部知識存取")}
                    <span className="badge bg-secondary ms-2 small">
                      {t("step2.system.alwaysOff", "永遠關閉")}
                    </span>
                  </label>
                </div>
              </div>

              {/* 無資料回應政策（僅顯示） */}
              <div className="mb-0 p-2 bg-light rounded">
                <div className="small fw-bold text-muted mb-1">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  {t("step2.system.noDataPolicy", "無資料回應政策")}
                </div>
                <div className="small text-secondary">
                  {t(
                    "step2.system.noDataPolicyDesc",
                    "當檢索不到相關資料時，AI 會明確告知使用者，並提供可能的替代問題建議。"
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* B. 回答政策 (Response Policy) - 右上 */}
        <div className="col-lg-6">
          <div
            className={`card h-100 ${
              disabled ? "border-secondary" : "border-info"
            }`}
          >
            <div
              className={`card-header ${
                disabled ? "bg-secondary" : "bg-info"
              } text-white d-flex justify-content-between align-items-center`}
            >
              <h6 className="card-title mb-0">
                <i className="bi bi-chat-square-text me-2"></i>
                {t("step2.policy.title", "回答政策")}
              </h6>
              <span className="badge bg-light text-dark small">
                <i className="bi bi-pencil me-1"></i>
                {t("step2.badge.chatAdjustable", "對話中可調整")}
              </span>
            </div>
            <div className="card-body">
              {/* 回答風格 */}
              <div className="mb-3">
                <label className="form-label small fw-bold">
                  {t("step2.policy.style.label", "回答風格")}
                </label>
                <select
                  className="form-select form-select-sm"
                  value={parameters.response_style || "standard"}
                  disabled={disabled}
                  onChange={(e) =>
                    onParameterChange("response_style", e.target.value)
                  }
                >
                  {RESPONSE_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey, option.label)}
                    </option>
                  ))}
                </select>
                <div className="form-text small text-muted">
                  {getStyleDescription(parameters.response_style || "standard")}
                </div>
              </div>

              {/* 回答語氣 */}
              <div className="mb-3">
                <label className="form-label small fw-bold">
                  {t("step2.policy.tone.label", "回答語氣")}
                </label>
                <select
                  className="form-select form-select-sm"
                  value={parameters.response_tone || "formal"}
                  disabled={disabled}
                  onChange={(e) =>
                    onParameterChange("response_tone", e.target.value)
                  }
                >
                  {RESPONSE_TONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey, option.label)}
                    </option>
                  ))}
                </select>
                <div className="form-text small text-muted">
                  {getToneDescription(parameters.response_tone || "formal")}
                </div>
              </div>

              {/* Persona */}
              <div className="mb-3">
                <label className="form-label small fw-bold">
                  {t("step2.policy.persona.label", "角色設定 (Persona)")}
                </label>
                <select
                  className="form-select form-select-sm"
                  value={parameters.persona || "expert"}
                  disabled={disabled}
                  onChange={(e) => onParameterChange("persona", e.target.value)}
                >
                  {PERSONA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey, option.label)}
                    </option>
                  ))}
                </select>
                <div className="form-text small text-muted">
                  {getPersonaDescription(parameters.persona || "expert")}
                </div>
              </div>

              {/* 引用方式 */}
              <div className="mb-0">
                <label className="form-label small fw-bold">
                  {t("step2.policy.citation.label", "引用方式")}
                </label>
                <select
                  className="form-select form-select-sm"
                  value={parameters.citation_style || "inline"}
                  disabled={disabled}
                  onChange={(e) =>
                    onParameterChange("citation_style", e.target.value)
                  }
                >
                  {CITATION_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey, option.label)}
                    </option>
                  ))}
                </select>
                <div className="form-text small text-muted">
                  {getCitationDescription(
                    parameters.citation_style || "inline"
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptConfigStep;
