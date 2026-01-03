/**
 * Step 4: Content Review Component
 * 內容預覽與審核步驟 - 顯示審核結果和上傳文件列表
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export interface ContentReviewStepProps {
  sessionId?: string;
  onReviewComplete?: () => void;
  onReviewStatusChange?: (canProceed: boolean) => void;
  documents?: DocumentInfo[]; // 從父組件接收documents
  crawledUrls?: any[]; // 從父組件接收crawledUrls
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
  onReviewStatusChange,
  documents: propDocuments = [], // 從props接收
  crawledUrls = [], // 從props接收
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // 添加審核進度狀態
  const [reviewProgress, setReviewProgress] = useState({
    currentItem: "",
    completed: [] as string[],
    failed: [] as string[],
    isCompleted: false,
    isRunning: false,
  });
  const [hasStartedReview, setHasStartedReview] = useState(false);

  // 開始審核過程
  const startReviewProcess = async () => {
    setHasStartedReview(true);
    setReviewProgress({
      currentItem: "",
      completed: [],
      failed: [],
      isCompleted: false,
      isRunning: true,
    });

    const reviewItems = [
      "檢查文件格式完整性",
      "掃描惡意軟體",
      "檢測敏感內容",
      "驗證文檔結構",
      "分析內容品質",
      "檢查版權限制",
    ];

    // 模擬逐項審核過程
    for (let i = 0; i < reviewItems.length; i++) {
      const item = reviewItems[i];
      setReviewProgress((prev) => ({ ...prev, currentItem: item }));

      // 模擬審核時間
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 模擬審核結果（大部分通過，少數可能失敗）
      const passed = Math.random() > 0.1; // 90%通過率

      setReviewProgress((prev) => ({
        ...prev,
        currentItem: "",
        completed: passed ? [...prev.completed, item] : prev.completed,
        failed: !passed ? [...prev.failed, item] : prev.failed,
      }));
    }

    // 完成審核
    setReviewProgress((prev) => ({
      ...prev,
      isCompleted: true,
      isRunning: false,
      currentItem: "",
    }));

    // 通知父組件審核完成
    onReviewStatusChange?.(true);
    onReviewComplete?.();
  };

  // 自動啟動審核過程
  React.useEffect(() => {
    if (!hasStartedReview) {
      setTimeout(() => {
        startReviewProcess();
      }, 1000);
    }
  }, [hasStartedReview]);

  // 轉換props數據為組件需要的格式
  const documents = React.useMemo(() => {
    const result: DocumentInfo[] = [];

    // 處理propDocuments
    if (propDocuments && propDocuments.length > 0) {
      propDocuments.forEach((doc: any, index: number) => {
        result.push({
          id: `file-${index}`,
          filename: doc.filename || doc.name || `文檔 ${index + 1}`,
          type: "file",
          size: doc.size || 1024000,
          uploadTime: doc.uploadTime || new Date().toISOString(),
          status: "approved",
          preview: doc.content || doc.preview || "文檔內容預覽...",
          chunks: doc.chunks || 5,
        });
      });
    }

    // 處理crawledUrls
    if (crawledUrls && crawledUrls.length > 0) {
      crawledUrls.forEach((url: any, index: number) => {
        result.push({
          id: `url-${index}`,
          filename: url.url || `網站 ${index + 1}`,
          type: "crawler",
          size: url.content_size || 500000,
          uploadTime: url.crawl_time || new Date().toISOString(),
          status: "approved",
          preview: url.summary || "網站內容摘要...",
          chunks: url.chunks || 3,
        });
      });
    }

    return result;
  }, [propDocuments, crawledUrls]);

  return (
    <div className="content-review-step">
      {/* 審核進度區域 */}
      {reviewProgress.isRunning && (
        <div className="card mb-4 border-primary">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">
              <i className="bi bi-shield-check me-2"></i>
              內容安全審核中...
            </h6>
          </div>
          <div className="card-body">
            <div className="mb-4">
              <div className="d-flex align-items-center mb-3">
                <div
                  className="spinner-border spinner-border-sm text-primary me-3"
                  role="status"
                >
                  <span className="visually-hidden">審核中...</span>
                </div>
                <span className="text-primary fw-bold">
                  {reviewProgress.currentItem || "準備開始審核..."}
                </span>
              </div>
              <div className="progress mb-3" style={{ height: "8px" }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  style={{
                    width: `${
                      ((reviewProgress.completed.length +
                        reviewProgress.failed.length) /
                        6) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* 審核項目列表 */}
            <div>
              <h6>審核項目與結果：</h6>
              <div className="row">
                {reviewProgress.completed.map((item, index) => (
                  <div key={`completed-${index}`} className="col-md-6 mb-2">
                    <div className="d-flex align-items-center p-2 bg-light rounded">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      <small className="text-success">{item}</small>
                    </div>
                  </div>
                ))}
                {reviewProgress.failed.map((item, index) => (
                  <div key={`failed-${index}`} className="col-md-6 mb-2">
                    <div className="d-flex align-items-center p-2 bg-light rounded">
                      <i className="bi bi-x-circle-fill text-danger me-2"></i>
                      <small className="text-danger">{item}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 審核完成後的結果摘要 */}
      {reviewProgress.isCompleted && (
        <div className="card mb-4 border-success">
          <div className="card-header bg-success text-white">
            <h6 className="mb-0">
              <i className="bi bi-check-circle me-2"></i>
              內容審核完成
            </h6>
          </div>
          <div className="card-body">
            <div className="alert alert-success mb-3">
              <i className="bi bi-check-circle-fill me-2"></i>
              <strong>審核完成！</strong>{" "}
              所有上傳的內容已通過安全檢查，可以進入下一步。
            </div>

            <div className="row text-center">
              <div className="col-6">
                <span className="badge bg-success fs-6 me-2">
                  {reviewProgress.completed.length}
                </span>
                <span>項目通過</span>
              </div>
              <div className="col-6">
                <span className="badge bg-danger fs-6 me-2">
                  {reviewProgress.failed.length}
                </span>
                <span>項目未通過</span>
              </div>
            </div>

            <div className="row mt-3">
              {reviewProgress.completed.map((item, index) => (
                <div
                  key={`summary-completed-${index}`}
                  className="col-md-6 mb-2"
                >
                  <div className="d-flex align-items-center">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <small>{item}</small>
                  </div>
                </div>
              ))}
              {reviewProgress.failed.map((item, index) => (
                <div key={`summary-failed-${index}`} className="col-md-6 mb-2">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-x-circle-fill text-danger me-2"></i>
                    <small>{item}</small>
                  </div>
                </div>
              ))}
            </div>

            {/* 文件統計 */}
            <div className="row mt-4 text-center">
              <div className="col-4">
                <div className="h5 text-primary mb-1">{documents.length}</div>
                <div className="small text-muted">總文件數</div>
              </div>
              <div className="col-4">
                <div className="h5 text-success mb-1">{documents.length}</div>
                <div className="small text-muted">已核准</div>
              </div>
              <div className="col-4">
                <div className="h5 text-info mb-1">
                  {documents.reduce((sum, doc) => sum + (doc.chunks || 0), 0)}
                </div>
                <div className="small text-muted">文件塊</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentReviewStep;
