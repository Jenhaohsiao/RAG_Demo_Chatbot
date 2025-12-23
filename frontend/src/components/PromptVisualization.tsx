/**
 * Prompt Visualization Component
 * 顯示系統使用的 AI Prompt 模板和當前 Session 的實際 Prompt
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface SystemPrompts {
  rag_prompt_template: string;
  summary_prompt_templates: { [key: string]: string };
  moderation_prompt: string;
  no_documents_prompt: string;
  language_mappings: { [key: string]: string };
  constitutional_principles: string[];
  system_info: {
    similarity_threshold: number;
    token_threshold: number;
    memory_limit: number;
    session_ttl_minutes: number;
    supported_languages: string[];
    supported_file_types: string[];
  };
  prompt_variables: { [key: string]: string };
}

interface CurrentSessionPrompt {
  session_id: string;
  language: string;
  response_language: string;
  prompt_type: string;
  has_documents: boolean;
  actual_prompt: string;
  timestamp: string;
}

interface PromptVisualizationProps {
  sessionId?: string;
  currentLanguage?: string;
  hasDocuments?: boolean;
  onParameterChange?: (parameter: string, value: any) => void;
}

interface PromptParameters {
  response_language: string;
  input_language: string;
  similarity_threshold: number;
  token_threshold: number;
  session_ttl_minutes: number;
  prompt_type: "rag" | "general" | "summary";
  response_style: "concise" | "standard" | "detailed";
  professional_level: "casual" | "professional" | "academic";
  creativity_level: "conservative" | "balanced" | "creative";
  enabled_principles: string[];
  supported_file_types: string[];
}

const PromptVisualization: React.FC<PromptVisualizationProps> = ({
  sessionId,
  currentLanguage = "zh",
  hasDocuments = false,
  onParameterChange,
}) => {
  const { t, i18n } = useTranslation();
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts | null>(
    null
  );
  const [currentPrompt, setCurrentPrompt] =
    useState<CurrentSessionPrompt | null>(null);
  const [activeTab, setActiveTab] = useState<"parameters">("parameters");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 參數狀態管理
  const [parameters, setParameters] = useState<PromptParameters>({
    response_language: "zh",
    input_language: "auto",
    similarity_threshold: 0.7,
    token_threshold: 10000,
    session_ttl_minutes: 60,
    prompt_type: "rag",
    response_style: "standard",
    professional_level: "professional",
    creativity_level: "balanced",
    enabled_principles: [],
    supported_file_types: ["pdf", "txt", "docx"],
  });

  // 折疊狀態管理
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isStyleCollapsed, setIsStyleCollapsed] = useState(true);
  const [isFileTypeCollapsed, setIsFileTypeCollapsed] = useState(true);
  const [isPrinciplesCollapsed, setIsPrinciplesCollapsed] = useState(true);

  // 參數變更處理
  const handleParameterChange = (
    parameter: keyof PromptParameters,
    value: any
  ) => {
    setParameters((prev) => ({
      ...prev,
      [parameter]: value,
    }));
    onParameterChange?.(parameter, value);
  };

  // 獲取系統 Prompt 模板
  const fetchSystemPrompts = async () => {
    try {
      console.log("[PromptVisualization] Fetching system prompts...");
      setLoading(true);
      const response = await fetch(
        "http://localhost:8000/api/v1/prompt/system-prompts"
      );
      console.log(
        "[PromptVisualization] System prompts response status:",
        response.status
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("[PromptVisualization] System prompts data:", data);
      setSystemPrompts(data);
    } catch (err) {
      console.error("[PromptVisualization] System prompts error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load system prompts"
      );
    } finally {
      setLoading(false);
    }
  };

  // 獲取當前 Session Prompt
  const fetchCurrentPrompt = async () => {
    try {
      console.log("[PromptVisualization] Fetching current prompt...");
      setLoading(true);
      const params = new URLSearchParams({
        language: currentLanguage,
        has_documents: hasDocuments.toString(),
      });
      if (sessionId) {
        params.append("session_id", sessionId);
      }

      const url = `http://localhost:8000/api/v1/prompt/current-session-prompt?${params}`;
      console.log("[PromptVisualization] Current prompt URL:", url);
      const response = await fetch(url);
      console.log(
        "[PromptVisualization] Current prompt response status:",
        response.status
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("[PromptVisualization] Current prompt data:", data);
      setCurrentPrompt(data);
    } catch (err) {
      console.error("[PromptVisualization] Current prompt error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load current prompt"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("[PromptVisualization] Component mounted, fetching data...");
    fetchSystemPrompts();
    fetchCurrentPrompt();
  }, [sessionId, currentLanguage, hasDocuments]);

  const formatPromptText = (text: string) => {
    return text.split("\n").map((line, index) => {
      // 高亮顯示重要部分
      if (line.includes("**") || line.includes("IMPORTANT")) {
        return (
          <div key={index} className="prompt-important-line">
            {line}
          </div>
        );
      }
      if (line.includes("{{") && line.includes("}}")) {
        return (
          <div key={index} className="prompt-variable-line">
            {line}
          </div>
        );
      }
      return (
        <div key={index} className="prompt-normal-line">
          {line}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="prompt-visualization loading">
        <div className="spinner"></div>
        <span>載入 Prompt 資訊...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prompt-visualization error">
        <div className="error-message">
          ❌ 無法載入 Prompt 資訊: {error}
          <button
            onClick={() => {
              fetchSystemPrompts();
              fetchCurrentPrompt();
            }}
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="prompt-visualization-compact">
      <div className="prompt-content-compact">
        {loading && (
          <div className="text-center">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <small className="text-muted ms-2">載入中...</small>
          </div>
        )}

        {error && (
          <div className="alert alert-danger alert-sm">
            <small>❌ 無法載入: {error}</small>
            <button
              className="btn btn-sm btn-outline-danger ms-2"
              onClick={() => {
                fetchSystemPrompts();
                fetchCurrentPrompt();
              }}
            >
              重試
            </button>
          </div>
        )}

        {!loading && !error && (
          <div>
            {/* 核心參數 */}
            <div className="card row-mb-3 mb-3">
              <div
                className="card-header bg-light"
                style={{ cursor: "pointer" }}
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">核心參數</h5>
                  <i
                    className={`bi ${
                      isCollapsed ? "bi-chevron-down" : "bi-chevron-up"
                    }`}
                  ></i>
                </div>
              </div>
              {!isCollapsed && (
                <>
                  <div className="p-3 mt-2">
                    <label className="form-label">
                      相似度閾值<small> (搜索精確度)</small>:{" "}
                      {parameters.similarity_threshold}
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={parameters.similarity_threshold}
                      onChange={(e) =>
                        handleParameterChange(
                          "similarity_threshold",
                          parseFloat(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">
                      Token限制<small> (回應長度上限)</small>:{" "}
                      {parameters.token_threshold.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1000"
                      max="10000"
                      step="1000"
                      value={parameters.token_threshold}
                      onChange={(e) =>
                        handleParameterChange(
                          "token_threshold",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">Session存活時間</label>
                    <select
                      className="form-select form-select-sm"
                      value={parameters.session_ttl_minutes}
                      onChange={(e) =>
                        handleParameterChange(
                          "session_ttl_minutes",
                          parseInt(e.target.value)
                        )
                      }
                    >
                      <option value={5}>5分鐘</option>
                      <option value={10}>10分鐘</option>
                      <option value={20}>20分鐘</option>
                      <option value={30}>30分鐘</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Prompt類型與風格 */}

            <div className="card row-mb-3 mb-3">
              <div
                className="card-header bg-light"
                style={{ cursor: "pointer" }}
                onClick={() => setIsStyleCollapsed(!isStyleCollapsed)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">回應風格</h5>
                  <i
                    className={`bi ${
                      isStyleCollapsed ? "bi-chevron-down" : "bi-chevron-up"
                    }`}
                  ></i>
                </div>
              </div>
              {!isStyleCollapsed && (
                <>
                  <div className="p-3 mt-2">
                    <label className="form-label">Prompt類型</label>
                    <div>
                      {["rag", "general", "summary"].map((type) => (
                        <div
                          key={type}
                          className="form-check form-check-inline"
                        >
                          <input
                            className="form-check-input"
                            type="radio"
                            name="prompt_type"
                            value={type}
                            checked={parameters.prompt_type === type}
                            onChange={(e) =>
                              handleParameterChange(
                                "prompt_type",
                                e.target.value
                              )
                            }
                          />
                          <label className="form-check-label">
                            {type === "rag"
                              ? "RAG"
                              : type === "general"
                              ? "一般"
                              : "摘要"}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">回應詳細程度</label>
                    <select
                      className="form-select form-select-sm"
                      value={parameters.response_style}
                      onChange={(e) =>
                        handleParameterChange("response_style", e.target.value)
                      }
                    >
                      <option value="concise">簡潔</option>
                      <option value="standard">標準</option>
                      <option value="detailed">詳細</option>
                    </select>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">專業程度</label>
                    <select
                      className="form-select form-select-sm"
                      value={parameters.professional_level}
                      onChange={(e) =>
                        handleParameterChange(
                          "professional_level",
                          e.target.value
                        )
                      }
                    >
                      <option value="casual">通俗</option>
                      <option value="professional">專業</option>
                      <option value="academic">學術</option>
                    </select>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">創意程度</label>
                    <select
                      className="form-select form-select-sm"
                      value={parameters.creativity_level}
                      onChange={(e) =>
                        handleParameterChange(
                          "creativity_level",
                          e.target.value
                        )
                      }
                    >
                      <option value="conservative">保守</option>
                      <option value="balanced">平衡</option>
                      <option value="creative">創新</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* 檔案類型支援 */}
            <div className="card row-mb-3 mb-3">
              <div
                className="card-header bg-light"
                style={{ cursor: "pointer" }}
                onClick={() => setIsFileTypeCollapsed(!isFileTypeCollapsed)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">支援檔案類型</h5>
                  <i
                    className={`bi ${
                      isFileTypeCollapsed ? "bi-chevron-down" : "bi-chevron-up"
                    }`}
                  ></i>
                </div>
              </div>
              {!isFileTypeCollapsed && (
                <div className="p-3 mt-2">
                  {["pdf", "txt", "docx", "md", "csv", "xlsx"].map(
                    (fileType) => (
                      <div
                        key={fileType}
                        className="form-check form-check-inline"
                      >
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={parameters.supported_file_types.includes(
                            fileType
                          )}
                          onChange={(e) => {
                            const updatedTypes = e.target.checked
                              ? [...parameters.supported_file_types, fileType]
                              : parameters.supported_file_types.filter(
                                  (t) => t !== fileType
                                );
                            handleParameterChange(
                              "supported_file_types",
                              updatedTypes
                            );
                          }}
                        />
                        <label className="form-check-label">
                          {fileType.toUpperCase()}
                        </label>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* 憲法原則選擇 */}

            {systemPrompts && systemPrompts.constitutional_principles && (
              <div className="card row-mb-3 mb-3">
                <div
                  className="card-header bg-light"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setIsPrinciplesCollapsed(!isPrinciplesCollapsed)
                  }
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">啟用的安全原則</h5>
                    <i
                      className={`bi ${
                        isPrinciplesCollapsed
                          ? "bi-chevron-down"
                          : "bi-chevron-up"
                      }`}
                    ></i>
                  </div>
                </div>
                {!isPrinciplesCollapsed && (
                  <div className="p-3 mt-2">
                    {systemPrompts.constitutional_principles
                      .slice(0, 5)
                      .map((principle, index) => (
                        <div key={index} className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={parameters.enabled_principles.includes(
                              principle
                            )}
                            onChange={(e) => {
                              const updatedPrinciples = e.target.checked
                                ? [...parameters.enabled_principles, principle]
                                : parameters.enabled_principles.filter(
                                    (p) => p !== principle
                                  );
                              handleParameterChange(
                                "enabled_principles",
                                updatedPrinciples
                              );
                            }}
                          />
                          <label className="form-check-label">
                            {principle.substring(0, 50)}...
                          </label>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptVisualization;
