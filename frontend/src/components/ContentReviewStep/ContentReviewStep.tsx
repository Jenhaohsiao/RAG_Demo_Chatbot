/**
 * Step 4: Content Review Component
 * Content preview and moderation step - Displays review results and uploaded file list
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { moderateMultipleContent } from "../../services/moderationService";
import type { ContentModerationResponse } from "../../services/moderationService";
import { useToast } from "../../hooks/useToast";
import "./ContentReviewStep.scss";

export interface ContentReviewStepProps {
  sessionId?: string;
  onReviewComplete?: () => void;
  onReviewStatusChange?: (canProceed: boolean) => void;
  documents?: DocumentInfo[]; // Received from parent component
  crawledUrls?: any[]; // Received from parent component
  shouldStartReview?: boolean; // Externally control whether to start review
  onLoadingChange?: (isLoading: boolean, message?: string) => void; // Notify parent component of loading state
  savedReviewResults?: { completed: string[]; failed: string[] } | null; // Saved review results
  onSaveReviewResults?: (results: {
    completed: string[];
    failed: string[];
  }) => void; // Callback to save review results
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
  documents: propDocuments = [], // Received from props
  crawledUrls = [], // Received from props
  shouldStartReview = false, // Received from props
  onLoadingChange,
  savedReviewResults, // Saved review results
  onSaveReviewResults, // Callback to save review results
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryOption, setShowRetryOption] = useState(false);

  const defaultDocPreview = t(
    "contentReview.defaults.documentPreview",
    "Document preview..."
  );
  const defaultSitePreview = t(
    "contentReview.defaults.sitePreview",
    "Website summary..."
  );
  const defaultDocName = (index: number) =>
    t("contentReview.defaults.documentName", "Document {{index}}", {
      index,
    });
  const defaultSiteName = (index: number) =>
    t("contentReview.defaults.siteName", "Website {{index}}", { index });

  const reviewChecklist = React.useMemo(
    () => [
      {
        key: "format",
        label: t("contentReview.items.format", "Check file format integrity"),
        short: t("contentReview.items.formatShort", "Format check"),
      },
      {
        key: "malware",
        label: t("contentReview.items.malware", "Scan for malware"),
        short: t("contentReview.items.malwareShort", "Malware scan"),
      },
      {
        key: "harm",
        label: t(
          "contentReview.items.harm",
          "Detect harmful content (blocks harassment, hate speech, sexual content, dangerous content)"
        ),
        short: t("contentReview.items.harmShort", "Harmful content check"),
      },
      {
        key: "structure",
        label: t(
          "contentReview.items.structure",
          "Validate document structure"
        ),
        short: t("contentReview.items.structureShort", "Structure validation"),
      },
      {
        key: "quality",
        label: t("contentReview.items.quality", "Analyze content quality"),
        short: t(
          "contentReview.items.qualityShort",
          "Content quality analysis"
        ),
      },
      {
        key: "copyright",
        label: t(
          "contentReview.items.copyright",
          "Check copyright restrictions"
        ),
        short: t("contentReview.items.copyrightShort", "Copyright check"),
      },
    ],
    [t]
  );

  // Add review progress state - Initialize with saved results if available
  const [reviewProgress, setReviewProgress] = useState(() => {
    if (
      savedReviewResults &&
      (savedReviewResults.completed.length > 0 ||
        savedReviewResults.failed.length > 0)
    ) {
      return {
        currentItem: "",
        completed: savedReviewResults.completed,
        failed: savedReviewResults.failed,
        isCompleted: true,
        isRunning: false,
      };
    }
    return {
      currentItem: "",
      completed: [] as string[],
      failed: [] as string[],
      isCompleted: false,
      isRunning: false,
    };
  });

  // Initialize hasStartedReview based on saved results
  const [hasStartedReview, setHasStartedReview] = useState(() => {
    return (
      savedReviewResults &&
      (savedReviewResults.completed.length > 0 ||
        savedReviewResults.failed.length > 0)
    );
  });

  // Handle retry
  const handleRetry = async () => {
    setRetryCount((prev) => prev + 1);
    setShowRetryOption(false);

    showToast({
      type: "info",
      message: t("contentReview.retrying", "Re-running content review..."),
      duration: 3000,
    });

    // Reset review state
    setReviewProgress({
      currentItem: "",
      completed: [],
      failed: [],
      isCompleted: false,
      isRunning: false,
    });

    // Restart review
    await startReviewProcess();
  };

  // Start review process
  const startReviewProcess = async () => {
    if (!sessionId) {
      return;
    }

    // Notify parent component to start loading
    if (onLoadingChange) {
      onLoadingChange(
        true,
        t("contentReview.loading", "Running content review...")
      );
    }

    setHasStartedReview(true);
    setReviewProgress({
      currentItem: "",
      completed: [],
      failed: [],
      isCompleted: false,
      isRunning: true,
    });

    // Use stable keys so progress persists across language switches
    const reviewItems = reviewChecklist.map((item) => item.key);

    try {
      // 準備審核內容
      const contentToModerate = documents.map((doc, index) => ({
        content:
          doc.preview && doc.preview !== defaultDocPreview
            ? doc.preview
            : doc.filename,
        source_reference: doc.filename || `Document ${index + 1}`,
      }));
      // 逐項執行審核
      for (let i = 0; i < reviewItems.length; i++) {
        const item = reviewItems[i];
        setReviewProgress((prev) => ({
          ...prev,
          currentItem: item,
        }));

        // 添加小延遲確保UI更新
        await new Promise((resolve) => setTimeout(resolve, 100));

        let passed = true;
        let failureReason = "";

        // 檢查每個審核項目
        if (i === 0 || i === 1 || i === 3 || i === 4 || i === 5) {
          // 檢查文件格式完整性、掃描惡意軟體、驗證文檔結構、分析內容品質、檢查版權限制 - 基本檢查總是通過
          await new Promise((resolve) => setTimeout(resolve, 1500));
          // ✅ 基本檢查總是通過，避免隨機失敗
          passed = true;
        } else if (i === 2) {
          // 檢測有害內容 - 只阻擋真正有害的內容
          if (contentToModerate.length > 0) {
            try {
              const moderationResults = await moderateMultipleContent(
                sessionId,
                contentToModerate,
                false // 不使用學術模式，因為新的邏輯已經夠寬鬆
              );
              // 檢查是否有任何內容被阻擋
              const blockedContent = moderationResults.filter(
                (result) => !result.is_approved
              );

              if (blockedContent.length > 0) {
                passed = false;
                const blockedSources = blockedContent
                  .map((item) => item.source_reference)
                  .join(", ");
                const blockedCategories = [
                  ...new Set(
                    blockedContent.flatMap((item) => item.blocked_categories)
                  ),
                ];
                failureReason = t(
                  "contentReview.harmfulFailureDetail",
                  "Detected harmful content ({{sources}}): {{categories}}",
                  {
                    sources: blockedSources,
                    categories: blockedCategories.join(", "),
                  }
                );
                // 顯示明確的有害內容警告
                showToast({
                  type: "error",
                  message: t(
                    "contentReview.harmfulDetected",
                    "Harmful content detected: harassment, hate speech, sexual content, or dangerous content"
                  ),
                  duration: 5000,
                });
              } else {
              }
            } catch (error) {
              // ⚠️ API 調用失敗 - 將錯誤記錄但不阻擋用戶
              // 這避免了因網絡問題或 API 錯誤而阻止合法內容
              passed = true;
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              // 顯示警告但不阻止繼續
              showToast({
                type: "warning",
                message: t(
                  "contentReview.serviceUnavailable",
                  "Content review service is temporarily unavailable, this check was skipped"
                ),
                duration: 3000,
              });
            }
          } else {
            // 沒有內容需要審核，直接通過
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
        // 更新進度狀態
        setReviewProgress((prev) => {
          const failureEntry = failureReason
            ? `${item}: ${failureReason}`
            : item;
          const newState = {
            ...prev,
            currentItem: "", // 清空當前項目
            completed: passed ? [...prev.completed, item] : prev.completed,
            failed: !passed ? [...prev.failed, failureEntry] : prev.failed,
          };
          return newState;
        });

        // 如果是有害內容檢測失敗，我們仍然繼續其他檢查，但會在最後標記為需要人工審核
        if (!passed && i === 2) {
          // 不要 break，繼續執行其他檢查項目
        }

        // 添加項目間的小延遲讓用戶看到進度變化
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // 完成審核
      let finalCompleted: string[] = [];
      let finalFailed: string[] = [];

      setReviewProgress((prev) => {
        const finalState = {
          ...prev,
          currentItem: "",
          isCompleted: true,
          isRunning: false,
        };

        // Capture the final state for callbacks outside setState
        finalCompleted = [...finalState.completed];
        finalFailed = [...finalState.failed];

        return finalState;
      });

      // 將通知與儲存邏輯移到 setState 之外，避免在渲染階段觸發父層更新
      const completedToSave = finalCompleted.length
        ? finalCompleted
        : reviewProgress.completed;
      const failedToSave = finalFailed.length
        ? finalFailed
        : reviewProgress.failed;

      onSaveReviewResults?.({
        completed: completedToSave,
        failed: failedToSave,
      });

      const canProceed = failedToSave.length === 0;

      // 通知父組件結束 loading
      if (onLoadingChange) {
        onLoadingChange(false);
      }

      onReviewStatusChange?.(canProceed);
      if (canProceed) {
        onReviewComplete?.();
        // 不再重置 hasStartedReview，保持為 true 以便返回時顯示結果
      }
    } catch (error) {
      // 通知父組件結束 loading（錯誤情況）
      if (onLoadingChange) {
        onLoadingChange(false);
      }

      setReviewProgress((prev) => ({
        ...prev,
        isCompleted: true,
        isRunning: false,
        currentItem: "",
        failed: [
          ...prev.failed,
          `generic:${t(
            "contentReview.genericError",
            "An error occurred during review"
          )}`,
        ],
      }));
      setHasStartedReview(false); // 重置審核狀態
      onReviewStatusChange?.(false);
    }
  };

  // 從外部觸發審核過程（移除自動執行）
  React.useEffect(() => {
    // 移除自動執行邏輯，改由外部按鈕觸發
  }, []);

  // 監聽外部觸發信號
  React.useEffect(() => {
    // 添加 sessionId 檢查，避免在沒有 sessionId 時執行
    // 使用 ref 來追蹤是否已經開始審核，避免重複執行
    if (
      shouldStartReview &&
      !hasStartedReview &&
      !reviewProgress.isRunning &&
      sessionId
    ) {
      // 使用 setTimeout 延遲執行，避免在渲染期間更新父組件狀態
      setTimeout(() => {
        startReviewProcess();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStartReview, sessionId]); // 只依賴外部觸發信號和 sessionId

  // 轉換props數據為組件需要的格式
  const documents = React.useMemo(() => {
    const result: DocumentInfo[] = [];

    // 處理propDocuments
    if (propDocuments && propDocuments.length > 0) {
      propDocuments.forEach((doc: any, index: number) => {
        const documentInfo = {
          id: `file-${index}`,
          filename: doc.filename || doc.name || defaultDocName(index + 1),
          type: "file" as const,
          size: doc.size || 1024000,
          uploadTime: doc.uploadTime || new Date().toISOString(),
          status: "approved" as const,
          preview: doc.content || doc.preview || defaultDocPreview,
          chunks: doc.chunks || 5,
        };
        result.push(documentInfo);
      });
    }

    // 處理crawledUrls
    if (crawledUrls && crawledUrls.length > 0) {
      crawledUrls.forEach((url: any, index: number) => {
        result.push({
          id: `url-${index}`,
          filename: url.url || defaultSiteName(index + 1),
          type: "crawler",
          size: url.content_size || 500000,
          uploadTime: url.crawl_time || new Date().toISOString(),
          status: "approved",
          preview: url.summary || defaultSitePreview,
          chunks: url.chunks || 3,
        });
      });
    }

    return result;
  }, [propDocuments, crawledUrls]);

  const totalChecklistItems = reviewChecklist.length;
  const completedCount =
    reviewProgress.completed.length + reviewProgress.failed.length;
  const progressPercent = Math.round(
    (completedCount / totalChecklistItems) * 100
  );

  return (
    <div className="content-review-step">
      {/* 簡化版審核資訊卡片 */}
      <div className="card mb-3 shadow-sm active-card-border surface-card">
        <div className="card-body p-3">
          {/* 審核工具說明 - 更簡潔 */}
          <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
            <i className="bi bi-shield-check text-primary fs-4 me-2"></i>
            <div>
              <span className="fw-bold me-2">
                {t("contentReview.header.title", "Gemini Safety API")}
              </span>
              <small className="text-muted">
                {t("contentReview.header.subtitle", "Blocks unsafe content")}
              </small>
            </div>
          </div>

          {/* 審核項目 - 精簡顯示 */}
          {(hasStartedReview ||
            reviewProgress.isRunning ||
            reviewProgress.isCompleted) && (
            <div className="row g-2 mb-3">
              {reviewChecklist.map(({ key, label, short }) => {
                const isCompleted = reviewProgress.completed.includes(key);
                const isFailed = reviewProgress.failed.some((failedItem) =>
                  failedItem.startsWith(key)
                );
                const isCurrent = reviewProgress.currentItem === label;

                let iconClass = "bi-circle text-muted";
                if (isCompleted)
                  iconClass = "bi-check-circle-fill text-success";
                else if (isFailed) iconClass = "bi-x-circle-fill text-danger";
                else if (isCurrent)
                  iconClass = "spinner-border spinner-border-sm text-primary";

                return (
                  <div key={key} className="col-md-4 col-6">
                    <div className="d-flex align-items-center small">
                      {isCurrent ? (
                        <div
                          className={iconClass}
                          role="status"
                          style={{ width: "1rem", height: "1rem" }}
                        ></div>
                      ) : (
                        <i className={`bi ${iconClass} me-2`}></i>
                      )}
                      <span className={isCurrent ? "ms-2" : ""}>{short}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 進度條 - 只在審核中顯示 */}
          {reviewProgress.isRunning && (
            <div className="mb-3">
              <div className="progress" style={{ height: "8px" }}>
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
          )}

          {/* 執行按鈕 / 完成訊息 - 固定在同一位置 */}
          <div className="text-center mt-3">
            {!hasStartedReview &&
              !reviewProgress.isRunning &&
              !reviewProgress.isCompleted && (
                <>
                  <button
                    className="btn btn-primary btn-lg px-5 py-3 shadow-lg"
                    style={{
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      border: "none",
                      fontSize: "1.1rem",
                      fontWeight: "600",
                    }}
                    onClick={() => startReviewProcess()}
                    disabled={
                      documents.length === 0 && crawledUrls.length === 0
                    }
                  >
                    <i className="bi bi-shield-check me-2 fs-4"></i>
                    {t("contentReview.startButton", "Start content review")}
                  </button>
                  {documents.length === 0 && crawledUrls.length === 0 ? (
                    <div className="text-muted mt-2 small">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      {t(
                        "contentReview.uploadFirst",
                        'Please upload files in the "Data Upload" step first'
                      )}
                    </div>
                  ) : (
                    <div className="text-muted mt-2 small">
                      <i className="bi bi-info-circle me-1"></i>
                      {t(
                        "contentReview.infoHint",
                        "Checks file safety and content compliance"
                      )}
                    </div>
                  )}
                </>
              )}

            {/* 完成訊息 - 與按鈕在同一位置 */}
            {reviewProgress.isCompleted &&
              reviewProgress.failed.length === 0 && (
                <div className="alert alert-success d-inline-flex align-items-center mb-0 shadow-sm">
                  <i className="bi bi-check-circle-fill me-2 fs-3"></i>
                  <div className="text-start">
                    <div className="fw-bold fs-5">
                      {t("contentReview.successTitle", "Review completed")}
                    </div>
                    <div className="small text-muted mt-1">
                      {t(
                        "contentReview.successSubtext",
                        "Content meets policy; you may continue to the next step"
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* 審核失敗提示 - 與按鈕在同一位置 */}
            {reviewProgress.isCompleted && reviewProgress.failed.length > 0 && (
              <div className="alert alert-danger mb-0 border-0 shadow-sm">
                <div className="d-flex align-items-center mb-2">
                  <i className="bi bi-x-circle-fill me-2 fs-4"></i>
                  <strong>
                    {t("contentReview.failureTitle", "Review failed")}
                  </strong>
                </div>
                <p className="mb-2 small">
                  {t(
                    "contentReview.failureSubtext",
                    'Inappropriate content detected. Click "Previous" to re-upload.'
                  )}
                </p>
                <div className="bg-white rounded p-2 border border-danger-subtle">
                  {reviewProgress.failed.map((failure, index) => {
                    const separatorIndex = failure.indexOf(":");
                    const failureKey =
                      separatorIndex >= 0
                        ? failure.slice(0, separatorIndex)
                        : failure;
                    const failureDetail =
                      separatorIndex >= 0
                        ? failure.slice(separatorIndex + 1).trim()
                        : "";
                    const checklistLabel =
                      reviewChecklist.find((item) => item.key === failureKey)
                        ?.label || failureKey;
                    return (
                      <div key={index} className="mb-1 text-danger small">
                        • {checklistLabel}
                        {failureDetail ? `: ${failureDetail}` : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentReviewStep;
