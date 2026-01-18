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
  onShowRagSummary?: () => void; // Added: Notify parent component to show RAG summary
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

  // Success dialog, used for crawler success, etc.
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogTitle, setSuccessDialogTitle] = useState<string>("");
  const [successDialogMessage, setSuccessDialogMessage] = useState<string>("");

  // Global Loading state
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

  // RAG summary dialog - Removed local state, use parent component's AboutProjectModal
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
          // Update document chunks state (Flow 3 is unreliable because chunk_count might be 0, check extraction_status instead)
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

            // Update corresponding item in documents list (use more stable matching logic)
            let docUpdated = false;
            const updatedDocs = documents.map((doc) => {
              // Forced matching logic: prioritize filename, then check other attributes
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
        2000, // Poll every 2 seconds
        30 // Max 30 polls (1 minute)
      );

      // Final update to ensure documents are not accidentally cleared
      if (
        finalStatus.extraction_status === "COMPLETED" ||
        finalStatus.chunk_count > 0
      ) {
        // Check if token count is sufficient (at least 50 tokens)
        const MIN_TOKENS_REQUIRED = 50;
        const tokensUsed = finalStatus.tokens_used || 0;

        if (tokensUsed > 0 && tokensUsed < MIN_TOKENS_REQUIRED) {
          // Insufficient tokens, show error dialog
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

          // Remove the file
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
          preview: finalStatus.summary || "Processing complete",
          status: "completed",
        };

        let docFound = false;
        const finalDocs = documents.map((doc) => {
          // Forced matching logic
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

        // If no corresponding file found, add directly (but avoid duplication)
        if (!docFound) {
          // Check if same file exists (avoid duplicate addition)
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

        // Safety check: ensure documents are not accidentally cleared
        if (finalDocs.length === 0 && documents.length > 0) {
          return; // Do not execute update that might clear documents
        }

        onDocumentsUpdate?.(finalDocs);

        // Now show final processing message here, including chunks info
        // onShowMessage?.({
        //   type: "success",
        //   message: `${
        //     docItem.type === "file" ? "File" : "URL"
        //   } ${identifier} processed! Generated ${
        //     finalStatus.chunk_count
        //   } text chunks.`,
        // });
      }

      // Polling complete, call callback
      onComplete?.();
    } catch (error) {
      // Call callback on error too
      onComplete?.();

      // Check if it is content review error - if so, do not show error in flow 3 (handled in review step)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isContentBlockedError =
        errorMessage.toLowerCase().includes("content blocked") ||
        errorMessage.toLowerCase().includes("moderation");

      if (!isContentBlockedError) {
        // Check if it's a crawler-related error
        const isUrlError = docItem.type === "url";
        const isBlockedError =
          errorMessage.toLowerCase().includes("blocked") ||
          errorMessage.toLowerCase().includes("forbidden") ||
          errorMessage.toLowerCase().includes("403") ||
          errorMessage.toLowerCase().includes("access denied") ||
          errorMessage.toLowerCase().includes("robot");

        // Check if it is insufficient content error
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

        // Use dialog instead of toast for non-content-review errors
        setErrorDialogTitle(displayTitle);
        setErrorDialogMessage(displayMessage);
        setShowErrorDialog(true);
      } else {
        // Content review error only logs to console, no toast shown
      }
    }
  };

  // File status polling function
  const pollFileStatus = async (
    documentId: string,
    docItem: any,
    filename: string,
    onComplete?: () => void
  ) => {
    return pollDocumentStatus(documentId, docItem, filename, onComplete);
  };

  // Add review status management
  const [reviewPassed, setReviewPassed] = useState(false);
  const [shouldStartReview, setShouldStartReview] = useState(false);

  // Save review results, to restore when recovering from other steps
  const [savedReviewResults, setSavedReviewResults] = useState<{
    completed: string[];
    failed: string[];
  } | null>(null);

  // Add text processing status management
  const [textProcessingCompleted, setTextProcessingCompleted] = useState(false);
  const [shouldStartProcessing, setShouldStartProcessing] = useState(false);

  // Save text processing results, to restore from other steps
  const [savedProcessingResults, setSavedProcessingResults] =
    useState<any>(null);

  // Save chat history, to restore from other steps
  const [savedChatMessages, setSavedChatMessages] = useState<any[]>([]);

  // When sessionId changes, reset all states
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

  // Helper function: Reset downstream steps state
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

  // Calculate if flow 1 should be disabled
  // Maintain logic: Disable step 1 config if step 3 upload success has documents or crawledUrls
  const shouldDisableConfigSteps = React.useMemo(() => {
    const hasDocuments = documents && documents.length > 0;
    const hasCrawledUrls = crawledUrls && crawledUrls.length > 0;
    return hasDocuments || hasCrawledUrls;
  }, [documents, crawledUrls]);

  // Handle step change
  // Note: Do not set review passed flag, ensure reviewed not repeated
  React.useEffect(() => {
    // Do nothing on step entry, but do not set reviewed flag
    if (currentStep === 4 && !reviewPassed) {
      // Step 4 entry but not explicit review, might need to start review
      // Note: shouldStartReview controlled by others, not automatic
    }
    if (currentStep === 5 && !textProcessingCompleted) {
      // Step 5 entry but not explicit processing, might need to start processing
      // Note: shouldStartProcessing controlled by others, not automatic
    }
  }, [currentStep, reviewPassed, textProcessingCompleted]);

  // Reset shouldStartReview when review complete
  React.useEffect(() => {
    if (currentStep === 4 && reviewPassed) {
      // Review complete, set shouldStartReview to false
      setShouldStartReview(false);
    }
  }, [currentStep, reviewPassed]);

  // Mark step 3 complete when upload success
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
      // If no content uploaded, cancel step completion mark
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
    // If step is marked as complete, return true
    if (stepCompletion[stepId as keyof typeof stepCompletion]) {
      return true;
    }
    // If current step > this step, it was visited, so complete
    if (stepId < currentStep) {
      return true;
    }
    return false;
  };
  const isStepActive = (stepId: number) => stepId === currentStep;
  const isStepDisabled = (stepId: number) => stepId > currentStep + 1; // Allow skipping one step

  const handleStepClick = (stepId: number) => {
    // Disable click on flow, only use prev/next buttons
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

  // Helper function: Get response style text
  const getResponseStyleText = (style: string | undefined) => {
    switch (style) {
      case "concise":
        return t("settings.responseStyle.concise", "Concise");
      case "standard":
        return t("settings.responseStyle.standard", "Standard");
      case "detailed":
        return t("settings.responseStyle.detailed", "Detailed");
      default:
        return t("settings.responseStyle.standard", "Standard");
    }
  };

  // Helper function: Get professional level text
  const getProfessionalLevelText = (level: string | undefined) => {
    switch (level) {
      case "casual":
        return t("settings.professionalLevel.casual", "Casual");
      case "professional":
        return t("settings.professionalLevel.professional", "Professional");
      case "academic":
        return t("settings.professionalLevel.academic", "Academic");
      default:
        return t("settings.professionalLevel.professional", "Professional");
    }
  };

  // Helper function: Get creativity level text
  const getCreativityLevelText = (level: string | undefined) => {
    switch (level) {
      case "conservative":
        return t("settings.creativityLevel.conservative", "Conservative");
      case "balanced":
        return t("settings.creativityLevel.balanced", "Balanced");
      case "creative":
        return t("settings.creativityLevel.creative", "Creative");
      default:
        return t("settings.creativityLevel.balanced", "Balanced");
    }
  };

  // Check if step can proceed
  const canProceedToNextStep = () => {
    if (currentStep === 3) {
      // Step 3: Data Upload - Needs document or crawler content to proceed
      const hasDocuments = documents && documents.length > 0;
      const hasCrawledUrls = crawledUrls && crawledUrls.length > 0;

      // Check if files are ready
      const allDocsReady =
        !documents ||
        documents.every(
          (doc) =>
            (doc.chunks && doc.chunks > 0) ||
            doc.extraction_status === "COMPLETED" ||
            doc.extraction_status === "EXTRACTED" ||
            doc.status === "COMPLETED"
        );

      // Check if URLs are ready
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
      // Step 4: Content Review - Needs all review items passed
      return reviewPassed;
    }
    if (currentStep === 5) {
      // Step 5: Data Processing - Needs all data processing completed
      return textProcessingCompleted;
    }
    // Other steps temporarily allow proceed
    return true;
  };

  // Handle previous step click
  const handlePreviousStepClick = () => {
    // If returning from Step 4 (Content Review) to Step 3 (Data Upload), reset review failure
    if (
      currentStep === 4 &&
      reviewPassed === false &&
      savedReviewResults?.failed &&
      savedReviewResults.failed.length > 0
    ) {
      // Clear uploaded data
      onDocumentsUpdate?.([]);
      onCrawledUrlsUpdate?.([]);

      // Reset review status
      setReviewPassed(false);
      setSavedReviewResults(null);
      setShouldStartReview(false);

      // Show toast message
      onShowMessage?.({
        type: "info",
        message:
          "Existing content detected. Please confirm parameters before proceeding.",
      });

      // Return to previous step
      onStepChange(currentStep - 1);
      return;
    }

    // Otherwise return to previous step directly, keeping uploaded data status
    onStepChange(currentStep - 1);
  };
  const handleNextStepClick = async () => {
    // Check if processing
    if (isGlobalLoading) {
      onShowMessage?.({
        type: "info",
        message: "Processing... please wait.",
      });
      return;
    }

    // Check if last step
    if (currentStep === steps.length) {
      return;
    }

    // Check if step 3 can proceed to next step
    if (currentStep === 3 && !canProceedToNextStep()) {
      setToastContent({
        title: t("workflow.warning"),
        message: t("workflow.warnings.uploadFirst"),
      });
      setShowToast(true);
      return;
    }

    // Check if step 4 can proceed to next step
    if (currentStep === 4 && !canProceedToNextStep()) {
      if (!reviewPassed) {
        setToastContent({
          title: t("workflow.warning"),
          message: t("workflow.warnings.reviewFirst"),
        });
        setShowToast(true);
      }
      return;
    }

    // Check if step 5 can proceed to next step
    if (currentStep === 5 && !canProceedToNextStep()) {
      setToastContent({
        title: t("workflow.warning"),
        message: t("workflow.warnings.processFirst"),
      });
      setShowToast(true);
      return;
    }

    // If entering step 6 from step 5, update and save custom_prompt
    if (currentStep === 5 && sessionId && parameters) {
      try {
        // Generate custom_prompt using logic from flow 2
        const customPrompt = generateCustomPrompt(parameters);
        if (customPrompt) {
          const { updateCustomPrompt } =
            await import("../../services/sessionService");
          await updateCustomPrompt(sessionId, customPrompt);
        }
      } catch (error) {
        // Do not block entering step 6
      }
    }

    // If entering step 4 from step 3, proceed directly
    if (currentStep === 3) {
      onStepChange(currentStep + 1);
      return;
    }
    // Continue to next step
    onStepChange(currentStep + 1);
  };

  // Generate custom_prompt using parameters from flow 2
  // Note: This function generates AI system prompts in the user's selected language
  const generateCustomPrompt = (params: any): string | null => {
    const {
      // A. System Rules
      allow_inference = true,
      answer_language = "auto",
      strict_rag_mode = true,
      // B. Response Style
      response_style = "detailed",
      response_tone = "professional",
      persona = "default",
      citation_style = "none",
      // C. Technical Control
      max_response_tokens = 2048,
      retrieval_top_k = 5,
      similarity_threshold = 0.7,
    } = params || {};

    // Determine prompt language based on answer_language
    const promptLang =
      answer_language === "auto" ? i18n.language : answer_language;

    // Get persona instruction from i18n
    const personaKey = `promptTemplate.persona.${persona}`;
    const personaInstruction = t(personaKey, { lng: promptLang });

    // Get response style instruction from i18n
    const styleKey = `promptTemplate.responseStyle.${response_style}`;
    const styleInstruction = t(styleKey, { lng: promptLang });

    // Get response tone instruction from i18n
    const toneKey = `promptTemplate.responseTone.${response_tone}`;
    const toneInstruction = t(toneKey, { lng: promptLang });

    // Get citation instruction from i18n
    const citationKey = `promptTemplate.citation.${citation_style}`;
    const citationInstruction = t(citationKey, { lng: promptLang });

    // Get inference policy from i18n
    const inferenceKey = allow_inference
      ? "promptTemplate.inference.allowed"
      : "promptTemplate.inference.notAllowed";
    const inferencePolicy = t(inferenceKey, { lng: promptLang });

    // Get strict RAG policy from i18n
    const strictRagKey =
      strict_rag_mode !== false
        ? "promptTemplate.strictRag.enabled"
        : "promptTemplate.strictRag.disabled";
    const strictRagPolicy = t(strictRagKey, { lng: promptLang });

    // Get language name
    const languageMap: Record<string, string> = {
      "zh-TW": t("promptTemplate.languages.zhTW", { lng: promptLang }),
      "zh-CN": t("promptTemplate.languages.zhCN", { lng: promptLang }),
      en: t("promptTemplate.languages.en", { lng: promptLang }),
      fr: t("promptTemplate.languages.fr", { lng: promptLang }),
      auto: "{{language}}",
    };
    const responseLanguage = languageMap[answer_language] || "{{language}}";

    // Assemble complete custom_prompt using template from i18n
    return t("promptTemplate.fullPrompt", {
      lng: promptLang,
      personaInstruction,
      styleInstruction,
      toneInstruction,
      citationInstruction,
      inferencePolicy,
      strictRagPolicy,
      maxResponseTokens: max_response_tokens,
      retrievalTopK: retrieval_top_k,
      similarityThreshold: similarity_threshold,
      responseLanguage,
    });
  };

  const handleStepComplete = (stepId: number) => {
    setStepCompletion((prev) => ({
      ...prev,
      [stepId]: true,
    }));

    // Step 4 (Content Review) complete, do not auto-jump, wait for user click next
    if (stepId === 4) {
      return; // Do not auto-jump, let user control
    }

    // Other steps auto-jump to next
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
                // Show global loading
                setIsGlobalLoading(true);
                setLoadingMessage(
                  t(
                    "workflow.loading.uploadingFile",
                    "Uploading file: {{name}}...",
                    { name: file.name }
                  )
                );

                const response = await uploadFile(sessionId!, file);

                // Create new document item
                const newDoc = {
                  filename: file.name,
                  size: file.size,
                  uploadTime: new Date().toISOString(),
                  type: "file",
                  chunks: 0, // Init 0, wait for poll update
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
