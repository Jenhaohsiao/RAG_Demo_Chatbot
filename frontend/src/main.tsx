import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// 確保Bootstrap JavaScript正確載入
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// 導入統一的SCSS樣式系統
// 包含全局變數、mixins、工具類和既有CSS檔案
import "./styles/index.scss";
import "./main.scss"; // 主樣式檔案（已轉換為SCSS）
import "./i18n/config";
import { useTranslation } from "react-i18next";
import i18n from "./i18n/config";

import Header from "./components/Header/Header";
import UploadScreen from "./components/UploadScreen/UploadScreen";
import ProcessingModal from "./components/ProcessingModal/ProcessingModal";
import ChatScreen from "./components/ChatScreen/ChatScreen";
import SettingsModal from "./components/SettingsModal/SettingsModal";
import ConfirmDialog from "./components/ConfirmDialog/ConfirmDialog";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary"; // T093: Import Error Boundary
import PromptVisualization from "./components/PromptVisualization/PromptVisualization";
import FixedRagFlow from "./components/FixedRagFlow/FixedRagFlow";
import AboutProjectModal from "./components/AboutProjectModal/AboutProjectModal";
import WorkflowMain from "./components/WorkflowMain/WorkflowMain"; // New workflow integration
import ToastMessage from "./components/ToastMessage/ToastMessage";
import { useSession } from "./hooks/useSession";
import { useUpload } from "./hooks/useUpload";
import { useToast } from "./hooks/useToast";
import { submitQuery } from "./services/chatService";
import type { SupportedLanguage } from "./hooks/useLanguage";
import type { ChatResponse } from "./types/chat";

/**
 * Main App Component
 * Phase 4: Document Upload Integration
 * T093: Wrapped with Error Boundary for error handling
 *
 * Flow:
 * 1. Upload Screen - 初始畫面
 * 2. Processing Modal - 上傳/處理進度
 * 3. Chat Screen - 完成後的對話界面
 */
