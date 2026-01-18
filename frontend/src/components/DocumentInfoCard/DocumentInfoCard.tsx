/**
 * DocumentInfoCard Component
 * Displays uploaded document summary and vector database information
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

  // Get session info (document_count, vector_count)
  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const data = await getSession(sessionId);
        setSessionInfo({
          document_count: data.document_count,
          vector_count: data.vector_count,
        });
      } catch (err) {}
    };

    fetchSessionInfo();

    // Update every 5 seconds
    const interval = setInterval(fetchSessionInfo, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Show card only if sessionInfo exists (even without summary)
  if (!sessionInfo) {
    return null;
  }

  // Debug: Check props
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
          {/* Document Summary */}
          {documentSummary && <div className="bg">{documentSummary}</div>}

          {/* Status Indicator */}
          {sessionInfo && sessionInfo.vector_count > 0 && (
            <div className="mt-3">
              <div className="alert alert-success mb-0 py-2 d-flex align-items-center">
                <i className="bi bi-check-circle-fill me-2"></i>
                <small>
                  {t(
                    "documentInfo.ready",
                    "✓ Document processed, vector data saved to Vector DB. Ready for Q&A."
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
