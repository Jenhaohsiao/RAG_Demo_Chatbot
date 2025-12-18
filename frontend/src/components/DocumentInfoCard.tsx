/**
 * DocumentInfoCard Component
 * 顯示上傳文檔的摘要和向量數據庫信息
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSession } from '../services/sessionService';

interface DocumentInfoCardProps {
  sessionId: string;
  documentSummary?: string;
  sourceReference?: string;
  chunkCount?: number;
}

interface SessionInfo {
  document_count: number;
  vector_count: number;
}

export const DocumentInfoCard: React.FC<DocumentInfoCardProps> = ({
  sessionId,
  documentSummary,
  sourceReference,
  chunkCount,
}) => {
  const { t } = useTranslation();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // 獲取 session 信息（document_count, vector_count）
  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const data = await getSession(sessionId);
        setSessionInfo({
          document_count: data.document_count,
          vector_count: data.vector_count,
        });
      } catch (err) {
        console.error('Failed to fetch session info:', err);
      }
    };

    fetchSessionInfo();
    
    // 每 5 秒更新一次
    const interval = setInterval(fetchSessionInfo, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // 只要有 sessionInfo 就顯示卡片（即使沒有 summary）
  if (!sessionInfo) {
    return null;
  }

  // Debug: 檢查 props
  console.log('[DocumentInfoCard] Props:', {
    hasDocumentSummary: !!documentSummary,
    documentSummaryLength: documentSummary?.length,
    documentSummary: documentSummary?.substring(0, 100),
    sessionInfo
  });

  return (
    <div className="card mb-3 border-primary">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <i className="bi bi-file-earmark-text me-2"></i>
          <strong>{t('documentInfo.title', '文檔信息')}</strong>
        </div>
        <button
          className="btn btn-sm btn-outline-light"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ border: 'none' }}
        >
          <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
        </button>
      </div>
      
      {isExpanded && (
        <div className="card-body">
          {/* Vector DB 信息 */}
          {sessionInfo && (
            <div className="row mb-3">
              <div className="col-md-6">
                <div className="d-flex align-items-center">
                  <i className="bi bi-database-fill text-success me-2" style={{ fontSize: '1.5rem' }}></i>
                  <div>
                    <div className="text-muted small">{t('documentInfo.vectorsStored', 'Vector DB 向量數')}</div>
                    <div className="fw-bold fs-5">{sessionInfo.vector_count} {t('documentInfo.vectors', '個向量')}</div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex align-items-center">
                  <i className="bi bi-file-earmark-check text-info me-2" style={{ fontSize: '1.5rem' }}></i>
                  <div>
                    <div className="text-muted small">{t('documentInfo.documentsUploaded', '已上傳文檔數')}</div>
                    <div className="fw-bold fs-5">{sessionInfo.document_count} {t('documentInfo.documents', '個文檔')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 文檔詳細信息 */}
          {(sourceReference || chunkCount) && (
            <div className="row mb-3">
              {sourceReference && (
                <div className="col-md-6">
                  <div className="text-muted small">{t('documentInfo.fileName', '文件名稱')}</div>
                  <div className="text-truncate" title={sourceReference}>
                    {sourceReference}
                  </div>
                </div>
              )}
              {chunkCount !== undefined && (
                <div className="col-md-6">
                  <div className="text-muted small">{t('documentInfo.chunks', '文本塊數')}</div>
                  <div>{chunkCount} chunks</div>
                </div>
              )}
            </div>
          )}

          {/* 文檔摘要 */}
          {documentSummary && (
            <div>
              <div className="text-muted small mb-2">
                <i className="bi bi-card-text me-1"></i>
                {t('documentInfo.summary', '文檔摘要')}
              </div>
              <div 
                className="p-3 bg-light border-start border-3 border-info rounded"
                style={{ 
                  maxHeight: isExpanded ? 'none' : '100px',
                  overflow: 'hidden',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {documentSummary}
              </div>
            </div>
          )}

          {/* 狀態指示器 */}
          {sessionInfo && sessionInfo.vector_count > 0 && (
            <div className="mt-3">
              <div className="alert alert-success mb-0 py-2 d-flex align-items-center">
                <i className="bi bi-check-circle-fill me-2"></i>
                <small>
                  {t('documentInfo.ready', '✓ 文檔已處理完成，向量數據已存入 Vector DB，可以開始提問')}
                </small>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentInfoCard;
