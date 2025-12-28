/**
 * Prompt Visualization Component
 * 顯示系統使用的 AI Prompt 模板和當前 Session 的實際 Prompt
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./PromptVisualization.css";

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
  max_file_size_mb: number;
  crawler_max_tokens: number;
  crawler_max_pages: number;
  rag_context_window: number;
  rag_citation_style: "numbered" | "inline" | "none";
  rag_fallback_mode: "strict" | "flexible";
  rag_top_k: number;
  rag_chunk_size: number;
  rag_chunk_overlap: number;
  rag_min_chunk_length: number;
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
    session_ttl_minutes: 5,
    max_file_size_mb: 10,
    crawler_max_tokens: 100000,
    crawler_max_pages: 10,
    rag_context_window: 5,
    rag_citation_style: "numbered",
    rag_fallback_mode: "flexible",
    rag_top_k: 8,
    rag_chunk_size: 2000,
    rag_chunk_overlap: 500,
    rag_min_chunk_length: 100,
    response_style: "standard",
    professional_level: "professional",
    creativity_level: "balanced",
    enabled_principles: [],
    supported_file_types: ["pdf", "txt", "docx"],
  });

  // 折疊狀態管理
  const [isRagCollapsed, setIsRagCollapsed] = useState(false);
  const [isResponseCollapsed, setIsResponseCollapsed] = useState(true);
  const [isSystemCollapsed, setIsSystemCollapsed] = useState(true);
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
            {/* RAG 設定 */}
            <div className="card row-mb-3 mb-3">
              <div
                className="card-header bg-light prompt-viz-card-header-clickable"
                onClick={() => setIsRagCollapsed(!isRagCollapsed)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-search me-2"></i>
                    RAG 設定
                  </h5>
                  <i
                    className={`bi ${
                      isRagCollapsed ? "bi-chevron-down" : "bi-chevron-up"
                    }`}
                  ></i>
                </div>
              </div>
              {!isRagCollapsed && (
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
                    <div className="d-flex justify-content-between small text-muted">
                      <span>0.1 (寬鬆)</span>
                      <span>0.9 (精確)</span>
                    </div>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">
                      上下文節段數量<small> (每次查詢使用)</small>:{" "}
                      {parameters.rag_context_window}
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1"
                      max="10"
                      step="1"
                      value={parameters.rag_context_window}
                      onChange={(e) =>
                        handleParameterChange(
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

                  <div className="p-3 mt-2">
                    <label className="form-label">引用格式</label>
                    <select
                      className="form-select form-select-sm"
                      value={parameters.rag_citation_style}
                      onChange={(e) =>
                        handleParameterChange(
                          "rag_citation_style",
                          e.target.value
                        )
                      }
                    >
                      <option value="numbered">
                        編號引用 (文檔1, 文檔2...)
                      </option>
                      <option value="inline">內嵌引用 (根據文檔...)</option>
                      <option value="none">不顯示引用</option>
                    </select>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">回應模式</label>
                    <select
                      className="form-select form-select-sm"
                      value={parameters.rag_fallback_mode}
                      onChange={(e) =>
                        handleParameterChange(
                          "rag_fallback_mode",
                          e.target.value
                        )
                      }
                    >
                      <option value="strict">嚴格模式 (僅基於文檔回答)</option>
                      <option value="flexible">
                        彈性模式 (允許一般知識補充)
                      </option>
                    </select>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">
                      Top-K 檢索數量<small> (候選段落數)</small>:{" "}
                      {parameters.rag_top_k}
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="3"
                      max="20"
                      step="1"
                      value={parameters.rag_top_k}
                      onChange={(e) =>
                        handleParameterChange(
                          "rag_top_k",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>3個 (精確)</span>
                      <span>20個 (寬鬆)</span>
                    </div>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">
                      Chunk 大小<small> (文檔分割單位)</small>:{" "}
                      {parameters.rag_chunk_size} 字元
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1000"
                      max="4000"
                      step="200"
                      value={parameters.rag_chunk_size}
                      onChange={(e) =>
                        handleParameterChange(
                          "rag_chunk_size",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>1K (細粒度)</span>
                      <span>4K (完整性)</span>
                    </div>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">
                      Chunk 重疊大小<small> (保持上下文連續性)</small>:{" "}
                      {parameters.rag_chunk_overlap} 字元
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="100"
                      max="800"
                      step="50"
                      value={parameters.rag_chunk_overlap}
                      onChange={(e) =>
                        handleParameterChange(
                          "rag_chunk_overlap",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>100 (5%)</span>
                      <span>800 (20%)</span>
                    </div>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">
                      最小 Chunk 長度<small> (過濾過短段落)</small>:{" "}
                      {parameters.rag_min_chunk_length} 字元
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="30"
                      max="300"
                      step="10"
                      value={parameters.rag_min_chunk_length}
                      onChange={(e) =>
                        handleParameterChange(
                          "rag_min_chunk_length",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>30 (寬鬆)</span>
                      <span>300 (嚴格)</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Prompt 設定 */}
            <div className="card row-mb-3 mb-3">
              <div
                className="card-header bg-light"
                style={{ cursor: "pointer" }}
                onClick={() => setIsResponseCollapsed(!isResponseCollapsed)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-chat-left-text me-2"></i>
                    Prompt 設定
                  </h5>
                  <i
                    className={`bi ${
                      isResponseCollapsed ? "bi-chevron-down" : "bi-chevron-up"
                    }`}
                  ></i>
                </div>
              </div>
              {!isResponseCollapsed && (
                <>
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
                    <div className="d-flex justify-content-between small text-muted">
                      <span>1K</span>
                      <span>10K</span>
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

            {/* 其它設定 */}
            <div className="card row-mb-3 mb-3">
              <div
                className="card-header bg-light prompt-viz-card-header-clickable"
                onClick={() => setIsSystemCollapsed(!isSystemCollapsed)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-gear me-2"></i>
                    其它設定
                  </h5>
                  <i
                    className={`bi ${
                      isSystemCollapsed ? "bi-chevron-down" : "bi-chevron-up"
                    }`}
                  ></i>
                </div>
              </div>
              {!isSystemCollapsed && (
                <>
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

                  <div className="p-3 mt-2">
                    <label className="form-label">
                      檔案大小限制<small> (上傳檔案)</small>:{" "}
                      {parameters.max_file_size_mb} MB
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1"
                      max="10"
                      step="1"
                      value={parameters.max_file_size_mb}
                      onChange={(e) =>
                        handleParameterChange(
                          "max_file_size_mb",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>1MB</span>
                      <span>10MB</span>
                    </div>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">
                      網站爬蟲最大 Token<small> (爬取內容)</small>:{" "}
                      {parameters.crawler_max_tokens.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1000"
                      max="200000"
                      step="1000"
                      value={parameters.crawler_max_tokens}
                      onChange={(e) =>
                        handleParameterChange(
                          "crawler_max_tokens",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>1K</span>
                      <span>200K</span>
                    </div>
                  </div>

                  <div className="p-3 mt-2">
                    <label className="form-label">
                      網站爬蟲最大頁面數<small> (爬取範圍)</small>:{" "}
                      {parameters.crawler_max_pages}
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1"
                      max="30"
                      step="1"
                      value={parameters.crawler_max_pages}
                      onChange={(e) =>
                        handleParameterChange(
                          "crawler_max_pages",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>1</span>
                      <span>30</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 檔案類型支援 */}
            <div className="card row-mb-3 mb-3">
              <div
                className="card-header bg-light prompt-viz-card-header-clickable"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptVisualization;
