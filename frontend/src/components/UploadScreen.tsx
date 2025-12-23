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
  uploadWebsite,
} from '../services/uploadService';
import WebsiteCrawlerPanel from './WebsiteCrawlerPanel';

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
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'crawler'>('file');  // 新增：選項卡狀態
  const [crawlerLoading, setCrawlerLoading] = useState(false);  // 新增：爬蟲加載狀態
  const [crawlerError, setCrawlerError] = useState<string | null>(null);  // 新增：爬蟲錯誤
  const [crawlerResults, setCrawlerResults] = useState<any | null>(null);  // 新增：爬蟲結果
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

  /**
   * 處理網站爬蟲提交
   */
  const handleCrawlerSubmit = async (url: string, maxTokens: number, maxPages: number) => {
    setCrawlerError(null);
    setCrawlerLoading(true);
    
    try {
      const response = await uploadWebsite(sessionId, url, maxTokens, maxPages);
      setCrawlerResults(response);
      
      // 自動提交爬蟲結果進行處理
      // 爬蟲已經將內容上傳，現在只需要開始處理流程
      onUrlSubmitted(url);  // 使用爬蟲 URL 作為來源
    } catch (err) {
      setCrawlerError(err instanceof Error ? err.message : 'Failed to crawl website');
    } finally {
      setCrawlerLoading(false);
    }
  };

  return (
    <div className="upload-screen">
      <style>{`
        .upload-screen {
          width: 100%;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .upload-header {
          text-align: center;
          margin-bottom: 24px;
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

        /* 上傳選項卡 */
        .upload-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e0e0e0;
        }

        .tab-button {
          padding: 12px 20px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tab-button:hover:not(:disabled) {
          color: #333;
          border-bottom-color: #ccc;
        }

        .tab-button.active {
          color: #4285f4;
          border-bottom-color: #4285f4;
        }

        .tab-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        .upload-content-wrapper {
          display: flex;
          gap: 24px;
          margin-top: 24px;
        }

        .upload-file-column {
          flex: 0 0 30%;
        }

        .upload-url-column {
          flex: 1;
        }

        .url-section {
          margin-top: 0;
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

          .upload-content-wrapper {
            flex-direction: column;
            gap: 16px;
          }

          .upload-file-column {
            flex: 0 0 100%;
          }

          .url-input-group {
            flex-direction: column;
          }

          .url-submit-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="upload-screen-compact">

        {/* 錯誤訊息 */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <small>⚠️ {error}</small>
          </div>
        )}

        {/* 上傳選項卡 */}
        <ul className="nav nav-pills nav-fill mb-3">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => setActiveTab('file')}
              disabled={disabled}
            >
              <small>📁 {t('upload.tab.file', '檔案上傳')}</small>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'url' ? 'active' : ''}`}
              onClick={() => setActiveTab('url')}
              disabled={disabled}
            >
              <small>🔗 {t('upload.tab.url', '單一URL')}</small>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'crawler' ? 'active' : ''}`}
              onClick={() => setActiveTab('crawler')}
              disabled={disabled}
            >
              <small>🌐 {t('upload.tab.crawler', '網站爬蟲')}</small>
            </button>
          </li>
        </ul>

        {/* 主要上傳區域 */}
        {(activeTab === 'file' || activeTab === 'url') && (
          <div className="upload-area border-dashed p-4 text-center bg-light">
            <div
              className={`dropzone ${isDragging ? 'border-primary' : ''} ${disabled ? 'opacity-50' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={activeTab === 'file' ? handleBrowseClick : undefined}
              style={{ cursor: activeTab === 'file' ? 'pointer' : 'default', minHeight: '150px', borderRadius: '8px' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileInputChange}
                disabled={disabled}
                style={{ display: 'none' }}
              />

              {activeTab === 'file' && (
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                  <p className="mb-2">
                    {isDragging
                      ? t('upload.dropzone.drop', '拖放檔案到此區域')
                      : t('upload.dropzone.dragOrClick', '拖放檔案到此區域，或點擊進入')}
                  </p>
                  <small className="text-muted">
                    {t('upload.dropzone.hint', '支援格式: PDF、TXT（最大 {{maxSize}}）', {
                      maxSize: formatFileSize(MAX_FILE_SIZE),
                    })}
                  </small>
                </div>
              )}

              {activeTab === 'url' && (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌐</div>
                  <form onSubmit={handleUrlSubmit}>
                    <div className="input-group mb-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={t('upload.url.placeholder', '輸入 URL (http:// 或 https://)')}
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        disabled={disabled}
                        style={{ flex: '1 1 auto' }}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={disabled || !urlInput.trim()}
                        style={{ minWidth: '80px' }}
                      >
                        {t('upload.url.submit', '獲取')}
                      </button>
                    </div>
                    <small className="text-muted">
                      {t('upload.url.hint', '我們將從 URL 中提取文字內容')}
                    </small>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 網站爬蟲選項卡 */}
        {activeTab === 'crawler' && (
          <div className="crawler-area">
            <WebsiteCrawlerPanel
              onCrawl={handleCrawlerSubmit}
              isLoading={crawlerLoading}
              error={crawlerError}
              crawlResults={crawlerResults}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadScreen;
