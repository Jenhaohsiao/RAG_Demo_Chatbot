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
    similarity_threshold?: number;
    rag_top_k?: number;
    strict_rag_mode?: boolean;
    answer_language?: string;
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
      // 使用 setTimeout 避免在渲染期間執行狀態更新
      setTimeout(() => {
        loadProcessingJobs();
        setHasInitialized(true);
      }, 0);
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
      // 使用 setTimeout 延遲執行，避免在渲染期間更新父組件狀態
      setTimeout(() => {
        startProcessing();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStartProcessing, jobs.length]); // 依賴觸發信號和作業數量

  // 計算整體進度並在完成時保存結果
  useEffect(() => {
    if (jobs.length > 0) {
      const avgProgress =
        jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length;
      setOverallProgress(avgProgress);

      const allCompleted = jobs.every((job) => job.status === "completed");
      const anyError = jobs.some((job) => job.status === "error");

      // 使用 setTimeout 延遲執行，避免在渲染期間更新父組件狀態
      setTimeout(() => {
        // 通知父組件狀態變化
        onProcessingStatusChange?.(
          allCompleted && !anyError && jobs.length > 0
        );

        if (allCompleted && !anyError) {
          // 保存處理結果到父組件
          onSaveProcessingResults?.({
            jobs: jobs,
            overallProgress: avgProgress,
          });
          onProcessingComplete?.();
        }
      }, 0);
    } else {
      // 沒有作業時設置為未完成
      setTimeout(() => {
        onProcessingStatusChange?.(false);
      }, 0);
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

  // Determine if processing has started or completed
  const hasStarted =
    shouldStartProcessing ||
    isProcessing ||
    (jobs.length > 0 && jobs.some((j) => j.status !== "pending"));

  const vectorTotal = jobs.reduce((sum, j) => sum + j.chunks, 0);
  const progressLabel = Math.round(overallProgress);

  return (
    <div className="text-processing-step">
      {/* 簡化版狀態卡片 - 只顯示關鍵資訊 */}
      <div className="card surface-card active-card-border mb-4">
        <div className="card-body p-4">
          <div className="row g-3 align-items-center">
            {/* Collection 資訊 */}
            <div className="col-md-4">
              <div className="d-flex align-items-center">
                <i className="bi bi-database-fill text-primary fs-4 me-3"></i>
                <div>
                  <small className="text-muted d-block">Collection</small>
                  <span className="fw-bold">
                    session_{sessionId?.substring(0, 8) || "xxxx"}
                  </span>
                </div>
              </div>
            </div>

            {/* 來源文件數 */}
            <div className="col-md-4">
              <div className="d-flex align-items-center">
                <i className="bi bi-file-earmark-text text-info fs-4 me-3"></i>
                <div>
                  <small className="text-muted d-block">來源文件</small>
                  <span className="fw-bold">{jobs.length} 個</span>
                </div>
              </div>
            </div>

            {/* 向量總數 */}
            <div className="col-md-4">
              <div className="d-flex align-items-center">
                <i className="bi bi-cpu text-success fs-4 me-3"></i>
                <div>
                  <small className="text-muted d-block">Vector DB</small>
                  <span
                    className={`fw-bold ${!hasStarted ? "text-muted" : "text-success"}`}
                  >
                    {!hasStarted
                      ? "等待執行"
                      : `${jobs.reduce((sum, j) => sum + j.chunks, 0)} 個向量`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 配置摘要 - 收合在一行 */}
          <div className="mt-3 pt-3 border-top">
            <div className="d-flex flex-wrap gap-3 small text-muted">
              <span>
                <i className="bi bi-gear me-1"></i>Embedding Model:{" "}
                <strong className="text-dark">text-embedding-004</strong>
              </span>
              <span>
                <i className="bi bi-scissors me-1"></i>Chunk Size:{" "}
                <strong className="text-dark">{parameters.chunk_size}</strong>
              </span>
              <span>
                <i className="bi bi-shuffle me-1"></i>Overlap:{" "}
                <strong className="text-dark">
                  {parameters.chunk_overlap}
                </strong>
              </span>
              <span>
                <i className="bi bi-search me-1"></i>Vector DB:{" "}
                <strong className="text-dark">Qdrant</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 執行按鈕區域 - 置頂且醒目 */}
      {!jobs.some((j) => j.status === "completed") && !isProcessing && (
        <div className="text-center mb-4">
          <button
            className="btn btn-primary btn-lg px-5 py-3 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              fontSize: "1.1rem",
              fontWeight: "600",
            }}
            onClick={() => {
              startProcessing();
            }}
            disabled={jobs.length === 0}
          >
            <i className="bi bi-play-circle-fill me-2 fs-4"></i>
            開始文本處理
          </button>
          <div className="mt-2 text-muted small">
            <i className="bi bi-info-circle me-1"></i>
            將文件分塊並轉換為向量，儲存至 Vector DB
          </div>
        </div>
      )}

      {/* 處理完成狀態 */}
      {jobs.length > 0 && jobs.every((j) => j.status === "completed") && (
        <div className="text-center mb-4">
          <div
            className="alert alert-success d-inline-flex align-items-center shadow-sm"
            style={{ maxWidth: "600px" }}
          >
            <i className="bi bi-check-circle-fill me-3 fs-3"></i>
            <div className="text-start">
              <div className="fw-bold fs-5">✅ 文本處理完成！</div>
              <div className="small text-muted mt-1">
                共處理 {jobs.length} 個文件，生成{" "}
                {jobs.reduce((sum, j) => sum + j.chunks, 0)} 個文本塊
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextProcessingStep;
