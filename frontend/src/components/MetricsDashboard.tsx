/**
 * Metrics Dashboard Component
 * 顯示 Session 運作狀況：Token 使用、查詢統計、Vector DB 使用、警告狀態
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionMetrics, formatTokenCount, getTokenPercentage, formatUnansweredRatio } from '../services/metricsService';

interface MetricsDashboardProps {
  sessionId: string;
  metrics: SessionMetrics | null;
  onMetricsUpdate?: (metrics: SessionMetrics) => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  sessionId,
  metrics,
  onMetricsUpdate
}) => {
  const { t } = useTranslation();

  if (!metrics) {
    return null;
  }

  const tokenPercentage = getTokenPercentage(metrics.total_tokens, metrics.token_warning_threshold);

  return (
    <div className="metrics-dashboard">
      {/* Token 使用情況 */}
      <div className="metrics-section token-section">
        <div className="section-header">
          <span className="section-title">🔋 {t('metrics.tokens.title', 'Token Usage')}</span>
          {metrics.is_token_warning && (
            <span className="warning-badge">⚠️ {t('metrics.tokens.warning', 'High Usage')}</span>
          )}
        </div>
        
        <div className="metrics-grid">
          {/* Total Tokens */}
          <div className="metric-item">
            <span className="metric-label">{t('metrics.tokens.total', 'Total')}</span>
            <span className={`metric-value ${metrics.is_token_warning ? 'warning' : ''}`}>
              {formatTokenCount(metrics.total_tokens)}
            </span>
            <span className="metric-sublabel">
              / {formatTokenCount(metrics.token_warning_threshold)}
            </span>
          </div>

          {/* Input Tokens */}
          <div className="metric-item">
            <span className="metric-label">{t('metrics.tokens.input', 'Input')}</span>
            <span className="metric-value">{formatTokenCount(metrics.total_input_tokens)}</span>
            <span className="metric-sublabel">
              {metrics.total_tokens > 0 
                ? `${((metrics.total_input_tokens / metrics.total_tokens) * 100).toFixed(1)}%` 
                : '0%'}
            </span>
          </div>

          {/* Output Tokens */}
          <div className="metric-item">
            <span className="metric-label">{t('metrics.tokens.output', 'Output')}</span>
            <span className="metric-value">{formatTokenCount(metrics.total_output_tokens)}</span>
            <span className="metric-sublabel">
              {metrics.total_tokens > 0 
                ? `${((metrics.total_output_tokens / metrics.total_tokens) * 100).toFixed(1)}%` 
                : '0%'}
            </span>
          </div>

          {/* Avg per Query */}
          <div className="metric-item">
            <span className="metric-label">{t('metrics.tokens.avgPerQuery', 'Avg/Query')}</span>
            <span className="metric-value">{formatTokenCount(Math.round(metrics.avg_tokens_per_query))}</span>
            <span className="metric-sublabel">{metrics.total_queries} {t('metrics.common.queries', 'queries')}</span>
          </div>
        </div>

        {/* Token Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar-wrapper">
            <div
              className={`progress-bar ${metrics.is_token_warning ? 'warning' : 'normal'}`}
              style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
            />
          </div>
          <span className="progress-text">{tokenPercentage.toFixed(1)}%</span>
        </div>
      </div>

      {/* 查詢統計 */}
      <div className="metrics-section query-section">
        <div className="section-header">
          <span className="section-title">📊 {t('metrics.queries.title', 'Query Statistics')}</span>
        </div>
        
        <div className="metrics-grid">
          {/* Total Queries */}
          <div className="metric-item">
            <span className="metric-label">{t('metrics.queries.total', 'Total Queries')}</span>
            <span className="metric-value">{metrics.total_queries}</span>
            <span className="metric-sublabel">{t('metrics.common.requests', 'requests')}</span>
          </div>

          {/* Answered Queries */}
          <div className="metric-item">
            <span className="metric-label">{t('metrics.queries.answered', 'Answered')}</span>
            <span className="metric-value">
              {metrics.total_queries > 0 
                ? Math.round((1 - metrics.unanswered_ratio) * metrics.total_queries)
                : 0}
            </span>
            <span className="metric-sublabel">
              {metrics.total_queries > 0 
                ? `${((1 - metrics.unanswered_ratio) * 100).toFixed(1)}%` 
                : '0%'}
            </span>
          </div>

          {/* Unanswered Queries */}
          <div className={`metric-item ${metrics.is_unanswered_warning ? 'warning-item' : ''}`}>
            <span className="metric-label">{t('metrics.queries.unanswered', 'Unanswered')}</span>
            <span className={`metric-value ${metrics.is_unanswered_warning ? 'warning' : ''}`}>
              {metrics.total_queries > 0 
                ? Math.round(metrics.unanswered_ratio * metrics.total_queries)
                : 0}
            </span>
            <span className="metric-sublabel">
              {formatUnansweredRatio(metrics.unanswered_ratio)}
              {metrics.is_unanswered_warning && ' ⚠️'}
            </span>
          </div>

          {/* Avg Chunks Retrieved */}
          <div className="metric-item">
            <span className="metric-label">{t('metrics.queries.avgChunks', 'Avg Chunks')}</span>
            <span className="metric-value">{metrics.avg_chunks_retrieved.toFixed(1)}</span>
            <span className="metric-sublabel">{t('metrics.common.perQuery', 'per query')}</span>
          </div>
        </div>

        {/* Unanswered Warning Bar */}
        {metrics.is_unanswered_warning && (
          <div className="warning-message">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">
              {t('metrics.warnings.highUnanswered', 'High unanswered rate. Consider uploading more relevant documents.')}
            </span>
          </div>
        )}
      </div>

      <style>{`
        .metrics-dashboard {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .metrics-section {
          background: white;
          border-radius: 6px;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border-left: 4px solid #4CAF50;
        }

        .metrics-section.token-section {
          border-left-color: #FF9800;
        }

        .metrics-section.query-section {
          border-left-color: #2196F3;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .section-title {
          font-weight: 600;
          color: #333;
          font-size: 1rem;
        }

        .warning-badge {
          background: #FFE5E5;
          color: #D32F2F;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: #f9f9f9;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
          transition: all 0.2s ease;
        }

        .metric-item:hover {
          background: #f0f0f0;
          border-color: #ccc;
        }

        .metric-item.warning-item {
          background: #fff3e0;
          border-color: #FFB74D;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #333;
        }

        .metric-value.warning {
          color: #D32F2F;
        }

        .metric-sublabel {
          font-size: 0.7rem;
          color: #999;
        }

        .progress-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .progress-bar-wrapper {
          flex: 1;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #45a049);
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .progress-bar.warning {
          background: linear-gradient(90deg, #FF9800, #F57C00);
        }

        .progress-text {
          min-width: 40px;
          text-align: right;
          font-size: 0.8rem;
          font-weight: 600;
          color: #333;
        }

        .warning-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #fff3e0;
          border: 1px solid #FFB74D;
          border-radius: 4px;
          color: #E65100;
        }

        .warning-icon {
          font-size: 1.2rem;
          min-width: 1.5rem;
        }

        .warning-text {
          font-size: 0.85rem;
          flex: 1;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .metrics-dashboard {
            padding: 0.75rem;
            gap: 0.75rem;
          }

          .metrics-section {
            padding: 0.75rem;
          }

          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          .metric-item {
            padding: 0.5rem;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .warning-badge {
            align-self: flex-start;
          }
        }

        @media (max-width: 480px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default MetricsDashboard;
