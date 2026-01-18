/**
 * Processing Screen Component
 * Document processing progress display
 *
 * Constitutional Compliance:
 * - Principle II (Testability): Independent React component
 * - User Story US2: Document Upload Progress Tracking
 * - User Story US5: Real-time Metrics Display (T081)
 */

import React from "react";
import { useTranslation } from "react-i18next";
import {
  ExtractionStatus,
  ModerationStatus,
  SourceType,
} from "../../types/document";
import MetricsPanel from "../MetricsPanel/MetricsPanel";

export interface ProcessingScreenProps {
  documentId: string;
  sourceType: SourceType;
  sourceReference: string;
  extractionStatus: ExtractionStatus;
  moderationStatus: ModerationStatus;
  chunkCount: number;
  processingProgress: number; // 0-100
  summary?: string;
  errorCode?: string;
  errorMessage?: string;
  moderationCategories?: string[];
  // T081: Metrics Display during upload
  metrics?: {
    token_input: number;
    token_output: number;
    token_total: number;
    token_limit: number;
    token_percent: number;
    context_tokens: number;
    context_percent: number;
    vector_count: number;
  } | null;
  // T089+ Token and page info
  tokensUsed?: number;
  pagesCrawled?: number;
}

const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  documentId,
  sourceType,
  sourceReference,
  extractionStatus,
  moderationStatus,
  chunkCount,
  processingProgress,
  summary,
  errorCode,
  errorMessage,
  moderationCategories = [],
  metrics,
  tokensUsed = 0,
  pagesCrawled = 0,
}) => {
  const { t } = useTranslation();

  /**
   * Get current processing stage text
   */
  const getProcessingStageText = (): string => {
    if (extractionStatus === ExtractionStatus.FAILED) {
      return t("processing.stage.failed", "Processing Failed");
    }

    if (moderationStatus === ModerationStatus.BLOCKED) {
      return t("processing.stage.blocked", "Content Blocked");
    }

    if (processingProgress === 100) {
      return t("processing.stage.complete", "Processing Complete");
    }

    if (processingProgress >= 75) {
      return t("processing.stage.embedding", "Embedding & Storing...");
    }

    if (processingProgress >= 50) {
      return t("processing.stage.chunking", "Chunking Text...");
    }

    if (processingProgress >= 25) {
      return t("processing.stage.moderating", "Checking Content Safety...");
    }

    return t("processing.stage.extracting", "Extracting Text...");
  };

  /**
   * Get progress color
   */
  const getProgressColor = (): string => {
    if (
      extractionStatus === ExtractionStatus.FAILED ||
      moderationStatus === ModerationStatus.BLOCKED
    ) {
      return "#ef4444"; // Red
    }

    if (processingProgress === 100) {
      return "#10b981"; // Green
    }

    return "#3b82f6"; // Blue
  };

  /**
   * Get source type icon
   */
  const getSourceIcon = (): string => {
    switch (sourceType) {
      case SourceType.PDF:
        return "📄";
      case SourceType.TEXT:
        return "📝";
      case SourceType.URL:
        return "🌐";
      default:
        return "📁";
    }
  };

  /**
   * Format source reference
   */
  const formatSourceReference = (): string => {
    if (!sourceReference) {
      return "Unknown Source";
    }

    if (sourceType === SourceType.URL) {
      return sourceReference;
    }

    // Only show filename
    const parts = sourceReference.split(/[/\\]/);
    return parts[parts.length - 1] || sourceReference;
  };

  return (
    <div className="processing-screen">
      <div className="processing-header">
        <h2>{t("processing.title", "Processing Document")}</h2>
      </div>

      {/* Source information */}
      <div className="processing-source">
        <span className="source-icon">{getSourceIcon()}</span>
        <div className="source-details">
          <p className="source-name">{formatSourceReference()}</p>
          <p className="source-type">
            {t(`processing.sourceType.${sourceType}`, sourceType.toUpperCase())}
          </p>
        </div>
      </div>

      {/* Error message */}
      {(extractionStatus === ExtractionStatus.FAILED ||
        moderationStatus === ModerationStatus.BLOCKED) && (
        <div className="processing-error">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <p className="error-title">
              {moderationStatus === ModerationStatus.BLOCKED
                ? t(
                    "processing.error.moderationBlocked",
                    "Content Blocked by Safety Check"
                  )
                : t("processing.error.processingFailed", "Processing Failed")}
            </p>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {errorCode && (
              <p className="error-code">
                {t("processing.error.code", "Error Code")}: {errorCode}
              </p>
            )}
            {moderationCategories.length > 0 && (
              <div className="moderation-categories">
                <p className="categories-label">
                  {t(
                    "processing.error.blockedCategories",
                    "Blocked Categories"
                  )}
                  :
                </p>
                <ul className="categories-list">
                  {moderationCategories.map((category, index) => (
                    <li key={index}>{category}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing progress */}
      {extractionStatus !== ExtractionStatus.FAILED &&
        moderationStatus !== ModerationStatus.BLOCKED && (
          <div className="processing-progress">
            {/* T081: MetricsPanel showing vector_count increasing during upload */}
            {metrics && (
              <MetricsPanel
                metrics={metrics}
                isLoading={processingProgress < 100}
              />
            )}

            {/* Progress bar */}
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{
                  width: `${processingProgress}%`,
                  backgroundColor: getProgressColor(),
                }}
              />
            </div>

            {/* Progress text */}
            <div className="progress-info">
              <p className="progress-stage">{getProcessingStageText()}</p>
              <p className="progress-percentage">{processingProgress}%</p>
            </div>

            {/* Spinner (processing) */}
            {processingProgress < 100 && (
              <div className="processing-spinner">
                <div className="spinner-icon">⏳</div>
                <p className="spinner-text">
                  {t(
                    "processing.pleaseWait",
                    "Please wait, this may take a few moments..."
                  )}
                </p>
              </div>
            )}

            {/* Completion information */}
            {processingProgress === 100 && (
              <div className="processing-complete">
                <div className="complete-icon">✅</div>
                <p className="complete-text">
                  {t(
                    "processing.complete.message",
                    "Document processed successfully!"
                  )}
                </p>
                {chunkCount > 0 && (
                  <p className="chunk-count">
                    {t(
                      "processing.complete.chunks",
                      "{{count}} text chunks created",
                      {
                        count: chunkCount,
                      }
                    )}
                  </p>
                )}
                {/* T089+ Display Token and page information */}
                <div className="processing-stats">
                  {tokensUsed > 0 && (
                    <p className="stat-item">
                      <span className="stat-label">
                        {t("processing.complete.tokensUsed", "Tokens Used")}:
                      </span>
                      <span className="stat-value">
                        {tokensUsed.toLocaleString()}
                      </span>
                    </p>
                  )}
                  {pagesCrawled > 0 && (
                    <p className="stat-item">
                      <span className="stat-label">
                        {t("processing.complete.pagesCrawled", "Pages Crawled")}
                        :
                      </span>
                      <span className="stat-value">{pagesCrawled}</span>
                    </p>
                  )}
                </div>
                {summary && (
                  <div className="document-summary">
                    <p className="summary-label">
                      {t("processing.complete.preview", "Preview")}:
                    </p>
                    <p className="summary-text">{summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Processing step indicators */}
      <div className="processing-steps">
        <div
          className={`step ${
            processingProgress >= 25 ? "completed" : "pending"
          }`}
        >
          <div className="step-icon">
            {processingProgress >= 25 ? "✓" : "1"}
          </div>
          <p className="step-label">
            {t("processing.steps.extract", "Extract")}
          </p>
        </div>

        <div
          className={`step ${
            processingProgress >= 50 ? "completed" : "pending"
          }`}
        >
          <div className="step-icon">
            {processingProgress >= 50 ? "✓" : "2"}
          </div>
          <p className="step-label">
            {t("processing.steps.moderate", "Moderate")}
          </p>
        </div>

        <div
          className={`step ${
            processingProgress >= 75 ? "completed" : "pending"
          }`}
        >
          <div className="step-icon">
            {processingProgress >= 75 ? "✓" : "3"}
          </div>
          <p className="step-label">{t("processing.steps.chunk", "Chunk")}</p>
        </div>

        <div
          className={`step ${
            processingProgress === 100 ? "completed" : "pending"
          }`}
        >
          <div className="step-icon">
            {processingProgress === 100 ? "✓" : "4"}
          </div>
          <p className="step-label">{t("processing.steps.embed", "Embed")}</p>
        </div>
      </div>

      {/* Debug 資訊（開發模式） */}
      {process.env.NODE_ENV === "development" && (
        <div className="processing-debug">
          <details>
            <summary>{t("processing.debug.title", "Debug Info")}</summary>
            <pre>
              {JSON.stringify(
                {
                  documentId,
                  sourceType,
                  extractionStatus,
                  moderationStatus,
                  processingProgress,
                  chunkCount,
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ProcessingScreen;
