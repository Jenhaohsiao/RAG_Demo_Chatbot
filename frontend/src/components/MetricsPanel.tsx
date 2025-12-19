/**
 * MetricsPanel Component
 * Displays all 8 metrics with labels, current values, progress bars for percentages
 * 
 * T079: MetricsPanel Component Implementation
 * T080: Progress bar color logic (green <50%, yellow 50-80%, red >80%)
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import './MetricsPanel.css';

interface MetricsPanelProps {
  metrics: {
    token_input: number;
    token_output: number;
    token_total: number;
    token_limit: number;
    token_percent: number;
    context_tokens: number;
    context_percent: number;
    vector_count: number;
  } | null;
  isLoading?: boolean;
}

/**
 * Determine progress bar color based on percentage
 * Green: <50%, Yellow: 50-80%, Red: >80%
 */
const getProgressBarColor = (percent: number): string => {
  if (percent < 50) {
    return 'bg-green-500';
  } else if (percent < 80) {
    return 'bg-yellow-500';
  } else {
    return 'bg-red-500';
  }
};

/**
 * Determine progress bar text color for contrast
 */
const getProgressBarTextColor = (percent: number): string => {
  if (percent < 50) {
    return 'text-green-600';
  } else if (percent < 80) {
    return 'text-yellow-600';
  } else {
    return 'text-red-600';
  }
};

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (!metrics && !isLoading) {
    return null;
  }

  if (isLoading && !metrics) {
    return (
      <div className="metrics-panel loading">
        <div className="loading-placeholder">
          {t('metrics.loading') || 'Loading metrics...'}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="metrics-panel metrics-panel-horizontal">
      <div className="metrics-header">
        <h3>{t('metrics.title') || 'Real-time Metrics'}</h3>
      </div>

      <div className="metrics-grid-horizontal">
        {/* Token Input */}
        <div className="metric-item-compact">
          <div className="metric-label">{t('metrics.tokenInput') || 'Input'}</div>
          <div className="metric-value">{metrics.token_input.toLocaleString()}</div>
        </div>

        {/* Token Output */}
        <div className="metric-item-compact">
          <div className="metric-label">{t('metrics.tokenOutput') || 'Output'}</div>
          <div className="metric-value">{metrics.token_output.toLocaleString()}</div>
        </div>

        {/* Token Total */}
        <div className="metric-item-compact">
          <div className="metric-label">{t('metrics.tokenTotal') || 'Total'}</div>
          <div className="metric-value">
            {metrics.token_total.toLocaleString()} / {(metrics.token_limit / 1000).toFixed(0)}K
          </div>
        </div>

        {/* Token Percent with Progress Bar */}
        <div className="metric-item-compact metric-item-progress">
          <div className="metric-label">{t('metrics.tokenPercent') || 'Usage %'}</div>
          <div className="metric-progress-compact">
            <div className="progress-bar-container">
              <div
                className={`progress-bar ${getProgressBarColor(metrics.token_percent)}`}
                style={{
                  width: `${Math.min(metrics.token_percent, 100)}%`,
                }}
              />
            </div>
            <div className={`progress-percent-compact ${getProgressBarTextColor(metrics.token_percent)}`}>
              {metrics.token_percent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Context Tokens */}
        <div className="metric-item-compact">
          <div className="metric-label">{t('metrics.contextTokens') || 'Context'}</div>
          <div className="metric-value">{metrics.context_tokens.toLocaleString()}</div>
        </div>

        {/* Context Percent with Progress Bar */}
        <div className="metric-item-compact metric-item-progress">
          <div className="metric-label">{t('metrics.contextPercent') || 'Ctx %'}</div>
          <div className="metric-progress-compact">
            <div className="progress-bar-container">
              <div
                className={`progress-bar ${getProgressBarColor(metrics.context_percent)}`}
                style={{
                  width: `${Math.min(metrics.context_percent, 100)}%`,
                }}
              />
            </div>
            <div className={`progress-percent-compact ${getProgressBarTextColor(metrics.context_percent)}`}>
              {metrics.context_percent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Vector Count */}
        <div className="metric-item-compact">
          <div className="metric-label">{t('metrics.vectorCount') || 'Vectors'}</div>
          <div className="metric-value">{metrics.vector_count.toLocaleString()}</div>
        </div>
      </div>

      {/* Warning when token usage is high */}
      {metrics.token_percent > 80 && (
        <div className="metrics-warning">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            {t('metrics.tokenWarning') ||
              'Token usage is above 80%. Consider starting a new session.'}
          </span>
        </div>
      )}
    </div>
  );
};

export default MetricsPanel;
