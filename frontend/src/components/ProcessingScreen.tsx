/**
 * Processing Screen Component
 * 文件處理進度顯示
 * 
 * Constitutional Compliance:
 * - Principle II (Testability): 獨立 React 組件
 * - User Story US2: Document Upload 進度追蹤
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExtractionStatus,
  ModerationStatus,
  SourceType,
} from '../types/document';

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
}) => {
  const { t } = useTranslation();

  /**
   * 取得當前處理階段文字
   */
  const getProcessingStageText = (): string => {
    if (extractionStatus === ExtractionStatus.FAILED) {
      return t('processing.stage.failed', 'Processing Failed');
    }

    if (moderationStatus === ModerationStatus.BLOCKED) {
      return t('processing.stage.blocked', 'Content Blocked');
    }

    if (processingProgress === 100) {
      return t('processing.stage.complete', 'Processing Complete');
    }

    if (processingProgress >= 75) {
      return t('processing.stage.embedding', 'Embedding & Storing...');
    }

    if (processingProgress >= 50) {
      return t('processing.stage.chunking', 'Chunking Text...');
    }

    if (processingProgress >= 25) {
      return t('processing.stage.moderating', 'Checking Content Safety...');
    }

    return t('processing.stage.extracting', 'Extracting Text...');
  };

  /**
   * 取得進度顏色
   */
  const getProgressColor = (): string => {
    if (extractionStatus === ExtractionStatus.FAILED || moderationStatus === ModerationStatus.BLOCKED) {
      return '#ef4444'; // Red
    }

    if (processingProgress === 100) {
      return '#10b981'; // Green
    }

    return '#3b82f6'; // Blue
  };

  /**
   * 取得來源類型圖示
   */
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

  /**
   * 格式化來源引用
   */
  const formatSourceReference = (): string => {
    if (!sourceReference) {
      return 'Unknown Source';
    }

    if (sourceType === SourceType.URL) {
      return sourceReference;
    }

    // 僅顯示檔名
    const parts = sourceReference.split(/[/\\]/);
    return parts[parts.length - 1] || sourceReference;
  };

  return (
    <div className="processing-screen">
      <div className="processing-header">
        <h2>{t('processing.title', 'Processing Document')}</h2>
      </div>

      {/* 來源資訊 */}
      <div className="processing-source">
        <span className="source-icon">{getSourceIcon()}</span>
        <div className="source-details">
          <p className="source-name">{formatSourceReference()}</p>
          <p className="source-type">
            {t(`processing.sourceType.${sourceType}`, sourceType.toUpperCase())}
          </p>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {(extractionStatus === ExtractionStatus.FAILED || moderationStatus === ModerationStatus.BLOCKED) && (
        <div className="processing-error">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <p className="error-title">
              {moderationStatus === ModerationStatus.BLOCKED
                ? t('processing.error.moderationBlocked', 'Content Blocked by Safety Check')
                : t('processing.error.processingFailed', 'Processing Failed')}
            </p>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {errorCode && (
              <p className="error-code">
                {t('processing.error.code', 'Error Code')}: {errorCode}
              </p>
            )}
            {moderationCategories.length > 0 && (
              <div className="moderation-categories">
                <p className="categories-label">
                  {t('processing.error.blockedCategories', 'Blocked Categories')}:
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

      {/* 處理進度 */}
      {extractionStatus !== ExtractionStatus.FAILED && moderationStatus !== ModerationStatus.BLOCKED && (
        <div className="processing-progress">
          {/* 進度條 */}
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{
                width: `${processingProgress}%`,
                backgroundColor: getProgressColor(),
              }}
            />
          </div>

          {/* 進度文字 */}
          <div className="progress-info">
            <p className="progress-stage">{getProcessingStageText()}</p>
            <p className="progress-percentage">{processingProgress}%</p>
          </div>

          {/* Spinner（處理中） */}
          {processingProgress < 100 && (
            <div className="processing-spinner">
              <div className="spinner-icon">⏳</div>
              <p className="spinner-text">
                {t('processing.pleaseWait', 'Please wait, this may take a few moments...')}
              </p>
            </div>
          )}

          {/* 完成資訊 */}
          {processingProgress === 100 && (
            <div className="processing-complete">
              <div className="complete-icon">✅</div>
              <p className="complete-text">
                {t('processing.complete.message', 'Document processed successfully!')}
              </p>
              {chunkCount > 0 && (
                <p className="chunk-count">
                  {t('processing.complete.chunks', '{{count}} text chunks created', {
                    count: chunkCount,
                  })}
                </p>
              )}
              {summary && (
                <div className="document-summary">
                  <p className="summary-label">
                    {t('processing.complete.preview', 'Preview')}:
                  </p>
                  <p className="summary-text">{summary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 處理步驟指示器 */}
      <div className="processing-steps">
        <div className={`step ${processingProgress >= 25 ? 'completed' : 'pending'}`}>
          <div className="step-icon">
            {processingProgress >= 25 ? '✓' : '1'}
          </div>
          <p className="step-label">{t('processing.steps.extract', 'Extract')}</p>
        </div>

        <div className={`step ${processingProgress >= 50 ? 'completed' : 'pending'}`}>
          <div className="step-icon">
            {processingProgress >= 50 ? '✓' : '2'}
          </div>
          <p className="step-label">{t('processing.steps.moderate', 'Moderate')}</p>
        </div>

        <div className={`step ${processingProgress >= 75 ? 'completed' : 'pending'}`}>
          <div className="step-icon">
            {processingProgress >= 75 ? '✓' : '3'}
          </div>
          <p className="step-label">{t('processing.steps.chunk', 'Chunk')}</p>
        </div>

        <div className={`step ${processingProgress === 100 ? 'completed' : 'pending'}`}>
          <div className="step-icon">
            {processingProgress === 100 ? '✓' : '4'}
          </div>
          <p className="step-label">{t('processing.steps.embed', 'Embed')}</p>
        </div>
      </div>

      {/* Debug 資訊（開發模式） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="processing-debug">
          <details>
            <summary>{t('processing.debug.title', 'Debug Info')}</summary>
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
