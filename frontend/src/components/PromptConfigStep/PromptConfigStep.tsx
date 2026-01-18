/**
 * Step 2: AI Behavior & Answer Rules Configuration
 * AI Behavior & Response Configuration
 * Divided into 2 sections: System Rules / Response Policy
 */

import React from "react";
import { useTranslation } from "react-i18next";
import "./PromptConfigStep.scss";

export interface PromptConfigStepProps {
  parameters: {
    // A. System Rules - Fixed per Session
    allow_inference: boolean; // Allow inference
    answer_language: "zh-TW" | "zh-CN" | "en" | "fr" | "auto"; // Answer language
    strict_rag_mode: boolean; // Strict RAG mode
    // external_knowledge: false;       // External knowledge (Always off, read-only)

    // B. Response Policy - Adjustable during conversation
    response_style: "brief" | "kid_friendly";
    response_tone: "friendly" | "rigorous" | "urgent";
    persona: "elementary_teacher" | "show_host" | "workplace_veteran";
    citation_style: "inline" | "document" | "none"; // Citation style

    // C. Runtime Constraints - Partially fixed
    max_response_tokens: number; // Max Response Tokens (512-4096)
    context_warning_threshold: number; // Context Warning Threshold (50-90%)
    retrieval_top_k: number; // Retrieval Top-K (1-10)
    similarity_threshold: number; // Similarity Threshold (0-1)
    max_context_tokens: number; // Max Context Tokens (1000-8000)

    // Deprecated parameters retained for backward compatibility
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

// Answer language options
const ANSWER_LANGUAGE_OPTIONS = [
  {
    value: "zh-TW",
    label: "Traditional Chinese",
    labelKey: "step2.system.lang.zhTW",
  },
  { value: "auto", label: "Auto Detect", labelKey: "step2.system.lang.auto" },
  {
    value: "zh-CN",
    label: "Simplified Chinese",
    labelKey: "step2.system.lang.zhCN",
  },
  { value: "en", label: "English", labelKey: "step2.system.lang.en" },
  { value: "fr", label: "Français", labelKey: "step2.system.lang.fr" },
];

// Response style options
const RESPONSE_STYLE_OPTIONS = [
  {
    value: "brief",
    label: "Brief",
    labelKey: "step2.policy.style.brief",
    descriptionKey: "step2.summary.style.brief",
    description: "Quick summary",
  },
  {
    value: "kid_friendly",
    label: "Explain Like I'm 5",
    labelKey: "step2.policy.style.kidFriendly",
    descriptionKey: "step2.summary.style.kidFriendly",
    description: "Simple analogies for kids",
  },
];

// Response tone options
const RESPONSE_TONE_OPTIONS = [
  {
    value: "friendly",
    label: "Friendly",
    labelKey: "step2.policy.tone.friendly",
    descriptionKey: "step2.summary.tone.friendly",
    description: "Warm and approachable",
  },
  {
    value: "rigorous",
    label: "Rigorous",
    labelKey: "step2.policy.tone.rigorous",
    descriptionKey: "step2.summary.tone.rigorous",
    description: "Precise and logical",
  },
  {
    value: "urgent",
    label: "Urgent",
    labelKey: "step2.policy.tone.urgent",
    descriptionKey: "step2.summary.tone.urgent",
    description: "Short and direct, fast output",
  },
];

// Persona options
const PERSONA_OPTIONS = [
  {
    value: "elementary_teacher",
    labelKey: "step2.persona.elementaryTeacher",
    descriptionKey: "step2.summary.persona.elementaryTeacher",
  },
  {
    value: "show_host",
    labelKey: "step2.persona.showHost",
    descriptionKey: "step2.summary.persona.showHost",
  },
  {
    value: "workplace_veteran",
    labelKey: "step2.persona.workplaceVeteran",
    descriptionKey: "step2.summary.persona.workplaceVeteran",
  },
];

// Citation style options
const CITATION_STYLE_OPTIONS = [
  {
    value: "inline",
    labelKey: "step2.policy.citation.inline",
    descriptionKey: "step2.summary.citation.inline",
  },
  {
    value: "document",
    labelKey: "step2.policy.citation.document",
    descriptionKey: "step2.summary.citation.document",
  },
  {
    value: "none",
    labelKey: "step2.policy.citation.none",
    descriptionKey: "step2.summary.citation.none",
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

  return (
    <div className={`prompt-config-step ${disabled ? "disabled-step" : ""}`}>
      {/* Disabled status notice */}
      {disabled && (
        <div className="alert alert-info mb-2 py-2">
          <i className="bi bi-info-circle me-2"></i>
          {t("step2.disabledNotice")}
        </div>
      )}

      <div className="row g-2 prompt-summary mb-2">
        <div className="col-md-3 col-sm-6">
          <div className="summary-tile">
            <div className="label">{t("step2.policy.style.label")}</div>
            <div className="value">{t(styleOption.labelKey)}</div>
            <div className="meta">{t(styleOption.descriptionKey)}</div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="summary-tile">
            <div className="label">{t("step2.policy.tone.label")}</div>
            <div className="value">{t(toneOption.labelKey)}</div>
            <div className="meta">{t(toneOption.descriptionKey)}</div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="summary-tile">
            <div className="label">{t("step2.policy.persona.label")}</div>
            <div className="value">{t(personaOption.labelKey)}</div>
            <div className="meta">{t(personaOption.descriptionKey)}</div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="summary-tile">
            <div className="label">{t("step2.policy.citation.label")}</div>
            <div className="value">{t(citationOption.labelKey)}</div>
            <div className="meta">{t(citationOption.descriptionKey)}</div>
          </div>
        </div>
      </div>

      {/* 2x2 Grid card layout */}
      <div className="row g-2">
        {/* A. System Rules - top left */}
        <div className="col-lg-6">
          <div
            className={`card h-100 prompt-card ${
              disabled ? "border-secondary" : "active-card-border"
            }`}
          >
            <div className="card-body p-3">
              <h5 className="card-title mb-2 fw-bold">
                {t("step2.system.title")}
              </h5>

              {/* Answer language */}
              <div className="mb-2">
                <label className="form-label small mb-1">
                  {t("step2.system.answerLanguage")}
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
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Strict RAG mode Toggle */}
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
                    {t("step2.system.strictRagMode")}
                  </label>
                </div>
              </div>

              {/* Allow inference Toggle */}
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
                    {t("step2.system.allowInference")}
                  </label>
                </div>
              </div>

              {/* Allow user prompt to adjust System Prompt (always off) */}
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
                    {t("step2.system.allowUserOverride")}
                    <span className="badge bg-secondary ms-1 small">
                      {t("step2.system.alwaysOff")}
                    </span>
                  </label>
                </div>
              </div>

              {/* External knowledge (always off, read-only) */}
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
                    {t("step2.system.externalKnowledge")}
                    <span className="badge bg-secondary ms-1 small">
                      {t("step2.system.alwaysOff")}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* B. Response Policy - top right */}
        <div className="col-lg-6">
          <div
            className={`card h-100 prompt-card ${
              disabled ? "border-secondary" : "active-card-border"
            }`}
          >
            <div className="card-body p-3">
              <h5 className="card-title mb-2 fw-bold">
                {t("step2.response.title")}
              </h5>

              {/* Response style */}
              <div className="mb-3">
                <label className="form-label fw-bold">
                  {t("step2.policy.style.label")}
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
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Response tone */}
              <div className="mb-2">
                <label className="form-label small mb-1">
                  {t("step2.policy.tone.label")}
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
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Persona */}
              <div className="mb-2">
                <label className="form-label small mb-1">
                  {t("step2.policy.persona.label")}
                </label>
                <select
                  className="form-select form-select-sm"
                  value={parameters.persona || "workplace_veteran"}
                  disabled={disabled}
                  onChange={(e) => onParameterChange("persona", e.target.value)}
                >
                  {PERSONA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Citation style */}
              <div className="mb-0">
                <label className="form-label small mb-1">
                  {t("step2.policy.citation.label")}
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
                      {t(option.labelKey)}
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
