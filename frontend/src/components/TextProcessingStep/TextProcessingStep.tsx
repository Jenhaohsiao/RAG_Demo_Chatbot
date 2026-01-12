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

  // Determine if processing has started or completed
  const hasStarted =
    shouldStartProcessing ||
    isProcessing ||
    (jobs.length > 0 && jobs.some((j) => j.status !== "pending"));

  const vectorTotal = jobs.reduce((sum, j) => sum + j.chunks, 0);
  const progressLabel = Math.round(overallProgress);

  return (
    <div className="text-processing-step">
      <div className="row g-3 mb-4 processing-panels">
        {/* 整合狀態面板 - 更緊湊的設計 */}
        <div className="col-12">
          <div className="card surface-card border-0">
            <div
              className="card-header bg-gradient py-3"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              <h4 className="card-title mb-0">Vector DB 狀態總覽</h4>
            </div>
            <div className="card-body p-4">
              {/* 上半部：關鍵指標 */}
              <div className="row g-3 mb-4">
                <div className="col-md-3 col-6">
                  <div className="p-3 bg-light rounded border">
                    <div className="d-flex align-items-center mb-1">
                      <i className="bi bi-collection text-primary me-2"></i>
                      <small className="text-muted">Collection</small>
                    </div>
                    <div className="fw-bold text-dark small">
                      session_{sessionId?.substring(0, 8) || "xxxx"}
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="p-3 bg-light rounded border">
                    <div className="d-flex align-items-center mb-1">
                      <i className="bi bi-file-earmark-text text-info me-2"></i>
                      <small className="text-muted">來源文件</small>
                    </div>
                    <div className="fw-bold text-dark">{jobs.length} 個</div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="p-3 bg-light rounded border">
                    <div className="d-flex align-items-center mb-1">
                      <i className="bi bi-vector-pen text-success me-2"></i>
                      <small className="text-muted">向量總數</small>
                    </div>
                    <div
                      className={`fw-bold ${
                        !hasStarted ? "text-muted" : "text-primary"
                      }`}
                    >
                      {!hasStarted
                        ? "未執行"
                        : jobs.reduce((sum, j) => sum + j.chunks, 0)}
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="p-3 bg-light rounded border">
                    <div className="d-flex align-items-center mb-1">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small className="text-muted">狀態</small>
                    </div>
                    <div
                      className={`fw-bold ${
                        !hasStarted
                          ? "text-muted"
                          : jobs.length > 0 &&
                            jobs.every((j) => j.status === "completed")
                          ? "text-success"
                          : "text-warning"
                      }`}
                    >
                      {!hasStarted
                        ? "未執行"
                        : jobs.length > 0 &&
                          jobs.every((j) => j.status === "completed")
                        ? "✅ 已就緒"
                        : "⏳ 處理中"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 中間部：配置詳情 */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <div className="border-start border-primary border-3 ps-3">
                    <h6 className="text-primary mb-2">
                      <i className="bi bi-gear-fill me-2"></i>向量化設定
                    </h6>
                    <div className="small">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Embedding Model:</span>
                        <strong>text-embedding-004</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Chunk Size:</span>
                        <strong>{parameters.chunk_size}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Chunk Overlap:</span>
                        <strong>{parameters.chunk_overlap}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">語言:</span>
                        <strong>
                          {parameters.answer_language === "en"
                            ? "English"
                            : parameters.answer_language === "zh-TW"
                            ? "繁體中文"
                            : "Auto"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="border-start border-info border-3 ps-3">
                    <h6 className="text-info mb-2">
                      <i className="bi bi-search me-2"></i>檢索配置
                    </h6>
                    <div className="small">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Vector DB:</span>
                        <strong>Qdrant</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">距離度量:</span>
                        <strong>Cosine</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">向量維度:</span>
                        <strong>768</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">索引類型:</span>
                        <strong>HNSW</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 下半部：提示信息 */}
              <div className="alert alert-info mb-0 d-flex align-items-start">
                <i className="bi bi-lightbulb-fill me-2 mt-1"></i>
                <div className="small">
                  <strong>重要提示：</strong>
                  <ul className="mb-0 ps-3 mt-1">
                    <li>AI 將從 Vector DB 檢索記憶，而非憑空捏造答案</li>
                    <li>適當的分塊與重疊能確保上下文連貫性</li>
                    <li>嚴格模式下，若相似度低於門檻將拒絕回答</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Area (Moved to bottom) */}
      {!jobs.some((j) => j.status === "completed") && !isProcessing && (
        <div className="action-area text-center mt-4 mb-4">
          <button
            className="btn btn-start-processing"
            onClick={() => {
              if (onProcessingStatusChange) {
                // Trigger via prop if wrapper handles logic,
                // but local startProcessing is also available if simulated.
                // Assuming shouldStartProcessing triggers useEffect, but let's call local start if wrapper logic is removed.
                // Or better, set state to trigger effect or call method directly.
                // The useEffect depends on `shouldStartProcessing`.
                // Let's assume we need to notify parent OR handle local.
                // Given previous logic relied on external trigger, let's look at Step 4 implementation. Step 4 had local click -> setShouldStartReview(true).
                // But here `shouldStartProcessing` is a prop.
                // However, the previous `WorkflowStepper` had logic to set internal state `shouldStartProcessing`.
                // If we move button here, `TextProcessingStep` needs to be able to start it.
                // The current component has `useEffect` on `shouldStartProcessing`.
                // Let's modify the component to allow internal triggering or rely on parent.
                // Actually `Step 4`'s internal button set an internal state `shouldStartReview` but here `shouldStartProcessing` is prop.
                // Wait, Step 4 had `shouldStartReview` as prop AND internal.
                // Let's check `TextProcessingStep` again. It has `shouldStartProcessing` prop.
                // And `useEffect` on it.
                // We should probably invoke `startProcessing()` directly from button click if it's cleaner.
                startProcessing();
              }
            }}
            disabled={jobs.length === 0}
          >
            <i className="bi bi-play-circle-fill me-2"></i>
            {t("workflow.common.startProcessing", "開始文本處理")}
          </button>
        </div>
      )}

      {/* 處理完成摘要 - 簡化版 */}
      {jobs.length > 0 && jobs.every((j) => j.status === "completed") && (
        <div className="text-center mt-4 mb-4">
          <div className="d-inline-flex align-items-center px-4 py-3 rounded-pill bg-success-subtle text-success border border-success-subtle shadow-sm">
            <i className="bi bi-check-circle-fill me-2 fs-4"></i>
            <span className="fw-bold fs-5">文本處理完成！</span>
            <span className="ms-2 small text-muted border-start border-success mx-2 ps-2">
              共處理 {jobs.length} 個文件，生成{" "}
              {jobs.reduce((sum, j) => sum + j.chunks, 0)} 個文本塊
            </span>
          </div>
          {/* 已刪除冗餘的提示文字 */}
        </div>
      )}
    </div>
  );
};

export default TextProcessingStep;
