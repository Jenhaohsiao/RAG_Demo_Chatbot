/**
 * Crawled URLs Panel Component
 * Displays all URLs crawled by the web crawler and their details
 *
 * Includes:
 * - URL list
 * - Title, Tokens, and Status for each URL
 * - Expandable details view
 * - Copy URL functionality
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export interface CrawledPage {
  url: string;
  title: string;
  tokens: number;
  content?: string;
}

export interface CrawledUrlsPanelProps {
  pages: CrawledPage[];
  baseUrl?: string;
  totalPages?: number;
  totalTokens?: number;
}

const CrawledUrlsPanel: React.FC<CrawledUrlsPanelProps> = ({
  pages = [],
  baseUrl = "",
  totalPages = 0,
  totalTokens = 0,
}) => {
  const { t } = useTranslation();
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!pages || pages.length === 0) {
    return null;
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const toggleExpanded = (url: string) => {
    setExpandedUrl(expandedUrl === url ? null : url);
  };

  // Extract relative path from URL
  const getPathFromUrl = (url: string, base: string) => {
    try {
      const urlObj = new URL(url);
      const baseObj = new URL(base);
      if (urlObj.hostname === baseObj.hostname) {
        return urlObj.pathname + urlObj.search;
      }
      return url;
    } catch {
      return url;
    }
  };

  const avgTokensPerPage =
    pages.length > 0 ? Math.round(totalTokens / pages.length) : 0;

  return (
    <div className="crawled-urls-panel">
      {/* Header with title and statistics */}
      <div className="panel-header">
        <div className="header-left">
          <h3 className="panel-title">{t("crawledUrls.title")}</h3>
          <span className="url-count">
            {pages.length} {t("crawledUrls.pagesCount")}
          </span>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">{t("crawledUrls.totalTokens")}</span>
            <span className="stat-value">{totalTokens?.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t("crawledUrls.average")}</span>
            <span className="stat-value">{avgTokensPerPage}</span>
          </div>
        </div>
      </div>

      {/* Base URL section */}
      {baseUrl && (
        <div className="base-url-section">
          <div className="label">{t("crawledUrls.baseUrl")}</div>
          <div className="url-display">
            <span className="url-text">{baseUrl}</span>
            <button
              className="copy-btn"
              onClick={() => handleCopyUrl(baseUrl)}
              title={t("crawledUrls.copyUrl")}
            >
              {copiedUrl === baseUrl ? t("crawledUrls.copied") : "📋"}
            </button>
          </div>
        </div>
      )}

      {/* URL list */}
      <div className="urls-list">
        {pages.map((page, index) => (
          <div key={`${page.url}-${index}`} className="url-item">
            {/* URL header bar */}
            <div
              className="url-header"
              onClick={() => toggleExpanded(page.url)}
            >
              <div className="url-header-left">
                <span className="expand-icon">
                  {expandedUrl === page.url ? "▼" : "▶"}
                </span>
                <span className="url-index">#{index + 1}</span>
                <div className="url-title-section">
                  <div className="url-title">{page.title || page.url}</div>
                  <div className="url-path">
                    {getPathFromUrl(page.url, baseUrl)}
                  </div>
                </div>
              </div>
              <div className="url-tokens">
                <span className="token-badge">⚡ {page.tokens}</span>
              </div>
            </div>

            {/* Expanded details */}
            {expandedUrl === page.url && (
              <div className="url-details">
                <div className="detail-row">
                  <span className="detail-label">
                    {t("crawledUrls.fullUrl")}
                  </span>
                  <div className="detail-value url-value">
                    <span className="url-text">{page.url}</span>
                    <button
                      className="copy-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyUrl(page.url);
                      }}
                      title={t("crawledUrls.copyUrl")}
                    >
                      {copiedUrl === page.url
                        ? t("crawledUrls.copied")
                        : t("crawledUrls.copyButton")}
                    </button>
                  </div>
                </div>

                {page.title && (
                  <div className="detail-row">
                    <span className="detail-label">
                      {t("crawledUrls.pageTitle")}
                    </span>
                    <div className="detail-value">{page.title}</div>
                  </div>
                )}

                <div className="detail-row">
                  <span className="detail-label">
                    {t("crawledUrls.tokens")}
                  </span>
                  <div className="detail-value">
                    {page.tokens.toLocaleString()}
                    <span className="percentage">
                      ({((page.tokens / totalTokens) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {page.content && (
                  <div className="detail-row">
                    <span className="detail-label">
                      {t("crawledUrls.contentPreview")}
                    </span>
                    <div className="detail-value content-preview">
                      {page.content.substring(0, 200)}
                      {page.content.length > 200 ? "..." : ""}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .crawled-urls-panel {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .panel-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .url-count {
          font-size: 13px;
          color: #6b7280;
          background: #f3f4f6;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 500;
        }

        .header-stats {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .stat-label {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .base-url-section {
          padding: 12px 16px;
          background: #f0f9ff;
          border-bottom: 1px solid #bfdbfe;
        }

        .label {
          font-size: 12px;
          color: #0369a1;
          font-weight: 600;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .url-display {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 8px 10px;
        }

        .url-text {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 12px;
          color: #1f2937;
          word-break: break-all;
          flex: 1;
        }

        .copy-btn {
          padding: 4px 8px;
          background: transparent;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          color: #6b7280;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .copy-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .urls-list {
          max-height: 600px;
          overflow-y: auto;
        }

        .url-item {
          border-bottom: 1px solid #f3f4f6;
        }

        .url-item:last-child {
          border-bottom: none;
        }

        .url-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }

        .url-header:hover {
          background: #f9fafb;
        }

        .url-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .expand-icon {
          font-size: 12px;
          color: #9ca3af;
          flex-shrink: 0;
        }

        .url-index {
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          flex-shrink: 0;
        }

        .url-title-section {
          flex: 1;
          min-width: 0;
        }

        .url-title {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .url-path {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
          font-family: 'Monaco', 'Courier New', monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .url-tokens {
          flex-shrink: 0;
        }

        .token-badge {
          display: inline-block;
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .url-details {
          background: #fafbfc;
          border-top: 1px solid #e5e7eb;
          padding: 12px 16px;
          margin-left: 36px;
        }

        .detail-row {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
          align-items: flex-start;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          flex-shrink: 0;
          width: 100px;
          text-align: right;
        }

        .detail-value {
          flex: 1;
          font-size: 12px;
          color: #374151;
          word-break: break-word;
        }

        .url-value {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 6px 8px;
        }

        .url-value .url-text {
          flex: 1;
          font-family: 'Monaco', 'Courier New', monospace;
          margin: 0;
        }

        .content-preview {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 8px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.4;
          max-height: 120px;
          overflow-y: auto;
          color: #4b5563;
        }

        .percentage {
          color: #9ca3af;
          font-size: 11px;
          margin-left: 4px;
        }

        /* RTL support */
        .rtl-layout .panel-header {
          direction: rtl;
        }

        .rtl-layout .url-header-left {
          direction: rtl;
        }

        .rtl-layout .url-details {
          margin-left: 0;
          margin-right: 36px;
          direction: rtl;
        }

        .rtl-layout .detail-row {
          direction: rtl;
        }

        .rtl-layout .detail-label {
          text-align: left;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .panel-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .header-stats {
            width: 100%;
            justify-content: flex-start;
          }

          .url-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .url-header-left {
            width: 100%;
          }

          .url-tokens {
            align-self: flex-start;
          }

          .url-details {
            margin-left: 0;
            padding: 10px 12px;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .detail-label {
            width: auto;
            text-align: left;
          }
        }

        @media (max-width: 480px) {
          .url-header {
            padding: 10px 12px;
          }

          .url-title {
            font-size: 13px;
          }

          .url-path {
            font-size: 11px;
          }

          .panel-title {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default CrawledUrlsPanel;
