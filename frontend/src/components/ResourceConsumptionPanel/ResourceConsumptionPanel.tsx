/**
 * Resource Consumption Panel Component
 * 顯示文檔上傳/爬蟲操作消耗的資源
 *
 * 包括：
 * - Token 消耗量和百分比
 * - 處理時間
 * - 文本塊數量
 * - 操作類型
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

  // 調試信息 - 臨時添加
  console.log("[ResourceConsumptionPanel] Props:", {
    sourceType,
    tokensUsed,
    chunkCount,
    processingTimeMs,
    crawlDurationSeconds,
    avgTokensPerPage,
    totalTokenLimit,
  });

  // 計算資源百分比
  const tokenPercent = Math.min(100, (tokensUsed / totalTokenLimit) * 100);

  // 判斷操作類型 - 需要先定義，因為後面會用到
  const isWebCrawl =
    sourceType === "URL" && (crawlDurationSeconds > 0 || avgTokensPerPage > 0);
  const isFilePdf = sourceType === "PDF";
  const isFileText = sourceType === "TEXT";

  // 使用爬蟲時間或處理時間
  const displayTimeSeconds = isWebCrawl
    ? crawlDurationSeconds
    : processingTimeMs
    ? processingTimeMs / 1000
    : 0;
  const processingTimeSeconds = Math.round(displayTimeSeconds * 100) / 100;

  // 獲取操作類型標籤
  const getOperationLabel = () => {
    if (isWebCrawl) return "🔍 網站爬蟲";
    if (isFilePdf) return "📄 PDF 轉檔";
    if (isFileText) return "📝 文本閱讀";
    return "📦 處理文檔";
  };

  // 獲取資源消耗的風險級別
  const getResourceLevel = (percent: number) => {
    if (percent < 30) return { level: "low", color: "#10b981" }; // 綠色 - 低
    if (percent < 70) return { level: "medium", color: "#f59e0b" }; // 黃色 - 中
    return { level: "high", color: "#ef4444" }; // 紅色 - 高
  };

  const resourceLevel = getResourceLevel(tokenPercent);

  return (
    <div className="resource-consumption-panel">
      {/* 標題 */}
      <div className="panel-header">
        <h3 className="panel-title">{getOperationLabel()}</h3>
      </div>

      {/* 資源消耗卡片 */}
      <div className="consumption-cards">
        {/* Token 消耗 */}
        <div className="consumption-card token-card">
          <div className="card-icon">⚡</div>
          <div className="card-content">
            <div className="card-label">Token 消耗</div>
            <div className="card-value">{tokensUsed.toLocaleString()}</div>
            <div className="card-sublabel">
              {tokenPercent.toFixed(1)}% of{" "}
              {(totalTokenLimit / 1000).toFixed(0)}K
            </div>
          </div>
          {/* 進度條 */}
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

        {/* 塊數 */}
        <div className="consumption-card chunks-card">
          <div className="card-icon">📦</div>
          <div className="card-content">
            <div className="card-label">文本塊</div>
            <div className="card-value">{chunkCount}</div>
            <div className="card-sublabel">
              {chunkCount > 0
                ? `平均 ${Math.round(tokensUsed / chunkCount)} tokens/塊`
                : "無"}
            </div>
          </div>
        </div>

        {/* 額外信息：爬蟲特定 */}
        {isWebCrawl && avgTokensPerPage > 0 && (
          <div className="consumption-card crawler-card">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <div className="card-label">平均每頁</div>
              <div className="card-value">{avgTokensPerPage}</div>
              <div className="card-sublabel">tokens/頁</div>
            </div>
          </div>
        )}

        {/* 處理時間卡片 - 所有模式都顯示 */}
        {processingTimeSeconds > 0 && (
          <div className="consumption-card time-card">
            <div className="card-icon">⏱️</div>
            <div className="card-content">
              <div className="card-label">
                {isWebCrawl ? "爬蟲時間" : "處理時間"}
              </div>
              <div className="card-value">
                {processingTimeSeconds.toFixed(1)}
              </div>
              <div className="card-sublabel">秒</div>
            </div>
          </div>
        )}
      </div>

      {/* 警告信息 */}
      {resourceLevel.level === "high" && (
        <div className="warning-message">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            資源消耗較高，請考慮後續上傳時調整參數
          </span>
        </div>
      )}
    </div>
  );
};

export default ResourceConsumptionPanel;
