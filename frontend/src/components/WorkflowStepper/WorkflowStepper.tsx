import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./WorkflowStepper.scss";
import RagConfigStep from "../RagConfigStep/RagConfigStep";
import PromptConfigStep from "../PromptConfigStep/PromptConfigStep";
import DataUploadStep from "../DataUploadStep/DataUploadStep";
import ContentReviewStep from "../ContentReviewStep/ContentReviewStep";
import TextProcessingStep from "../TextProcessingStep/TextProcessingStep";
import AiChatStep from "../AiChatStep/AiChatStep";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
// import TestStep6 from "../TestStep6/TestStep6"; // 測試組件已替換為真實組件
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
  onShowRagSummary?: () => void; // 新增：通知父組件顯示 RAG 總結
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
  onShowRagSummary,
}) => {
  const { t, i18n } = useTranslation();

  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ title: "", message: "" });
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogTitle, setErrorDialogTitle] = useState<string>("");
  const [errorDialogMessage, setErrorDialogMessage] = useState<string>("");

  // 成功對話框，用於爬蟲成功等情況
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogTitle, setSuccessDialogTitle] = useState<string>("");
  const [successDialogMessage, setSuccessDialogMessage] = useState<string>("");

  // 全局 Loading 狀態
  const processingLabel = t(
    "workflow.loading.processingShort",
    "Processing..."
  );
  const defaultLoadingMessage = t(
    "workflow.loading.default",
    "Processing, please wait..."
  );
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(defaultLoadingMessage);

  // RAG 總結對話框 - 移除本地狀態，改用父組件的 AboutProjectModal
  // const [showRagSummaryDialog, setShowRagSummaryDialog] = useState(false);

  const [stepCompletion, setStepCompletion] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  const pollDocumentStatus = async (
    documentId: string,
    identifier: string,
    docItem: any,
    onComplete?: () => void
  ) => {
    try {
      const finalStatus = await pollUploadStatus(
        sessionId || "",
        documentId,
        (status) => {
          // 更新文檔的chunks 狀態 (Flow 3 不可靠，因為chunk_count 可能為0，改檢查 extraction_status)
          if (
            status.extraction_status === "COMPLETED" ||
            status.chunk_count > 0
          ) {
            const updatedDoc = {
              ...docItem,
              chunks: status.chunk_count,
              preview: status.summary || processingLabel,
              status: "processing",
            };

            // 更新 documents 列表中的對應項目（使用更穩定的匹配邏輯）
            let docUpdated = false;
            const updatedDocs = documents.map((doc) => {
              // 強制匹配邏輯：優先使用filename，然後檢查其他屬性
              const filenameMatch =
                doc.filename === identifier ||
                doc.filename === docItem.filename;
              const typeMatch = doc.type === docItem.type;
              const timeMatch =
                Math.abs(
                  new Date(doc.uploadTime).getTime() -
                    new Date(docItem.uploadTime).getTime()
                ) < 10000;

              const isMatch = filenameMatch || (typeMatch && timeMatch);

              if (isMatch) {
                //   original: doc,
                //   updated: updatedDoc,
                //   matchReason: filenameMatch ? "filename" : "type+time",
                // });
                docUpdated = true;
                return updatedDoc;
              }
              return doc;
            });

            if (docUpdated) {
              onDocumentsUpdate?.(updatedDocs);
            } else {
            }
          }
        },
        2000, // 2秒輪詢一次
        30 // 最多輪詢30次（1分鐘）
      );

      // 最終更新，確保不會意外清空documents
      if (
        finalStatus.extraction_status === "COMPLETED" ||
        finalStatus.chunk_count > 0
      ) {
        // 檢查 token 數量是否足夠（至少50 tokens）
        const MIN_TOKENS_REQUIRED = 50;
        const tokensUsed = finalStatus.tokens_used || 0;

        if (tokensUsed > 0 && tokensUsed < MIN_TOKENS_REQUIRED) {
          // Token 數量不足，顯示錯誤對話框
          const isUrlType = docItem.type === "url";
          setErrorDialogTitle("Insufficient content");
          setErrorDialogMessage(
            `${
              isUrlType ? "URL" : "File"
            } content is too small (${tokensUsed} tokens).\n\nPlease provide richer content or use the sample ${
              isUrlType ? "URL" : "file"
            }.`
          );
          setShowErrorDialog(true);

          // 移除該文件
          const filteredDocs = documents.filter((doc) => {
            const filenameMatch =
              doc.filename === identifier || doc.filename === docItem.filename;
            return !filenameMatch;
          });
          onDocumentsUpdate?.(filteredDocs);
          onComplete?.();
          return;
        }

        const finalDoc = {
          ...docItem,
          chunks: finalStatus.chunk_count,
          preview: finalStatus.summary || "處理完成",
          status: "completed",
        };

        let docFound = false;
        const finalDocs = documents.map((doc) => {
          // 強制匹配邏輯
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
            //   original: doc,
            //   updated: finalDoc,
            //   matchReason: filenameMatch ? "filename" : "type+time",
            // });
            docFound = true;
            return finalDoc;
          }
          return doc;
        });

        // 如果沒有找到對應的檔案，直接添加（但要避免重複）
        if (!docFound) {
          // 檢查是否已經存在同樣的檔案（避免重複添加）
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
            finalDocs.push(finalDoc);
          } else {
          }
        }

        // 安全檢查：確保不意外清空documents
        if (finalDocs.length === 0 && documents.length > 0) {
          return; // 不執行可能清空documents的更新
        }

        onDocumentsUpdate?.(finalDocs);

        // 現在在這裡顯示最終處理訊息，包含chunks信息
        // onShowMessage?.({
        //   type: "success",
        //   message: `${
        //     docItem.type === "file" ? "檔案" : "URL"
        //   } ${identifier} 處理完成！產生${
        //     finalStatus.chunk_count
        //   } 個文字段落。`,
        // });
      }

      // 輪詢完成，調用回調
      onComplete?.();
    } catch (error) {
      // 錯誤也要調用回調
      onComplete?.();

      // 檢查是否為內容審核錯誤 - 如果是則不在流程3顯示錯誤（改為審核步驟處理）
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isContentBlockedError =
        errorMessage.toLowerCase().includes("content blocked") ||
        errorMessage.toLowerCase().includes("moderation");

      if (!isContentBlockedError) {
        // 檢查是否為爬蟲相關錯誤
        const isUrlError = docItem.type === "url";
        const isBlockedError =
          errorMessage.toLowerCase().includes("blocked") ||
          errorMessage.toLowerCase().includes("forbidden") ||
          errorMessage.toLowerCase().includes("403") ||
          errorMessage.toLowerCase().includes("access denied") ||
          errorMessage.toLowerCase().includes("robot");

        // 檢查是否為內容不足錯誤
        const isEmptyContentError =
          errorMessage.toLowerCase().includes("empty text list") ||
          errorMessage.toLowerCase().includes("empty text") ||
          errorMessage.toLowerCase().includes("no content");

        let displayTitle: string;
        let displayMessage: string;

        if (isEmptyContentError) {
          displayTitle = "Insufficient content";
          displayMessage = isUrlError
            ? "The crawled URL returned almost no content. Please provide a richer site or use the sample URL."
            : "The uploaded file is empty or too small. Please upload a richer file or use the sample file.";
        } else if (isUrlError && isBlockedError) {
          displayTitle = "URL crawl failed";
          displayMessage = `URL ${identifier} cannot be crawled: ${errorMessage}\n\nThe site may block crawling. Please try another site or use the sample URL.`;
        } else if (isUrlError) {
          displayTitle = "URL crawl failed";
          displayMessage = `URL ${identifier} failed: ${errorMessage}\n\nPlease try another site or use the sample URL.`;
        } else {
          displayTitle = "File upload failed";
          displayMessage = `File ${identifier} failed: ${errorMessage}\n\nPlease try another file or use the sample file.`;
        }

        // 對顯示非內容審核類的錯誤，使用對話框而非toast
        setErrorDialogTitle(displayTitle);
        setErrorDialogMessage(displayMessage);
        setShowErrorDialog(true);
      } else {
        // 內容審核錯誤僅記錄日誌，不顯示toast
      }
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

  // 保存審核結果，用於從其他步驟恢復時還原
  const [savedReviewResults, setSavedReviewResults] = useState<{
    completed: string[];
    failed: string[];
  } | null>(null);

  // 添加文本處理狀態管理
  const [textProcessingCompleted, setTextProcessingCompleted] = useState(false);
  const [shouldStartProcessing, setShouldStartProcessing] = useState(false);

  // 保存文本處理結果，用於從其他步驟恢復時還原
  const [savedProcessingResults, setSavedProcessingResults] =
    useState<any>(null);

  // 保存聊天記錄，用於從其他步驟恢復時還原
  const [savedChatMessages, setSavedChatMessages] = useState<any[]>([]);

  // 當下 sessionId 變更，重置所有狀態
  React.useEffect(() => {
    if (sessionId) {
      setStepCompletion({
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
      });
      setReviewPassed(false);
      setShouldStartReview(false);
      setSavedReviewResults(null);
      setTextProcessingCompleted(false);
      setShouldStartProcessing(false);
      setSavedProcessingResults(null);
      setSavedChatMessages([]);
    }
  }, [sessionId]);

  // 輔助函數：當上傳等改變，重置後續步驟狀態
  const resetDownstreamSteps = () => {
    setReviewPassed(false);
    setShouldStartReview(false);
    setSavedReviewResults(null);
    setTextProcessingCompleted(false);
    setShouldStartProcessing(false);
    setSavedProcessingResults(null);
    setSavedChatMessages([]);

    setStepCompletion((prev) => ({
      ...prev,
      4: false,
      5: false,
      6: false,
    }));
  };

  // 計算流程1是否應該被禁用
  // 只要流程3上傳成功有documents 或crawledUrls 不為空，就禁用流程1的部分配置
  const shouldDisableConfigSteps = React.useMemo(() => {
    const hasDocuments = documents && documents.length > 0;
    const hasCrawledUrls = crawledUrls && crawledUrls.length > 0;
    return hasDocuments || hasCrawledUrls;
  }, [documents, crawledUrls]);

  // 處理步驟變更
  // 注意：不要設置審核成功旗標，確保已審核不會重複
  React.useEffect(() => {
    // 切入步驟後不做任何操作，但不設置已審核旗標
    if (currentStep === 4 && !reviewPassed) {
      // 切入步驟4但不明確審核，可能需要開始審核
      // 注意：shouldStartReview 由其他控制，不自動開始
    }
    if (currentStep === 5 && !textProcessingCompleted) {
      // 切入步驟5但不明確處理，可能需要開始處理
      // 注意：shouldStartProcessing 由其他控制，不自動開始
    }
  }, [currentStep, reviewPassed, textProcessingCompleted]);

  // 當審核完成後，重置shouldStartReview
  React.useEffect(() => {
    if (currentStep === 4 && reviewPassed) {
      // 審核完成則設置shouldStartReview為false
      setShouldStartReview(false);
    }
  }, [currentStep, reviewPassed]);

  // 當有上傳成功則標記步驟3完成
  React.useEffect(() => {
    const hasDocuments = documents && documents.length > 0;
    const hasCrawledUrls = crawledUrls && crawledUrls.length > 0;

    if (hasDocuments || hasCrawledUrls) {
      //   documents: documents?.length || 0,
      //   crawledUrls: crawledUrls?.length || 0,
      // });

      setStepCompletion((prev) => ({
        ...prev,
        3: true,
      }));
    } else {
      // 如果沒有上傳內容，取消步驟標記完成
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
      title: t("workflow.stepper.ragConfig.title"),
      infoTitle: t("workflow.stepper.ragConfig.infoTitle"),
      icon: "bi-gear",
      description: t("workflow.stepper.ragConfig.description"),
      color: "primary",
      detailMessage: t("workflow.stepper.ragConfig.detailMessage"),
    },
    {
      id: 2,
      key: "prompt-config",
      title: t("workflow.stepper.promptConfig.title"),
      infoTitle: t("workflow.stepper.promptConfig.infoTitle"),
      icon: "bi-chat-dots",
      description: t("workflow.stepper.promptConfig.description"),
      color: "info",
      detailMessage: t("workflow.stepper.promptConfig.detailMessage"),
    },
    {
      id: 3,
      key: "data-upload",
      title: t("workflow.stepper.dataUpload.title"),
      infoTitle: t("workflow.stepper.dataUpload.infoTitle"),
      icon: "bi-cloud-upload",
      description: t("workflow.stepper.dataUpload.description"),
      color: "orange",
      detailMessage: t("workflow.stepper.dataUpload.detailMessage"),
    },
    {
      id: 4,
      key: "content-review",
      title: t("workflow.stepper.contentReview.title"),
      icon: "bi-shield-check",
      description: t("workflow.stepper.contentReview.description"),
      color: "warning",
      detailMessage: t("workflow.stepper.contentReview.detailMessage"),
    },
    {
      id: 5,
      key: "text-processing",
      title: t("workflow.stepper.textProcessing.title"),
      icon: "bi-diagram-3",
      description: t("workflow.stepper.textProcessing.description"),
      color: "purple",
      detailMessage: t("workflow.stepper.textProcessing.detailMessage"),
    },
    {
      id: 6,
      key: "ai-chat",
      title: t("workflow.stepper.aiChat.title"),
      icon: "bi-robot",
      description: t("workflow.stepper.aiChat.description"),
      color: "indigo",
      detailMessage: t("workflow.stepper.aiChat.detailMessage"),
    },
  ];

  const isStepCompleted = (stepId: number) => {
    // 如果步驟已被確實記為完成，直接返回 true
    if (stepCompletion[stepId as keyof typeof stepCompletion]) {
      return true;
    }
    // 如果當前步驟大於這個步驟，說明已經被訪問過，也算完成
    if (stepId < currentStep) {
      return true;
    }
    return false;
  };
  const isStepActive = (stepId: number) => stepId === currentStep;
  const isStepDisabled = (stepId: number) => stepId > currentStep + 1; // 允許跳一步

  const handleStepClick = (stepId: number) => {
    // 禁用流程的點擊功能，只能靠上一步下一步按鈕移動
    // if (!isStepDisabled(stepId)) {
    //   onStepChange(stepId);
    // }
  };

  const handleInfoClick = (step: any, event: React.MouseEvent) => {
    setToastContent({
      title: step.infoTitle || step.title,
      message: step.detailMessage,
    });
    setShowToast(true);
  };

  // 輔助函數：獲取回應樣式文字
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

  // 輔助函數：獲取專業度文字
  const getProfessionalLevelText = (level: string | undefined) => {
    switch (level) {
      case "casual":
        return "輕鬆";
      case "professional":
        return "專業";
      case "academic":
        return "學術";
      default:
        return "專業";
    }
  };

  // 輔助函數：獲取創造度文字
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
      // 步骤3：資料上傳 - 需要文档或爬蟲內容才可继续
      const hasDocuments = documents && documents.length > 0;
      const hasCrawledUrls = crawledUrls && crawledUrls.length > 0;

      // 檢查文件是否就緒
      const allDocsReady =
        !documents ||
        documents.every(
          (doc) =>
            (doc.chunks && doc.chunks > 0) ||
            doc.extraction_status === "COMPLETED" ||
            doc.extraction_status === "EXTRACTED" ||
            doc.status === "COMPLETED"
        );

      // 檢查URL是否就緒
      const allUrlsReady =
        !crawledUrls ||
        crawledUrls.every(
          (url) =>
            (url.chunks && url.chunks > 0) ||
            url.extraction_status === "COMPLETED" ||
            url.extraction_status === "EXTRACTED" ||
            url.status === "COMPLETED"
        );

      return (hasDocuments || hasCrawledUrls) && allDocsReady && allUrlsReady;
    }
    if (currentStep === 4) {
      // 步骤4：內容審核 - 需要所有審核項目都通過
      return reviewPassed;
    }
    if (currentStep === 5) {
      // 步骤5：資料處理 - 需要所有資料處理已完成
      return textProcessingCompleted;
    }
    // 其他步骤暂时允许继续
    return true;
  };

  // 處理上一步點擊
  const handlePreviousStepClick = () => {
    // 如果從步驟（內容審核）返回流程3（資料上傳），重置審核失敗
    if (
      currentStep === 4 &&
      reviewPassed === false &&
      savedReviewResults?.failed &&
      savedReviewResults.failed.length > 0
    ) {
      // 清除已上傳資料
      onDocumentsUpdate?.([]);
      onCrawledUrlsUpdate?.([]);

      // 重置審核狀態
      setReviewPassed(false);
      setSavedReviewResults(null);
      setShouldStartReview(false);

      // 顯示 toast 訊息
      onShowMessage?.({
        type: "info",
        message:
          "Existing content detected. Please confirm parameters before proceeding.",
      });

      // 返回上一步
      onStepChange(currentStep - 1);
      return;
    }

    // 否則直接返回上一步驟，保留已上傳資料狀態
    onStepChange(currentStep - 1);
  };
  const handleNextStepClick = async () => {
    // 檢查是否正在處理
    if (isGlobalLoading) {
      onShowMessage?.({
        type: "info",
        message: "Processing... please wait.",
      });
      return;
    }

    // 檢查是否已到最後一步
    if (currentStep === steps.length) {
      return;
    }

    // 檢查步驟3是否可以進入下一步
    if (currentStep === 3 && !canProceedToNextStep()) {
      setToastContent({
        title: t("workflow.warning", "警告"),
        message: t(
          "workflow.warnings.uploadFirst",
          "請先上傳檔案或設定網站爬蟲後才能進入下一步驟。"
        ),
      });
      setShowToast(true);
      return;
    }

    // 檢查步驟4是否可以進入下一步
    if (currentStep === 4 && !canProceedToNextStep()) {
      if (!reviewPassed) {
        setToastContent({
          title: t("workflow.warning", "警告"),
          message: t(
            "workflow.warnings.reviewFirst",
            "請先完成內容審核並通過檢查後才能進入下一步驟。"
          ),
        });
        setShowToast(true);
      }
      return;
    }

    // 檢查步驟5是否可以進入下一步
    if (currentStep === 5 && !canProceedToNextStep()) {
      setToastContent({
        title: t("workflow.warning", "警告"),
        message: t(
          "workflow.warnings.processFirst",
          "請先完成資料處理並寫入 Vector DB 後才能進入下一步驟。"
        ),
      });
      setShowToast(true);
      return;
    }

    // 如果從步驟5進入步驟6，更新並儲存 custom_prompt
    if (currentStep === 5 && sessionId && parameters) {
      try {
        // 使用流程2的邏輯生成custom_prompt
        const customPrompt = generateCustomPrompt(parameters);
        if (customPrompt) {
          const { updateCustomPrompt } =
            await import("../../services/sessionService");
          await updateCustomPrompt(sessionId, customPrompt);
        }
      } catch (error) {
        // 不阻擋進入步驟6
      }
    }

    // 如果從步驟3進入步驟4，直接進入下一步
    if (currentStep === 3) {
      onStepChange(currentStep + 1);
      return;
    }
    // 继续下一步
    onStepChange(currentStep + 1);
  };

  // 使用流程2的參數生成 custom_prompt（新增4 塊架構）
  const generateCustomPrompt = (params: any): string | null => {
    const {
      // A. 系統規則
      allow_inference,
      answer_language,
      strict_rag_mode,
      // B. 回應風格
      response_style,
      response_tone,
      persona,
      citation_style,
      // C. 技術控制
      max_response_tokens,
      retrieval_top_k,
      similarity_threshold,
    } = params;

    // Persona 對照
    const personaMap: Record<string, string> = {
      elementary_teacher: "小學老師 - 用簡單例子循序漸進，耐心讓孩子理解。",
      show_host: "節目主持人 - 生動活潑、帶節奏，讓內容更有趣也容易跟上。",
      workplace_veteran: "職場老手 - 實戰經驗豐富，提供務實可落地的建議。",
    };

    // 回應風格對照
    const styleMap: Record<string, string> = {
      brief: "簡要回答，直接給出重點與結論。",
      kid_friendly: "用淺顯比喻與例子，讓小孩也能聽懂。",
    };

    // 回應語氣對照
    const toneMap: Record<string, string> = {
      friendly: "親切溫和的語氣，保持陪伴感。",
      rigorous: "嚴謹精確的語氣，條理清晰。",
      urgent: "急促直接，快速給出答案。",
    };

    // 引用樣式對照
    const citationMap: Record<string, string> = {
      inline: "請勿在回答中插入 [文件ID] 或 [文件x] 等引用標記。直接回答即可。",
      document: "在回答最尾統一列出參考文件來源。",
      none: "不需要標註出處來源。",
    };

    // 語言對照
    const languageMap: Record<string, string> = {
      "zh-TW": "Traditional Chinese (繁體中文)",
      "zh-CN": "Simplified Chinese (简体中文)",
      en: "English",
      fr: "Français",
      auto: "{{language}}", // 使用變數，由後端決定
    };

    // 推論政策
    const inferencePolicy = allow_inference
      ? "你可以基於文件內容做適當推論，但必須清楚標示哪些是直接引用。"
      : "你只能回答文件中明確記載的內容，不可進行推論。";

    // 嚴格 RAG 模式
    const strictRagPolicy =
      strict_rag_mode !== false
        ? "若檢索到的文件無法回答問題，必須明確拒絕回答，並告知使用者找不到相關資料。"
        : "若文件內容不足，可以適度使用一般知識補充，但需標示哪些來自文件及哪些是補充。";

    // 組裝提示
    const personaInstruction =
      personaMap[persona] || personaMap["workplace_veteran"];
    const styleInstruction = styleMap[response_style] || styleMap["brief"];
    const toneInstruction = toneMap[response_tone] || toneMap["friendly"];
    const citationInstruction =
      citationMap[citation_style] || citationMap["inline"];
    const responseLanguage = languageMap[answer_language] || "{{language}}";

    // 組合完整的custom_prompt
    return `你是一個RAG (Retrieval-Augmented Generation) 助理。

**角色設定**: ${personaInstruction}

**回答風格 (RESPONSE STYLE)**: ${styleInstruction}

**回答語氣 (RESPONSE TONE)**: ${toneInstruction}

**引用規範 (CITATION)**: ${citationInstruction}

**推論政策 (INFERENCE)**: ${inferencePolicy}

**嚴格 RAG 模式**: ${strictRagPolicy}

**回答長度限制**: 將回答控制在約${max_response_tokens || 2048} tokens 以內。

**檢索設定**: Top-K=${retrieval_top_k || 5}, 相似度閾值=${
      similarity_threshold || 0.7
    }

**關鍵規則**:
1. **回答語言**: 一律使用${responseLanguage} 進行完整回答，不論使用何種語言。
2. **嚴格 RAG**: 只能依靠下方檢索到的文件內容回答。
3. **禁止虛構**: 不可編造資訊，使用文件以外知識。
4. **部分回答策略**: 如果只有部分與文件相關：
   - 先說明文件中有哪些相關內容
   - 再明確表示問題的哪個部分找不到資料
5. **完全未知處理**: 明確告知使用者並建議可能的替代問法。

**檢索到的文件 (Retrieved Documents)**:
{{context}}

**使用者問題(User Question)**:
{{query}}

**你的回答** (請遵循上述角色、風格與語氣設定):`;
  };

  const handleStepComplete = (stepId: number) => {
    setStepCompletion((prev) => ({
      ...prev,
      [stepId]: true,
    }));

    // 步驟4（內容審核）完成後不自動跳轉，等待用戶點擊下一步
    if (stepId === 4) {
      return; // 不自動跳轉，讓用戶控制
    }

    // 其他步驟自動跳到下一步
    if (stepId < steps.length) {
      onStepChange(stepId + 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <RagConfigStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            onComplete={() => handleStepComplete(1)}
            disabled={shouldDisableConfigSteps}
          />
        );
      case 2:
        return (
          <PromptConfigStep
            parameters={parameters}
            onParameterChange={onParameterChange!}
            onComplete={() => handleStepComplete(2)}
            disabled={shouldDisableConfigSteps}
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
                // 顯示全局 Loading
                setIsGlobalLoading(true);
                setLoadingMessage(
                  t(
                    "workflow.loading.uploadingFile",
                    "Uploading file: {{name}}...",
                    { name: file.name }
                  )
                );

                const response = await uploadFile(sessionId!, file);

                // 建立新的文件項目
                const newDoc = {
                  filename: file.name,
                  size: file.size,
                  uploadTime: new Date().toISOString(),
                  type: "file",
                  chunks: 0, // 初始化0，等待輪詢更新
                  preview: response.preview || processingLabel,
                  status: "processing",
                };
                onDocumentsUpdate?.([...documents, newDoc]);

                // 重置後續步驟狀態
                resetDownstreamSteps();

                // 開始輪詢以獲取最終的 chunks 數量（因為不能在輪詢中更新顯示）
                pollFileStatus(response.document_id, newDoc, file.name, () => {
                  // 輪詢完成後隱藏全局 Loading
                  setIsGlobalLoading(false);
                });

                // 檔案上傳完成，用戶可手動進入下一步
              } catch (error) {
                setIsGlobalLoading(false);
                setToastContent({
                  title: t("workflow.errors.uploadFailedTitle", "Error"),
                  message: t(
                    "workflow.errors.uploadFailed",
                    "File upload failed: {{error}}",
                    {
                      error:
                        error instanceof Error
                          ? error.message
                          : t("workflow.errors.unknown", "Unknown error"),
                    }
                  ),
                });
                setShowToast(true);
              }
            }}
            onUrlUpload={async (url) => {
              try {
                // 顯示全局 Loading
                setIsGlobalLoading(true);
                setLoadingMessage(
                  t(
                    "workflow.loading.processingUrl",
                    "Processing URL: {{url}}...",
                    { url }
                  )
                );

                const response = await uploadUrl(sessionId!, url);
                // 建立新的文件項目
                const newDoc = {
                  filename: url,
                  size: response.content_size || 0,
                  uploadTime: new Date().toISOString(),
                  type: "url",
                  chunks: 0, // 初始為0，等待輪詢更新
                  preview: response.preview || processingLabel,
                  status: "processing",
                };
                onDocumentsUpdate?.([...documents, newDoc]);

                // 重置後續步驟狀態
                resetDownstreamSteps();

                // 啟動輪詢以獲取最終的 chunks 數量（在背景輪詢，不阻擋顯示）
                pollDocumentStatus(response.document_id, url, newDoc, () => {
                  // 輪詢完成後隱藏全局 Loading
                  setIsGlobalLoading(false);
                });

                // URL處理完成，用戶可以進入下一步
              } catch (error) {
                setIsGlobalLoading(false);

                // 檢查是否為內容審核錯誤
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                const isContentBlockedError =
                  errorMessage.toLowerCase().includes("content blocked") ||
                  errorMessage.toLowerCase().includes("moderation");

                if (!isContentBlockedError) {
                  setToastContent({
                    title: t("workflow.errors.urlFailedTitle", "Error"),
                    message: t(
                      "workflow.errors.urlFailed",
                      "URL processing failed: {{error}}",
                      { error: errorMessage }
                    ),
                  });
                  setShowToast(true);
                } else {
                }
              }
            }}
            onCrawlerUpload={async (url, maxTokens, maxPages) => {
              // 保留之前的邏輯，依然由在主要的UploadScreen 處理，這裡只是備用
              try {
                // 顯示全局 Loading
                setIsGlobalLoading(true);
                setLoadingMessage(
                  t(
                    "workflow.loading.processingSite",
                    "Processing website: {{url}}...",
                    { url }
                  )
                );

                const response = await uploadWebsite(
                  sessionId!,
                  url,
                  maxTokens,
                  maxPages
                );
                // 更新crawledUrls列表
                const newUrl = {
                  url: url,
                  content_size: response.content_size || 0,
                  crawl_time: new Date().toISOString(),
                  chunks: response.chunk_count || 0,
                  summary: response.summary || processingLabel,
                  pages_found: response.pages_found || 1,
                };
                onCrawledUrlsUpdate?.([...crawledUrls, newUrl]);

                // 重置後續步驟狀態
                resetDownstreamSteps();

                // 關閉全局 Loading
                setIsGlobalLoading(false);

                // 使用中文對話框顯示成功訊息
                setSuccessDialogTitle(t("workflow.success", "成功"));
                setSuccessDialogMessage(
                  t(
                    "workflow.crawlerSuccess",
                    `網站 ${url} 爬取成功，共爬取 ${response.pages_found} 個頁面`,
                    { url, pages: response.pages_found }
                  )
                );
                setShowSuccessDialog(true);
              } catch (error) {
                setIsGlobalLoading(false);

                // 處理錯誤...
                const errorMessage =
                  error instanceof Error ? error.message : String(error);

                setToastContent({
                  title: t("workflow.errors.crawlerFailedTitle", "Error"),
                  message: t(
                    "workflow.errors.crawlerFailed",
                    "Website crawl failed: {{error}}",
                    { error: errorMessage }
                  ),
                });
                setShowToast(true);
              }
            }}
            onCrawlerSuccess={(result) => {
              // 注意：這裡由UploadScreen 直接調用
              // 不需要再次呼叫API，只更新狀態
              const url =
                result.source_reference || result.url || "Unknown URL";

              const newUrl = {
                url: url,
                content_size: result.content_size || 0,
                crawl_time: new Date().toISOString(),
                chunks: result.chunk_count || 0,
                summary: result.summary || "網站內容處理...",
                pages_found: result.pages_found || 1,
                extraction_status: "EXTRACTED", // 標記為已提取，供 canProceedToNextStep 判斷使用
                status: "COMPLETED",
              };

              onCrawledUrlsUpdate?.([...crawledUrls, newUrl]);
              resetDownstreamSteps();

              // 使用中文對話框顯示成功訊息
              setSuccessDialogTitle(t("workflow.success", "成功"));
              setSuccessDialogMessage(
                t(
                  "workflow.crawlerSuccess",
                  `網站 ${url} 爬取成功，共爬取 ${result.pages_found} 個頁面`,
                  { url, pages: result.pages_found }
                )
              );
              setShowSuccessDialog(true);
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
              // 使用 setTimeout 將狀態更新推遲到下一個事件循環，避免在渲染期間更新狀態
              setTimeout(() => {
                setReviewPassed(passed);
                if (passed) {
                  // 審核通過後重置shouldStartReview為false
                  setShouldStartReview(false);
                }
              }, 0);
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
            savedReviewResults={savedReviewResults}
            onSaveReviewResults={setSavedReviewResults}
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
            shouldStartProcessing={shouldStartProcessing}
            onProcessingComplete={() => {
              // 更新狀態並標記步驟完成
              setTextProcessingCompleted(true);
              setStepCompletion((prev) => ({ ...prev, 5: true }));
            }}
            onProcessingStatusChange={(isCompleted) => {
              // 使用 setTimeout 將狀態更新推遲到下一個事件循環
              setTimeout(() => {
                setTextProcessingCompleted(isCompleted);
              }, 0);
            }}
            onLoadingChange={(isLoading, message) => {
              setIsGlobalLoading(isLoading);
              if (message) {
                setLoadingMessage(message);
              }
            }}
            savedProcessingResults={savedProcessingResults}
            onSaveProcessingResults={setSavedProcessingResults}
          />
        );
      case 6:
        return (
          <div className="ai-chat-step-container">
            {/* AI 聊天界面 - 不留空白 - 使用真實組件 */}
            <div className="ai-chat-content">
              <AiChatStep
                sessionId={sessionId}
                parameters={parameters}
                savedChatMessages={savedChatMessages}
                onSaveChatMessages={setSavedChatMessages}
              />
            </div>
          </div>
        );
      default:
        return <div>Invalid step: {currentStep}</div>;
    }
  };

  return (
    <div className="workflow-stepper xs:p-0">
      {/* 錯誤對話框*/}
      {showErrorDialog && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {errorDialogTitle}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowErrorDialog(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p style={{ whiteSpace: "pre-line" }}>{errorDialogMessage}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowErrorDialog(false)}
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 成功對話框*/}
      {showSuccessDialog && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {successDialogTitle}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowSuccessDialog(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p style={{ whiteSpace: "pre-line" }}>{successDialogMessage}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setShowSuccessDialog(false)}
                >
                  {t("buttons.confirm", "Confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card workflow-container p-3">
        {/* 步驟顯示區 - 水平排列 */}
        <div className="stepper-header ">
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
                  {/* 步驟圓圈區域*/}
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

                  {/* 連接線（只顯示最後一個步驟 */}
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

        <div className="step-action-hero mt-2">
          <div className="action-left">
            <h5 className="mb-1 d-flex align-items-center gap-2">
              {steps[currentStep - 1].title}
              {currentStep === 5 &&
                shouldStartProcessing &&
                !textProcessingCompleted && (
                  <span className="badge bg-info text-dark">
                    {t("workflow.loading.processingShort", "Processing...")}
                  </span>
                )}
            </h5>
            <div className="text-muted ">
              {steps[currentStep - 1].description}
            </div>
          </div>

          <div className="action-right d-flex align-items-center gap-2 flex-wrap justify-content-end">
            {currentStep > 1 && (
              <button
                className="btn btn-outline-light"
                onClick={handlePreviousStepClick}
                disabled={currentStep === 1}
              >
                <i className="bi bi-chevron-left me-1"></i>
                {t("workflow.previous")}
              </button>
            )}

            <div className="step-counter-pill">
              {currentStep} / {steps.length}
            </div>

            {/* 步驟6顯示「總結」按鈕 */}
            {currentStep === 6 && (
              <button
                className="btn btn-summary-pro me-2"
                onClick={() => onShowRagSummary?.()}
                disabled={isGlobalLoading}
              >
                {t("workflow.summary")}
              </button>
            )}

            {/* 非最後步驟顯示「下一步」按鈕 */}
            {currentStep < steps.length && (
              <button
                className={
                  [3, 4, 5].includes(currentStep) && !canProceedToNextStep()
                    ? "btn btn-secondary"
                    : "btn btn-success"
                }
                onClick={handleNextStepClick}
                disabled={currentStep === steps.length || isGlobalLoading}
              >
                {[3, 4, 5].includes(currentStep) && !canProceedToNextStep() ? (
                  <>
                    {t("workflow.next")}
                    <i className="bi bi-question-circle ms-1"></i>
                  </>
                ) : (
                  <>
                    {t("workflow.next")}
                    <i className="bi bi-chevron-right ms-1"></i>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* renderStepContent*/}
      <div className="container py-3 col-sm-12 col-md-10 col-lg-8 ">
        {renderStepContent()}
      </div>

      {/* 中央資訊對話框，取代 Toast*/}
      {showToast && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1090 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title d-flex align-items-center mb-0">
                  <i className="bi bi-info-circle-fill me-2"></i>
                  {toastContent.title}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setShowToast(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
                  {toastContent.message}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowToast(false)}
                >
                  {t("buttons.understand", "Got it")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAG 總結對話框 */}
      {/* 移除本地的 RAG 總結對話框，改用父組件的 AboutProjectModal */}
      {false && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100 }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div
                className="modal-header"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                }}
              >
                <h3 className="modal-title text-white">RAG 技術總結 </h3>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {}}
                ></button>
              </div>
              <div className="modal-body p-4">
                {/* 使用 Card Grid 布局 */}
                <div className="row g-3">
                  {/* 主題 1: 進步空間（新增，放第一位）*/}
                  <div className="col-md-6">
                    <div className="card h-100 border-warning shadow-sm">
                      <div className="card-header bg-warning bg-opacity-10 border-warning">
                        <h3 className="card-title text-warning mb-0 fw-bold">
                          還有進步空間
                        </h3>
                        <small className="text-muted">
                          此專案與商業實用之間距離
                        </small>
                      </div>
                      <div className="card-body">
                        <p className="card-text mb-2">
                          <strong className="text-danger">
                            缺少企業級功能：
                          </strong>
                          未實現用戶權限管理、多租戶隔離、審計日誌等企業必需功能。
                        </p>
                        <p className="card-text mb-2">
                          <strong className="text-danger">
                            可擴展性不足：
                          </strong>
                          單機部署架構，未考慮分散式向量庫、負載均衡、容錯機制。
                        </p>
                        <p className="card-text mb-2">
                          <strong className="text-danger">
                            成本控制缺失：
                          </strong>
                          無 Token 用量監控、配額管理、成本分析等營運必備工具。
                        </p>
                        <p className="card-text mb-0">
                          <strong className="text-danger">
                            測試覆蓋有限：
                          </strong>
                          缺少完整的單元測試、集成測試、性能測試與 A/B
                          測試框架。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 主題 2: RAG 的好處 */}
                  <div className="col-md-6">
                    <div className="card h-100 border-success shadow-sm">
                      <div className="card-header bg-success bg-opacity-10 border-success">
                        <h3 className="card-title text-success mb-0 fw-bold">
                          RAG 帶來的好處
                        </h3>
                        <small className="text-muted">為何選擇 RAG 架構</small>
                      </div>
                      <div className="card-body">
                        <p className="card-text mb-2">
                          <strong className="text-success">
                            減少幻覺，提升準確性：
                          </strong>
                          RAG 透過檢索真實文件確保回答有明確來源，大幅降低 LLM
                          憑空想像的幻覺問題。
                        </p>
                        <p className="card-text mb-2">
                          <strong className="text-success">
                            即時知識更新：
                          </strong>
                          只需更新向量資料庫文件即可反映最新資訊，無需重新訓練模型。
                        </p>
                        <p className="card-text mb-0">
                          <strong className="text-success">
                            可追溯性與安全性：
                          </strong>
                          明確標示答案來源，便於驗證。企業資料存於自建資料庫，符合隱私法規。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 主題 3: RAG 的短處 */}
                  <div className="col-md-6">
                    <div className="card h-100 border-danger shadow-sm">
                      <div className="card-header bg-danger bg-opacity-10 border-danger">
                        <h3 className="card-title text-danger mb-0 fw-bold">
                          RAG 並非萬能
                        </h3>
                        <small className="text-muted">需要注意的局限性</small>
                      </div>
                      <div className="card-body">
                        <p className="card-text mb-2">
                          <strong className="text-danger">
                            檢索品質決定一切：
                          </strong>
                          向量搜尋若錯過關鍵資訊或檢索不當，會導致錯誤答案。閾值設定、模型選擇、切塊策略都影響結果。
                        </p>
                        <p className="card-text mb-2">
                          <strong className="text-danger">延遲與成本：</strong>
                          需先檢索再生成，增加延遲。大規模部署時資料庫與 LLM
                          並發壓力高。
                        </p>
                        <p className="card-text mb-0">
                          <strong className="text-danger">
                            複雜推理限制：
                          </strong>
                          擅長查找回答，但不擅長多步驟推理或跨文件整合的複雜分析。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 主題 4: Agentic RAG */}
                  <div className="col-md-6">
                    <div className="card h-100 border-info shadow-sm">
                      <div className="card-header bg-info bg-opacity-10 border-info">
                        <h3 className="card-title text-info mb-0 fw-bold">
                          可以更智能! Agentic RAG
                        </h3>
                        <small className="text-muted">
                          從被動檢索到主動推理
                        </small>
                      </div>
                      <div className="card-body">
                        <p className="card-text mb-2">
                          <strong className="text-info">多輪自主檢索：</strong>
                          評估結果充分性，自動調整策略直到找到滿意答案。
                        </p>
                        <p className="card-text mb-2">
                          <strong className="text-info">工具呼叫整合：</strong>
                          可執行代碼、查詢
                          API、訪問資料庫，實現複雜計算與即時查詢。
                        </p>
                        <p className="card-text mb-2">
                          <strong className="text-info">任務分解：</strong>
                          將複雜問題拆解成子任務獨立執行，最終整合結果。
                        </p>
                        <div className="alert alert-info mb-0 py-2 small">
                          <strong>應用案例：</strong>
                          客服代理、研究助手、程式碼助手
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {}}
                >
                  {t("buttons.understand", "Got it")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全局 Loading Overlay */}
      <LoadingOverlay isVisible={isGlobalLoading} message={loadingMessage} />
    </div>
  );
};

export default WorkflowStepper;
