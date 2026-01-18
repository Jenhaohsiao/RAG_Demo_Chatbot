/**
 * Metrics Dashboard Component
 * Displays Session operational status: Token usage, query statistics, Vector DB usage, warning states
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  SessionMetrics,
  formatTokenCount,
  getTokenPercentage,
  formatUnansweredRatio,
} from "../../services/metricsService";
import "./MetricsDashboard.scss";

interface MetricsDashboardProps {
  sessionId: string;
  metrics: SessionMetrics | null;
  onMetricsUpdate?: (metrics: SessionMetrics) => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  sessionId,
  metrics,
  onMetricsUpdate,
}) => {
  const { t } = useTranslation();

  if (!metrics) {
    return null;
  }

  const tokenPercentage = getTokenPercentage(
    metrics.total_tokens,
    metrics.token_warning_threshold
  );

  return (
    <div className="metrics-dashboard">
      {/* Token Usage */}
      <div className="metrics-section token-section">
        <div className="section-header">
          <span className="section-title">🔋 {t("metrics.tokens.title")}</span>
          {metrics.is_token_warning && (
            <span className="warning-badge">
              ⚠️ {t("metrics.tokens.warning")}
            </span>
          )}
        </div>

        <div className="metrics-grid">
          {/* Total Tokens */}
          <div className="metric-item">
            <span className="metric-label">{t("metrics.tokens.total")}</span>
            <span
              className={`metric-value ${
                metrics.is_token_warning ? "warning" : ""
              }`}
            >
              {formatTokenCount(metrics.total_tokens)}
            </span>
            <span className="metric-sublabel">
              / {formatTokenCount(metrics.token_warning_threshold)}
            </span>
          </div>

          {/* Input Tokens */}
          <div className="metric-item">
            <span className="metric-label">{t("metrics.tokens.input")}</span>
            <span className="metric-value">
              {formatTokenCount(metrics.total_input_tokens)}
            </span>
            <span className="metric-sublabel">
              {metrics.total_tokens > 0
                ? `${(
                    (metrics.total_input_tokens / metrics.total_tokens) *
                    100
                  ).toFixed(1)}%`
                : "0%"}
            </span>
          </div>

          {/* Output Tokens */}
          <div className="metric-item">
            <span className="metric-label">{t("metrics.tokens.output")}</span>
            <span className="metric-value">
              {formatTokenCount(metrics.total_output_tokens)}
            </span>
            <span className="metric-sublabel">
              {metrics.total_tokens > 0
                ? `${(
                    (metrics.total_output_tokens / metrics.total_tokens) *
                    100
                  ).toFixed(1)}%`
                : "0%"}
            </span>
          </div>

          {/* Avg per Query */}
          <div className="metric-item">
            <span className="metric-label">
              {t("metrics.tokens.avgPerQuery")}
            </span>
            <span className="metric-value">
              {formatTokenCount(Math.round(metrics.avg_tokens_per_query))}
            </span>
            <span className="metric-sublabel">
              {metrics.total_queries} {t("metrics.common.queries")}
            </span>
          </div>
        </div>

        {/* Token Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar-wrapper">
            <div
              className={`progress-bar ${
                metrics.is_token_warning ? "warning" : "normal"
              }`}
              style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
            />
          </div>
          <span className="progress-text">{tokenPercentage.toFixed(1)}%</span>
        </div>
      </div>

      <div className="metrics-section query-section">
        <div className="section-header">
          <span className="section-title">📊 {t("metrics.queries.title")}</span>
        </div>

        <div className="metrics-grid">
          {/* Total Queries */}
          <div className="metric-item">
            <span className="metric-label">{t("metrics.queries.total")}</span>
            <span className="metric-value">{metrics.total_queries}</span>
            <span className="metric-sublabel">
              {t("metrics.common.requests")}
            </span>
          </div>

          {/* Answered Queries */}
          <div className="metric-item">
            <span className="metric-label">
              {t("metrics.queries.answered")}
            </span>
            <span className="metric-value">
              {metrics.total_queries > 0
                ? Math.round(
                    (1 - metrics.unanswered_ratio) * metrics.total_queries
                  )
                : 0}
            </span>
            <span className="metric-sublabel">
              {metrics.total_queries > 0
                ? `${((1 - metrics.unanswered_ratio) * 100).toFixed(1)}%`
                : "0%"}
            </span>
          </div>

          {/* Unanswered Queries */}
          <div
            className={`metric-item ${
              metrics.is_unanswered_warning ? "warning-item" : ""
            }`}
          >
            <span className="metric-label">
              {t("metrics.queries.unanswered")}
            </span>
            <span
              className={`metric-value ${
                metrics.is_unanswered_warning ? "warning" : ""
              }`}
            >
              {metrics.total_queries > 0
                ? Math.round(metrics.unanswered_ratio * metrics.total_queries)
                : 0}
            </span>
            <span className="metric-sublabel">
              {formatUnansweredRatio(metrics.unanswered_ratio)}
              {metrics.is_unanswered_warning && " ⚠️"}
            </span>
          </div>

          {/* Avg Chunks Retrieved */}
          <div className="metric-item">
            <span className="metric-label">
              {t("metrics.queries.avgChunks")}
            </span>
            <span className="metric-value">
              {metrics.avg_chunks_retrieved.toFixed(1)}
            </span>
            <span className="metric-sublabel">
              {t("metrics.common.perQuery")}
            </span>
          </div>
        </div>

        {/* Unanswered Warning Bar */}
        {metrics.is_unanswered_warning && (
          <div className="warning-message">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">
              {t("metrics.warnings.highUnanswered")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsDashboard;
