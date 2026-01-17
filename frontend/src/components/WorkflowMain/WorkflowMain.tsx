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
  }) => void;
  onResetWorkflow?: boolean;
  similarityThreshold?: number;
  maxFileSizeMB?: number;
  supportedFileTypes?: string[];
  crawlerMaxTokens?: number;
  crawlerMaxPages?: number;
  ragContextWindow?: number;
  ragCitationStyle?: string;
  ragFallbackMode?: string;
  onShowRagSummary?: () => void; // 新增
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
  onShowRagSummary,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowComplete, setWorkflowComplete] = useState(false);

  const [documents, setDocuments] = useState<any[]>([]);
  const [crawledUrls, setCrawledUrls] = useState<any[]>([]);

  const [parameters, setParameters] = useState({
    similarity_threshold: similarityThreshold,
    rag_context_window: ragContextWindow,
    rag_citation_style: ragCitationStyle,
    rag_fallback_mode: ragFallbackMode,
    rag_top_k: 5,
    rag_chunk_size: 1000,
    rag_chunk_overlap: 200,
    rag_min_chunk_length: 100,
    allow_inference: false,
    answer_language: "auto" as "zh-TW" | "zh-CN" | "en" | "fr" | "auto",
    strict_rag_mode: true,

    response_style: "brief" as "brief" | "kid_friendly",
    response_tone: "friendly" as "friendly" | "rigorous" | "urgent",
    persona: "workplace_veteran" as
      | "elementary_teacher"
      | "show_host"
      | "workplace_veteran",
    citation_style: "inline" as "inline" | "document" | "none",

    max_response_tokens: 2048,
    context_warning_threshold: 80,
    retrieval_top_k: 5,
    max_context_tokens: 4000,

    token_threshold: 4000,
    professional_level: "professional" as const,
    creativity_level: "balanced" as const,
    combined_style: "professional_standard",
    response_format: "auto" as const,

    session_ttl_minutes: 30,
    max_file_size_mb: maxFileSizeMB,
    crawler_max_tokens: crawlerMaxTokens,
    crawler_max_pages: crawlerMaxPages,
    supported_file_types: supportedFileTypes,

    chunk_size: 1000,
    chunk_overlap: 200,
    chunk_max_size: 2000,
    chunk_min_size: 500,
    chunk_overlap_size: 200,
  });
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

  useEffect(() => {
    if (sessionId) {
      setCurrentStep(1);
      setWorkflowComplete(false);
      setDocuments([]);
      setCrawledUrls([]);
    }
  }, [sessionId]);

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
    onParameterChange?.(parameter, value);
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <div className="workflow-main w-100">
      <div className="w-100 ">
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
          onShowRagSummary={onShowRagSummary}
        />
      </div>
    </div>
  );
};

export default WorkflowMain;
