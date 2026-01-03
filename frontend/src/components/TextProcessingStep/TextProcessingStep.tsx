/**
 * Step 5: Text Processing Component
 * 文本切割與向量嵌入步驟 - 處理文件切塊和向量化
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./TextProcessingStep.scss";

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
  onLoadingChange?: (isLoading: boolean, message?: string) => void; // 通知父組件 loading 狀態
  shouldStartProcessing?: boolean; // 從外部控制是否開始處理
  savedProcessingResults?: {
    jobs: ProcessingJob[];
    overallProgress: number;
  } | null; // 保存的處理結果
  onSaveProcessingResults?: (results: {
    jobs: ProcessingJob[];
    overallProgress: number;
  }) => void; // 保存處理結果回調
}

const TextProcessingStep: React.FC<TextProcessingStepProps> = ({
  parameters,
  onParameterChange,
  sessionId,
  onProcessingComplete,
  onProcessingStatusChange,
  documents = [],
  crawledUrls = [],
  onLoadingChange,
  shouldStartProcessing = false,
  savedProcessingResults,
  onSaveProcessingResults,
}) => {
  const { t } = useTranslation();

  // 如果有保存的結果，使用保存的結果初始化
  const [jobs, setJobs] = useState<ProcessingJob[]>(() => {
    if (savedProcessingResults && savedProcessingResults.jobs.length > 0) {
      return savedProcessingResults.jobs;
    }
    return [];
  });

  const [overallProgress, setOverallProgress] = useState(() => {
    if (savedProcessingResults) {
      return savedProcessingResults.overallProgress;
    }
    return 0;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 追蹤是否已經初始化過（用於判斷是否需要載入新作業）
  const [hasInitialized, setHasInitialized] = useState(() => {
    return savedProcessingResults && savedProcessingResults.jobs.length > 0;
  });

  // 載入處理作業，當文檔或URL變化時重新加載（只在沒有保存結果時）
  useEffect(() => {
    if (
      sessionId &&
      (documents.length > 0 || crawledUrls.length > 0) &&
      !hasInitialized
    ) {
      loadProcessingJobs();
      setHasInitialized(true);
    }
  }, [sessionId, documents, crawledUrls, hasInitialized]);

  // 當外部觸發開始處理時
  useEffect(() => {
    if (
      shouldStartProcessing &&
      !isProcessing &&
      jobs.length > 0 &&
      jobs.some((j) => j.status === "pending")
    ) {
      startProcessing();
    }
  }, [shouldStartProcessing]);

  // 計算整體進度並在完成時保存結果
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
        // 保存處理結果到父組件
        onSaveProcessingResults?.({
          jobs: jobs,
          overallProgress: avgProgress,
        });
        onProcessingComplete?.();
      }
    } else {
      // 沒有作業時設置為未完成
      onProcessingStatusChange?.(false);
    }
  }, [
    jobs,
    onProcessingComplete,
    onProcessingStatusChange,
    onSaveProcessingResults,
  ]);

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

    // 通知父組件開始 loading
    if (onLoadingChange) {
      onLoadingChange(true, "正在進行文本處理...");
    }

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

    // 通知父組件結束 loading
    if (onLoadingChange) {
      onLoadingChange(false);
    }
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
      {/* 簡化合併 - 3個 Card 在同一行 */}
      <div className="row g-3 mb-4">
        {/* 處理參數 Card */}
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-header bg-secondary text-white py-2">
              <h6 className="card-title mb-0">
                <i className="bi bi-gear me-2"></i>
                處理參數
              </h6>
            </div>
            <div className="card-body p-3">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="text-muted">分塊大小</small>
                  <strong className="text-primary small">
                    {parameters.chunk_size}
                  </strong>
                </div>
                <input
                  type="range"
                  className="form-range form-range-sm"
                  min="100"
                  max="2000"
                  step="100"
                  value={parameters.chunk_size}
                  onChange={(e) =>
                    onParameterChange("chunk_size", parseInt(e.target.value))
                  }
                />
                <div
                  className="d-flex justify-content-between"
                  style={{ fontSize: "0.65rem", color: "#6c757d" }}
                >
                  <span>100</span>
                  <span>2000</span>
                </div>
              </div>

              <div>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="text-muted">分塊重疊</small>
                  <strong className="text-primary small">
                    {parameters.chunk_overlap}
                  </strong>
                </div>
                <input
                  type="range"
                  className="form-range form-range-sm"
                  min="0"
                  max="500"
                  step="50"
                  value={parameters.chunk_overlap}
                  onChange={(e) =>
                    onParameterChange("chunk_overlap", parseInt(e.target.value))
                  }
                />
                <div
                  className="d-flex justify-content-between"
                  style={{ fontSize: "0.65rem", color: "#6c757d" }}
                >
                  <span>0</span>
                  <span>500</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 整體進度 Card */}
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-header bg-info text-white py-2">
              <h6 className="card-title mb-0">
                <i className="bi bi-speedometer me-2"></i>
                整體進度
              </h6>
            </div>
            <div className="card-body p-3">
              <div className="text-center mb-2">
                <h3 className="mb-0 text-primary">
                  {overallProgress.toFixed(1)}%
                </h3>
              </div>
              <div className="progress mb-3" style={{ height: "8px" }}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${overallProgress}%` }}
                  aria-valuenow={overallProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
              <div className="row text-center small">
                <div className="col-6 mb-2">
                  <div className="fw-bold">{jobs.length}</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                    總文件
                  </div>
                </div>
                <div className="col-6 mb-2">
                  <div className="fw-bold">
                    {jobs.filter((j) => j.status === "completed").length}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                    已完成
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-bold">
                    {jobs.filter((j) => j.status === "pending").length}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                    等待中
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-bold">
                    {
                      jobs.filter((j) =>
                        ["chunking", "embedding"].includes(j.status)
                      ).length
                    }
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                    處理中
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 處理統計 Card */}
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-header bg-success text-white py-2">
              <h6 className="card-title mb-0">
                <i className="bi bi-clipboard-data me-2"></i>
                處理統計
              </h6>
            </div>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <small className="text-muted">總分塊數</small>
                <strong className="text-dark">
                  {jobs.reduce((sum, j) => sum + (j.totalChunks || 0), 0)}
                </strong>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <small className="text-muted">已處理分塊</small>
                <strong className="text-success">
                  {jobs.reduce((sum, j) => sum + j.chunks, 0)}
                </strong>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <small className="text-muted">成功數</small>
                <strong className="text-success">
                  {jobs.filter((j) => j.status === "completed").length}
                </strong>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <small className="text-muted">錯誤數</small>
                <strong className="text-danger">
                  {jobs.filter((j) => j.status === "error").length}
                </strong>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">耗時</small>
                <strong className="text-info">
                  {jobs.length > 0 && jobs[0].startTime
                    ? formatDuration(
                        jobs[0].startTime,
                        jobs.every((j) => j.status === "completed")
                          ? jobs[jobs.length - 1].endTime
                          : undefined
                      )
                    : "0秒"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 處理完成摘要 - 簡化版 */}
      {jobs.length > 0 && jobs.every((j) => j.status === "completed") && (
        <div className="alert alert-success mb-0">
          <div className="d-flex align-items-center">
            <i className="bi bi-check-circle-fill me-2 fs-5"></i>
            <strong>文本處理完成！</strong>
            <span className="ms-3 text-muted">
              共處理 {jobs.length} 個文件，生成{" "}
              {jobs.reduce((sum, j) => sum + j.chunks, 0)}{" "}
              個文本塊，可進入下一步
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextProcessingStep;
