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
      <style>{`
        .upload-screen {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .upload-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .upload-header h2 {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #333;
        }

        .upload-header p {
          font-size: 16px;
          color: #666;
          margin: 0;
        }

        .upload-container {
          border: 2px dashed #ddd;
          border-radius: 12px;
          background-color: #fafafa;
          padding: 40px 24px;
          transition: all 0.3s ease;
          margin-bottom: 24px;
        }

        .upload-container.dragging {
          border-color: #4285f4;
          background-color: #f0f7ff;
        }

        .upload-dropzone {
          cursor: pointer;
          border: none;
          background: transparent;
          padding: 0;
          text-align: center;
        }

        .upload-dropzone.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dropzone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .dropzone-icon {
          font-size: 48px;
          line-height: 1;
        }

        .dropzone-text {
          font-size: 16px;
          font-weight: 500;
          color: #333;
          margin: 0;
        }

        .dropzone-hint {
          font-size: 13px;
          color: #999;
          margin: 0;
        }

        .upload-divider {
          text-align: center;
          margin: 32px 0;
          position: relative;
        }

        .upload-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background-color: #ddd;
        }

        .upload-divider-text {
          position: relative;
          display: inline-block;
          padding: 0 16px;
          background-color: white;
          color: #999;
          font-size: 13px;
          font-weight: 500;
        }

        .url-section {
          margin-top: 24px;
        }

        .url-section-title {
          font-size: 14px;
          font-weight: 600;
          color: #666;
          margin-bottom: 12px;
          display: block;
        }

        .upload-url-form {
          margin: 0;
        }

        .url-input-group {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .url-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          transition: border-color 0.2s;
        }

        .url-input:focus {
          outline: none;
          border-color: #34a853;
          box-shadow: 0 0 0 3px rgba(52, 168, 83, 0.1);
        }

        .url-input:disabled {
          background-color: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }

        .url-submit-button {
          padding: 10px 24px;
          background-color: #34a853;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          white-space: nowrap;
        }

        .url-submit-button:hover:not(:disabled) {
          background-color: #2d8659;
        }

        .url-submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .url-hint {
          font-size: 12px;
          color: #999;
          margin: 0;
        }

        .upload-error {
          background-color: #ffebee;
          border: 1px solid #ffcdd2;
          border-radius: 6px;
          padding: 12px 14px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #c62828;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .upload-debug {
          text-align: center;
          margin-top: 32px;
          padding-top: 32px;
          border-top: 1px solid #eee;
          font-size: 11px;
          color: #ccc;
        }

        @media (max-width: 600px) {
          .upload-screen {
            padding: 24px 16px;
          }

          .upload-header h2 {
            font-size: 22px;
          }

          .upload-features {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 32px;
          }

          .feature-badge {
            padding: 8px 12px;
            font-size: 12px;
          }

          .upload-container {
            padding: 32px 20px;
            margin-bottom: 20px;
          }

          .dropzone-icon {
            font-size: 40px;
          }

          .dropzone-text {
            font-size: 14px;
          }

          .url-input-group {
            flex-direction: column;
          }

          .url-submit-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="upload-header">
        <h2>{t('upload.title', 'Upload Document')}</h2>
        <p className="upload-subtitle">
          {t('upload.subtitle', 'Upload a PDF, text file, or provide a URL to get started')}
        </p>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="upload-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* 主要上傳區域 - 檔案拖放 */}
      <div className={`upload-container ${isDragging ? 'dragging' : ''}`}>
        <div
          className={`upload-dropzone ${disabled ? 'disabled' : ''}`}
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
      </div>

      {/* 分隔線 */}
      <div className="upload-divider">
        <span className="upload-divider-text">{t('upload.divider', 'Or')}</span>
      </div>

      {/* 次要選項 - URL 輸入 */}
      <div className="url-section">
        <label className="url-section-title">🌐 {t('upload.url.label', 'Provide a URL')}</label>
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
      </div>

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
