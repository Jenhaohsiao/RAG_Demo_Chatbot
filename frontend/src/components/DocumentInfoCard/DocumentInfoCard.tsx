/**
 * DocumentInfoCard Component
 * 顯示上傳文檔的摘要和向量數據庫信息
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSession } from "../../services/sessionService";
import "./DocumentInfoCard.scss";

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
        console.error("Failed to fetch session info:", err);
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
  console.log("[DocumentInfoCard] Props:", {
    hasDocumentSummary: !!documentSummary,
    documentSummaryLength: documentSummary?.length,
    documentSummary: documentSummary?.substring(0, 100),
    sessionInfo,
  });

  return (
    <div className="card mb-3 border-primary">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="p-0">
            {" "}
            <strong>{t("documentInfo.title", "資料分析摘要")}</strong>
          </h5>
        </div>
        <button
          className="btn btn-lg btn-outline-light btn-toggle-expand"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`}></i>
        </button>
      </div>

      {isExpanded && (
        <div className="card-body">
          {/* 文檔摘要 */}
          {documentSummary && <div className="bg">{documentSummary}</div>}

          {/* 狀態指示器 */}
          {sessionInfo && sessionInfo.vector_count > 0 && (
            <div className="mt-3">
              <div className="alert alert-success mb-0 py-2 d-flex align-items-center">
                <i className="bi bi-check-circle-fill me-2"></i>
                <small>
                  {t(
                    "documentInfo.ready",
                    "✓ 文檔已處理完成，向量數據已存入 Vector DB，可以開始提問"
                  )}
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
