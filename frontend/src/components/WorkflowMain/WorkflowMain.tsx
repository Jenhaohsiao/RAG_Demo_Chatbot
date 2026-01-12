/**
 * Workflow Main Component - ?��???
 * ?��??��? 6 步�?工�?流�??�現?��?案中
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
  }) => void; // �?main.tsx ?�入?�現?��???
  onResetWorkflow?: boolean; // ?��?：�?置工作�?程�?信�?
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
  onResetWorkflow = false,
  similarityThreshold = 0.3,
  maxFileSizeMB = 3,
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

  // 添�?documents?�crawledUrls?�??
  const [documents, setDocuments] = useState<any[]>([]);
  const [crawledUrls, setCrawledUrls] = useState<any[]>([]);

  // ?��??�?��??�到一?��??�中
  const [parameters, setParameters] = useState({
    // RAG ?�數 (Step 1)
    similarity_threshold: similarityThreshold,
    rag_context_window: ragContextWindow,
    rag_citation_style: ragCitationStyle,
    rag_fallback_mode: ragFallbackMode,
    rag_top_k: 5,
    rag_chunk_size: 1000,
    rag_chunk_overlap: 200,
    rag_min_chunk_length: 100,

    // Step 2: AI 行為?��?答�??�設�?
    // A. 系統規�? (System Rules) - Session ?��?
    allow_inference: false,
    answer_language: "auto" as "zh-TW" | "en" | "auto",
    strict_rag_mode: true,

    // B. ?��??��? (Response Policy) - 對話中可調整
    response_style: "standard" as
      | "concise"
      | "standard"
      | "detailed"
      | "step_by_step",
    response_tone: "formal" as "formal" | "friendly" | "casual" | "academic",
    persona: "expert" as "professor" | "expert" | "educator" | "neighbor",
    citation_style: "inline" as "inline" | "document" | "none",

    // C. ?��??�制 (Runtime Constraints) - ?��??��?
    max_response_tokens: 2048,
    context_warning_threshold: 80,
    retrieval_top_k: 5,
    max_context_tokens: 4000,

    // ?��??��??��?供�?後相容�?
    token_threshold: 4000,
    professional_level: "professional" as const,
    creativity_level: "balanced" as const,
    combined_style: "professional_standard",
    response_format: "auto" as const,

    // 系統?�數 (Step 3)
    session_ttl_minutes: 30,
    max_file_size_mb: maxFileSizeMB,
    crawler_max_tokens: crawlerMaxTokens,
    crawler_max_pages: crawlerMaxPages,
    supported_file_types: supportedFileTypes,

    // ?��??�數 (Step 5)
    chunk_size: 1000,
    chunk_overlap: 200,
  });

  // ?�步外部?�數變更
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

  // ??�� sessionId 變�?，�??��?始�??�置工�?流�??�??
  useEffect(() => {
    if (sessionId) {
      // Session ID 變�??��?置工作�?程到第�?�?
      setCurrentStep(1);
      setWorkflowComplete(false);
      setDocuments([]);
      setCrawledUrls([]);
    }
  }, [sessionId]);

  // ??��?�置工�?流�?信�?
  useEffect(() => {
    if (onResetWorkflow) {
      setCurrentStep(1);
      setWorkflowComplete(false);
      setDocuments([]);
      setCrawledUrls([]);
    }
  }, [onResetWorkflow]);

  const handleParameterChange = (parameter: string, value: any) => {
    setParameters((prev) => ({
      ...prev,
      [parameter]: value,
    }));

    // ?��?調用外部?��??��??��?�?
    onParameterChange?.(parameter, value);
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);

    // 不�??�步�??��?標�??��??��?讓用?�在WorkflowStepper中�?驗第6�?
    // 移除?��?跳�??��??�ChatScreen?��?�?
    // if (step === 6) {
    //   setWorkflowComplete(true);
    // }
  };

  // ?��??�用?��?跳�??��??�ChatScreen?��?輯�?讓第6步在WorkflowStepper中顯�?
  // 如�?工�?流�?完�?且在?�後�?步�?顯示?�天?�面
  if (false && workflowComplete && currentStep === 6) {
    return (
      <div className="workflow-main">
        {/* ?�天?�面 - 移除返�?工�?流�??��? */}
        <div className="mb-3">
          <h4 className="mb-0">
            <i className="bi bi-chat-dots me-2"></i>
            {t("workflow.steps.aiChat.title", "AI 對�?")}
          </h4>
        </div>

        {/* ?�天?�面 */}
        {sessionId ? (
          <ChatScreen
            sessionId={sessionId}
            onSendQuery={async (query: string) => {
              // ?�裡?�要實?�實?��??�詢?�輯
              // ?��?返�?一?�模?��???
              return {
                message_id: `msg_${Date.now()}`,
                session_id: sessionId,
                llm_response:
                  "這是一個模擬 AI 回應，實際實作時會在此呼叫後端對話 API",
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
            ?��?載入?�天?�面：缺少�?�?ID
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="workflow-main w-100">
      {/* ?��?幕寫�?*/}
      <div className="w-100 ">
        {/* 工�?流�?步�???*/}
        <WorkflowStepper
          currentStep={currentStep}
          onStepChange={handleStepChange}
          sessionId={sessionId}
          parameters={parameters}
          onParameterChange={handleParameterChange}
          onShowMessage={onShowMessage}
          documents={documents}
          crawledUrls={crawledUrls}
          onDocumentsUpdate={setDocuments}
          onCrawledUrlsUpdate={setCrawledUrls}
        />
      </div>
    </div>
  );
};

export default WorkflowMain;
