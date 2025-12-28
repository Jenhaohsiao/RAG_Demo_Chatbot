/**
 * Step 5: Text Processing Component
 * 文本切割與向量嵌入步驟 - 處理文件切塊和向量化
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./TextProcessingStep.css";

export interface TextProcessingStepProps {
  parameters: {
    chunk_size: number;
    chunk_overlap: number;
  };
  onParameterChange: (parameter: string, value: any) => void;
  sessionId?: string;
  onProcessingComplete?: () => void;
  onProcessingStatusChange?: (isCompleted: boolean) => void;
  documents?: any[];
  crawledUrls?: any[];
}

interface ProcessingJob {
  id: string;
  filename: string;
  status: "pending" | "chunking" | "embedding" | "completed" | "error";
  progress: number;
  chunks: number;
  totalChunks?: number;
  errorMessage?: string;
  startTime: string;
  endTime?: string;
}

const TextProcessingStep: React.FC<TextProcessingStepProps> = ({
  parameters,
  onParameterChange,
  sessionId,
  onProcessingComplete,
  onProcessingStatusChange,
  documents = [],
  crawledUrls = [],
}) => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 載入處理作業，當文檔或URL變化時重新加載
  useEffect(() => {
    if (sessionId && (documents.length > 0 || crawledUrls.length > 0)) {
      loadProcessingJobs();
    }
  }, [sessionId, documents, crawledUrls]);

  // 計算整體進度
  useEffect(() => {
    if (jobs.length > 0) {
      const avgProgress =
        jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length;
      setOverallProgress(avgProgress);

      const allCompleted = jobs.every((job) => job.status === "completed");
      const anyError = jobs.some((job) => job.status === "error");

      // 通知父組件狀態變化
      onProcessingStatusChange?.(allCompleted && !anyError && jobs.length > 0);

      if (allCompleted && !anyError) {
        onProcessingComplete?.();
      }
    } else {
      // 沒有作業時設置為未完成
      onProcessingStatusChange?.(false);
    }
  }, [jobs, onProcessingComplete, onProcessingStatusChange]);

  const loadProcessingJobs = async () => {
    // 使用實際上傳的文檔數據
    const jobsFromDocuments = documents.map((doc, index) => ({
      id: `doc-${doc.id || index}`,
      filename: doc.name || doc.filename || `document-${index + 1}`,
      status: "pending" as const,
      progress: 0,
      chunks: 0,
      totalChunks: Math.floor(Math.random() * 20) + 10, // 模擬預估分塊數
      startTime: new Date().toISOString(),
    }));

    const jobsFromUrls = crawledUrls.map((url, index) => ({
      id: `url-${url.id || index}`,
      filename: url.title || url.url || `website-${index + 1}`,
      status: "pending" as const,
      progress: 0,
      chunks: 0,
      totalChunks: Math.floor(Math.random() * 15) + 5, // 模擬預估分塊數
      startTime: new Date().toISOString(),
    }));

    const allJobs = [...jobsFromDocuments, ...jobsFromUrls];
    setJobs(allJobs);
  };

  const startProcessing = async () => {
    setIsProcessing(true);

    // 模擬處理過程
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      // 開始切塊
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: "chunking", progress: 5 } : j
        )
      );

      // 模擬切塊進度
      for (let progress = 10; progress <= 50; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  progress,
                  chunks: Math.floor((progress / 50) * (j.totalChunks || 0)),
                }
              : j
          )
        );
      }

      // 開始向量嵌入
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: "embedding", progress: 60 } : j
        )
      );

      // 模擬嵌入進度
      for (let progress = 70; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  progress,
                  chunks: j.totalChunks || 0,
                  ...(progress === 100 && {
                    status: "completed",
                    endTime: new Date().toISOString(),
                  }),
                }
              : j
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: "bi-clock",
      chunking: "bi-scissors",
      embedding: "bi-cpu",
      completed: "bi-check-circle",
      error: "bi-x-circle",
    };
    return icons[status as keyof typeof icons] || "bi-clock";
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-secondary",
      chunking: "bg-warning",
      embedding: "bg-info",
      completed: "bg-success",
      error: "bg-danger",
    };
    const labels = {
      pending: "等待中",
      chunking: "切塊中",
      embedding: "嵌入中",
      completed: "已完成",
      error: "錯誤",
    };
    return (
      <span className={`badge ${variants[status as keyof typeof variants]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    return `${duration}秒`;
  };

  return (
    <div className="text-processing-step">
      {/* 處理設定 */}
      <div className="card mb-4">
        <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">
            <i className="bi bi-gear me-2"></i>
            文本處理設定
          </h5>
          <button
            className="btn btn-sm btn-outline-light"
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? "隱藏" : "顯示"}設定
          </button>
        </div>

        {showSettings && (
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <label className="form-label">
                  文本分塊大小: {parameters.chunk_size} 字符
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="100"
                  max="2000"
                  step="100"
                  value={parameters.chunk_size}
                  onChange={(e) =>
                    onParameterChange("chunk_size", parseInt(e.target.value))
                  }
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>100</span>
                  <span>2000</span>
                </div>
                <div className="form-text">每個文本塊的最大字符數</div>
              </div>

              <div className="col-md-6">
                <label className="form-label">
                  分塊重疊: {parameters.chunk_overlap} 字符
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="500"
                  step="50"
                  value={parameters.chunk_overlap}
                  onChange={(e) =>
                    onParameterChange("chunk_overlap", parseInt(e.target.value))
                  }
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>0</span>
                  <span>500</span>
                </div>
                <div className="form-text">相鄰文本塊之間的重疊字符數</div>
              </div>
            </div>

            {/* 設定說明 */}
            <div className="mt-3 p-3 bg-light rounded">
              <small className="text-muted">
                <strong>建議設定：</strong>
                <br />• 較小的分塊大小提供更精確的檢索，但可能遺失上下文
                <br />• 較大的重疊值有助於保持語意連貫性，但增加儲存空間
                <br />• 一般建議：分塊大小 500-1000 字符，重疊 50-200 字符
              </small>
            </div>
          </div>
        )}
      </div>

      {/* 整體進度 */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="card-title mb-0">
              <i className="bi bi-speedometer me-2"></i>
              整體處理進度
            </h6>
            <span className="fw-bold">{overallProgress.toFixed(1)}%</span>
          </div>

          <div className="progress mb-3 text-processing-progress-main">
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${overallProgress}%` }}
              aria-valuenow={overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>

          <div className="row text-center">
            <div className="col-3">
              <div className="h5 mb-1">{jobs.length}</div>
              <div className="small text-muted">總文件數</div>
            </div>
            <div className="col-3">
              <div className="h5 mb-1">
                {jobs.filter((j) => j.status === "pending").length}
              </div>
              <div className="small text-muted">等待處理</div>
            </div>
            <div className="col-3">
              <div className="h5 mb-1">
                {
                  jobs.filter((j) =>
                    ["chunking", "embedding"].includes(j.status)
                  ).length
                }
              </div>
              <div className="small text-muted">處理中</div>
            </div>
            <div className="col-3">
              <div className="h5 mb-1">
                {jobs.filter((j) => j.status === "completed").length}
              </div>
              <div className="small text-muted">已完成</div>
            </div>
          </div>

          {/* 開始處理按鈕 */}
          <div className="text-center mt-3">
            {!isProcessing && jobs.some((j) => j.status === "pending") && (
              <button className="btn btn-success" onClick={startProcessing}>
                <i className="bi bi-play me-2"></i>
                開始文本處理
              </button>
            )}
            {isProcessing && (
              <button className="btn btn-secondary" disabled>
                <div
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                處理中...
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 處理作業列表 */}
      <div className="card">
        <div className="card-header bg-secondary text-white">
          <h5 className="card-title mb-0">
            <i className="bi bi-list-task me-2"></i>
            處理作業狀態
          </h5>
        </div>

        <div className="card-body">
          {jobs.map((job) => (
            <div key={job.id} className="border rounded mb-3 p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">
                  <i className={`${getStatusIcon(job.status)} me-2`}></i>
                  {job.filename}
                </h6>
                {getStatusBadge(job.status)}
              </div>

              {/* 進度條 */}
              <div className="progress mb-2 text-processing-progress-job">
                <div
                  className={`progress-bar ${
                    job.status === "error"
                      ? "bg-danger"
                      : job.status === "completed"
                      ? "bg-success"
                      : ""
                  }`}
                  role="progressbar"
                  style={{ width: `${job.progress}%` }}
                  aria-valuenow={job.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>

              <div className="row small text-muted">
                <div className="col-4">進度: {job.progress.toFixed(1)}%</div>
                <div className="col-4">
                  分塊: {job.chunks}/{job.totalChunks || 0}
                </div>
                <div className="col-4">
                  耗時: {formatDuration(job.startTime, job.endTime)}
                </div>
              </div>

              {job.status === "error" && job.errorMessage && (
                <div className="alert alert-danger mt-2 mb-0 small">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {job.errorMessage}
                </div>
              )}

              {job.status === "completed" && (
                <div className="alert alert-success mt-2 mb-0 small">
                  <i className="bi bi-check-circle me-2"></i>
                  處理完成！共生成 {job.chunks} 個文本塊並完成向量嵌入
                </div>
              )}
            </div>
          ))}

          {jobs.length === 0 && (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox display-6 d-block mb-2"></i>
              尚未有文件需要處理
            </div>
          )}
        </div>
      </div>

      {/* 處理完成摘要 */}
      {jobs.length > 0 && jobs.every((j) => j.status === "completed") && (
        <div className="mt-4">
          <div className="alert alert-success">
            <h6 className="alert-heading">
              <i className="bi bi-check-circle me-2"></i>
              文本處理完成！
            </h6>
            <div className="row">
              <div className="col-md-3">
                <strong>處理文件數：</strong> {jobs.length}
              </div>
              <div className="col-md-3">
                <strong>總分塊數：</strong>{" "}
                {jobs.reduce((sum, j) => sum + j.chunks, 0)}
              </div>
              <div className="col-md-3">
                <strong>平均分塊：</strong>{" "}
                {Math.round(
                  jobs.reduce((sum, j) => sum + j.chunks, 0) / jobs.length
                )}
              </div>
              <div className="col-md-3">
                <strong>總耗時：</strong>{" "}
                {jobs.reduce((sum, j) => {
                  const duration = j.endTime
                    ? Math.floor(
                        (new Date(j.endTime).getTime() -
                          new Date(j.startTime).getTime()) /
                          1000
                      )
                    : 0;
                  return sum + duration;
                }, 0)}
                秒
              </div>
            </div>
            <hr />
            <div className="mb-0">
              所有文件已完成文本切割和向量嵌入，可以進入下一步進行 AI 對談。
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextProcessingStep;
