/**
 * Resource Consumption Panel Component
 * Displays resource consumption for document upload/crawler operations
 *
 * Includes:
 * - Token consumption and percentage
 * - Processing time
 * - Chunk count
 * - Operation type
 */

import React from "react";
import { useTranslation } from "react-i18next";
import "./ResourceConsumptionPanel.scss";

export interface ResourceConsumptionPanelProps {
  sourceType?: string;
  tokensUsed?: number;
  chunkCount?: number;
  processingTimeMs?: number;
  crawlDurationSeconds?: number;
  avgTokensPerPage?: number;
  totalTokenLimit?: number;
}

const ResourceConsumptionPanel: React.FC<ResourceConsumptionPanelProps> = ({
  sourceType,
  tokensUsed = 0,
  chunkCount = 0,
  processingTimeMs = 0,
  crawlDurationSeconds = 0,
  avgTokensPerPage = 0,
  totalTokenLimit = 100000,
}) => {
  const { t } = useTranslation();

  // Debug info - temporary
  // Calculate resource percentage
  const tokenPercent = Math.min(100, (tokensUsed / totalTokenLimit) * 100);

  // Determine operation type - define first as used later
  const isWebCrawl =
    sourceType === "URL" && (crawlDurationSeconds > 0 || avgTokensPerPage > 0);
  const isFilePdf = sourceType === "PDF";
  const isFileText = sourceType === "TEXT";

  // Use crawl time or processing time
  const displayTimeSeconds = isWebCrawl
    ? crawlDurationSeconds
    : processingTimeMs
    ? processingTimeMs / 1000
    : 0;
  const processingTimeSeconds = Math.round(displayTimeSeconds * 100) / 100;

  // Get operation label
  const getOperationLabel = () => {
    if (isWebCrawl) return " Website Crawler";
    if (isFilePdf) return " PDF Processing";
    if (isFileText) return " Text Processing";
    return " Document Processing";
  };

  // Get resource consumption risk level
  const getResourceLevel = (percent: number) => {
    if (percent < 30) return { level: "low", color: "#10b981" }; // Green - Low
    if (percent < 70) return { level: "medium", color: "#f59e0b" }; // Yellow - Medium
    return { level: "high", color: "#ef4444" }; // Red - High
  };

  const resourceLevel = getResourceLevel(tokenPercent);

  return (
    <div className="resource-consumption-panel">
      {/* Header */}
      <div className="panel-header">
        <h3 className="panel-title">{getOperationLabel()}</h3>
      </div>

      {/* Consumption Cards */}
      <div className="consumption-cards">
        {/* Token Consumption */}
        <div className="consumption-card token-card">
          <div className="card-icon"></div>
          <div className="card-content">
            <div className="card-label">Token Consumption</div>
            <div className="card-value">{tokensUsed.toLocaleString()}</div>
            <div className="card-sublabel">
              {tokenPercent.toFixed(1)}% of{" "}
              {(totalTokenLimit / 1000).toFixed(0)}K
            </div>
          </div>
          {/* Progress Bar */}
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${tokenPercent}%`,
                backgroundColor: resourceLevel.color,
              }}
            />
          </div>
        </div>

        {/* Text Chunks */}
        <div className="consumption-card chunks-card">
          <div className="card-icon"></div>
          <div className="card-content">
            <div className="card-label">Text Chunks</div>
            <div className="card-value">{chunkCount}</div>
            <div className="card-sublabel">
              {chunkCount > 0
                ? `Avg ${Math.round(tokensUsed / chunkCount)} tokens/chunk`
                : "None"}
            </div>
          </div>
        </div>

        {/* Extra Info: Crawler Specific */}
        {isWebCrawl && avgTokensPerPage > 0 && (
          <div className="consumption-card crawler-card">
            <div className="card-icon"></div>
            <div className="card-content">
              <div className="card-label">Avg per page</div>
              <div className="card-value">{avgTokensPerPage}</div>
              <div className="card-sublabel">tokens/page</div>
            </div>
          </div>
        )}

        {/* Processing Time Card - Show for all modes */}
        {processingTimeSeconds > 0 && (
          <div className="consumption-card time-card">
            <div className="card-icon"></div>
            <div className="card-content">
              <div className="card-label">
                {isWebCrawl ? "Crawl Time" : "Processing Time"}
              </div>
              <div className="card-value">
                {processingTimeSeconds.toFixed(1)}
              </div>
              <div className="card-sublabel">sec</div>
            </div>
          </div>
        )}
      </div>

      {/* Warning Message */}
      {resourceLevel.level === "high" && (
        <div className="warning-message">
          <span className="warning-icon"></span>
          <span className="warning-text">
            High resource consumption. Consider adjusting parameters for future uploads.
          </span>
        </div>
      )}
    </div>
  );
};

export default ResourceConsumptionPanel;
