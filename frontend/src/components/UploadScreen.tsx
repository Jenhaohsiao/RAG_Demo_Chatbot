/**
 * Upload Screen Component
 * 文件上傳介面（支援檔案拖放與 URL 輸入）
 * 
 * Constitutional Compliance:
 * - Principle II (Testability): 獨立 React 組件
 * - User Story US2: Document Upload 功能
 */

import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  validateFileType,
  validateFileSize,
  validateUrl,
  formatFileSize,
} from '../services/uploadService';

export interface UploadScreenProps {
  sessionId: string;
  onFileSelected: (file: File) => void;
  onUrlSubmitted: (url: string) => void;
  disabled?: boolean;
}

const UploadScreen: React.FC<UploadScreenProps> = ({
  sessionId,
  onFileSelected,
  onUrlSubmitted,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 最大檔案大小：10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  /**
   * 處理檔案選擇
   */
  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);

      // 驗證檔案類型
      if (!validateFileType(file)) {
        setError(t('upload.error.invalidFileType', 'Only PDF and TXT files are supported'));
        return;
      }

      // 驗證檔案大小
      if (!validateFileSize(file, MAX_FILE_SIZE)) {
        if (file.size === 0) {
          setError(t('upload.error.emptyFile', 'File is empty'));
        } else {
          setError(
            t(
              'upload.error.fileTooLarge',
              `File size exceeds {{maxSize}}`,
              { maxSize: formatFileSize(MAX_FILE_SIZE) }
            )
          );
        }
        return;
      }

      // 呼叫父組件回調
      onFileSelected(file);
    },
    [onFileSelected, t]
  );

  /**
   * 處理檔案輸入改變
   */
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * 處理拖放事件
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * 處理 URL 提交
   */
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = urlInput.trim();

    // 驗證 URL 格式
    if (!validateUrl(trimmedUrl)) {
      setError(t('upload.error.invalidUrl', 'Invalid URL format. Must be http:// or https://'));
      return;
    }

    // 呼叫父組件回調
    onUrlSubmitted(trimmedUrl);
    setUrlInput(''); // 清空輸入
  };

  /**
   * 觸發檔案選擇對話框
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-screen">
      <div className="upload-header">
        <h2>{t('upload.title', 'Upload Document')}</h2>
        <p className="upload-subtitle">
          {t('upload.subtitle', 'Upload a PDF, text file, or provide a URL to get started')}
        </p>
      </div>

      {/* 模式切換 */}
      <div className="upload-mode-selector">
        <button
          className={`mode-button ${uploadMode === 'file' ? 'active' : ''}`}
          onClick={() => setUploadMode('file')}
          disabled={disabled}
        >
          {t('upload.mode.file', 'File Upload')}
        </button>
        <button
          className={`mode-button ${uploadMode === 'url' ? 'active' : ''}`}
          onClick={() => setUploadMode('url')}
          disabled={disabled}
        >
          {t('upload.mode.url', 'URL')}
        </button>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="upload-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* 檔案上傳模式 */}
      {uploadMode === 'file' && (
        <div
          className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${
            disabled ? 'disabled' : ''
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileInputChange}
            disabled={disabled}
            style={{ display: 'none' }}
          />

          <div className="dropzone-content">
            <div className="dropzone-icon">📁</div>
            <p className="dropzone-text">
              {isDragging
                ? t('upload.dropzone.drop', 'Drop file here')
                : t('upload.dropzone.dragOrClick', 'Drag & drop a file here, or click to browse')}
            </p>
            <p className="dropzone-hint">
              {t('upload.dropzone.hint', 'Supported formats: PDF, TXT (max {{maxSize}})', {
                maxSize: formatFileSize(MAX_FILE_SIZE),
              })}
            </p>
          </div>
        </div>
      )}

      {/* URL 上傳模式 */}
      {uploadMode === 'url' && (
        <form className="upload-url-form" onSubmit={handleUrlSubmit}>
          <div className="url-input-group">
            <input
              type="text"
              className="url-input"
              placeholder={t('upload.url.placeholder', 'Enter URL (http:// or https://)')}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={disabled}
            />
            <button
              type="submit"
              className="url-submit-button"
              disabled={disabled || !urlInput.trim()}
            >
              {t('upload.url.submit', 'Fetch')}
            </button>
          </div>
          <p className="url-hint">
            {t('upload.url.hint', 'We will extract text content from the URL')}
          </p>
        </form>
      )}

      {/* Session ID 顯示（開發用） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="upload-debug">
          <small>Session ID: {sessionId}</small>
        </div>
      )}
    </div>
  );
};

export default UploadScreen;
