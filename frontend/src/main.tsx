import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/badges.css';
import './styles/rtl.css';
import './styles/responsive.css';  // T094: Import responsive design utilities
import './i18n/config';
import { useTranslation } from 'react-i18next';
import i18n from './i18n/config';

import Header from './components/Header';
import UploadScreen from './components/UploadScreen';
import ProcessingModal from './components/ProcessingModal';
import ChatScreen from './components/ChatScreen';
import SettingsModal from './components/SettingsModal';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';  // T093: Import Error Boundary
import { useSession } from './hooks/useSession';
import { useUpload } from './hooks/useUpload';
import { submitQuery } from './services/chatService';
import sessionService from './services/sessionService';
import type { SupportedLanguage } from './hooks/useLanguage';
import type { ChatResponse } from './types/chat';

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
  const {
    sessionId,
    sessionState,
    expiresAt,
    language,
    isLoading,
    error,
    createSession,
    closeSession,
    restartSession,
    updateLanguage
  } = useSession();

  const {
    uploadState,
    uploadResponse,
    statusResponse,
    error: uploadError,
    handleFileUpload,
    handleUrlUpload,
    reset: resetUpload,
    isCompleted,
    isFailed
  } = useUpload(sessionId || '');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [chatPhase, setChatPhase] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  
  // T084-T085: Session control confirmation dialogs
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // T074: Setup RTL support for Arabic language
  React.useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      // RTL support for Arabic
      const isRTL = lng === 'ar';
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
      
      // Also apply to body for some CSS properties
      if (isRTL) {
        document.body.classList.add('rtl-layout');
      } else {
        document.body.classList.remove('rtl-layout');
      }
      
      console.log('[RTL] Language changed to:', lng, 'Direction:', isRTL ? 'rtl' : 'ltr');
    };

    // Initial setup based on current language
    handleLanguageChanged(i18n.language);

    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
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

  // Auto-create session on component mount
  React.useEffect(() => {
    if (!sessionId && !isLoading) {
      createSession(similarityThreshold);
    }
  }, [sessionId, isLoading, createSession, similarityThreshold]);

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
    console.log('[handleModalConfirm] Called', { isFailed, isCompleted });
    
    if (isFailed) {
      // 失敗時回到上傳畫面
      console.log('[handleModalConfirm] Upload failed, resetting');
      setShowModal(false);
      resetUpload();
    } else if (isCompleted) {
      // 直接進入聊天畫面，不需要等待狀態更新
      // 因為文件處理完成後，後端已經將狀態設置為 READY_FOR_CHAT
      console.log('[handleModalConfirm] Upload completed, entering chat phase');
      setShowModal(false);
      setChatPhase(true);
    } else {
      console.log('[handleModalConfirm] Unexpected state - not failed and not completed');
    }
  };

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    try {
      console.log('[handleLanguageChange] Changing language to:', newLanguage, 'with sessionId:', sessionId);
      
      // T075: Pass sessionId for backend sync
      await updateLanguage(newLanguage, sessionId);
      
      console.log('[handleLanguageChange] Language change successful');
    } catch (err) {
      console.error('[handleLanguageChange] Error:', err);
      // Error is already handled in useSession.updateLanguage
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
      console.error('[handleConfirmLeave] Error:', err);
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
    } catch (err) {
      console.error('[handleConfirmRestart] Error:', err);
    }
  };

  const handleSettingsSave = async (threshold: number, customPrompt?: string) => {
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
      return t('processing.stage.failed', 'Processing Failed');
    }

    if (!statusResponse) return t('processing.stage.extracting', 'Extracting Text...');

    const progress = statusResponse.processing_progress;

    if (progress === 100) {
      return t('processing.stage.complete', 'Processing Complete');
    }

    if (progress >= 75) {
      return t('processing.stage.embedding', 'Embedding & Storing...');
    }

    if (progress >= 50) {
      return t('processing.stage.chunking', 'Chunking Text...');
    }

    if (progress >= 25) {
      return t('processing.stage.moderating', 'Checking Content Safety...');
    }

    return t('processing.stage.extracting', 'Extracting Text...');
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Header
        sessionId={sessionId}
        onLanguageChange={handleLanguageChange}
        onLeave={handleLeaveClick}
        onRestart={handleRestartClick}
      />

      <main className="flex-grow-1 container mt-4">
        <div className="row">
          <div className="col-lg-12 mx-auto">
            {/* Error Display */}
            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => {}}
                ></button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !sessionId && (
              <div className="card text-center">
                <div className="card-body py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-3">Initializing your session...</p>
                </div>
              </div>
            )}

            {/* Upload Screen - Initial State */}
            {sessionId && !chatPhase && (
              <div>
                {/* Welcome Section */}
                <div className="card mb-4 border-0 bg-light">
                  <div className="card-body">
                    <h1 className="card-title mb-3">{t('app.title')}</h1>
                    <p className="card-text text-muted lead">
                      {t('app.description')}
                    </p>
                    <div className="d-flex gap-2 flex-wrap mt-3">
                      <span className="badge-custom badge-primary">{t('app.features.pdfSupport')}</span>
                      <span className="badge-custom badge-info">{t('app.features.urlExtraction')}</span>
                      <span className="badge-custom badge-success">{t('app.features.aiQa')}</span>
                      <span className="badge-custom badge-warning">{t('app.features.multilingual')}</span>
                    </div>
                  </div>
                </div>

                {/* Upload Screen */}
                <UploadScreen
                  sessionId={sessionId}
                  onFileSelected={wrappedFileUpload}
                  onUrlSubmitted={wrappedUrlUpload}
                  disabled={false}
                  similarityThreshold={similarityThreshold}
                  onThresholdChange={handleThresholdChange}
                  hasDocuments={!!uploadResponse}
                />
              </div>
            )}

            {/* Chat Screen - After Upload Complete */}
            {sessionId && chatPhase && uploadResponse && statusResponse && (
              <>
                {console.log('[App] ChatScreen props:', {
                  sessionId,
                  documentSummary: statusResponse.summary,
                  chunkCount: statusResponse.chunk_count,
                  fullStatusResponse: statusResponse
                })}
                <ChatScreen
                  sessionId={sessionId}
                  documentSummary={statusResponse.summary}
                  sourceReference={statusResponse.source_reference}
                  sourceType={uploadResponse.source_type}
                  chunkCount={statusResponse.chunk_count}
                  onSendQuery={async (query: string): Promise<ChatResponse> => {
                    // 標準化語言代碼：zh-TW -> zh, en-US -> en
                    const normalizedLang = language.split('-')[0];
                    console.log('[App] Sending query with language:', normalizedLang, '(original:', language, ')');
                  return await submitQuery(sessionId, query, normalizedLang);
                }}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Processing Modal */}
      {showModal && uploadResponse && statusResponse && (
        <ProcessingModal
          isOpen={showModal}
          sourceType={uploadResponse.source_type}
          sourceReference={statusResponse.source_reference || 'Unknown'}
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
        isOpen={showSettings}
        currentThreshold={similarityThreshold}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />

      {/* T084: Leave Confirmation Dialog */}
      <ConfirmDialog
        title={t('dialogs.leave.title')}
        message={t('dialogs.leave.message')}
        confirmText={t('buttons.leave')}
        cancelText={t('buttons.cancel')}
        isDangerous={true}
        isOpen={showLeaveConfirm}
        onConfirm={handleConfirmLeave}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* T085: Restart Confirmation Dialog */}
      <ConfirmDialog
        title={t('dialogs.restart.title')}
        message={t('dialogs.restart.message')}
        confirmText={t('buttons.restart')}
        cancelText={t('buttons.cancel')}
        isDangerous={false}
        isOpen={showRestartConfirm}
        onConfirm={handleConfirmRestart}
        onCancel={() => setShowRestartConfirm(false)}
      />

      <footer className="bg-light text-center py-3 mt-auto border-top">
        <small className="text-muted">
          RAG Demo Chatbot | Phase 4: Document Upload | {new Date().getFullYear()}
        </small>
      </footer>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>  {/* T093: Wrap App with Error Boundary */}
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

