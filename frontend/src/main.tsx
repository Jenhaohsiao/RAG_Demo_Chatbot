import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Ensure Bootstrap JavaScript is loaded correctly
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// Import unified SCSS style system
// Includes global variables, mixins, utilities and existing CSS files
import "./styles/index.scss";
import "./main.scss"; // Main style file (converted to SCSS)
import "./components/ToastMessage/ToastMessage.scss"; // Explicit import for use in main.tsx
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
import ContactModal from "./components/ContactModal/ContactModal";
import WorkflowMain from "./components/WorkflowMain/WorkflowMain"; // New workflow integration
import SessionExpiredModal from "./components/SessionExpiredModal/SessionExpiredModal";
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
 * 1. Upload Screen - Initial screen
 * 2. Processing Modal - Upload/processing progress
 * 3. Chat Screen - Chat interface after completion
 */
const App: React.FC = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1); // Current step state
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
    resetSessionExpired,
  } = useSession(); // Initialize session first, set callback later

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
    // Modal will be shown via isSessionExpired state
    // Reset all states to first step
    setCurrentStep(1);
    setChatPhase(false);
    resetUpload();
  }, [resetUpload]);

  // Set session expired callback
  React.useEffect(() => {
    setOnSessionExpired(handleSessionExpiration);
  }, [handleSessionExpiration, setOnSessionExpired]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [chatPhase, setChatPhase] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(3);
  const [supportedFileTypes, setSupportedFileTypes] = useState(["pdf", "txt"]);
  const [crawlerMaxTokens, setCrawlerMaxTokens] = useState(100000);
  const [crawlerMaxPages, setCrawlerMaxPages] = useState(10);
  const [ragContextWindow, setRagContextWindow] = useState(5);
  const [ragCitationStyle, setRagCitationStyle] = useState("numbered");
  const [ragFallbackMode, setRagFallbackMode] = useState("flexible");

  // T084-T085: Session control confirmation dialogs
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(true);
  const [aboutModalInitialView, setAboutModalInitialView] = useState<
    "about" | "summary"
  >("about");
  const [showContactModal, setShowContactModal] = useState(false);
  const [systemMessage, setSystemMessage] = useState<{
    type: "error" | "warning" | "info" | "success";
    message: string;
  } | null>(null);
  const [isBlocked, setIsBlocked] = useState(false); // Block user actions until message confirmed
  const lastErrorRef = React.useRef<string | null>(null);
  const [workflowReset, setWorkflowReset] = useState(false); // Workflow reset signal

  // T074: Setup language direction (simplified - no RTL languages)
  React.useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      // All supported languages are LTR
      document.documentElement.dir = "ltr";
      document.documentElement.lang = lng;
      document.body.classList.remove("rtl-layout");
    };

    // Initial setup based on current language
    handleLanguageChanged(i18n.language);

    // Listen for language changes
    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  // Recreate session when threshold changes (only when no files uploaded)
  const handleThresholdChange = async (newThreshold: number) => {
    setSimilarityThreshold(newThreshold);

    // Only recreate session when no files uploaded
    if (sessionId && !uploadResponse) {
      await closeSession();
      await createSession(newThreshold);
    }
  };

  // Handle parameter changes from PromptVisualization
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
        break;
    }
  };

  // Retry count for session creation
  const retryCountRef = React.useRef(0);

  // Auto-create session on component mount
  // But NOT when session has expired - wait for user to confirm modal first
  React.useEffect(() => {
    // Check if we have a session - if so, reset retry count
    if (sessionId) {
      if (retryCountRef.current > 0) {
        retryCountRef.current = 0;
      }
      return;
    }

    if (!sessionId && !isLoading && !isSessionExpired) {
      // If we have an error (meaning previous attempt failed), check retry limits
      if (error) {
        if (retryCountRef.current >= 10) {
          return;
        }

        retryCountRef.current += 1;
      }

      createSession(similarityThreshold);
    }
  }, [
    sessionId,
    isLoading,
    isSessionExpired,
    createSession,
    similarityThreshold,
    error,
  ]);

  // Handle error messages from session and upload
  React.useEffect(() => {
    let currentError: string | null = null;

    if (error) {
      currentError = error;
    } else if (isFailed && statusResponse?.error_message) {
      currentError = statusResponse.error_message;
    }

    if (currentError && lastErrorRef.current !== currentError) {
      // New error, set system message
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
      // Error cleared, cleanup state
      lastErrorRef.current = null;
      setSystemMessage(null);
      setIsBlocked(false);
    }
  }, [
    error,
    isFailed,
    statusResponse?.error_message,
    // Remove systemMessage dependency to avoid circular triggers
  ]);

  // Show modal when uploading file
  const wrappedFileUpload = async (file: File) => {
    setShowModal(true);
    await handleFileUpload(file);
  };

  // Show modal when uploading URL
  const wrappedUrlUpload = async (url: string) => {
    setShowModal(true);
    await handleUrlUpload(url);
  };

  // Modal confirm button
  const handleModalConfirm = async () => {
    if (isFailed) {
      // Return to upload screen on failure
      setShowModal(false);
      resetUpload();
    } else if (isCompleted) {
      // Go directly to chat screen without waiting for state update
      // Because backend already set state to READY_FOR_CHAT after file processing completes
      setShowModal(false);
      setChatPhase(true);
    } else {
    }
  };

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    try {
      // T075: Pass sessionId for backend sync
      await updateLanguage(newLanguage, sessionId);
    } catch (err) {
      // Error is already handled in useSession.updateLanguage
    }
  };
  // Handle system message confirmation
  const handleDismissMessage = () => {
    setSystemMessage(null);
    setIsBlocked(false);
  };

  // Handle session restart on error
  const handleRestartSession = async () => {
    try {
      setSystemMessage(null);
      setIsBlocked(false);
      await restartSession();
      resetUpload();
      setChatPhase(false);

      // Show success message
      setSystemMessage({
        type: "success",
        message: t("system.sessionUpdateSuccess", "Session updated successfully!"),
      });
    } catch (err) {
      // Show error message
      setSystemMessage({
        type: "error",
        message: t("system.sessionUpdateFailed", "Failed to update session, please try again later."),
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
    } catch (err) {}
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

      // Trigger workflow reset
      setWorkflowReset(true);
      setTimeout(() => setWorkflowReset(false), 100); // Reset signal

      // Show success message
      setSystemMessage({
        type: "success",
        message: t("system.sessionRestartSuccess", "Session restarted successfully! System reset to initial state."),
      });
    } catch (err) {
      // Show error message
      setSystemMessage({
        type: "error",
        message: t("system.sessionRestartFailed", "Failed to restart session, please try again later."),
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

  // Get processing stage text
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
    <div className=" min-vh-100 d-flex flex-column">
      <Header
        sessionId={sessionId}
        onLanguageChange={handleLanguageChange}
        onLeave={handleLeaveClick}
        onRestart={handleRestartClick}
        onAboutClick={() => {
          setAboutModalInitialView("about");
          setShowAboutModal(true);
        }}
        onContactClick={() => setShowContactModal(true)}
        systemMessage={systemMessage}
        onDismissMessage={handleDismissMessage}
        onRestartSession={handleRestartSession}
      />

      {/* Workflow Mode Content */}
      <div
        className={`container sm:m-0 p-0${
          isBlocked ? "position-relative" : ""
        }`}
      >
        {/* Blocking overlay */}
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
          onShowRagSummary={() => {
            setAboutModalInitialView("summary");
            setShowAboutModal(true);
          }}
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
          // T089+ Pass token and page info
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

      {/* Session Expired Modal */}
      <SessionExpiredModal
        isOpen={isSessionExpired}
        onConfirm={() => {
          // First reset the expired state so auto-create effect can work
          // Then the useEffect will auto-create new session
          setCurrentStep(1);
          setChatPhase(false);
          resetUpload();
          // Reset session expired state - this will trigger auto-create session effect
          resetSessionExpired();
        }}
      />

      {/* About Project Modal */}
      <AboutProjectModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        initialView={aboutModalInitialView}
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />

      {/* Toast Messages */}
      <div className="position-fixed top-0 end-0 p-3 toast-container-wrapper">
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
