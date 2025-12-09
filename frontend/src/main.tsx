import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './i18n/config';

import Header from './components/Header';
import { UploadScreen } from './components/UploadScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { useSession } from './hooks/useSession';
import { useUpload } from './hooks/useUpload';
import type { SupportedLanguage } from './hooks/useLanguage';

/**
 * Main App Component
 * Phase 4: Document Upload Integration
 */
const App: React.FC = () => {
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

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    await updateLanguage(newLanguage);
  };

  const handleLeave = async () => {
    if (window.confirm('Are you sure you want to leave? All data will be deleted.')) {
      await closeSession();
      resetUpload();
    }
  };

  const handleRestart = async () => {
    if (window.confirm('Are you sure you want to restart? Current session will be closed.')) {
      await restartSession();
      resetUpload();
    }
  };

  const handleUploadComplete = () => {
    console.log('Upload completed successfully!');
    // Future: Transition to Chat screen
  };

  const handleUploadError = (errorMessage: string) => {
    console.error('Upload failed:', errorMessage);
  };

  // Determine which screen to show based on upload state
  const showUploadScreen = sessionId && uploadState === 'IDLE' && !isCompleted;
  const showProcessingScreen = sessionId && (uploadState === 'UPLOADING' || uploadState === 'PROCESSING' || isCompleted || isFailed);

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
              </div>
            )}

            {/* Session Status */}
            {!sessionId ? (
              <div className="card text-center">
                <div className="card-body py-5">
                  <h2 className="card-title mb-4">Welcome to RAG Chatbot</h2>
                  <p className="card-text text-muted mb-4">
                    Phase 4: Document Upload Ready
                  </p>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={createSession}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Session...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-play-circle me-2"></i>
                        Start New Session
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : showUploadScreen ? (
              /* Upload Screen - Phase 4 */
              <UploadScreen
                sessionId={sessionId}
                onFileSelected={handleFileUpload}
                onUrlSubmitted={handleUrlUpload}
                disabled={false}
              />
            ) : showProcessingScreen && uploadResponse && statusResponse ? (
              /* Processing Screen - Phase 4 */
              <ProcessingScreen
                documentId={uploadResponse.document_id}
                sourceType={uploadResponse.source_type}
                extractionStatus={statusResponse.extraction_status}
                moderationStatus={statusResponse.moderation_status}
                chunkCount={statusResponse.chunk_count}
                processingProgress={statusResponse.processing_progress}
                summary={statusResponse.summary}
                errorCode={statusResponse.error_code}
                errorMessage={statusResponse.error_message}
                moderationCategories={statusResponse.moderation_categories}
              />
            ) : (
              <div className="card">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-check-circle me-2"></i>
                    Session Active
                  </h5>
                </div>
                <div className="card-body">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <th style={{ width: '150px' }}>Session ID:</th>
                        <td>
                          <code>{sessionId}</code>
                        </td>
                      </tr>
                      <tr>
                        <th>State:</th>
                        <td>
                          <span className="badge bg-info">{sessionState}</span>
                        </td>
                      </tr>
                      <tr>
                        <th>Language:</th>
                        <td>{language}</td>
                      </tr>
                      <tr>
                        <th>Expires At:</th>
                        <td>
                          {expiresAt ? new Date(expiresAt).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="alert alert-info mt-3">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>Session Debug Info</strong>
                    <ul className="mb-0 mt-2">
                      <li>Session ID: {sessionId}</li>
                      <li>State: {sessionState}</li>
                      <li>Upload State: {uploadState}</li>
                      <li>Upload Error: {uploadError || 'None'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

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

