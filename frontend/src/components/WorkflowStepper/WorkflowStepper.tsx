import React, { useState } from "react";
import "./WorkflowStepper.css";
import "../../styles/fixed-rag-flow.css";
import RagConfigStep from "../RagConfigStep/RagConfigStep";
import PromptConfigStep from "../PromptConfigStep/PromptConfigStep";
import DataUploadStep from "../DataUploadStep/DataUploadStep";
import ContentReviewStep from "../ContentReviewStep/ContentReviewStep";
import TextProcessingStep from "../TextProcessingStep/TextProcessingStep";
import AiChatStep from "../AiChatStep/AiChatStep";
// import TestStep6 from "../TestStep6/TestStep6"; // 測試組件已替換為正式組件
import FixedRagFlow from "../FixedRagFlow/FixedRagFlow";
import {
  uploadFile,
  uploadUrl,
  uploadWebsite,
} from "../../services/uploadService";

interface WorkflowStepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  parameters?: any;
  onParameterChange?: (key: string, value: any) => void;
  sessionId?: string;
  documents?: any[];
  crawledUrls?: any[];
  onDocumentsUpdate?: (documents: any[]) => void;
  onCrawledUrlsUpdate?: (urls: any[]) => void;
  onShowMessage?: (message: {
    type: "error" | "warning" | "info" | "success";
    message: string;
  }) => void;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onStepChange,
  parameters,
  onParameterChange,
  sessionId,
  documents = [],
  crawledUrls = [],
  onDocumentsUpdate,
  onCrawledUrlsUpdate,
  onShowMessage,
}) => {
  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ title: "", message: "" });

  const [stepCompletion, setStepCompletion] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  // 添加審核狀態管理
  const [reviewPassed, setReviewPassed] = useState(false);

  // 添加文本處理狀態管理
  const [textProcessingCompleted, setTextProcessingCompleted] = useState(false);

  const steps = [
    {
      id: 1,
      key: "rag-config",
      title: "RAG 參數配置",
      icon: "bi-gear",
      description: "設定檢索增強生成參數",
      color: "primary",
      detailMessage:
        "配置相似度閾值、檢索段落數、Chunk分割大小等核心參數。這些設定直接影響AI回答的準確度和相關性，建議根據您的文檔類型和期望的回答精度來調整這些參數。",
    },
    {
      id: 2,
      key: "prompt-config",
      title: "Prompt 配置",
      icon: "bi-chat-dots",
      description: "優化AI模型對話風格",
      color: "info",
      detailMessage:
        "設定AI助手的角色定位、回答風格和行為準則。您可以定義AI的專業領域、語氣風格、回答長度等，讓AI更符合您的使用需求和品牌形象。",
    },
    {
      id: 3,
      key: "data-upload",
      title: "資料上傳",
      icon: "bi-cloud-upload",
      description: "上傳文檔或爬取網站資料",
      color: "orange",
      detailMessage:
        "支援多種格式文檔上傳（PDF、Word、TXT等）或網站內容爬取。系統會自動提取文本內容，這些資料將作為AI回答問題的知識庫基礎。",
    },
    {
      id: 4,
      key: "content-review",
      title: "內容審核",
      icon: "bi-shield-check",
      description: "安全性檢查和內容審查",
      color: "warning",
      detailMessage:
        "自動檢測上傳內容是否包含敏感資訊、不當內容或隱私資料。確保您的知識庫符合安全標準，保護用戶隱私和企業資訊安全。",
    },
    {
      id: 5,
      key: "text-processing",
      title: "文本切割 向量嵌入",
      icon: "bi-diagram-3",
      description: "分塊處理並生成向量",
      color: "purple",
      detailMessage:
        "將文檔內容切分成適當大小的段落，並轉換為高維向量表示。這個過程讓AI能夠理解和檢索相關內容，是實現精準問答的關鍵技術步驟。",
    },
    {
      id: 6,
      key: "ai-chat",
      title: "AI 對談",
      icon: "bi-robot",
      description: "開始智能問答對話",
      color: "indigo",
      detailMessage:
        "基於您上傳的知識庫開始問答對話。AI會根據問題檢索相關內容並給出準確回答，同時提供資料來源引用，確保答案的可信度和可追溯性。",
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

  const handleInfoClick = (step: any, event: React.MouseEvent) => {
    setToastContent({
      title: step.title,
      message: step.detailMessage,
    });
    setShowToast(true);
  };

  // 辅助函数：获取回应风格文本
  const getResponseStyleText = (style: string | undefined) => {
    switch (style) {
      case "concise":
        return "簡潔";
      case "standard":
        return "標準";
      case "detailed":
        return "詳細";
      default:
        return "標準";
    }
  };

  // 辅助函数：获取专业程度文本
  const getProfessionalLevelText = (level: string | undefined) => {
    switch (level) {
      case "casual":
        return "通俗";
      case "professional":
        return "專業";
      case "academic":
        return "學術";
      default:
        return "專業";
    }
  };

  // 辅助函数：获取创意程度文本
  const getCreativityLevelText = (level: string | undefined) => {
    switch (level) {
      case "conservative":
        return "保守";
      case "balanced":
        return "平衡";
      case "creative":
        return "創新";
      default:
        return "平衡";
    }
  };

  // 检查步骤是否可以继续
  const canProceedToNextStep = () => {
    if (currentStep === 3) {
      // 步骤3：资料上传 - 需要有文档或爬虫内容才能继续
      const hasDocuments = documents && documents.length > 0;
      const hasCrawledUrls = crawledUrls && crawledUrls.length > 0;
      return hasDocuments || hasCrawledUrls;
    }
    if (currentStep === 4) {
      // 步骤4：内容审核 - 需要所有审核项目都通过
      return reviewPassed;
    }
    if (currentStep === 5) {
      // 步骤5：文本处理 - 需要文本切割和向量化完成
      return textProcessingCompleted;
    }
    // 其他步骤暂时允许继续
    return true;
  };

  // 处理下一步点击
  const handleNextStepClick = () => {
    if (currentStep === 3 && !canProceedToNextStep()) {
      // 显示Toast提醒
      onShowMessage?.({
        type: "warning",
        message: "請先上傳檔案或設定網站爬蟲，然後才能進入下一步。",
      });
      return;
    }
    if (currentStep === 5 && !canProceedToNextStep()) {
      // 顯示Toast提醒
      onShowMessage?.({
        type: "warning",
        message: "請先完成文本切割和向量化處理，然後才能進入下一步。",
      });
      return;
    }
    // 如果從步驟3進入步驟4，直接進入下一步
    if (currentStep === 3) {
      onStepChange(currentStep + 1);
      return;
    }
    // 继续到下一步
    onStepChange(currentStep + 1);
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
    console.log("Current step rendering:", currentStep); // 添加调试日志
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
            parameters={parameters}
            onParameterChange={onParameterChange!}
            sessionId={sessionId}
            onFileUpload={async (file) => {
              try {
                console.log("Starting file upload:", file.name);
                onShowMessage?.({
                  type: "info",
                  message: `正在上傳檔案: ${file.name}...`,
                });

                const response = await uploadFile(sessionId!, file);
                console.log("File upload successful:", response);

                // 更新documents狀態
                const newDoc = {
                  filename: file.name,
                  size: file.size,
                  uploadTime: new Date().toISOString(),
                  type: "file",
                  chunks: response.chunk_count || 0,
                  preview: response.preview || "文件內容預覽...",
                };
                onDocumentsUpdate?.([...documents, newDoc]);

                onShowMessage?.({
                  type: "success",
                  message: `檔案 ${file.name} 上傳成功！`,
                });

                // 檔案上傳完成，用戶需手動進入下一步
              } catch (error) {
                console.error("File upload failed:", error);
                onShowMessage?.({
                  type: "error",
                  message: `檔案上傳失敗: ${
                    error instanceof Error ? error.message : "未知錯誤"
                  }`,
                });
              }
            }}
            onUrlUpload={async (url) => {
              try {
                console.log("Starting URL upload:", url);
                onShowMessage?.({
                  type: "info",
                  message: `正在處理URL: ${url}...`,
                });

                const response = await uploadUrl(sessionId!, url);
                console.log("URL upload successful:", response);

                // 更新documents狀態
                const newDoc = {
                  filename: url,
                  size: response.content_size || 0,
                  uploadTime: new Date().toISOString(),
                  type: "url",
                  chunks: response.chunk_count || 0,
                  preview: response.preview || "URL內容預覽...",
                };
                onDocumentsUpdate?.([...documents, newDoc]);

                onShowMessage?.({
                  type: "success",
                  message: `URL ${url} 處理成功！`,
                });

                // URL處理完成，用戶需手動進入下一步
              } catch (error) {
                console.error("URL upload failed:", error);
                onShowMessage?.({
                  type: "error",
                  message: `URL處理失敗: ${
                    error instanceof Error ? error.message : "未知錯誤"
                  }`,
                });
              }
            }}
            onCrawlerUpload={async (url, maxTokens, maxPages) => {
              try {
                console.log("Starting crawler upload:", {
                  url,
                  maxTokens,
                  maxPages,
                });
                onShowMessage?.({
                  type: "info",
                  message: `正在爬取網站: ${url}...`,
                });

                const response = await uploadWebsite(
                  sessionId!,
                  url,
                  maxTokens,
                  maxPages
                );
                console.log("Website crawl successful:", response);

                // 更新crawledUrls狀態
                const newUrl = {
                  url: url,
                  content_size: response.content_size || 0,
                  crawl_time: new Date().toISOString(),
                  chunks: response.chunk_count || 0,
                  summary: response.summary || "網站內容摘要...",
                  pages_found: response.pages_found || 1,
                };
                onCrawledUrlsUpdate?.([...crawledUrls, newUrl]);

                onShowMessage?.({
                  type: "success",
                  message: `網站 ${url} 爬取成功，共處理 ${response.pages_found} 個頁面！`,
                });

                // 網站爬取完成，用戶需手動進入下一步
              } catch (error) {
                console.error("Website crawl failed:", error);
                onShowMessage?.({
                  type: "error",
                  message: `網站爬取失敗: ${
                    error instanceof Error ? error.message : "未知錯誤"
                  }`,
                });
              }
            }}
          />
        );
      case 4:
        return (
          <ContentReviewStep
            sessionId={sessionId}
            onReviewComplete={() => handleStepComplete(4)}
            onReviewStatusChange={setReviewPassed}
            documents={documents}
            crawledUrls={crawledUrls}
          />
        );
      case 5:
        return (
          <TextProcessingStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            sessionId={sessionId}
            documents={documents}
            crawledUrls={crawledUrls}
            onProcessingComplete={() => {
              // 更新狀態並標記步驟完成
              console.log(
                "TextProcessing completed, marking step 5 as complete"
              );
              setTextProcessingCompleted(true);
              setStepCompletion((prev) => ({ ...prev, 5: true }));
            }}
            onProcessingStatusChange={setTextProcessingCompleted}
          />
        );
      case 6:
        console.log(
          "Rendering case 6 - AI Chat with flow diagram (PRODUCTION MODE)"
        );
        return (
          <div className="ai-chat-step-container">
            {/* AI 聊天界面 - 剩餘空間 - 使用正式組件 */}
            <div className="ai-chat-content">
              <AiChatStep sessionId={sessionId} parameters={parameters} />
            </div>
          </div>
        );
      default:
        console.log("Invalid step:", currentStep);
        return <div>Invalid step: {currentStep}</div>;
    }
  };

  return (
    <div className="workflow-stepper w-100">
      {/* 步驟指示器 - 水平排列 */}
      <div className="stepper-header">
        <div className="d-flex justify-content-between align-items-center px-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-fill mx-2">
              <div
                className={`stepper-item ${
                  isStepActive(step.id) ? "active" : ""
                } ${isStepCompleted(step.id) ? "completed" : ""} ${
                  isStepDisabled(step.id) ? "disabled" : ""
                } workflow-stepper-step-circle`}
                onClick={() => handleInfoClick(step, {} as React.MouseEvent)}
              >
                {/* 步驟圓圈和圖示 */}
                <div
                  className={`stepper-circle ${
                    isStepCompleted(step.id)
                      ? "step-completed"
                      : isStepActive(step.id)
                      ? "step-active"
                      : "step-inactive"
                  } text-white`}
                >
                  <span className="fw-bold">{step.id}</span>
                </div>

                {/* 步驟文本 */}
                <div className="stepper-text mt-2">
                  <div className="stepper-title d-flex align-items-center justify-content-center">
                    {isStepCompleted(step.id) && (
                      <i className="bi bi-check-circle-fill text-success me-1 workflow-stepper-check-icon"></i>
                    )}
                    <span>{step.title}</span>
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

      {/* 當前步驟資訊與導航按鈕同一行 */}
      <div className="w-100">
        <div className="current-step-info mb-2">
          <div className="d-flex align-items-center justify-content-between">
            {/* 左側步驟信息 - 60% */}
            <div className="d-flex align-items-center workflow-stepper-progress-container">
              <div className="badge bg-primary me-3">步驟 {currentStep}</div>
              <div className="flex-grow-1">
                <h4 className="mb-0">{steps[currentStep - 1].title}</h4>
                <small className="text-muted">
                  {steps[currentStep - 1].description}
                </small>
              </div>
            </div>

            {/* 中间重点数据显示 */}
            <div className="text-center mx-3 workflow-stepper-progress-center"></div>

            {/* 右侧导航按钮 - 40% */}
            <div className="d-flex align-items-center justify-content-end workflow-stepper-navigation">
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
                onClick={handleNextStepClick}
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
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">{renderStepContent()}</div>
          </div>
        </div>
      </div>

      {/* Bootstrap Toast */}
      <div className="toast-container position-fixed top-0 end-0 p-3">
        <div
          className={`toast ${showToast ? "show" : ""}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="toast-header">
            <i className="bi bi-info-circle text-primary me-2"></i>
            <strong className="me-auto">{toastContent.title}</strong>
          </div>
          <div className="toast-body">
            <div className="mb-3">{toastContent.message}</div>
            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowToast(false)}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStepper;
