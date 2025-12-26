import React, { useState } from "react";
import "./WorkflowStepper.css";
import RagConfigStep from "./RagConfigStep";
import PromptConfigStep from "./PromptConfigStep";
import DataUploadStep from "./DataUploadStep";
import ContentReviewStep from "./ContentReviewStep";
import TextProcessingStep from "./TextProcessingStep";
import AiChatStep from "./AiChatStep";

interface WorkflowStepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  parameters?: any;
  onParameterChange?: (key: string, value: any) => void;
  sessionId?: string;
  documents?: any[];
  crawledUrls?: any[];
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onStepChange,
  parameters,
  onParameterChange,
  sessionId,
  documents = [],
  crawledUrls = [],
}) => {
  const [stepCompletion, setStepCompletion] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  const steps = [
    {
      id: 1,
      key: "rag-config",
      title: "RAG 參數配置",
      icon: "bi-gear",
      description: "設定檢索增強生成參數",
      color: "primary",
    },
    {
      id: 2,
      key: "prompt-config",
      title: "Prompt 配置",
      icon: "bi-chat-dots",
      description: "優化AI模型對話風格",
      color: "info",
    },
    {
      id: 3,
      key: "data-upload",
      title: "資料上傳",
      icon: "bi-cloud-upload",
      description: "上傳文檔或爬取網站資料",
      color: "success",
    },
    {
      id: 4,
      key: "content-review",
      title: "內容審核",
      icon: "bi-shield-check",
      description: "安全性檢查和內容審查",
      color: "warning",
    },
    {
      id: 5,
      key: "text-processing",
      title: "文本切割 向量嵌入",
      icon: "bi-diagram-3",
      description: "分塊處理並生成向量",
      color: "secondary",
    },
    {
      id: 6,
      key: "ai-chat",
      title: "AI 對談",
      icon: "bi-robot",
      description: "開始智能問答對話",
      color: "dark",
    },
  ];

  const isStepCompleted = (stepId: number) =>
    stepCompletion[stepId as keyof typeof stepCompletion] ||
    stepId < currentStep;
  const isStepActive = (stepId: number) => stepId === currentStep;
  const isStepDisabled = (stepId: number) => stepId > currentStep + 1; // 只允許下一步

  const handleStepClick = (stepId: number) => {
    // 禁用流程图按钮点击，只能通过上一步/下一步按钮移动
    // if (!isStepDisabled(stepId)) {
    //   onStepChange(stepId);
    // }
  };

  // 辅助函数：获取回应风格文本
  const getResponseStyleText = (style: string | undefined) => {
    switch (style) {
      case "concise": return "簡潔";
      case "standard": return "標準";
      case "detailed": return "詳細";
      default: return "標準";
    }
  };

  // 辅助函数：获取专业程度文本
  const getProfessionalLevelText = (level: string | undefined) => {
    switch (level) {
      case "casual": return "通俗";
      case "professional": return "專業";
      case "academic": return "學術";
      default: return "專業";
    }
  };

  // 辅助函数：获取创意程度文本
  const getCreativityLevelText = (level: string | undefined) => {
    switch (level) {
      case "conservative": return "保守";
      case "balanced": return "平衡";
      case "creative": return "創新";
      default: return "平衡";
    }
  };

  const handleStepComplete = (stepId: number) => {
    setStepCompletion((prev) => ({
      ...prev,
      [stepId]: true,
    }));

    // 自動跳轉到下一步
    if (stepId < steps.length) {
      onStepChange(stepId + 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <RagConfigStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            onComplete={() => handleStepComplete(1)}
          />
        );
      case 2:
        return (
          <PromptConfigStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            onComplete={() => handleStepComplete(2)}
          />
        );
      case 3:
        return (
          <DataUploadStep
            sessionId={sessionId}
            onDocumentUpload={(file) => {
              console.log("Document uploaded:", file);
            }}
            onUrlUpload={(url) => {
              console.log("URL uploaded:", url);
            }}
            onCrawlerUpload={(url, maxTokens, maxPages) => {
              console.log("Crawler upload:", { url, maxTokens, maxPages });
            }}
          />
        );
      case 4:
        return (
          <ContentReviewStep
            sessionId={sessionId}
            onReviewComplete={() => handleStepComplete(4)}
          />
        );
      case 5:
        return (
          <TextProcessingStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            sessionId={sessionId}
            onProcessingComplete={() => handleStepComplete(5)}
          />
        );
      case 6:
        return <AiChatStep sessionId={sessionId} parameters={parameters} />;
      default:
        return <div>Invalid step</div>;
    }
  };

  return (
    <div className="workflow-stepper w-100">
      {/* 步驟指示器 - 水平排列 */}
      <div className="stepper-header mb-4">
        <div className="d-flex justify-content-between align-items-center px-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-fill mx-2">
              <div
                className={`stepper-item ${
                  isStepActive(step.id) ? "active" : ""
                } ${isStepCompleted(step.id) ? "completed" : ""} ${
                  isStepDisabled(step.id) ? "disabled" : ""
                }`}
                onClick={() => handleStepClick(step.id)}
                style={{
                  cursor: isStepDisabled(step.id) ? "not-allowed" : "pointer",
                }}
              >
                {/* 步驟圓圈和圖示 */}
                <div
                  className={`stepper-circle bg-${step.color} ${
                    isStepActive(step.id)
                      ? "text-white"
                      : isStepCompleted(step.id)
                      ? "text-white"
                      : "text-muted"
                  }`}
                >
                  {isStepCompleted(step.id) ? (
                    <i className="bi bi-check-lg"></i>
                  ) : (
                    <i className={step.icon}></i>
                  )}
                </div>

                {/* 步驟文本 */}
                <div className="stepper-text mt-2">
                  <div className="stepper-title">{step.title}</div>
                  <div className="stepper-description text-muted small">
                    {step.description}
                  </div>
                </div>

                {/* 連接線 (除了最後一個步驟) */}
                {index < steps.length - 1 && (
                  <div className="stepper-connector">
                    <div
                      className={`connector-line ${
                        isStepCompleted(step.id) ? "completed" : ""
                      }`}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 進度條 */}
      <div className="progress mb-4" style={{ height: "8px" }}>
        <div
          className="progress-bar bg-primary"
          role="progressbar"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={steps.length}
        ></div>
      </div>

      {/* 當前步驟資訊與導航按鈕同一行 */}
      <div className="w-100">
        <div className="current-step-info">
          <div className="d-flex align-items-center justify-content-between">
            {/* 左側步驟信息 - 60% */}
            <div className="d-flex align-items-center" style={{ width: "60%" }}>
              <div className="badge bg-primary me-3">步驟 {currentStep}</div>
              <div className="flex-grow-1">
                <h4 className="mb-0">{steps[currentStep - 1].title}</h4>
                <small className="text-muted">
                  {steps[currentStep - 1].description}
                </small>
              </div>
            </div>

            {/* 中间重点数据显示 */}
            <div className="text-center mx-3" style={{ minWidth: "250px" }}>
              {currentStep === 1 && (
                <div className="key-params-summary">
                  <div className="mb-1">
                    <span className="badge bg-primary text-white me-2">相似度: {parameters?.similarity_threshold || 0.5}</span>
                    <span className="badge bg-success text-white me-2">Top-K: {parameters?.rag_top_k || 5}</span>
                  </div>
                  <div>
                    <span className="badge bg-info text-white me-2">块大小: {parameters?.chunk_max_size || 1000}</span>
                    <span className="badge bg-warning text-white">上下文: {parameters?.rag_context_window || 5}</span>
                  </div>
                </div>
              )}
              {currentStep === 2 && (
                <div className="key-params-summary">
                  <div className="mb-1">
                    <span className="badge bg-primary text-white me-2">Token: {parameters?.token_threshold || 4000}</span>
                    <span className="badge bg-success text-white me-2">風格: {getResponseStyleText(parameters?.response_style)}</span>
                  </div>
                  <div>
                    <span className="badge bg-info text-white me-2">專業: {getProfessionalLevelText(parameters?.professional_level)}</span>
                    <span className="badge bg-warning text-white">創意: {getCreativityLevelText(parameters?.creativity_level)}</span>
                  </div>
                </div>
              )}
              {currentStep === 3 && (
                <div className="key-params-summary">
                  <div className="mb-1">
                    <span className="badge bg-primary text-white me-2">文檔: {documents?.length || 0}</span>
                    <span className="badge bg-success text-white me-2">網頁: {crawledUrls?.length || 0}</span>
                  </div>
                  <div>
                    <span className="badge bg-info text-white">總計: {(documents?.length || 0) + (crawledUrls?.length || 0)}</span>
                  </div>
                </div>
              )}
              {currentStep === 4 && (
                <div className="key-params-summary">
                  <div className="mb-1">
                    <span className="badge bg-primary text-white me-2">已審核: {documents?.filter(doc => doc.reviewed)?.length || 0}</span>
                    <span className="badge bg-success text-white me-2">總數: {documents?.length || 0}</span>
                  </div>
                  <div>
                    <span className="badge bg-info text-white">狀態: {((documents?.filter(doc => doc.reviewed)?.length || 0) === (documents?.length || 0)) && documents?.length ? '完成' : '進行中'}</span>
                  </div>
                </div>
              )}
              {currentStep === 5 && (
                <div className="key-params-summary">
                  <div className="mb-1">
                    <span className="badge bg-primary text-white me-2">向量化: 啟用</span>
                    <span className="badge bg-success text-white me-2">嵌入: 準備中</span>
                  </div>
                  <div>
                    <span className="badge bg-info text-white">狀態: 等待處理</span>
                  </div>
                </div>
              )}
              {currentStep === 6 && (
                <div className="key-params-summary">
                  <div className="mb-1">
                    <span className="badge bg-primary text-white me-2">模式: RAG增強</span>
                    <span className="badge bg-success text-white me-2">引擎: 活躍</span>
                  </div>
                  <div>
                    <span className="badge bg-info text-white">狀態: 準備對話</span>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧导航按钮 - 40% */}
            <div
              className="d-flex align-items-center justify-content-end"
              style={{ width: "40%" }}
            >
              {currentStep > 1 && (
                <button
                  className="btn btn-outline-secondary me-2"
                  onClick={() => onStepChange(currentStep - 1)}
                  disabled={currentStep === 1}
                >
                  <i className="bi bi-chevron-left me-1"></i>
                  上一步
                </button>
              )}

              <div className="step-counter mx-3">
                <small className="text-muted">
                  {currentStep} / {steps.length}
                </small>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => onStepChange(currentStep + 1)}
                disabled={currentStep === steps.length}
              >
                下一步
                <i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 步驟內容區域 - 全寬度 */}
      <div className="w-100">
        <div className="step-content mb-4">
          <div className="container-fluid">
            <div className="row">
              <div className="col-12">{renderStepContent()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStepper;