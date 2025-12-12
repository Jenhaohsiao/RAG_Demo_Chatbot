import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/badges.css';
import './i18n/config';
import { useTranslation } from 'react-i18next';

import Header from './components/Header';
import UploadScreen from './components/UploadScreen';
import ProcessingModal from './components/ProcessingModal';
import ChatScreen from './components/ChatScreen';
import { useSession } from './hooks/useSession';
import { useUpload } from './hooks/useUpload';
import type { SupportedLanguage } from './hooks/useLanguage';
import type { ChatResponse } from './types/chat';

/**
 * Main App Component
 * Phase 4: Document Upload Integration
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

  // Auto-create session on component mount
  React.useEffect(() => {
    if (!sessionId && !isLoading) {
      createSession();
    }
  }, [sessionId, isLoading, createSession]);

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
  const handleModalConfirm = () => {
    if (isFailed) {
      // 失敗時回到上傳畫面
      setShowModal(false);
      resetUpload();
    } else if (isCompleted) {
      // 成功時進入聊天畫面
      setShowModal(false);
      setChatPhase(true);
    }
  };

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    await updateLanguage(newLanguage);
  };

  const handleLeave = async () => {
    if (window.confirm('Are you sure you want to leave? All data will be deleted.')) {
      await closeSession();
      resetUpload();
      setChatPhase(false);
    }
  };

  const handleRestart = async () => {
    if (window.confirm('Are you sure you want to restart? Current session will be closed.')) {
      await restartSession();
      resetUpload();
      setChatPhase(false);
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
        onLeave={handleLeave}
        onRestart={handleRestart}
      />

      <main className="flex-grow-1 container mt-4">
        <div className="row">
          <div className="col-lg-8 mx-auto">
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
                />
              </div>
            )}

            {/* Chat Screen - After Upload Complete */}
            {sessionId && chatPhase && uploadResponse && statusResponse && (
              <ChatScreen
                sessionId={sessionId}
                documentSummary={statusResponse.summary}
                sourceReference={statusResponse.source_reference}
                sourceType={uploadResponse.source_type}
                chunkCount={statusResponse.chunk_count}
                onSendQuery={async () => {
                  // TODO: Implement chat API call
                  // 臨時回傳一個有效的 ChatResponse
                  return {
                    message_id: `msg-${Date.now()}`,
                    session_id: sessionId,
                    llm_response: 'Testing response',
                    response_type: 'ANSWER' as const,
                    retrieved_chunks: [],
                    similarity_scores: [],
                    token_input: 0,
                    token_output: 0,
                    token_total: 0,
                    timestamp: new Date().toISOString(),
                  };
                }}
              />
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
          onConfirm={handleModalConfirm}
        />
      )}

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
    <App />
  </React.StrictMode>,
);

