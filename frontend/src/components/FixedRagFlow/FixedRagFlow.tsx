/**
 * Fixed RAG Process Flow Component
 * Fixed RAG process flowchart at the top of the page
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
      description: "Adjust parameters",
      tooltip:
        "Allows users to adjust parameters like Prompt templates, similarity thresholds, and chunking strategies to ensure precise retrieval matching user intent and high-quality responses.",
    },
    {
      id: "upload",
      title: "Document Upload",
      description: "Upload files or URLs",
      tooltip:
        "Supports PDF/TXT upload and URL crawling. Automatically detects format and extracts content. Enters security review after upload.",
    },
    {
      id: "processing",
      title: "Content Moderation",
      description: "Safety validation",
      tooltip:
        "Uses Gemini Safety API for comprehensive content safety checks, filtering hate speech, violence, and adult content to meet AI safety guidelines.",
    },
    {
      id: "chunking",
      title: "Text Chunking",
      description: "Split into segments",
      tooltip:
        "Intelligently splits approved text into vector-ready segments, preserving semantic integrity while optimizing retrieval performance.",
    },
    {
      id: "embedding",
      title: "Vector Embedding",
      description: "Generate embeddings",
      tooltip:
        "Uses Gemini Embedding API to convert text segments into high-dimensional vectors stored in Qdrant, building semantic search indices for RAG.",
    },
    {
      id: "ready",
      title: "AI Response",
      description: "Ready for chat",
      tooltip:
        "System is ready. When users ask questions, it executes vector search, retrieves relevant content, and uses Gemini AI to generate accurate answers.",
    },
  ];

  const getStepIndex = (stepId: string) =>
    steps.findIndex((step) => step.id === stepId);
  const currentStepIndex = getStepIndex(currentStep);

  // Mouse enter event - Show tooltip
  const handleMouseEnter = (
    event: React.MouseEvent,
    step: (typeof steps)[0]
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      content: step.tooltip,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10, // Show below
    });
  };

  // Mouse leave event - Hide tooltip
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
                        aria-label={`${step.title}: ${step.tooltip}`}
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
