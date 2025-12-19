/**
 * Uploaded Document Info Component
 * 顯示已上傳文檔的詳細統計信息
 * 
 * 包括：
 * - 文檔來源和文件名
 * - Token 使用量
 * - 頁面計數（爬蟲）
 * - 分塊數量
 * - 文檔摘要預覽
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SourceType } from '../types/document';

export interface UploadedDocumentInfoProps {
  sourceType?: SourceType;
  sourceReference?: string;
  tokensUsed?: number;
  pagesCrawled?: number;
  chunkCount?: number;
  summary?: string;
}

const UploadedDocumentInfo: React.FC<UploadedDocumentInfoProps> = ({
  sourceType,
  sourceReference,
  tokensUsed = 0,
  pagesCrawled = 0,
  chunkCount = 0,
  summary,
}) => {
  const { t } = useTranslation();

  if (!sourceReference) {
    return null;
  }

  // 獲取來源類型圖標
  const getSourceIcon = (): string => {
    switch (sourceType) {
      case SourceType.PDF:
        return '📄';
      case SourceType.TEXT:
        return '📝';
      case SourceType.URL:
        return '🌐';
      default:
        return '📁';
    }
  };

  // 格式化來源引用
  const formatSourceReference = (): string => {
    if (!sourceReference) return 'Unknown';

    if (sourceType === SourceType.URL) {
      // 對於 URL，提取域名
      try {
        const url = new URL(sourceReference);
        return url.hostname;
      } catch {
        return sourceReference;
      }
    }

    // 對於文件，只顯示文件名
    const parts = sourceReference.split(/[/\\]/);
    return parts[parts.length - 1] || sourceReference;
  };

  return (
    <div className="uploaded-document-info">
      <div className="document-header">
        <div className="document-title">
          <span className="document-icon">{getSourceIcon()}</span>
          <div className="document-name">
            <p className="document-reference">{formatSourceReference()}</p>
            <p className="document-type">
              {t(`processing.sourceType.${sourceType || 'URL'}`, sourceType?.toUpperCase() || 'Unknown')}
            </p>
          </div>
        </div>

        {/* 右側統計信息 */}
        <div className="document-stats">
          {/* Chunks 計數 */}
          <div className="stat-item">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <p className="stat-label">{t('labels.chunks', 'Chunks')}</p>
              <p className="stat-value">{chunkCount}</p>
            </div>
          </div>

          {/* Tokens 使用量 */}
          {tokensUsed > 0 && (
            <div className="stat-item">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <p className="stat-label">{t('processing.complete.tokensUsed', 'Tokens Used')}</p>
                <p className="stat-value">{tokensUsed.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* 頁面計數（僅爬蟲） */}
          {pagesCrawled > 0 && (
            <div className="stat-item">
              <div className="stat-icon">🌐</div>
              <div className="stat-content">
                <p className="stat-label">{t('processing.complete.pagesCrawled', 'Pages Crawled')}</p>
                <p className="stat-value">{pagesCrawled}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 文檔摘要 */}
      {summary && (
        <div className="document-summary-section">
          <p className="summary-label">{t('processing.complete.preview', 'Preview')}:</p>
          <p className="summary-text">{summary}</p>
        </div>
      )}

      <style>{`
        .uploaded-document-info {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .document-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 12px;
        }

        .document-title {
          display: flex;
          gap: 12px;
          flex: 1;
        }

        .document-icon {
          font-size: 32px;
          line-height: 1;
          margin-top: 4px;
        }

        .document-name {
          flex: 1;
        }

        .document-reference {
          margin: 0;
          font-weight: 600;
          color: #1f2937;
          word-break: break-all;
          font-size: 15px;
        }

        .document-type {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: #6b7280;
        }

        .document-stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .stat-item {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          text-align: center;
          min-width: 80px;
        }

        .stat-icon {
          font-size: 24px;
          line-height: 1;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          margin: 0;
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          margin: 4px 0 0 0;
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
        }

        .document-summary-section {
          border-top: 1px solid #e5e7eb;
          padding-top: 12px;
          margin-top: 12px;
        }

        .summary-label {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .summary-text {
          margin: 0;
          font-size: 14px;
          color: #4b5563;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* 響應式設計 */
        @media (max-width: 768px) {
          .document-header {
            flex-direction: column;
          }

          .document-stats {
            width: 100%;
            justify-content: flex-start;
          }

          .stat-item {
            flex: 1;
            min-width: 70px;
          }
        }

        @media (max-width: 600px) {
          .uploaded-document-info {
            padding: 12px;
            margin-bottom: 12px;
          }

          .document-title {
            gap: 10px;
          }

          .document-icon {
            font-size: 24px;
          }

          .stat-value {
            font-size: 16px;
          }

          .document-stats {
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default UploadedDocumentInfo;
