/**
 * Step 4: Content Review Component
 * 內容審核步驟 - 檢視和管理上傳的文件內容
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export interface ContentReviewStepProps {
  sessionId?: string;
  onReviewComplete?: () => void;
}

interface DocumentInfo {
  id: string;
  filename: string;
  type: "file" | "url" | "crawler";
  size: number;
  uploadTime: string;
  status: "pending" | "approved" | "rejected";
  preview: string;
  chunks?: number;
}

const ContentReviewStep: React.FC<ContentReviewStepProps> = ({
  sessionId,
  onReviewComplete,
}) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  // 模擬載入文件數據
  useEffect(() => {
    if (sessionId) {
      loadDocuments();
    }
  }, [sessionId]);

  const loadDocuments = async () => {
    setLoading(true);
    // 模擬API調用 - 替換為實際的API
    setTimeout(() => {
      setDocuments([
        {
          id: "1",
          filename: "sample-document.pdf",
          type: "file",
          size: 1024000,
          uploadTime: new Date().toISOString(),
          status: "pending",
          preview: "這是一個示例PDF文件的內容預覽...",
          chunks: 15,
        },
        {
          id: "2",
          filename: "website-content",
          type: "crawler",
          size: 512000,
          uploadTime: new Date().toISOString(),
          status: "pending",
          preview: "從網站爬取的內容預覽...",
          chunks: 8,
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const handleStatusChange = (
    docId: string,
    newStatus: "approved" | "rejected" | "pending"
  ) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, status: newStatus } : doc
      )
    );
  };

  const handleApproveAll = () => {
    setDocuments((prev) =>
      prev.map((doc) => ({ ...doc, status: "approved" as const }))
    );
  };

  const handleRejectAll = () => {
    setDocuments((prev) =>
      prev.map((doc) => ({ ...doc, status: "rejected" as const }))
    );
  };

  const filteredDocuments = documents.filter((doc) =>
    filter === "all" ? true : doc.status === filter
  );

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-warning",
      approved: "bg-success",
      rejected: "bg-danger",
    };
    const labels = {
      pending: "待審核",
      approved: "已核准",
      rejected: "已拒絕",
    };
    return (
      <span className={`badge ${variants[status as keyof typeof variants]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      file: "bi-file-earmark",
      url: "bi-link-45deg",
      crawler: "bi-globe",
    };
    return icons[type as keyof typeof icons] || "bi-file-earmark";
  };

  return (
    <div className="content-review-step">
      <div className="row">
        {/* 左側：文件列表 */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="bi bi-list-check me-2"></i>
                上傳的文件列表
              </h5>
              {loading && (
                <div
                  className="spinner-border spinner-border-sm text-dark"
                  role="status"
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
              )}
            </div>

            <div className="card-body">
              {/* 篩選器 */}
              <div className="d-flex gap-2 mb-3">
                <button
                  className={`btn btn-sm ${
                    filter === "all" ? "btn-primary" : "btn-outline-primary"
                  }`}
                  onClick={() => setFilter("all")}
                >
                  全部 ({documents.length})
                </button>
                <button
                  className={`btn btn-sm ${
                    filter === "pending" ? "btn-warning" : "btn-outline-warning"
                  }`}
                  onClick={() => setFilter("pending")}
                >
                  待審核 (
                  {documents.filter((d) => d.status === "pending").length})
                </button>
                <button
                  className={`btn btn-sm ${
                    filter === "approved"
                      ? "btn-success"
                      : "btn-outline-success"
                  }`}
                  onClick={() => setFilter("approved")}
                >
                  已核准 (
                  {documents.filter((d) => d.status === "approved").length})
                </button>
                <button
                  className={`btn btn-sm ${
                    filter === "rejected" ? "btn-danger" : "btn-outline-danger"
                  }`}
                  onClick={() => setFilter("rejected")}
                >
                  已拒絕 (
                  {documents.filter((d) => d.status === "rejected").length})
                </button>
              </div>

              {/* 批次操作 */}
              <div className="d-flex gap-2 mb-3">
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleApproveAll}
                >
                  <i className="bi bi-check-all me-1"></i>
                  全部核准
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleRejectAll}
                >
                  <i className="bi bi-x-lg me-1"></i>
                  全部拒絕
                </button>
              </div>

              {/* 文件列表 */}
              <div className="list-group">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`list-group-item list-group-item-action ${
                      selectedDoc?.id === doc.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedDoc(doc)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-1">
                          <i className={`${getTypeIcon(doc.type)} me-2`}></i>
                          {doc.filename}
                        </h6>
                        <p className="mb-1 small text-muted">
                          {formatFileSize(doc.size)} • {doc.chunks} chunks
                        </p>
                        <small className="text-muted">
                          {new Date(doc.uploadTime).toLocaleString("zh-TW")}
                        </small>
                      </div>
                      <div className="d-flex flex-column align-items-end">
                        {getStatusBadge(doc.status)}
                        {doc.status === "pending" && (
                          <div className="mt-2">
                            <button
                              className="btn btn-success btn-xs me-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(doc.id, "approved");
                              }}
                            >
                              <i className="bi bi-check"></i>
                            </button>
                            <button
                              className="btn btn-danger btn-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(doc.id, "rejected");
                              }}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredDocuments.length === 0 && !loading && (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-inbox display-6 d-block mb-2"></i>
                    {filter === "all"
                      ? "尚未上傳任何文件"
                      : `無${
                          filter === "pending"
                            ? "待審核"
                            : filter === "approved"
                            ? "已核准"
                            : "已拒絕"
                        }的文件`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右側：文件預覽和操作 */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-secondary text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-eye me-2"></i>
                內容預覽與審核
              </h5>
            </div>

            <div className="card-body">
              {selectedDoc ? (
                <>
                  {/* 文件詳情 */}
                  <div className="mb-3">
                    <h6>
                      <i
                        className={`${getTypeIcon(selectedDoc.type)} me-2`}
                      ></i>
                      {selectedDoc.filename}
                    </h6>
                    <div className="small text-muted">
                      <div>
                        類型:{" "}
                        {selectedDoc.type === "file"
                          ? "檔案上傳"
                          : selectedDoc.type === "url"
                          ? "網址"
                          : "網站爬蟲"}
                      </div>
                      <div>大小: {formatFileSize(selectedDoc.size)}</div>
                      <div>分塊數: {selectedDoc.chunks}</div>
                      <div>
                        上傳時間:{" "}
                        {new Date(selectedDoc.uploadTime).toLocaleString(
                          "zh-TW"
                        )}
                      </div>
                      <div>狀態: {getStatusBadge(selectedDoc.status)}</div>
                    </div>
                  </div>

                  {/* 內容預覽 */}
                  <div className="mb-3">
                    <label className="form-label fw-bold">內容預覽</label>
                    <div
                      className="form-control"
                      style={{ height: "200px", overflow: "auto" }}
                    >
                      {selectedDoc.preview}
                    </div>
                  </div>

                  {/* 審核操作 */}
                  {selectedDoc.status === "pending" && (
                    <div className="d-grid gap-2">
                      <button
                        className="btn btn-success"
                        onClick={() =>
                          handleStatusChange(selectedDoc.id, "approved")
                        }
                      >
                        <i className="bi bi-check-circle me-2"></i>
                        核准此文件
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() =>
                          handleStatusChange(selectedDoc.id, "rejected")
                        }
                      >
                        <i className="bi bi-x-circle me-2"></i>
                        拒絕此文件
                      </button>
                    </div>
                  )}

                  {/* 已審核狀態 */}
                  {selectedDoc.status !== "pending" && (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      此文件已
                      {selectedDoc.status === "approved" ? "核准" : "拒絕"}
                      <button
                        className="btn btn-sm btn-outline-primary ms-2"
                        onClick={() =>
                          handleStatusChange(selectedDoc.id, "pending")
                        }
                      >
                        重新審核
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-eye-slash display-6 d-block mb-2"></i>
                  請從左側選擇要預覽的文件
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 審核統計摘要 */}
      <div className="mt-4">
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">
              <i className="bi bi-graph-up me-2"></i>
              審核統計
            </h6>
            <div className="row">
              <div className="col-3">
                <div className="text-center">
                  <div className="h4 mb-1">{documents.length}</div>
                  <div className="small text-muted">總文件數</div>
                </div>
              </div>
              <div className="col-3">
                <div className="text-center">
                  <div className="h4 mb-1 text-warning">
                    {documents.filter((d) => d.status === "pending").length}
                  </div>
                  <div className="small text-muted">待審核</div>
                </div>
              </div>
              <div className="col-3">
                <div className="text-center">
                  <div className="h4 mb-1 text-success">
                    {documents.filter((d) => d.status === "approved").length}
                  </div>
                  <div className="small text-muted">已核准</div>
                </div>
              </div>
              <div className="col-3">
                <div className="text-center">
                  <div className="h4 mb-1 text-danger">
                    {documents.filter((d) => d.status === "rejected").length}
                  </div>
                  <div className="small text-muted">已拒絕</div>
                </div>
              </div>
            </div>

            {/* 完成審核按鈕 */}
            <div className="text-center mt-3">
              {documents.filter((d) => d.status === "pending").length === 0 &&
                documents.length > 0 && (
                  <button
                    className="btn btn-primary"
                    onClick={onReviewComplete}
                  >
                    <i className="bi bi-check-all me-2"></i>
                    完成內容審核
                  </button>
                )}
              {documents.filter((d) => d.status === "pending").length > 0 && (
                <div className="alert alert-warning mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  還有 {
                    documents.filter((d) => d.status === "pending").length
                  }{" "}
                  個文件待審核
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentReviewStep;
