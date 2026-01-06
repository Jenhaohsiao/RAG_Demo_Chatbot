/**
 * Fixed RAG Process Flow Component
 * 固定在頁面上方的RAG系統流程圖
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./FixedRagFlow.scss";

interface FixedRagFlowProps {
  currentStep?:
    | "prepare"
    | "upload"
    | "processing"
    | "chunking"
    | "embedding"
    | "ready";
}

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

const FixedRagFlow: React.FC<FixedRagFlowProps> = ({
  currentStep = "prepare",
}) => {
  const { t } = useTranslation();

  // Tooltip state
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  const steps = [
    {
      id: "prepare",
      title: "Prepare Data",
      titleZh: "準備資料",
      description: "Adjust parameters",
      descriptionZh: "調整參數",
      tooltip:
        "此階段讓使用者調整Prompt模板、相似度闾值、分塊策略等分析參數，確保後續RAG檢索能夠精準匹配使用者意圖並生成高品質回應",
    },
    {
      id: "upload",
      title: "Document Upload",
      titleZh: "文檔上傳",
      description: "Upload files or URLs",
      descriptionZh: "上傳檔案或網址",
      tooltip:
        "支援PDF、TXT文件上傳以及網站URL爬取，系統會自動檢測文件格式並進行內容提取，上傳完成後進入安全性審核流程",
    },
    {
      id: "processing",
      title: "Content Moderation",
      titleZh: "內容審核",
      description: "Safety validation",
      descriptionZh: "安全性檢驗",
      tooltip:
        "使用Gemini Safety API對上傳內容進行全面安全性檢測，包含仇恨言論、暴力內容、成人內容等有害資訊過濾，確保符合AI安全準則",
    },
    {
      id: "chunking",
      title: "Text Chunking",
      titleZh: "文本切割",
      description: "Split into segments",
      descriptionZh: "分割成片段",
      tooltip:
        "將通過審核的文本內容智能分割為適合向量化的片段，保持語意完整性的同時優化檢索效能，為後續的嵌入和儲存做準備",
    },
    {
      id: "embedding",
      title: "Vector Embedding",
      titleZh: "向量嵌入",
      description: "Generate embeddings",
      descriptionZh: "生成向量表示",
      tooltip:
        "使用Gemini Embedding API將文本片段轉換為高維度向量表示，儲存至Qdrant向量資料庫中，建立語意搜尋索引以支持後RAG檢索",
    },
    {
      id: "ready",
      title: "AI Response",
      titleZh: "AI回應",
      description: "Ready for chat",
      descriptionZh: "準備對話",
      tooltip:
        "系統已完成所有準備工作，現在可以開始對話。當使用者提問時，系統會執行向量搜尋、檢索相關內容並結合Gemini AI生成準確的答案",
    },
  ];

  const getStepIndex = (stepId: string) =>
    steps.findIndex((step) => step.id === stepId);
  const currentStepIndex = getStepIndex(currentStep);

  // 滑鼠移入事件 - 顯示tooltip
  const handleMouseEnter = (
    event: React.MouseEvent,
    step: (typeof steps)[0]
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      content: step.tooltip,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10, // 改為下方顯示
    });
  };

  // 滑鼠移出事件 - 隱藏tooltip
  const handleMouseLeave = () => {
    setTooltip({
      visible: false,
      content: "",
      x: 0,
      y: 0,
    });
  };

  return (
    <>
      {tooltip.visible && (
        <div
          className="custom-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          {tooltip.content}
          <div className="tooltip-arrow" />
        </div>
      )}

      <div className="fixed-rag-flow border-bottom p-3 ">
        <div className="row">
          <div className="col-12">
            <div className="row justify-content-center g-2">
              {steps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.id} className="col-auto">
                    <div className="d-flex align-items-center">
                      <button
                        className={`flow-step-item d-flex align-items-center justify-content-center p-3 rounded text-center border-0 ${
                          isCurrent
                            ? "bg-primary text-white"
                            : isActive
                            ? "text-white step-completed"
                            : "bg-white border text-muted"
                        }`}
                        aria-label={`${step.titleZh}: ${step.tooltip}`}
                        onMouseEnter={(e) => handleMouseEnter(e, step)}
                        onMouseLeave={handleMouseLeave}
                        tabIndex={0}
                        onFocus={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            visible: true,
                            content: step.tooltip,
                            x: rect.left + rect.width / 2,
                            y: rect.bottom + 10,
                          });
                        }}
                        onBlur={handleMouseLeave}
                      >
                        <div className="step-content d-flex align-items-center">
                          {isActive && !isCurrent && (
                            <i className="bi bi-check-circle-fill text-success me-2 step-check-icon"></i>
                          )}
                        </div>
                      </button>

                      {index < steps.length - 1 && (
                        <div className="flow-arrow mx-2">
                          <i
                            className={`bi bi-arrow-right ${
                              index < currentStepIndex
                                ? "text-success"
                                : "text-muted"
                            }`}
                          ></i>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FixedRagFlow;
