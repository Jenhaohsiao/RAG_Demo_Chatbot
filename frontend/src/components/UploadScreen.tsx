/**
 * Upload Screen Component
 * File upload interface (supports file drag & drop and URL input)
 *
 * Constitutional Compliance:
 * - Principle II (Testability): Independent React component
 * - User Story US2: Document Upload functionality
 */

import React, { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import "../styles/UploadScreen.css";
import {
  validateFileType,
  validateFileSize,
  formatFileSize,
  uploadWebsite,
} from "../services/uploadService";
import WebsiteCrawlerPanel from "./WebsiteCrawlerPanel";

export interface UploadScreenProps {
  sessionId: string;
  onFileSelected: (file: File) => void;
  onUrlSubmitted: (url: string) => void;
  maxFileSizeMB?: number;
  supportedFileTypes?: string[];
  crawlerMaxTokens?: number;
  crawlerMaxPages?: number;
  disabled?: boolean;
}

const UploadScreen: React.FC<UploadScreenProps> = ({
  sessionId,
  onFileSelected,
  onUrlSubmitted,
  maxFileSizeMB = 10,
  supportedFileTypes = ["pdf", "txt"],
  crawlerMaxTokens = 100000,
  crawlerMaxPages = 10,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"file" | "crawler">("file"); // 移除 URL 選項
  const [crawlerLoading, setCrawlerLoading] = useState(false); // Added: Crawler loading state
  const [crawlerError, setCrawlerError] = useState<string | null>(null); // Added: Crawler error
  const [crawlerResults, setCrawlerResults] = useState<any | null>(null); // Added: Crawler results
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 動態檔案大小限制（根據參數設定）
  const MAX_FILE_SIZE = maxFileSizeMB * 1024 * 1024;

  // 生成支援檔案格式顯示文字
  const getSupportedFormatsText = () => {
    const formatMap: Record<string, string> = {
      pdf: "PDF",
      txt: "TXT",
      docx: "DOCX",
      md: "MD",
      csv: "CSV",
      xlsx: "XLSX",
    };

    const displayFormats = supportedFileTypes
      .map((type) => formatMap[type.toLowerCase()] || type.toUpperCase())
      .join("、");

    return `支援格式: ${displayFormats}（最大 ${formatFileSize(
      MAX_FILE_SIZE
    )}）`;
  };

  // 生成檔案接受屬性
  const getAcceptAttribute = () => {
    return supportedFileTypes.map((type) => `.${type.toLowerCase()}`).join(",");
  };

  // 動態檔案類型驗證
  const validateDynamicFileType = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split(".").pop();
    return fileExtension
      ? supportedFileTypes.includes(fileExtension.toLowerCase())
      : false;
  };

  // 生成動態錯誤訊息
  const getFileTypeErrorMessage = (): string => {
    const formatMap: Record<string, string> = {
      pdf: "PDF",
      txt: "TXT",
      docx: "DOCX",
      md: "MD",
      csv: "CSV",
      xlsx: "XLSX",
    };

    const displayFormats = supportedFileTypes
      .map((type) => formatMap[type.toLowerCase()] || type.toUpperCase())
      .join("、");

    return `僅支援 ${displayFormats} 格式檔案`;
  };

  /**
   * 處理檔案選擇
   */
  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);

      // Validate file type using dynamic validation
      if (!validateDynamicFileType(file)) {
        setError(getFileTypeErrorMessage());
        return;
      }

      // Validate file size
      if (!validateFileSize(file, MAX_FILE_SIZE)) {
        if (file.size === 0) {
          setError(t("upload.error.emptyFile", "File is empty"));
        } else {
          setError(
            t("upload.error.fileTooLarge", `File size exceeds {{maxSize}}`, {
              maxSize: formatFileSize(MAX_FILE_SIZE),
            })
          );
        }
        return;
      }

      // Call parent component callback
      onFileSelected(file);
    },
    [onFileSelected, t, supportedFileTypes, MAX_FILE_SIZE]
  );

  /**
   * 處理檔案輸入改變
   */
  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
   * 觸發檔案選擇對話框
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * 處理網站爬蟲提交
   */
  const handleCrawlerSubmit = async (
    url: string,
    maxTokens: number,
    maxPages: number
  ) => {
    setCrawlerError(null);
    setCrawlerLoading(true);

    try {
      const response = await uploadWebsite(sessionId, url, maxTokens, maxPages);
      setCrawlerResults(response);

      // Auto-submit crawler results for processing
      // Crawler has already uploaded content, now just start processing flow
      onUrlSubmitted(url); // Use crawler URL as source
    } catch (err) {
      setCrawlerError(
        err instanceof Error ? err.message : "Failed to crawl website"
      );
    } finally {
      setCrawlerLoading(false);
    }
  };

  return (
    <div className=" p-0">
      {/* Error messages */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <small>
            <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
            {error}
          </small>
        </div>
      )}

      {/* Upload tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link text-start  ${
              activeTab === "file" ? "active" : ""
            }`}
            onClick={() => setActiveTab("file")}
            disabled={disabled}
          >
            <i className="bi bi-file-earmark-arrow-up me-2"></i>
            {t("upload.tab.file", "檔案上傳")}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link text-start ${
              activeTab === "crawler" ? "active" : ""
            }`}
            onClick={() => setActiveTab("crawler")}
            disabled={disabled}
          >
            <i className="bi bi-globe me-2"></i>
            {t("upload.tab.crawler", "網站爬蟲")}
          </button>
        </li>
      </ul>

      {/* Main upload area */}
      {activeTab === "file" && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptAttribute()}
            onChange={handleFileInputChange}
            disabled={disabled}
            style={{ display: "none" }}
          />

          <div className="container">
            <div className="dropzone-icon-large">
              <i className="bi bi-cloud-upload-fill text-primary"></i>
            </div>
            <p className="mb-2">
              {isDragging
                ? t("upload.dropzone.drop", "拖放檔案到此區域")
                : t(
                    "upload.dropzone.dragOrClick",
                    "拖放檔案到此區域，或點擊進入"
                  )}
            </p>
            <small className="text-muted">{getSupportedFormatsText()}</small>
          </div>
        </div>
      )}

      {/* Website crawler tab */}
      {activeTab === "crawler" && (
        <div className="container">
          <div className="dropzone-icon-large">
            <i className="bi bi-globe text-success"></i>
          </div>
          <WebsiteCrawlerPanel
            onCrawl={handleCrawlerSubmit}
            isLoading={crawlerLoading}
            error={crawlerError}
            crawlResults={crawlerResults}
            maxTokens={crawlerMaxTokens}
            maxPages={crawlerMaxPages}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

export default UploadScreen;