const App: React.FC = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1); // 新增當前步驟狀態
  const { toasts, showToast, dismissToast } = useToast();

  const {
    sessionId,
    language,
    isLoading,
    error,
    isSessionExpired,
    createSession,
    closeSession,
    restartSession,
    updateLanguage,
    setOnSessionExpired,
  } = useSession(); // 先初始化session，稍後設置callback

  const {
    uploadResponse,
    statusResponse,
    handleFileUpload,
    handleUrlUpload,
    reset: resetUpload,
    isCompleted,
    isFailed,
  } = useUpload(sessionId || "");

  /**
   * Handle session expiration
   */
  const handleSessionExpiration = useCallback(() => {
    // 顯示toast通知
    showToast({
      type: "error",
      message: "會話已過期，將重新開始整個流程",
      duration: 4000,
    });

    // 重置所有狀態到第一步
    setCurrentStep(1);
    setChatPhase(false);
    resetUpload();

    console.log("Session expired, reset to step 1");
  }, [showToast, resetUpload]);

  // 設置session過期回調
  React.useEffect(() => {
    setOnSessionExpired(handleSessionExpiration);
  }, [handleSessionExpiration, setOnSessionExpired]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [chatPhase, setChatPhase] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(10);
  const [supportedFileTypes, setSupportedFileTypes] = useState(["pdf", "txt"]);
  const [crawlerMaxTokens, setCrawlerMaxTokens] = useState(100000);
  const [crawlerMaxPages, setCrawlerMaxPages] = useState(10);
  const [ragContextWindow, setRagContextWindow] = useState(5);
  const [ragCitationStyle, setRagCitationStyle] = useState("numbered");
  const [ragFallbackMode, setRagFallbackMode] = useState("flexible");

  // T084-T085: Session control confirmation dialogs
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [systemMessage, setSystemMessage] = useState<{
    type: "error" | "warning" | "info" | "success";
    message: string;
  } | null>(null);
  const [isBlocked, setIsBlocked] = useState(false); // 阻止用户操作直到确认消息
  const lastErrorRef = React.useRef<string | null>(null);
  const [workflowReset, setWorkflowReset] = useState(false); // 工作流程重置信號

  // T074: Setup RTL support for Arabic language
  React.useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      // RTL support for Arabic
      const isRTL = lng === "ar";
      document.documentElement.dir = isRTL ? "rtl" : "ltr";
      document.documentElement.lang = lng;

      // Also apply to body for some CSS properties
      if (isRTL) {
        document.body.classList.add("rtl-layout");
      } else {
        document.body.classList.remove("rtl-layout");
      }

      console.log(
        "[RTL] Language changed to:",
        lng,
        "Direction:",
        isRTL ? "rtl" : "ltr"
      );
    };

    // Initial setup based on current language
    handleLanguageChanged(i18n.language);

    // Listen for language changes
    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  // 當 threshold 改變時重新創建 session（僅在沒有上傳文件時）
  const handleThresholdChange = async (newThreshold: number) => {
    setSimilarityThreshold(newThreshold);

    // 只在沒有上傳文件時才重新創建 session
    if (sessionId && !uploadResponse) {
      await closeSession();
      await createSession(newThreshold);
    }
  };

  // 處理來自 PromptVisualization 的參數變更
  const handleParameterChange = (parameter: string, value: any) => {
    switch (parameter) {
      case "similarity_threshold":
        handleThresholdChange(value);
        break;
      case "max_file_size_mb":
        setMaxFileSizeMB(value);
        break;
      case "supported_file_types":
        setSupportedFileTypes(value);
        break;
      case "crawler_max_tokens":
        setCrawlerMaxTokens(value);
        break;
      case "crawler_max_pages":
        setCrawlerMaxPages(value);
        break;
      case "rag_context_window":
        setRagContextWindow(value);
        break;
      case "rag_citation_style":
        setRagCitationStyle(value);
        break;
      case "rag_fallback_mode":
        setRagFallbackMode(value);
        break;
      default:
        console.log(`RAG 參數變更: ${parameter} = ${value}`);
        break;
    }
  };

  // Auto-create session on component mount
  React.useEffect(() => {
    if (!sessionId && !isLoading) {
      createSession(similarityThreshold);
    }
  }, [sessionId, isLoading, createSession, similarityThreshold]);

  // Handle error messages from session and upload
  React.useEffect(() => {
    let currentError: string | null = null;

    if (error) {
      currentError = error;
    } else if (isFailed && statusResponse?.error_message) {
      currentError = statusResponse.error_message;
    }

    if (currentError && lastErrorRef.current !== currentError) {
      // 新錯誤，設置系統消息
      lastErrorRef.current = currentError;
      setSystemMessage({
        type: "error",
        message: currentError,
      });
      setIsBlocked(true);
    } else if (
      !currentError &&
      lastErrorRef.current &&
      systemMessage?.type === "error"
    ) {
      // 錯誤已清除，清理狀態
      lastErrorRef.current = null;
      setSystemMessage(null);
      setIsBlocked(false);
    }
  }, [
    error,
    isFailed,
    statusResponse?.error_message,
    // 移除 systemMessage 依賴，避免循環觸發
  ]);

  // 上傳檔案時顯示 modal
  const wrappedFileUpload = async (file: File) => {
    setShowModal(true);
    await handleFileUpload(file);
  };

  // 上傳 URL 時顯示 modal
  const wrappedUrlUpload = async (url: string) => {
    setShowModal(true);
    await handleUrlUpload(url);
  };

  // Modal 確認按鈕
  const handleModalConfirm = async () => {
    console.log("[handleModalConfirm] Called", { isFailed, isCompleted });

    if (isFailed) {
      // 失敗時回到上傳畫面
      console.log("[handleModalConfirm] Upload failed, resetting");
      setShowModal(false);
      resetUpload();
    } else if (isCompleted) {
      // 直接進入聊天畫面，不需要等待狀態更新
      // 因為文件處理完成後，後端已經將狀態設置為 READY_FOR_CHAT
      console.log("[handleModalConfirm] Upload completed, entering chat phase");
      setShowModal(false);
      setChatPhase(true);
    } else {
      console.log(
        "[handleModalConfirm] Unexpected state - not failed and not completed"
      );
    }
  };

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    try {
      console.log(
        "[handleLanguageChange] Changing language to:",
        newLanguage,
        "with sessionId:",
        sessionId
      );

      // T075: Pass sessionId for backend sync
      await updateLanguage(newLanguage, sessionId);

      console.log("[handleLanguageChange] Language change successful");
    } catch (err) {
      console.error("[handleLanguageChange] Error:", err);
      // Error is already handled in useSession.updateLanguage
    }
  };
  // 处理系统消息确认
  const handleDismissMessage = () => {
    setSystemMessage(null);
    setIsBlocked(false);
  };

  // 处理session错误时的重启
  const handleRestartSession = async () => {
    try {
      setSystemMessage(null);
      setIsBlocked(false);
      await restartSession();
      resetUpload();
      setChatPhase(false);

      // 显示成功提示
      setSystemMessage({
        type: "success",
        message: "Session 更新成功！",
      });
    } catch (err) {
      console.error("[handleRestartSession] Error:", err);
      // 显示错误提示
      setSystemMessage({
        type: "error",
        message: "Session 更新失敗，請稍後再試。",
      });
    }
  };
  // T086: Leave button handler - shows confirmation dialog
  const handleLeaveClick = () => {
    setShowLeaveConfirm(true);
  };

  // T086: Confirm leave - close session and reset UI
  const handleConfirmLeave = async () => {
    try {
      await closeSession();
      resetUpload();
      setChatPhase(false);
      setShowLeaveConfirm(false);
    } catch (err) {
      console.error("[handleConfirmLeave] Error:", err);
    }
  };

  // T087: Restart button handler - shows confirmation dialog
  const handleRestartClick = () => {
    setShowRestartConfirm(true);
  };

  // T087: Confirm restart - close session, create new one, reset UI
  const handleConfirmRestart = async () => {
    try {
      await restartSession();
      resetUpload();
      setChatPhase(false);
      setShowRestartConfirm(false);

      // 觸發工作流程重置
      setWorkflowReset(true);
      setTimeout(() => setWorkflowReset(false), 100); // 重置信號

      // 显示成功提示
      setSystemMessage({
        type: "success",
        message: "Session 重新啟動成功！系統已重置為初始狀態。",
      });
    } catch (err) {
      console.error("[handleConfirmRestart] Error:", err);
      // 显示错误提示
      setSystemMessage({
        type: "error",
        message: "Session 重新啟動失敗，請稍後再試。",
      });
    }
  };

  const handleSettingsSave = async (
    threshold: number,
    customPrompt?: string
  ) => {
    setSimilarityThreshold(threshold);
    setShowSettings(false);

    // If session already exists, recreate it with new threshold and custom prompt
    if (sessionId) {
      await closeSession();
      await createSession(threshold, customPrompt);
    }
  };

  // 取得處理階段文字
  const getProcessingStage = (): string => {
    if (isFailed) {
      return t("processing.stage.failed", "Processing Failed");
    }

    if (!statusResponse)
      return t("processing.stage.extracting", "Extracting Text...");

    const progress = statusResponse.processing_progress;

    if (progress === 100) {
      return t("processing.stage.complete", "Processing Complete");
    }

    if (progress >= 75) {
      return t("processing.stage.embedding", "Embedding & Storing...");
    }

    if (progress >= 50) {
      return t("processing.stage.chunking", "Chunking Text...");
    }

    if (progress >= 25) {
      return t("processing.stage.moderating", "Checking Content Safety...");
    }

    return t("processing.stage.extracting", "Extracting Text...");
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Header
        sessionId={sessionId}
        onLanguageChange={handleLanguageChange}
        onLeave={handleLeaveClick}
        onRestart={handleRestartClick}
        onAboutClick={() => setShowAboutModal(true)}
        systemMessage={systemMessage}
        onDismissMessage={handleDismissMessage}
        onRestartSession={handleRestartSession}
      />

      {/* Workflow Mode Content */}
      <div
        className={`container main-content-container xs:m-0 p-0${
          isBlocked ? "position-relative" : ""
        }`}
      >
        {/* 阻止遮罩层 */}
        {isBlocked && (
          <div className="position-fixed main-blocking-overlay"></div>
        )}

        <WorkflowMain
          sessionId={sessionId}
          onParameterChange={handleParameterChange}
          onShowMessage={setSystemMessage}
          onResetWorkflow={workflowReset}
          similarityThreshold={similarityThreshold}
          maxFileSizeMB={maxFileSizeMB}
          supportedFileTypes={supportedFileTypes}
          crawlerMaxTokens={crawlerMaxTokens}
          crawlerMaxPages={crawlerMaxPages}
          ragContextWindow={ragContextWindow}
          ragCitationStyle={ragCitationStyle}
          ragFallbackMode={ragFallbackMode}
        />
      </div>

      {/* Processing Modal */}
      {showModal && uploadResponse && statusResponse && (
        <ProcessingModal
          isOpen={showModal}
          sourceType={uploadResponse.source_type}
          sourceReference={statusResponse.source_reference || "Unknown"}
          processingProgress={statusResponse.processing_progress}
          processingStage={getProcessingStage()}
          isError={isFailed}
          errorMessage={statusResponse.error_message}
          isCompleted={isCompleted}
          summary={statusResponse.summary}
          chunkCount={statusResponse.chunk_count}
          // T089+ 傳遞 token 和頁面信息
          tokensUsed={statusResponse.tokens_used}
          pagesCrawled={statusResponse.pages_crawled}
          onConfirm={handleModalConfirm}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        show={showSettings}
        defaultThreshold={similarityThreshold}
        onCancel={() => setShowSettings(false)}
        onConfirm={handleSettingsSave}
      />

      {/* T084: Leave Confirmation Dialog */}
      <ConfirmDialog
        title={t("dialogs.leave.title")}
        message={t("dialogs.leave.message")}
        confirmText={t("buttons.leave")}
        cancelText={t("buttons.cancel")}
        isDangerous={true}
        isOpen={showLeaveConfirm}
        onConfirm={handleConfirmLeave}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* T085: Restart Confirmation Dialog */}
      <ConfirmDialog
        title={t("dialogs.restart.title")}
        message={t("dialogs.restart.message")}
        confirmText={t("buttons.restart")}
        cancelText={t("buttons.cancel")}
        isDangerous={false}
        isOpen={showRestartConfirm}
        onConfirm={handleConfirmRestart}
        onCancel={() => setShowRestartConfirm(false)}
      />

      {/* About Project Modal */}
      <AboutProjectModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* Toast Messages */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
        {toasts.map((toast) => (
          <ToastMessage
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onDismiss={() => dismissToast(toast.id)}
            showConfirmButton={false}
          />
        ))}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {" "}
      {/* T093: Wrap App with Error Boundary */}
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
