/**
 * RAG Process Flow Component
 * Shows detailed workflow of the RAG system
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface FlowStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  details: string[];
  color: string;
}

const RagProcessFlow: React.FC = () => {
  const { t } = useTranslation();
  const [selectedStep, setSelectedStep] = useState<string>("upload");

  const steps: FlowStep[] = [
    {
      id: "upload",
      icon: "bi-cloud-upload",
      title: "Document Upload",
      description: "Upload documents or provide URLs for content extraction",
      details: [
        "Support PDF, TXT files up to 10MB",
        "Website crawling with 100K token limit",
        "Content validation and format detection",
        "Automatic file type recognition",
      ],
      color: "#0d6efd",
    },
    {
      id: "moderation",
      icon: "bi-shield-check",
      title: "Content Moderation",
      description: "Gemini Safety API validates content for harmful material",
      details: [
        "Real-time safety analysis",
        "Hate speech detection",
        "Violence and harmful content filtering",
        "Constitutional AI compliance",
      ],
      color: "#dc3545",
    },
    {
      id: "extraction",
      icon: "bi-file-earmark-text",
      title: "Text Extraction",
      description: "Extract and clean text from various document formats",
      details: [
        "PDF text layer extraction",
        "HTML content parsing",
        "Text normalization and cleanup",
        "Metadata preservation",
      ],
      color: "#fd7e14",
    },
    {
      id: "chunking",
      icon: "bi-scissors",
      title: "Smart Chunking",
      description: "Intelligently split content into semantic chunks",
      details: [
        "Paragraph-aware splitting",
        "Optimal chunk size balancing",
        "Context boundary preservation",
        "Overlap for coherence",
      ],
      color: "#ffc107",
    },
    {
      id: "embedding",
      icon: "bi-diagram-3",
      title: "Vector Embedding",
      description: "Convert text chunks into high-dimensional vectors",
      details: [
        "Gemini embedding model",
        "Semantic representation",
        "Multi-language support",
        "Dimension optimization",
      ],
      color: "#20c997",
    },
    {
      id: "storage",
      icon: "bi-database",
      title: "Vector Storage",
      description: "Store embeddings in Qdrant vector database",
      details: [
        "Session-isolated collections",
        "Efficient similarity search",
        "Automatic indexing",
        "TTL-based cleanup",
      ],
      color: "#6610f2",
    },
    {
      id: "query",
      icon: "bi-search",
      title: "Semantic Search",
      description: "Find relevant content using vector similarity",
      details: [
        "Query embedding generation",
        "Cosine similarity matching",
        "Configurable threshold (≥0.7)",
        "Context ranking",
      ],
      color: "#0dcaf0",
    },
    {
      id: "response",
      icon: "bi-chat-dots",
      title: "AI Response",
      description: "Generate contextual answers using retrieved content",
      details: [
        "Strict RAG (no hallucination)",
        "Context-aware prompting",
        "Multi-language response",
        "Source attribution",
      ],
      color: "#198754",
    },
  ];

  const handleStepClick = (stepId: string) => {
    setSelectedStep(stepId);
  };

  return (
    <div className="rag-process-flow">
      <div className="row">
        <div className="col-lg-8">
          <h3 className="flow-title mb-4">
            <i className="bi bi-gear-fill me-2"></i>
            RAG System Architecture & Flow
          </h3>

          <div className="flow-diagram">
            {steps.map((step, index) => (
              <div key={step.id} className="flow-item-container">
                <div
                  className={`flow-item ${selectedStep === step.id ? "active" : ""}`}
                  onClick={() => handleStepClick(step.id)}
                  style={{ "--step-color": step.color } as React.CSSProperties}
                >
                  <div className="flow-icon">
                    <i className={step.icon}></i>
                  </div>
                  <div className="flow-content">
                    <h5 className="flow-step-title">{step.title}</h5>
                    <p className="flow-step-desc">{step.description}</p>
                  </div>
                  <div className="flow-number">{index + 1}</div>
                </div>

                {index < steps.length - 1 && (
                  <div className="flow-connector">
                    <div className="flow-line"></div>
                    <div className="flow-arrow">→</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="step-details">
            {steps.find((step) => step.id === selectedStep) && (
              <div className="details-card">
                <div
                  className="details-header"
                  style={{
                    background: `linear-gradient(135deg, ${steps.find((s) => s.id === selectedStep)?.color}15, ${steps.find((s) => s.id === selectedStep)?.color}05)`,
                    borderLeft: `4px solid ${steps.find((s) => s.id === selectedStep)?.color}`,
                  }}
                >
                  <i
                    className={steps.find((s) => s.id === selectedStep)?.icon}
                  ></i>
                  <h4>{steps.find((s) => s.id === selectedStep)?.title}</h4>
                </div>

                <div className="details-body">
                  <p className="details-description">
                    {steps.find((s) => s.id === selectedStep)?.description}
                  </p>

                  <h6 className="details-subtitle">Technical Details:</h6>
                  <ul className="details-list">
                    {steps
                      .find((s) => s.id === selectedStep)
                      ?.details.map((detail, index) => (
                        <li key={index}>{detail}</li>
                      ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RagProcessFlow;
