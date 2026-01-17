/**
 * Step 2: AI 行為與回答規則設定
 * AI Behavior & Response Configuration
 * 分為 2 區塊：系統規則 / 回答政策
 */

import React from "react";
import { useTranslation } from "react-i18next";
import "./PromptConfigStep.scss";

export interface PromptConfigStepProps {
  parameters: {
    // A. 系統規則 (System Rules) - Session 固定
    allow_inference: boolean; // 允許推論
    answer_language: "zh-TW" | "zh-CN" | "en" | "fr" | "auto"; // 回答語言
    strict_rag_mode: boolean; // 嚴格 RAG 模式
    // external_knowledge: false;       // 外部知識（永遠關閉，唯讀）

    // B. 回答政策 (Response Policy) - 對話中可調整
    response_style: "brief" | "kid_friendly";
    response_tone: "friendly" | "rigorous" | "urgent";
    persona: "elementary_teacher" | "show_host" | "workplace_veteran";
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
  { value: "auto", label: "自動偵測", labelKey: "step2.system.lang.auto" },
  { value: "zh-CN", label: "Simplified Chinese", labelKey: "step2.system.lang.zhCN" },
  { value: "en", label: "English", labelKey: "step2.system.lang.en" },
  { value: "fr", label: "Français", labelKey: "step2.system.lang.fr" },
];

// 回答風格選項
const RESPONSE_STYLE_OPTIONS = [
  {
    value: "brief",
    label: "簡要",
    labelKey: "step2.policy.style.brief",
    descriptionKey: "step2.summary.style.brief",
    description: "快速給重點",
  },
  {
    value: "kid_friendly",
    label: "試著讓小孩也能懂",
    labelKey: "step2.policy.style.kidFriendly",
    descriptionKey: "step2.summary.style.kidFriendly",
    description: "用淺顯比喻讓孩子懂",
  },
];

// 回答語氣選項
const RESPONSE_TONE_OPTIONS = [
  {
    value: "friendly",
    label: "親切",
    labelKey: "step2.policy.tone.friendly",
    descriptionKey: "step2.summary.tone.friendly",
    description: "溫暖易親近",
  },
  {
    value: "rigorous",
    label: "嚴謹",
    labelKey: "step2.policy.tone.rigorous",
    descriptionKey: "step2.summary.tone.rigorous",
    description: "精確、邏輯清晰",
  },
  {
    value: "urgent",
    label: "急促",
    labelKey: "step2.policy.tone.urgent",
    descriptionKey: "step2.summary.tone.urgent",
    description: "簡短直入重點，快速輸出",
  },
];

// Persona 選項
const PERSONA_OPTIONS = [
  {
    value: "elementary_teacher",
    label: "小學老師",
    labelKey: "step2.persona.elementaryTeacher",
    descriptionKey: "step2.summary.persona.elementaryTeacher",
    description: "用簡單例子慢慢教",
  },
  {
    value: "show_host",
    label: "節目主持人",
    labelKey: "step2.persona.showHost",
    descriptionKey: "step2.summary.persona.showHost",
    description: "生動活潑，帶節奏與互動",
  },
  {
    value: "workplace_veteran",
    label: "職場老手",
    labelKey: "step2.persona.workplaceVeteran",
    descriptionKey: "step2.summary.persona.workplaceVeteran",
    description: "實戰經驗豐富，給務實建議",
  },
];

// 引用方式選項
const CITATION_STYLE_OPTIONS = [
  {
    value: "inline",
    label: "行內引用",
    labelKey: "step2.policy.citation.inline",
    descriptionKey: "step2.summary.citation.inline",
    description: "在文字旁標註來源 [文件1]",
  },
  {
    value: "document",
    label: "文件引用",
    labelKey: "step2.policy.citation.document",
    descriptionKey: "step2.summary.citation.document",
    description: "在結尾列出所有來源",
  },
  {
    value: "none",
    label: "不顯示",
    labelKey: "step2.policy.citation.none",
    descriptionKey: "step2.summary.citation.none",
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

  const styleOption =
    RESPONSE_STYLE_OPTIONS.find(
      (opt) => opt.value === (parameters.response_style || "brief")
    ) || RESPONSE_STYLE_OPTIONS[0];
  const toneOption =
    RESPONSE_TONE_OPTIONS.find(
      (opt) => opt.value === (parameters.response_tone || "friendly")
    ) || RESPONSE_TONE_OPTIONS[0];
  const personaOption =
    PERSONA_OPTIONS.find(
      (opt) => opt.value === (parameters.persona || "workplace_veteran")
    ) || PERSONA_OPTIONS[2];
  const citationOption =
    CITATION_STYLE_OPTIONS.find(
      (opt) => opt.value === (parameters.citation_style || "inline")
    ) || CITATION_STYLE_OPTIONS[0];

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
        <div className="alert alert-info mb-2 py-2">
          <i className="bi bi-info-circle me-2"></i>
          {t("step2.disabledNotice", "資料已上傳，配置已鎖定，無法修改。")}
        </div>
      )}

