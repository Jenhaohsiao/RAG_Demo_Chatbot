/**
 * Workflow Main Component - 整合版
 * 整合新的 6 步驟工作流程到現有專案中
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import WorkflowStepper from "../WorkflowStepper/WorkflowStepper";
import ChatScreen from "../ChatScreen/ChatScreen";
import { ResponseType } from "../../types/chat";

export interface WorkflowMainProps {
  sessionId?: string;
  onParameterChange?: (parameter: string, value: any) => void;
  onShowMessage?: (message: {
    type: "error" | "warning" | "info" | "success";
    message: string;
  }) => void; // 從 main.tsx 傳入的現有參數
  similarityThreshold?: number;
  maxFileSizeMB?: number;
  supportedFileTypes?: string[];
  crawlerMaxTokens?: number;
  crawlerMaxPages?: number;
  ragContextWindow?: number;
  ragCitationStyle?: string;
  ragFallbackMode?: string;
}

const WorkflowMain: React.FC<WorkflowMainProps> = ({
  sessionId,
  onParameterChange,
  onShowMessage,
  similarityThreshold = 0.5,
  maxFileSizeMB = 10,
  supportedFileTypes = ["pdf", "txt"],
  crawlerMaxTokens = 100000,
  crawlerMaxPages = 10,
  ragContextWindow = 5,
  ragCitationStyle = "numbered",
  ragFallbackMode = "flexible",
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowComplete, setWorkflowComplete] = useState(false);

  // 整合所有參數到一個狀態中
  const [parameters, setParameters] = useState({
    // RAG 參數 (Step 1)
    similarity_threshold: similarityThreshold,
    rag_context_window: ragContextWindow,
    rag_citation_style: ragCitationStyle,
    rag_fallback_mode: ragFallbackMode,
    rag_top_k: 5,
    rag_chunk_size: 1000,
    rag_chunk_overlap: 200,
    rag_min_chunk_length: 100,

    // Prompt 參數 (Step 2)
    token_threshold: 4000,
    response_style: "standard" as const,
    professional_level: "professional" as const,
    creativity_level: "balanced" as const,

    // 系統參數 (Step 3)
    session_ttl_minutes: 30,
    max_file_size_mb: maxFileSizeMB,
    crawler_max_tokens: crawlerMaxTokens,
    crawler_max_pages: crawlerMaxPages,
    supported_file_types: supportedFileTypes,

    // 處理參數 (Step 5)
    chunk_size: 1000,
    chunk_overlap: 200,
  });

  // 同步外部參數變更
  useEffect(() => {
    setParameters((prev) => ({
      ...prev,
      similarity_threshold: similarityThreshold,
      max_file_size_mb: maxFileSizeMB,
      supported_file_types: supportedFileTypes,
      crawler_max_tokens: crawlerMaxTokens,
      crawler_max_pages: crawlerMaxPages,
      rag_context_window: ragContextWindow,
      rag_citation_style: ragCitationStyle,
      rag_fallback_mode: ragFallbackMode,
    }));
  }, [
    similarityThreshold,
    maxFileSizeMB,
    supportedFileTypes,
    crawlerMaxTokens,
    crawlerMaxPages,
    ragContextWindow,
    ragCitationStyle,
    ragFallbackMode,
  ]);

  const handleParameterChange = (parameter: string, value: any) => {
    setParameters((prev) => ({
      ...prev,
      [parameter]: value,
    }));

    // 同時調用外部的參數變更回調
    onParameterChange?.(parameter, value);
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);

    // 如果到達最後一步，標記工作流程完成
    if (step === 6) {
      setWorkflowComplete(true);
    }
  };

  // 如果工作流程完成且在最後一步，顯示聊天界面
  if (workflowComplete && currentStep === 6) {
    return (
      <div className="workflow-main">
        {/* 可選的頭部導航 */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">
            <i className="bi bi-chat-dots me-2"></i>
            {t("workflow.steps.aiChat.title", "AI 對談")}
          </h4>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              setWorkflowComplete(false);
              setCurrentStep(1);
            }}
          >
            <i className="bi bi-arrow-left me-1"></i>
            返回工作流程
          </button>
        </div>

        {/* 聊天界面 */}
        {sessionId ? (
          <ChatScreen
            sessionId={sessionId}
            onSendQuery={async (query: string) => {
              // 這裡需要實現實際的查詢邏輯
              // 暫時返回一個模擬回應
              return {
                message_id: `msg_${Date.now()}`,
                session_id: sessionId,
                llm_response:
                  "這是一個模擬的AI回應。在實際環境中，這裡會調用真正的聊天服務。",
                response_type: ResponseType.ANSWERED,
                retrieved_chunks: [],
                similarity_scores: [],
                token_input: 100,
                token_output: 50,
                token_total: 150,
                timestamp: new Date().toISOString(),
              };
            }}
          />
        ) : (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            無法載入聊天界面：缺少會話 ID
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="workflow-main w-100 py-4">
      {/* 全屏幕寫度 */}
      <div className="w-100 px-3">
        {/* 標題 */}
        <div className="text-center">
          <h5 className="mb-0">{t("workflow.title", "RAG 工作流程")}</h5>
        </div>

        {/* 工作流程步驟器 */}
        <WorkflowStepper
          currentStep={currentStep}
          onStepChange={handleStepChange}
          sessionId={sessionId}
          parameters={parameters}
          onParameterChange={handleParameterChange}
          onShowMessage={onShowMessage}
        />

        {/* 調試資訊 (開發時可用) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-5">
            <div className="card">
              <div className="card-header bg-dark text-white">
                <h6 className="card-title mb-0">
                  <i className="bi bi-bug me-2"></i>
                  調試資訊 (開發模式)
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-6">
                    <strong>當前步驟:</strong> {currentStep}
                  </div>
                  <div className="col-6">
                    <strong>會話 ID:</strong> {sessionId || "None"}
                  </div>
                  <div className="col-6">
                    <strong>工作流程狀態:</strong>{" "}
                    {workflowComplete ? "已完成" : "進行中"}
                  </div>
                </div>
                <details className="mt-2">
                  <summary>當前參數配置</summary>
                  <pre className="small mt-2 p-2 bg-light rounded">
                    {JSON.stringify(parameters, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowMain;
