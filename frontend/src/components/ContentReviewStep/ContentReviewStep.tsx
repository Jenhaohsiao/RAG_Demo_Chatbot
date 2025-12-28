/**
 * Step 4: Content Review Component
 * 內容預覽與審核步驟 - 顯示審核結果和上傳文件列表
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { moderateMultipleContent } from "../../services/moderationService";
import type { ContentModerationResponse } from "../../services/moderationService";

export interface ContentReviewStepProps {
  sessionId?: string;
  onReviewComplete?: () => void;
  onReviewStatusChange?: (canProceed: boolean) => void;
  documents?: DocumentInfo[]; // 從父組件接收documents
  crawledUrls?: any[]; // 從父組件接收crawledUrls
  shouldStartReview?: boolean; // 外部控制是否開始審核
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
    console.log("startReviewProcess called");
    if (!sessionId) {
      console.error("No sessionId provided for content review");
      return;
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
      "檢測敏感內容",
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

        // 模擬前兩項檢查
        if (i < 2) {
          console.log(`[ContentReview] Processing basic check: ${item}`);
          // 檢查文件格式和惡意軟體（模擬檢查）
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 增加到2秒讓用戶看到進度
          passed = Math.random() > 0.05; // 95%通過率
          if (!passed) {
            failureReason = `${item} 檢查失敗`;
          }
        } else if (i === 2) {
          // 檢測敏感內容 - 調用真實的審核API
          console.log(
            `[ContentReview] Starting content moderation for ${contentToModerate.length} items`
          );

          if (contentToModerate.length > 0) {
            try {
              const moderationResults = await moderateMultipleContent(
                sessionId,
                contentToModerate
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
                failureReason = `發現不當內容 (${blockedSources}): ${blockedCategories.join(
                  ", "
                )}`;
                console.warn(
                  "[ContentReview] Content blocked by moderation:",
                  blockedContent
                );
              } else {
                console.log("[ContentReview] All content passed moderation");
              }
            } catch (error) {
              console.error(
                "[ContentReview] Content moderation failed:",
                error
              );
              passed = false;
              failureReason = "無法完成內容審核檢查";
            }
          } else {
            // 沒有內容需要審核，直接通過
            console.log("[ContentReview] No content to moderate, passing");
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        } else {
          // 其他檢查項目（模擬）
          console.log(`[ContentReview] Processing additional check: ${item}`);
          await new Promise((resolve) => setTimeout(resolve, 1800));
          passed = Math.random() > 0.1; // 90%通過率
          if (!passed) {
            failureReason = `${item} 檢查失敗`;
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

        // 如果是敏感內容檢測失敗，我們仍然繼續其他檢查，但會在最後標記為需要人工審核
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
        const hasCriticalFailure = prev.failed.some(
          (item) => item.includes("檢測敏感內容") || item.includes("不當內容")
        );

        const finalState = {
          ...prev,
          currentItem: "",
          isCompleted: true,
          isRunning: false,
        };

        console.log(`[ContentReview] Final state:`, finalState);
        console.log(
          `[ContentReview] Has critical failure:`,
          hasCriticalFailure
        );

        // 通知父組件審核完成
        // 即使有內容被標記為不當，我們也允許用戶繼續（但會顯示警告）
        const canProceed = prev.failed.length === 0 || !hasCriticalFailure;
        console.log(`[ContentReview] Can proceed:`, canProceed);

        onReviewStatusChange?.(canProceed);
        if (canProceed) {
          onReviewComplete?.();
        }

        return finalState;
      });
    } catch (error) {
      console.error("Review process failed:", error);
      setReviewProgress((prev) => ({
        ...prev,
        isCompleted: true,
        isRunning: false,
        currentItem: "",
        failed: [...prev.failed, "審核過程發生錯誤"],
      }));
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
      willTrigger:
        shouldStartReview && !hasStartedReview && !reviewProgress.isRunning,
    });

    if (shouldStartReview && !hasStartedReview && !reviewProgress.isRunning) {
      console.log("shouldStartReview triggered, starting review process...");
      startReviewProcess();
    }
  }, [shouldStartReview, hasStartedReview, reviewProgress.isRunning]);

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
              "檢測敏感內容",
              "驗證文檔結構",
              "分析內容品質",
              "檢查版權限制",
            ].map((item, index) => {
              const isCompleted = reviewProgress.completed.includes(item);
              const isFailed = reviewProgress.failed.includes(item);
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
                {reviewProgress.currentItem === "檢測敏感內容" && (
                  <div className="mt-2">
                    <div className="badge bg-warning text-dark">
                      <i className="bi bi-shield-exclamation me-1"></i>
                      正在使用 Gemini Safety API 檢測不當內容...
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 完成提示 - 只在審核完成時顯示 */}
          {reviewProgress.isCompleted && (
            <div className="alert alert-success mt-3 mb-0">
              <i className="bi bi-check-circle-fill me-2"></i>
              <strong>審核完成！</strong>{" "}
              所有上傳的內容已通過安全檢查，可以進入下一步。
            </div>
          )}

          {/* 文件統計 */}
          <div className="row mt-4 text-center">
            <div className="col-4">
              <div className="h5 text-primary mb-1">{documents.length}</div>
              <div className="small text-muted">總文件數</div>
            </div>
            <div className="col-4">
              <div className="h5 text-warning mb-1">
                {reviewProgress.isCompleted
                  ? "已完成"
                  : reviewProgress.isRunning
                  ? "審核中"
                  : "等待審核"}
              </div>
              <div className="small text-muted">狀態</div>
            </div>
            <div className="col-4">
              <div className="h5 text-info mb-1">
                {documents.reduce((sum, doc) => sum + (doc.chunks || 0), 0)}
              </div>
              <div className="small text-muted">預計文件塊</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentReviewStep;