      <div className="row g-2 prompt-summary mb-2">
        <div className="col-md-3 col-sm-6">
          <div className="summary-tile">
            <div className="label">
              {t("step2.policy.style.label", "回答風格")}
            </div>
            <div className="value">
              {t(styleOption.labelKey, styleOption.label)}
            </div>
            <div className="meta">
              {t(styleOption.descriptionKey, styleOption.description)}
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="summary-tile">
            <div className="label">
              {t("step2.policy.tone.label", "回答語氣")}
            </div>
            <div className="value">
              {t(toneOption.labelKey, toneOption.label)}
            </div>
            <div className="meta">
              {t(toneOption.descriptionKey, toneOption.description)}
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="summary-tile">
            <div className="label">
              {t("step2.policy.persona.label", "角色設定")}
            </div>
            <div className="value">
              {t(personaOption.labelKey, personaOption.label)}
            </div>
            <div className="meta">
              {t(personaOption.descriptionKey, personaOption.description)}
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="summary-tile">
            <div className="label">
              {t("step2.policy.citation.label", "引用方式")}
            </div>
            <div className="value">
              {t(citationOption.labelKey, citationOption.label)}
            </div>
            <div className="meta">
              {t(citationOption.descriptionKey, citationOption.description)}
            </div>
          </div>
        </div>
      </div>

      {/* 2x2 Grid 卡片佈局 */}
      <div className="row g-2">
        {/* A. 系統規則 (System Rules) - 左上 */}
        <div className="col-lg-6">
          <div
            className={`card h-100 prompt-card ${
              disabled ? "border-secondary" : "active-card-border"
            }`}
          >
            <div className="card-body p-3">
              <h5 className="card-title mb-2 fw-bold">
                {t("step2.system.title", "系統規則")}
              </h5>

              {/* 回答語言 */}
              <div className="mb-2">
                <label className="form-label small mb-1">
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
              <div className="mb-2">
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
                  <label
                    className="form-check-label small"
                    htmlFor="strictRagMode"
                  >
                    {t("step2.system.strictRagMode", "嚴格 RAG 模式")}
                  </label>
                </div>
              </div>

              {/* 允許推論 Toggle */}
              <div className="mb-2">
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
                  <label
                    className="form-check-label small"
                    htmlFor="allowInference"
                  >
                    {t("step2.system.allowInference", "允許推論")}
                  </label>
                </div>
              </div>

              {/* 允許使用者的 Prompt 來調整 System Prompt (永遠關閉) */}
              <div className="mb-2">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="allowUserOverride"
                    checked={false}
                    disabled={true}
                  />
                  <label
                    className="form-check-label text-muted small"
                    htmlFor="allowUserOverride"
                  >
                    {t(
                      "step2.system.allowUserOverride",
                      "允許調整 System Prompt"
                    )}
                    <span className="badge bg-secondary ms-1 small">
                      {t("step2.system.alwaysOff", "關")}
                    </span>
                  </label>
                </div>
              </div>

              {/* 外部知識（永遠關閉，唯讀） */}
              <div className="mb-0">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="externalKnowledge"
                    checked={false}
                    disabled={true}
                  />
                  <label
                    className="form-check-label text-muted small"
                    htmlFor="externalKnowledge"
                  >
                    {t("step2.system.externalKnowledge", "外部知識存取")}
                    <span className="badge bg-secondary ms-1 small">
                      {t("step2.system.alwaysOff", "關")}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* B. 回應策略 (Response Policy) - 右上 */}
        <div className="col-lg-6">
          <div
            className={`card h-100 prompt-card ${
              disabled ? "border-secondary" : "active-card-border"
            }`}
          >
            <div className="card-body p-3">
              <h5 className="card-title mb-2 fw-bold">
                {t("step2.response.title", "回應策略")}
              </h5>

              {/* 回答風格 */}
              <div className="mb-3">
                <label className="form-label fw-bold">
                  {t("step2.policy.style.label", "回答風格")}
                </label>
                <select
                  className="form-select modern-select"
                  value={parameters.response_style || "brief"}
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
              </div>

              {/* 回答語氣 */}
              <div className="mb-2">
                <label className="form-label small mb-1">
                  {t("step2.policy.tone.label", "回答語氣")}
                </label>
                <select
                  className="form-select form-select-sm"
                  value={parameters.response_tone || "friendly"}
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
              </div>

              {/* Persona */}
              <div className="mb-2">
                <label className="form-label small mb-1">
                  {t("step2.policy.persona.label", "角色設定")}
                </label>
                <select
                  className="form-select form-select-sm"
                  value={parameters.persona || "workplace_veteran"}
                  disabled={disabled}
                  onChange={(e) => onParameterChange("persona", e.target.value)}
                >
                  {PERSONA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey, option.label)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 引用方式 */}
              <div className="mb-0">
                <label className="form-label small mb-1">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptConfigStep;
