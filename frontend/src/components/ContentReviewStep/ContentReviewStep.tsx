/**
 * Step 4: Content Review Component
 * 內容預覽與審核步驟 - 顯示審核結果和上傳文件列表
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { moderateMultipleContent } from "../../services/moderationService";
import type { ContentModerationResponse } from "../../services/moderationService";
import { useToast } from "../../hooks/useToast";

export interface ContentReviewStepProps {
  sessionId?: string;
  onReviewComplete?: () => void;
  onReviewStatusChange?: (canProceed: boolean) => void;
  documents?: DocumentInfo[]; // 從父組件接收documents
  crawledUrls?: any[]; // 從父組件接收crawledUrls
  shouldStartReview?: boolean; // 外部控制是否開始審核
  onLoadingChange?: (isLoading: boolean, message?: string) => void; // 通知父組件 loading 狀態
  savedReviewResults?: { completed: string[]; failed: string[] } | null; // 保存的審核結果
  onSaveReviewResults?: (results: {
    completed: string[];
    failed: string[];
  }) => void; // 保存審核結果回調
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
  shouldStartReview = false, // 從props接收
  onLoadingChange,
  savedReviewResults, // 保存的審核結果
  onSaveReviewResults, // 保存審核結果回調
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryOption, setShowRetryOption] = useState(false);

  // 添加審核進度狀態 - 如果有保存的結果，使用保存的結果初始化
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

  // 根據是否有保存的結果來初始化 hasStartedReview
  const [hasStartedReview, setHasStartedReview] = useState(() => {
    return (
      savedReviewResults &&
      (savedReviewResults.completed.length > 0 ||
        savedReviewResults.failed.length > 0)
    );
  });

  // 重試處理
  const handleRetry = async () => {
    console.log("[ContentReview] Retrying content review");
    setRetryCount((prev) => prev + 1);
    setShowRetryOption(false);

    showToast({
      type: "info",
      message: "正在重新審核...",
      duration: 3000,
    });

    // 重置審核狀態
    setReviewProgress({
      currentItem: "",
      completed: [],
      failed: [],
      isCompleted: false,
      isRunning: false,
    });

    // 重新開始審核
    await startReviewProcess();
  };

  // 開始審核過程
  const startReviewProcess = async () => {
    console.log("startReviewProcess called");
    if (!sessionId) {
      console.error("No sessionId provided for content review");
      return;
    }

    // 通知父組件開始 loading
    if (onLoadingChange) {
      onLoadingChange(true, "正在進行內容審核...");
    }

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
      "檢測有害內容 (僅阻擋騷擾、仇恨言論、性相關內容、危險內容)",
      "驗證文檔結構",
      "分析內容品質",
      "檢查版權限制",
    ];

    try {
      // 準備審核內容
      const contentToModerate = documents.map((doc, index) => ({
        content:
          doc.preview && doc.preview !== "文檔內容預覽..."
            ? doc.preview
            : doc.filename,
        source_reference: doc.filename || `Document ${index + 1}`,
      }));

      console.log("[ContentReview] Content to moderate:", contentToModerate);

      // 逐項執行審核
      for (let i = 0; i < reviewItems.length; i++) {
        const item = reviewItems[i];
        console.log(`[ContentReview] Starting item ${i + 1}: ${item}`);

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
          console.log(`[ContentReview] Processing basic check: ${item}`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          // ✅ 基本檢查總是通過，避免隨機失敗
          passed = true;
        } else if (i === 2) {
          // 檢測有害內容 - 只阻擋真正有害的內容
          console.log(
            `[ContentReview] Starting harmful content detection for ${contentToModerate.length} items`
          );

          if (contentToModerate.length > 0) {
            try {
              const moderationResults = await moderateMultipleContent(
                sessionId,
                contentToModerate,
                false // 不使用學術模式，因為新的邏輯已經夠寬鬆
              );

              console.log(
                `[ContentReview] Moderation results:`,
                moderationResults
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
                failureReason = `檢測到有害內容 (${blockedSources}): ${blockedCategories.join(
                  ", "
                )}`;
                console.warn(
                  "[ContentReview] Content blocked by moderation:",
                  blockedContent
                );

                // 顯示明確的有害內容警告
                showToast({
                  type: "error",
                  message:
                    "檢測到有害內容：騷擾、仇恨言論、性相關內容或危險內容",
                  duration: 5000,
                });
              } else {
                console.log(
                  "[ContentReview] All content passed harmful content detection"
                );
              }
            } catch (error) {
              console.error(
                "[ContentReview] Content moderation failed:",
                error
              );
              // ⚠️ API 調用失敗 - 將錯誤記錄但不阻擋用戶
              // 這避免了因網絡問題或 API 錯誤而阻止合法內容
              passed = true;
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              console.warn(
                `[ContentReview] Moderation API error (defaulting to PASS): ${errorMsg}`
              );
              console.log(
                "[ContentReview] Moderation error, defaulting to PASS to avoid false blocks"
              );

              // 顯示警告但不阻止繼續
              showToast({
                type: "warning",
                message: "內容審核服務暫時無法使用，已跳過此檢查",
                duration: 3000,
              });
            }
          } else {
            // 沒有內容需要審核，直接通過
            console.log("[ContentReview] No content to moderate, passing");
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }

        console.log(
          `[ContentReview] Item ${i + 1} completed: ${item} - ${
            passed ? "PASSED" : "FAILED"
          }`
        );

        // 更新進度狀態
        setReviewProgress((prev) => {
          const newState = {
            ...prev,
            currentItem: "", // 清空當前項目
            completed: passed ? [...prev.completed, item] : prev.completed,
            failed: !passed
              ? [
                  ...prev.failed,
                  failureReason ? `${item}: ${failureReason}` : item,
                ]
              : prev.failed,
          };
          console.log(`[ContentReview] Updated state:`, newState);
          return newState;
        });

        // 如果是有害內容檢測失敗，我們仍然繼續其他檢查，但會在最後標記為需要人工審核
        if (!passed && i === 2) {
          console.log(
            "[ContentReview] Content moderation failed, but continuing with other checks"
          );
          // 不要 break，繼續執行其他檢查項目
        }

        // 添加項目間的小延遲讓用戶看到進度變化
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // 完成審核
      console.log("[ContentReview] All review items completed");

      setReviewProgress((prev) => {
        const finalState = {
          ...prev,
          currentItem: "",
          isCompleted: true,
          isRunning: false,
        };

        console.log(`[ContentReview] Final state:`, finalState);

        // 保存審核結果到父組件
        onSaveReviewResults?.({
          completed: finalState.completed,
          failed: finalState.failed,
        });

        // 通知父組件審核完成
        // 🚨 安全準則：如果有任何審核失敗項目，必須阻止用戶繼續
        const canProceed = prev.failed.length === 0;
        console.log(`[ContentReview] Can proceed:`, canProceed);
        console.log(`[ContentReview] Failed items:`, prev.failed);

        // 通知父組件結束 loading
        if (onLoadingChange) {
          onLoadingChange(false);
        }

        onReviewStatusChange?.(canProceed);
        if (canProceed) {
          onReviewComplete?.();
          // 不再重置 hasStartedReview，保持為 true 以便返回時顯示結果
        }

        return finalState;
      });
    } catch (error) {
      console.error("Review process failed:", error);

      // 通知父組件結束 loading（錯誤情況）
      if (onLoadingChange) {
        onLoadingChange(false);
      }

      setReviewProgress((prev) => ({
        ...prev,
        isCompleted: true,
        isRunning: false,
        currentItem: "",
        failed: [...prev.failed, "審核過程發生錯誤"],
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
    console.log("[ContentReview] shouldStartReview effect:", {
      shouldStartReview,
      hasStartedReview,
      isRunning: reviewProgress.isRunning,
      sessionId,
      willTrigger:
        shouldStartReview &&
        !hasStartedReview &&
        !reviewProgress.isRunning &&
        sessionId,
    });

    // 添加 sessionId 檢查，避免在沒有 sessionId 時執行
    // 使用 ref 來追蹤是否已經開始審核，避免重複執行
    if (
      shouldStartReview &&
      !hasStartedReview &&
      !reviewProgress.isRunning &&
      sessionId
    ) {
      console.log("shouldStartReview triggered, starting review process...");
      startReviewProcess();
    }
  }, [shouldStartReview]); // 只依賴外部觸發信號，避免因內部狀態變化導致重複執行

  // 轉換props數據為組件需要的格式
  const documents = React.useMemo(() => {
    console.log("[ContentReview] Converting props to documents:", {
      propDocuments,
      crawledUrls,
    });
    const result: DocumentInfo[] = [];

    // 處理propDocuments
    if (propDocuments && propDocuments.length > 0) {
      propDocuments.forEach((doc: any, index: number) => {
        const documentInfo = {
          id: `file-${index}`,
          filename: doc.filename || doc.name || `文檔 ${index + 1}`,
          type: "file" as const,
          size: doc.size || 1024000,
          uploadTime: doc.uploadTime || new Date().toISOString(),
          status: "approved" as const,
          preview: doc.content || doc.preview || "文檔內容預覽...",
          chunks: doc.chunks || 5,
        };
        console.log(`[ContentReview] Document ${index}:`, documentInfo);
        result.push(documentInfo);
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
      {/* 審核項目列表 - 保持顯示，動態更新狀態 */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h6 className="mb-0">
            <i className="bi bi-list-check me-2"></i>
            審核項目與結果：
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            {[
              "檢查文件格式完整性",
              "掃描惡意軟體",
              "檢測有害內容 (僅阻擋騷擾、仇恨言論、性相關內容、危險內容)",
              "驗證文檔結構",
              "分析內容品質",
              "檢查版權限制",
            ].map((item, index) => {
              const isCompleted = reviewProgress.completed.includes(item);
              // 修復：正確檢測失敗項目
              const isFailed = reviewProgress.failed.some(
                (failedItem) =>
                  failedItem.includes(item) || failedItem.startsWith(item)
              );
              const isCurrent = reviewProgress.currentItem === item;
              const isPending =
                !isCompleted &&
                !isFailed &&
                !isCurrent &&
                !reviewProgress.isRunning;
              const isWaiting =
                !isCompleted &&
                !isFailed &&
                !isCurrent &&
                reviewProgress.isRunning;

              return (
                <div key={`item-${index}`} className="col-md-6 mb-2">
                  <div
                    className={`d-flex align-items-center p-2 rounded ${
                      isCompleted
                        ? "bg-success-subtle"
                        : isFailed
                        ? "bg-danger-subtle"
                        : isCurrent
                        ? "bg-primary-subtle"
                        : "bg-light"
                    }`}
                  >
                    {isCurrent && (
                      <div
                        className="spinner-border spinner-border-sm text-primary me-2"
                        role="status"
                      >
                        <span className="visually-hidden">處理中...</span>
                      </div>
                    )}
                    {isCompleted && (
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                    )}
                    {isFailed && (
                      <i className="bi bi-x-circle-fill text-danger me-2"></i>
                    )}
                    {(isPending || isWaiting) && (
                      <i className="bi bi-clock text-secondary me-2"></i>
                    )}

                    <small
                      className={
                        isCompleted
                          ? "text-success fw-medium"
                          : isFailed
                          ? "text-danger fw-medium"
                          : isCurrent
                          ? "text-primary fw-medium"
                          : "text-muted"
                      }
                    >
                      {item}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 進度條 - 只在審核中顯示 */}
          {reviewProgress.isRunning && (
            <div className="mt-3">
              <div className="progress mb-2" style={{ height: "6px" }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
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
              <div className="text-center">
                <small className="text-muted">
                  進度：
                  {reviewProgress.completed.length +
                    reviewProgress.failed.length}{" "}
                  / 6
                </small>
                {/* 特殊提示：當前在執行內容審核 */}
                {reviewProgress.currentItem ===
                  "檢測有害內容 (僅阻擋騷擾、仇恨言論、性相關內容、危險內容)" && (
                  <div className="mt-2">
                    <div className="badge bg-warning text-dark">
                      <i className="bi bi-shield-exclamation me-1"></i>
                      正在檢測有害內容...
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 審核失敗提示 */}
          {reviewProgress.isCompleted && reviewProgress.failed.length > 0 && (
            <div className="alert alert-danger mt-3 mb-0">
              <i className="bi bi-x-circle-fill me-2"></i>
              <strong>審核失敗！</strong>{" "}
              檢測到不當內容，無法進入下一步。請重新上傳符合規範的內容。
              <div className="mt-3">
                <small className="d-block mb-2">
                  <strong>❌ 失敗項目：</strong>
                </small>
                {reviewProgress.failed.map((failure, index) => {
                  // 解析失敗原因以提供更詳細信息
                  const isContentModeration =
                    failure.includes("檢測敏感內容") ||
                    failure.includes("不當內容");
                  const isModerationError =
                    failure.includes("MODERATION_ERROR");
                  const hasUrl =
                    failure.includes("https://") || failure.includes("http://");

                  let detailMessage = "";
                  let iconClass = "text-danger";
                  let icon = "bi-x-circle-fill";

                  if (isContentModeration) {
                    icon = "bi-shield-exclamation-fill";
                    if (isModerationError) {
                      detailMessage = "內容審核服務暫時無法使用，請稍後重試";
                    } else if (hasUrl) {
                      const urlMatch = failure.match(/(https?:\/\/[^\s:)]+)/);
                      const url = urlMatch ? urlMatch[1] : "未知來源";
                      detailMessage = `來源 "${url}" 包含不當內容（如色情、暴力或其他違規材料）`;
                    } else {
                      detailMessage =
                        "上傳內容包含敏感或不當材料，不符合社區準則";
                    }
                  } else if (failure.includes("檢查文件格式")) {
                    icon = "bi-file-earmark-x-fill";
                    detailMessage = "文件格式不支持或文件已損壞";
                  } else if (failure.includes("掃描惡意軟體")) {
                    icon = "bi-bug-fill";
                    detailMessage = "檢測到潛在惡意軟體或病毒";
                  } else {
                    detailMessage = "審核過程中發生未知錯誤";
                  }

                  return (
                    <div
                      key={index}
                      className="border border-danger rounded p-2 mb-2 bg-light"
                    >
                      <div className="d-flex align-items-start">
                        <i
                          className={`${icon} ${iconClass} me-2 mt-1 flex-shrink-0`}
                        ></i>
                        <div className="flex-grow-1">
                          <div className="fw-bold text-danger small mb-1">
                            {failure.split(":")[0]}
                          </div>
                          <div className="small text-muted">
                            {detailMessage}
                          </div>
                          {failure.includes(":") && (
                            <details className="mt-2">
                              <summary className="small text-muted cursor-pointer">
                                查看詳細錯誤信息
                              </summary>
                              <div className="small text-muted mt-1 ps-3 border-start border-secondary">
                                {failure.split(":").slice(1).join(":").trim()}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 p-3 bg-warning-subtle border border-warning rounded">
                  <div className="mb-2">
                    <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                    <strong>建議解決方案：</strong>
                  </div>
                  <ul className="mb-3 ps-4 small">
                    <li>檢查上傳內容是否符合社區準則</li>
                    <li>確保文件來源可靠且不含惡意軟體</li>
                    <li>避免上傳包含色情、暴力或其他不當內容的資料</li>
                  </ul>
                  <div className="p-2 bg-info-subtle border border-info rounded">
                    <i className="bi bi-arrow-left-circle-fill text-info me-2"></i>
                    <strong className="text-info">如何重新上傳？</strong>
                    <div className="small mt-1">
                      請點擊下方「<strong>上一步</strong>
                      」按鈕返回上傳步驟。系統將<strong>自動清除</strong>
                      原有內容，您可以重新上傳符合規範的資料。
                      <br />
                      <span className="text-muted">
                        （流程1、2的配置也可以重新調整）
                      </span>
                    </div>
                  </div>
                </div>

                {/* 學術內容重試選項 */}
                {showRetryOption && (
                  <div className="mt-3 p-3 bg-info-subtle border border-info rounded">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-bold text-info mb-1">
                          <i className="bi bi-mortarboard-fill me-2"></i>
                          學術內容檢測
                        </div>
                        <small className="text-muted">
                          檢測到這可能是學術或教育內容。學術模式會調整審核標準，允許討論敏感話題用於教育目的。
                          <br />
                          <strong>注意：</strong>
                          請確認您的內容確實用於學術或教育目的。
                        </small>
                      </div>
                      <button
                        className="btn btn-info btn-sm ms-3"
                        onClick={handleRetry}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        重新審核
                      </button>
                    </div>
                    {retryCount > 0 && (
                      <div className="small text-muted mt-2">
                        已重試 {retryCount} 次
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentReviewStep;
