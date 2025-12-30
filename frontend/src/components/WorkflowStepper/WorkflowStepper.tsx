import React, { useState } from "react";
import "./WorkflowStepper.css";
import "../../styles/fixed-rag-flow.css";
import RagConfigStep from "../RagConfigStep/RagConfigStep";
import PromptConfigStep from "../PromptConfigStep/PromptConfigStep";
import DataUploadStep from "../DataUploadStep/DataUploadStep";
import ContentReviewStep from "../ContentReviewStep/ContentReviewStep";
import TextProcessingStep from "../TextProcessingStep/TextProcessingStep";
import AiChatStep from "../AiChatStep/AiChatStep";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
// import TestStep6 from "../TestStep6/TestStep6"; // 測試組件已替換為正式組件
import FixedRagFlow from "../FixedRagFlow/FixedRagFlow";
import {
  uploadFile,
  uploadUrl,
  uploadWebsite,
  pollUploadStatus,
} from "../../services/uploadService";

interface WorkflowStepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  parameters?: any;
  onParameterChange?: (key: string, value: any) => void;
  sessionId?: string;
  documents?: any[];
  crawledUrls?: any[];
  onDocumentsUpdate?: (documents: any[]) => void;
  onCrawledUrlsUpdate?: (urls: any[]) => void;
  onShowMessage?: (message: {
    type: "error" | "warning" | "info" | "success";
    message: string;
  }) => void;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onStepChange,
  parameters,
  onParameterChange,
  sessionId,
  documents = [],
  crawledUrls = [],
  onDocumentsUpdate,
  onCrawledUrlsUpdate,
  onShowMessage,
}) => {
  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ title: "", message: "" });

  // 全局 Loading 狀態
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("處理中，請稍候...");

  const [stepCompletion, setStepCompletion] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  // 文檔狀態輪詢函數
  const pollDocumentStatus = async (
    documentId: string,
    docItem: any,
    identifier: string,
    onComplete?: () => void
  ) => {
    try {
      console.log(`[WorkflowStepper] 開始輪詢文檔狀態`, {
        documentId,
        identifier,
        docItem,
      });

      const finalStatus = await pollUploadStatus(
        sessionId!,
        documentId,
        (status) => {
          console.log(`[WorkflowStepper] 輪詢狀態更新:`, status);
          // 更新文檔的 chunks 數量
          if (status.chunk_count > 0) {
            const updatedDoc = {
              ...docItem,
              chunks: status.chunk_count,
              preview: status.summary || "內容預覽...",
            };

            // 更新 documents 陣列中對應的項目（使用更穩定的匹配邏輯）
            let docUpdated = false;
            const updatedDocs = documents.map((doc) => {
              // 強化匹配邏輯：優先使用filename，然後檢查其他屬性
              const filenameMatch =
                doc.filename === identifier ||
                doc.filename === docItem.filename;
              const typeMatch = doc.type === docItem.type;
              const timeMatch =
                Math.abs(
                  new Date(doc.uploadTime).getTime() -
                    new Date(docItem.uploadTime).getTime()
                ) < 10000; // 10秒內

              const isMatch = filenameMatch || (typeMatch && timeMatch);

              if (isMatch) {
                console.log(`[WorkflowStepper] 輪詢更新匹配文檔:`, {
                  original: doc,
                  updated: updatedDoc,
                  matchReason: filenameMatch ? "filename" : "type+time",
                });
                docUpdated = true;
                return updatedDoc;
              }
              return doc;
            });

            // 如果沒有找到匹配的文檔，不要丟失原有documents
            if (docUpdated) {
              console.log(
                `[WorkflowStepper] 輪詢更新成功，新documents:`,
                updatedDocs
              );
              onDocumentsUpdate?.(updatedDocs);
            } else {
              console.warn(
                `[WorkflowStepper] 輪詢更新時未找到匹配文檔，保持原有documents`,
                {
                  currentDocs: documents,
                  targetDoc: docItem,
                  identifier,
                }
              );
            }
          }
        },
        2000, // 2秒輪詢一次
        30 // 最多輪詢30次（1分鐘）
      );

      // 最終更新（確保不會意外清空documents）
      if (finalStatus.chunk_count > 0) {
        console.log(
          `[WorkflowStepper] 輪詢完成，最終chunks:`,
          finalStatus.chunk_count
        );
        console.log(`[WorkflowStepper] 當前documents:`, documents);
        console.log(`[WorkflowStepper] docItem:`, docItem);
        console.log(`[WorkflowStepper] identifier:`, identifier);

        const finalDoc = {
          ...docItem,
          chunks: finalStatus.chunk_count,
          preview: finalStatus.summary || "處理完成",
          status: "completed",
        };

        let docFound = false;
        const finalDocs = documents.map((doc) => {
          // 強化匹配邏輯
          const filenameMatch =
            doc.filename === identifier || doc.filename === docItem.filename;
          const typeMatch = doc.type === docItem.type;
          const timeMatch =
            Math.abs(
              new Date(doc.uploadTime).getTime() -
                new Date(docItem.uploadTime).getTime()
            ) < 10000;

          const isMatch = filenameMatch || (typeMatch && timeMatch);

          if (isMatch) {
            console.log(`[WorkflowStepper] 最終更新找到匹配文檔:`, {
              original: doc,
              updated: finalDoc,
              matchReason: filenameMatch ? "filename" : "type+time",
            });
            docFound = true;
            return finalDoc;
          }
          return doc;
        });

        // 如果沒有找到匹配的文檔，直接添加（但要避免重複）
        if (!docFound) {
          console.log(
            `[WorkflowStepper] 未找到匹配文檔，檢查是否需要添加:`,
            finalDoc
          );

          // 檢查是否已經存在相同文檔（避免重複添加）
          const existingDoc = finalDocs.find(
            (doc) =>
              doc.filename === finalDoc.filename ||
              (doc.type === finalDoc.type &&
                Math.abs(
                  new Date(doc.uploadTime).getTime() -
                    new Date(finalDoc.uploadTime).getTime()
                ) < 10000)
          );

          if (!existingDoc) {
            console.log(`[WorkflowStepper] 添加新文檔:`, finalDoc);
            finalDocs.push(finalDoc);
          } else {
            console.log(`[WorkflowStepper] 文檔已存在，不重複添加`);
          }
        }

        // 安全檢查：確保不會意外清空documents
        if (finalDocs.length === 0 && documents.length > 0) {
          console.error(
            `[WorkflowStepper] 警告：最終更新將清空documents！保持原有documents`,
            {
              originalDocs: documents,
              finalDocs,
              docItem,
              identifier,
            }
          );
          return; // 不執行可能清空documents的更新
        }

        console.log(`[WorkflowStepper] 最終documents更新:`, finalDocs);
        onDocumentsUpdate?.(finalDocs);

        // 只在這裡顯示最終的成功訊息，包含chunks信息
        onShowMessage?.({
          type: "success",
          message: `${
            docItem.type === "file" ? "檔案" : "URL"
          } ${identifier} 處理完成！產生 ${
            finalStatus.chunk_count
          } 個文字段落。`,
        });
      }

      // 輪詢完成，調用回調
      onComplete?.();
    } catch (error) {
      console.error(`[WorkflowStepper] 文檔狀態輪詢失敗:`, error);
      // 錯誤時也要調用回調
      onComplete?.();
      onShowMessage?.({
        type: "error",
        message: `${
          docItem.type === "file" ? "檔案" : "URL"
        } ${identifier} 處理失敗: ${error}`,
      });
    }
  };

  // 文件狀態輪詢函數
  const pollFileStatus = async (
    documentId: string,
    docItem: any,
    filename: string,
    onComplete?: () => void
  ) => {
    return pollDocumentStatus(documentId, docItem, filename, onComplete);
  };

  // 添加審核狀態管理
  const [reviewPassed, setReviewPassed] = useState(false);
  const [shouldStartReview, setShouldStartReview] = useState(false);

  // 添加文本處理狀態管理
  const [textProcessingCompleted, setTextProcessingCompleted] = useState(false);

  // 監聽步驟變化，重置相關狀態
  React.useEffect(() => {
    if (currentStep !== 4) {
      setShouldStartReview(false);
      setReviewPassed(false); // 重置審核通過狀態
    }
  }, [currentStep]);

  // 監聽審核完成狀態，重置shouldStartReview
  React.useEffect(() => {
    if (currentStep === 4 && reviewPassed) {
      // 審核完成時重置shouldStartReview狀態
      console.log("[WorkflowStepper] 審核完成，重置shouldStartReview狀態");
      setShouldStartReview(false);
    }
  }, [currentStep, reviewPassed]);

  // 監聽文檔上傳狀態，自動標記步驟3完成
  React.useEffect(() => {
    const hasDocuments = documents && documents.length > 0;
    const hasCrawledUrls = crawledUrls && crawledUrls.length > 0;

    if (hasDocuments || hasCrawledUrls) {
      console.log("[WorkflowStepper] 檢測到已上傳內容，標記步驟3完成", {
        documents: documents?.length || 0,
        crawledUrls: crawledUrls?.length || 0,
      });

      setStepCompletion((prev) => ({
        ...prev,
        3: true,
      }));
    } else {
      // 如果沒有上傳內容，取消步驟3的完成狀態
      setStepCompletion((prev) => ({
        ...prev,
        3: false,
      }));
    }
  }, [documents, crawledUrls]);

  const steps = [
    {
      id: 1,
      key: "rag-config",
      title: "RAG 參數配置",
      icon: "bi-gear",
      description: "設定檢索增強生成參數",
      color: "primary",
      detailMessage:
        "配置相似度閾值、檢索段落數、Chunk分割大小等核心參數。這些設定直接影響AI回答的準確度和相關性，建議根據您的文檔類型和期望的回答精度來調整這些參數。",
    },
    {
      id: 2,
      key: "prompt-config",
      title: "Prompt 配置",
      icon: "bi-chat-dots",
      description: "優化AI模型對話風格",
      color: "info",
      detailMessage:
        "設定AI助手的角色定位、回答風格和行為準則。您可以定義AI的專業領域、語氣風格、回答長度等，讓AI更符合您的使用需求和品牌形象。",
    },
    {
      id: 3,
      key: "data-upload",
      title: "資料上傳",
      icon: "bi-cloud-upload",
      description: "上傳文檔或爬取網站資料",
      color: "orange",
      detailMessage:
        "支援多種格式文檔上傳（PDF、Word、TXT等）或網站內容爬取。系統會自動提取文本內容，這些資料將作為AI回答問題的知識庫基礎。",
    },
    {
      id: 4,
      key: "content-review",
      title: "內容審核",
      icon: "bi-shield-check",
      description: "安全性檢查和內容審查",
      color: "warning",
      detailMessage:
        "自動檢測上傳內容是否包含敏感資訊、不當內容或隱私資料。確保您的知識庫符合安全標準，保護用戶隱私和企業資訊安全。",
    },
    {
      id: 5,
      key: "text-processing",
      title: "文本切割 向量嵌入",
      icon: "bi-diagram-3",
      description: "分塊處理並生成向量",
      color: "purple",
      detailMessage:
        "將文檔內容切分成適當大小的段落，並轉換為高維向量表示。這個過程讓AI能夠理解和檢索相關內容，是實現精準問答的關鍵技術步驟。",
    },
    {
      id: 6,
      key: "ai-chat",
      title: "AI 對談",
      icon: "bi-robot",
      description: "開始智能問答對話",
      color: "indigo",
      detailMessage:
        "基於您上傳的知識庫開始問答對話。AI會根據問題檢索相關內容並給出準確回答，同時提供資料來源引用，確保答案的可信度和可追溯性。",
    },
  ];

  const isStepCompleted = (stepId: number) => {
    // 如果步驟已明確標記為完成，則返回 true
    if (stepCompletion[stepId as keyof typeof stepCompletion]) {
      return true;
    }
    // 如果當前步驟大於這個步驟，說明已經被訪問過，視為完成
    if (stepId < currentStep) {
      return true;
    }
    return false;
  };
  const isStepActive = (stepId: number) => stepId === currentStep;
  const isStepDisabled = (stepId: number) => stepId > currentStep + 1; // 只允許下一步

  const handleStepClick = (stepId: number) => {
    // 禁用流程图按钮点击，只能通过上一步/下一步按钮移动
    // if (!isStepDisabled(stepId)) {
    //   onStepChange(stepId);
    // }
  };

  const handleInfoClick = (step: any, event: React.MouseEvent) => {
    setToastContent({
      title: step.title,
      message: step.detailMessage,
    });
    setShowToast(true);
  };

  // 辅助函数：获取回应风格文本
  const getResponseStyleText = (style: string | undefined) => {
    switch (style) {
      case "concise":
        return "簡潔";
      case "standard":
        return "標準";
      case "detailed":
        return "詳細";
      default:
        return "標準";
    }
  };

  // 辅助函数：获取专业程度文本
  const getProfessionalLevelText = (level: string | undefined) => {
    switch (level) {
      case "casual":
        return "通俗";
      case "professional":
        return "專業";
      case "academic":
        return "學術";
      default:
        return "專業";
    }
  };

  // 辅助函数：获取创意程度文本
  const getCreativityLevelText = (level: string | undefined) => {
    switch (level) {
      case "conservative":
        return "保守";
      case "balanced":
        return "平衡";
      case "creative":
        return "創新";
      default:
        return "平衡";
    }
  };

  // 检查步骤是否可以继续
  const canProceedToNextStep = () => {
    if (currentStep === 3) {
      // 步骤3：资料上传 - 需要有文档或爬虫内容才能继续
      const hasDocuments = documents && documents.length > 0;
      const hasCrawledUrls = crawledUrls && crawledUrls.length > 0;
      return hasDocuments || hasCrawledUrls;
    }
    if (currentStep === 4) {
      // 步骤4：内容审核 - 需要所有审核项目都通过
      return reviewPassed;
    }
    if (currentStep === 5) {
      // 步骤5：文本处理 - 需要文本切割和向量化完成
      return textProcessingCompleted;
    }
    // 其他步骤暂时允许继续
    return true;
  };

  // 處理上一步點擊
  const handlePreviousStepClick = () => {
    // 如果在步驟4且審核失敗，需要清除上傳數據
    if (currentStep === 4 && !reviewPassed) {
      // 清除上傳數據
      onDocumentsUpdate?.([]);
      onCrawledUrlsUpdate?.([]);

      // 重置審核狀態
      setReviewPassed(false);
      setShouldStartReview(false);

      // 提示用戶需要重新上傳
      onShowMessage?.({
        type: "warning",
        message:
          "審核失敗，已清除上傳內容。請重新上傳符合規範的檔案或網站內容。",
      });

      // 回到步驟3
      onStepChange(3);
      return;
    }

    // 普通的上一步邏輯
    onStepChange(currentStep - 1);
  };
  const handleNextStepClick = () => {
    // 檢查是否正在處理中
    if (isGlobalLoading) {
      onShowMessage?.({
        type: "info",
        message: "資料處理中，請稍候...",
      });
      return;
    }

    // 檢查是否已到達最後一步
    if (currentStep === steps.length) {
      return;
    }

    // 檢查步驟3是否可以進入下一步
    if (currentStep === 3 && !canProceedToNextStep()) {
      onShowMessage?.({
        type: "warning",
        message: "請先上傳檔案或設定網站爬蟲，然後才能進入下一步。",
      });
      return;
    }

    // 檢查步驟4是否可以進入下一步
    if (currentStep === 4 && !canProceedToNextStep()) {
      if (!reviewPassed) {
        onShowMessage?.({
          type: "warning",
          message: "請先完成內容審核並通過檢查，然後才能進入下一步。",
        });
      }
      return;
    }

    // 檢查步驟5是否可以進入下一步
    if (currentStep === 5 && !canProceedToNextStep()) {
      onShowMessage?.({
        type: "warning",
        message: "請先完成文本切割和向量化處理，然後才能進入下一步。",
      });
      return;
    }

    // 如果從步驟3進入步驟4，直接進入下一步
    if (currentStep === 3) {
      onStepChange(currentStep + 1);
      return;
    }
    // 继续到下一步
    onStepChange(currentStep + 1);
  };

  const handleStepComplete = (stepId: number) => {
    setStepCompletion((prev) => ({
      ...prev,
      [stepId]: true,
    }));

    // 步驟4（內容審核）完成後不自動跳轉，等待用戶手動點擊"下一步"
    if (stepId === 4) {
      return; // 不自動跳轉，讓用戶手動控制
    }

    // 其他步驟自動跳轉到下一步
    if (stepId < steps.length) {
      onStepChange(stepId + 1);
    }
  };

  const renderStepContent = () => {
    console.log("Current step rendering:", currentStep); // 添加调试日志
    switch (currentStep) {
      case 1:
        return (
          <RagConfigStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            onComplete={() => handleStepComplete(1)}
          />
        );
      case 2:
        return (
          <PromptConfigStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            onComplete={() => handleStepComplete(2)}
          />
        );
      case 3:
        return (
          <DataUploadStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            sessionId={sessionId}
            documents={documents}
            crawledUrls={crawledUrls}
            onFileUpload={async (file) => {
              try {
                console.log("Starting file upload:", file.name);
                // 顯示全局 Loading
                setIsGlobalLoading(true);
                setLoadingMessage(`正在上傳檔案: ${file.name}...`);

                const response = await uploadFile(sessionId!, file);
                console.log("File upload successful:", response);

                // 創建初始文檔項目
                const newDoc = {
                  filename: file.name,
                  size: file.size,
                  uploadTime: new Date().toISOString(),
                  type: "file",
                  chunks: 0, // 初始為 0，等待輪詢更新
                  preview: response.preview || "處理中...",
                  status: "processing",
                };
                onDocumentsUpdate?.([...documents, newDoc]);

                // 開始輪詢文檔狀態以獲取最終的 chunks 數量（成功訊息將在輪詢完成後顯示）
                pollFileStatus(response.document_id, newDoc, file.name, () => {
                  // 輪詢完成後隱藏全局 Loading
                  setIsGlobalLoading(false);
                });

                // 檔案上傳完成，用戶需手動進入下一步
              } catch (error) {
                console.error("File upload failed:", error);
                setIsGlobalLoading(false);
                onShowMessage?.({
                  type: "error",
                  message: `檔案上傳失敗: ${
                    error instanceof Error ? error.message : "未知錯誤"
                  }`,
                });
              }
            }}
            onUrlUpload={async (url) => {
              try {
                console.log("Starting URL upload:", url);
                // 顯示全局 Loading
                setIsGlobalLoading(true);
                setLoadingMessage(`正在處理URL: ${url}...`);

                const response = await uploadUrl(sessionId!, url);
                console.log("URL upload successful:", response);

                // 創建初始文檔項目
                const newDoc = {
                  filename: url,
                  size: response.content_size || 0,
                  uploadTime: new Date().toISOString(),
                  type: "url",
                  chunks: 0, // 初始為 0，等待輪詢更新
                  preview: response.preview || "處理中...",
                  status: "processing",
                };
                onDocumentsUpdate?.([...documents, newDoc]);

                // 開始輪詢文檔狀態以獲取最終的 chunks 數量（成功訊息將在輪詢完成後顯示）
                pollDocumentStatus(response.document_id, newDoc, url, () => {
                  // 輪詢完成後隱藏全局 Loading
                  setIsGlobalLoading(false);
                });

                // URL處理完成，用戶需手動進入下一步
              } catch (error) {
                console.error("URL upload failed:", error);
                setIsGlobalLoading(false);
                onShowMessage?.({
                  type: "error",
                  message: `URL處理失敗: ${
                    error instanceof Error ? error.message : "未知錯誤"
                  }`,
                });
              }
            }}
            onCrawlerUpload={async (url, maxTokens, maxPages) => {
              try {
                console.log("Starting crawler upload:", {
                  url,
                  maxTokens,
                  maxPages,
                });
                // 顯示全局 Loading
                setIsGlobalLoading(true);
                setLoadingMessage(`正在爬取網站: ${url}...`);

                const response = await uploadWebsite(
                  sessionId!,
                  url,
                  maxTokens,
                  maxPages
                );
                console.log("Website crawl successful:", response);

                // 更新crawledUrls狀態
                const newUrl = {
                  url: url,
                  content_size: response.content_size || 0,
                  crawl_time: new Date().toISOString(),
                  chunks: response.chunk_count || 0,
                  summary: response.summary || "網站內容摘要...",
                  pages_found: response.pages_found || 1,
                };
                onCrawledUrlsUpdate?.([...crawledUrls, newUrl]);

                // 隱藏全局 Loading
                setIsGlobalLoading(false);

                onShowMessage?.({
                  type: "success",
                  message: `網站 ${url} 爬取成功，共處理 ${response.pages_found} 個頁面！`,
                });

                // 網站爬取完成，用戶需手動進入下一步
              } catch (error) {
                console.error("Website crawl failed:", error);
                setIsGlobalLoading(false);
                onShowMessage?.({
                  type: "error",
                  message: `網站爬取失敗: ${
                    error instanceof Error ? error.message : "未知錯誤"
                  }`,
                });
              }
            }}
          />
        );
      case 4:
        return (
          <ContentReviewStep
            sessionId={sessionId}
            onReviewComplete={() => {
              handleStepComplete(4);
              // 審核完成後重置狀態
              setShouldStartReview(false);
            }}
            onReviewStatusChange={(passed) => {
              setReviewPassed(passed);
              if (passed) {
                // 審核通過時立即重置shouldStartReview狀態
                setShouldStartReview(false);
              }
            }}
            onLoadingChange={(isLoading, message) => {
              setIsGlobalLoading(isLoading);
              if (message) {
                setLoadingMessage(message);
              }
            }}
            documents={documents}
            crawledUrls={crawledUrls}
            shouldStartReview={shouldStartReview}
          />
        );
      case 5:
        return (
          <TextProcessingStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            sessionId={sessionId}
            documents={documents}
            crawledUrls={crawledUrls}
            onProcessingComplete={() => {
              // 更新狀態並標記步驟完成
              console.log(
                "TextProcessing completed, marking step 5 as complete"
              );
              setTextProcessingCompleted(true);
              setStepCompletion((prev) => ({ ...prev, 5: true }));
            }}
            onProcessingStatusChange={setTextProcessingCompleted}
            onLoadingChange={(isLoading, message) => {
              setIsGlobalLoading(isLoading);
              if (message) {
                setLoadingMessage(message);
              }
            }}
          />
        );
      case 6:
        console.log(
          "Rendering case 6 - AI Chat with flow diagram (PRODUCTION MODE)"
        );
        return (
          <div className="ai-chat-step-container">
            {/* AI 聊天界面 - 剩餘空間 - 使用正式組件 */}
            <div className="ai-chat-content">
              <AiChatStep sessionId={sessionId} parameters={parameters} />
            </div>
          </div>
        );
      default:
        console.log("Invalid step:", currentStep);
        return <div>Invalid step: {currentStep}</div>;
    }
  };

  return (
    <div className="workflow-stepper w-100">
      {/* 步驟指示器 - 水平排列 */}
      <div className="stepper-header">
        <div className="d-flex justify-content-between align-items-center px-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-fill mx-2">
              <div
                className={`stepper-item ${
                  isStepActive(step.id) ? "active" : ""
                } ${isStepCompleted(step.id) ? "completed" : ""} ${
                  isStepDisabled(step.id) ? "disabled" : ""
                } workflow-stepper-step-circle`}
                onClick={() => handleInfoClick(step, {} as React.MouseEvent)}
              >
                {/* 步驟圓圈和圖示 */}
                <div
                  className={`stepper-circle ${
                    isStepCompleted(step.id)
                      ? "step-completed"
                      : isStepActive(step.id)
                      ? "step-active"
                      : "step-inactive"
                  } text-white`}
                >
                  <span className="fw-bold">{step.id}</span>
                </div>

                {/* 步驟文本 */}
                <div className="stepper-text mt-2">
                  <div className="stepper-title d-flex align-items-center justify-content-center">
                    {isStepCompleted(step.id) && (
                      <i className="bi bi-check-circle-fill text-success me-1 workflow-stepper-check-icon"></i>
                    )}
                    <span>{step.title}</span>
                  </div>
                </div>

                {/* 連接線 (除了最後一個步驟) */}
                {index < steps.length - 1 && (
                  <div className="stepper-connector">
                    <div
                      className={`connector-line ${
                        isStepCompleted(step.id) ? "completed" : ""
                      }`}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 當前步驟資訊與導航按鈕同一行 */}
      <div className="w-100">
        <div className="current-step-info mb-2">
          <div className="d-flex align-items-center justify-content-between">
            {/* 左側步驟信息 - 60% */}
            <div className="d-flex align-items-center workflow-stepper-progress-container">
              <div className="badge bg-primary me-3">步驟 {currentStep}</div>
              <div className="flex-grow-1">
                <h4 className="mb-0">{steps[currentStep - 1].title}</h4>
                <small className="text-muted">
                  {steps[currentStep - 1].description}
                </small>
              </div>
            </div>

            {/* 中间重点数据显示 */}
            <div className="text-center mx-3 workflow-stepper-progress-center">
              {/* 步驟4專用：內容審核執行按鈕 */}
              {currentStep === 4 && !shouldStartReview && !reviewPassed && (
                <button
                  className="btn btn-warning btn-lg"
                  onClick={() => {
                    console.log("Starting review process...");
                    setShouldStartReview(true);
                  }}
                  disabled={documents.length === 0 && crawledUrls.length === 0}
                >
                  <i className="bi bi-shield-check me-2"></i>
                  開始內容審核
                </button>
              )}
              {/* 步驟4：審核進行中顯示 */}
              {currentStep === 4 && shouldStartReview && !reviewPassed && (
                <div className="d-flex align-items-center text-warning">
                  <div
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  >
                    <span className="visually-hidden">審核中...</span>
                  </div>
                  <span className="fw-bold">內容審核中...</span>
                </div>
              )}
              {/* 步驟4：審核完成顯示 */}
              {currentStep === 4 && reviewPassed && (
                <div className="d-flex align-items-center text-success">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <span className="fw-bold">審核完成，可以進入下一步</span>
                </div>
              )}
            </div>

            {/* 右侧导航按钮 - 40% */}
            <div className="d-flex align-items-center justify-content-end workflow-stepper-navigation">
              {currentStep > 1 && (
                <button
                  className="btn btn-outline-secondary me-2"
                  onClick={handlePreviousStepClick}
                  disabled={currentStep === 1}
                >
                  <i className="bi bi-chevron-left me-1"></i>
                  上一步
                </button>
              )}

              <div className="step-counter mx-3">
                <small className="text-muted">
                  {currentStep} / {steps.length}
                </small>
              </div>

              {/* 流程6不顯示下一步按鈕 */}
              {currentStep < steps.length && (
                <button
                  className="btn btn-primary"
                  onClick={handleNextStepClick}
                  disabled={
                    currentStep === steps.length ||
                    !canProceedToNextStep() ||
                    isGlobalLoading
                  }
                >
                  下一步
                  <i className="bi bi-chevron-right ms-1"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 步驟內容區域 - 全寬度 */}
      <div className="w-100">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">{renderStepContent()}</div>
          </div>
        </div>
      </div>

      {/* Bootstrap Toast */}
      <div className="toast-container position-fixed top-0 end-0 p-3">
        <div
          className={`toast ${showToast ? "show" : ""}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="toast-header">
            <i className="bi bi-info-circle text-primary me-2"></i>
            <strong className="me-auto">{toastContent.title}</strong>
          </div>
          <div className="toast-body">
            <div className="mb-3">{toastContent.message}</div>
            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowToast(false)}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 全局 Loading Overlay */}
      <LoadingOverlay isVisible={isGlobalLoading} message={loadingMessage} />
    </div>
  );
};

export default WorkflowStepper;
