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
import "./UploadScreen.scss";
import {
  validateFileType,
  validateFileSize,
  formatFileSize,
  uploadWebsite,
} from "../../services/uploadService";
import WebsiteCrawlerPanel from "../WebsiteCrawlerPanel/WebsiteCrawlerPanel";

export interface UploadScreenProps {
  sessionId: string;
  onFileSelected: (file: File) => void;
  onUrlSubmitted: (url: string) => void;
  maxFileSizeMB?: number;
  supportedFileTypes?: string[];
  crawlerMaxTokens?: number;
  crawlerMaxPages?: number;
  disabled?: boolean;
  hasUploadedContent?: boolean; // 是否已有上傳內容
  uploadedFiles?: any[]; // 已上傳文件列表
  crawledUrls?: any[]; // 已爬取URL列表
  onTabChange?: (tab: "file" | "crawler") => void; // tab 切換回調
  // 新增：參數設定相關 props
  parameters?: {
    session_ttl_minutes: number;
    max_file_size_mb: number;
    crawler_max_tokens: number;
    crawler_max_pages: number;
    supported_file_types: string[];
  };
  onParameterChange?: (parameter: string, value: any) => void;
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
  hasUploadedContent = false,
  uploadedFiles = [],
  crawledUrls = [],
  onTabChange,
  parameters,
  onParameterChange,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"file" | "crawler">("file"); // 移除 URL 選項
  const [uploadSubStep, setUploadSubStep] = useState<1 | 2>(1); // 1: 參數設定, 2: 上傳介面
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

      {/* 如果已有上傳內容，顯示結果摘要 */}
      {hasUploadedContent && (
        <div className="upload-results-summary">
          {/* 保持與上傳介面一致的卡片外框 */}
          <div className="card shadow-sm mx-auto active-card-border upload-card-wrapper">
            <div className="card-body p-4">
              <h5 className="card-title text-center mb-4 fw-bold text-primary">
                上傳完成
              </h5>

              {/* 文件上傳結果 */}
              {uploadedFiles.length > 0 && (
                <div className="card mb-3 border active-card-border shadow-sm">
                  <div className="card-header active-card-bg text-white border-bottom-0 pt-3">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-file-earmark-check me-2"></i>
                      已上傳文件 ({uploadedFiles.length})
                    </h6>
                  </div>
                  <div className="card-body pt-0 bg-white">
                    <div className="list-group list-group-flush">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="list-group-item px-0 py-2 border-0"
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1">
                              <div className="fw-medium text-truncate">
                                {file.filename}
                              </div>
                              <small className="text-muted">
                                {formatFileSize(file.size)} •{" "}
                                {new Date(file.uploadTime).toLocaleString()}
                              </small>
                            </div>
                            <span className="badge bg-success rounded-pill ms-2">
                              <i className="bi bi-check-lg"></i>
                            </span>
                          </div>
                          {/* 移除預覽文字 */}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 網站爬蟲結果 */}
              {crawledUrls.length > 0 && (
                <div className="card border active-card-border shadow-sm">
                  <div className="card-header active-card-bg text-white border-bottom-0 pt-3">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-globe-americas me-2"></i>
                      已爬取網站 ({crawledUrls.length})
                    </h6>
                  </div>
                  <div className="card-body pt-0">
                    <div className="list-group list-group-flush">
                      {crawledUrls.map((site, index) => (
                        <div
                          key={index}
                          className="list-group-item px-0 py-2 border-0"
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1">
                              <div className="fw-medium text-truncate">
                                {site.url}
                              </div>
                              <small className="text-muted">
                                {formatFileSize(site.content_size)} •{" "}
                                {site.pages_found || 1} 頁面 •{" "}
                                {new Date(site.crawl_time).toLocaleString()}
                              </small>
                            </div>
                            <span className="badge bg-success rounded-pill ms-2">
                              <i className="bi bi-check-lg"></i>
                            </span>
                          </div>
                          {/* 移除摘要文字 */}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 如果沒有上傳內容，顯示上傳界面 */}
      {!hasUploadedContent && (
        <div className="upload-interface-container">
          {/* 1. 切換按鈕 (取代 Tabs) */}
          <div className="d-flex justify-content-center gap-3 mb-4">
            <button
              className={`btn ${
                activeTab === "file" ? "btn-primary" : "btn-outline-primary"
              } px-4 py-2 rounded-pill`}
              onClick={() => {
                setActiveTab("file");
                setUploadSubStep(1);
                onTabChange?.("file");
              }}
              disabled={disabled}
            >
              <i className="bi bi-file-earmark-arrow-up me-2"></i>
              {t("upload.tab.file", "檔案上傳")}
            </button>
            <button
              className={`btn ${
                activeTab === "crawler" ? "btn-primary" : "btn-outline-primary"
              } px-4 py-2 rounded-pill`}
              onClick={() => {
                setActiveTab("crawler");
                setUploadSubStep(1);
                onTabChange?.("crawler");
              }}
              disabled={disabled}
            >
              <i className="bi bi-globe me-2"></i>
              {t("upload.tab.crawler", "網站爬蟲")}
            </button>
          </div>

          {/* 2. 卡片容器 (簡化風格) */}
          <div className="card shadow-sm mx-auto active-card-border upload-card-wrapper">
            <div className="card-body p-4">
              {/* 步驟 1: 參數設定 */}
              {uploadSubStep === 1 && (
                <div className="step-parameters fade-in">
                  <h5 className="card-title text-center mb-4 fw-bold text-primary">
                    {activeTab === "file"
                      ? "步驟 1/2: 檔案參數設定"
                      : "步驟 1/2: 爬蟲參數設定"}
                  </h5>

                  {activeTab === "file" ? (
                    // 檔案參數
                    <div className="parameter-content">
                      {/* 檔案大小限制 */}
                      <div className="mb-4 bg-white p-3 rounded shadow-sm border">
                        <label className="form-label fw-bold text-dark mb-2">
                          <i className="bi bi-hdd me-2"></i>
                          單檔大小限制
                        </label>
                        <div className="d-flex align-items-center gap-3">
                          <input
                            type="range"
                            className="form-range flex-grow-1"
                            min="1"
                            max="10"
                            step="1"
                            value={
                              parameters?.max_file_size_mb || maxFileSizeMB
                            }
                            onChange={(e) =>
                              onParameterChange?.(
                                "max_file_size_mb",
                                parseInt(e.target.value)
                              )
                            }
                            disabled={!onParameterChange}
                          />
                          <span className="badge bg-secondary fs-6">
                            {parameters?.max_file_size_mb || maxFileSizeMB} MB
                          </span>
                        </div>
                      </div>

                      {/* 支援檔案類型 */}
                      <div className="mb-3 bg-white p-3 rounded shadow-sm border">
                        <label className="form-label fw-bold text-dark mb-3">
                          <i className="bi bi-file-earmark-check me-2"></i>
                          支援檔案類型
                        </label>
                        <div className="row g-2">
                          {["pdf", "txt", "docx", "md", "csv", "xlsx"].map(
                            (fileType) => (
                              <div key={fileType} className="col-6">
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={(
                                      parameters?.supported_file_types ||
                                      supportedFileTypes
                                    ).includes(fileType)}
                                    onChange={(e) => {
                                      if (onParameterChange && parameters) {
                                        const updatedTypes = e.target.checked
                                          ? [
                                              ...parameters.supported_file_types,
                                              fileType,
                                            ]
                                          : parameters.supported_file_types.filter(
                                              (type) => type !== fileType
                                            );
                                        onParameterChange(
                                          "supported_file_types",
                                          updatedTypes
                                        );
                                      }
                                    }}
                                    id={`fileType-${fileType}`}
                                    disabled={!onParameterChange}
                                  />
                                  <label
                                    className="form-check-label"
                                    htmlFor={`fileType-${fileType}`}
                                  >
                                    {fileType.toUpperCase()}
                                  </label>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 爬蟲參數
                    <div className="parameter-content">
                      {/* 最大 Token 數 */}
                      <div className="mb-4 bg-white p-3 rounded shadow-sm border">
                        <label className="form-label fw-bold text-dark mb-2">
                          <i className="bi bi-cpu me-2"></i>
                          最大 Token 數
                        </label>
                        <div className="d-flex align-items-center gap-3">
                          <input
                            type="range"
                            className="form-range flex-grow-1"
                            min="1000"
                            max="200000"
                            step="1000"
                            value={
                              parameters?.crawler_max_tokens || crawlerMaxTokens
                            }
                            onChange={(e) =>
                              onParameterChange?.(
                                "crawler_max_tokens",
                                parseInt(e.target.value)
                              )
                            }
                            disabled={!onParameterChange}
                          />
                          <span className="badge bg-secondary fs-6">
                            {(
                              parameters?.crawler_max_tokens || crawlerMaxTokens
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* 最大頁面數 */}
                      <div className="mb-3 bg-white p-3 rounded shadow-sm border">
                        <label className="form-label fw-bold text-dark mb-2">
                          <i className="bi bi-layers me-2"></i>
                          最大頁面數
                        </label>
                        <div className="d-flex align-items-center gap-3">
                          <input
                            type="range"
                            className="form-range flex-grow-1"
                            min="1"
                            max="30"
                            step="1"
                            value={
                              parameters?.crawler_max_pages || crawlerMaxPages
                            }
                            onChange={(e) =>
                              onParameterChange?.(
                                "crawler_max_pages",
                                parseInt(e.target.value)
                              )
                            }
                            disabled={!onParameterChange}
                          />
                          <span className="badge bg-secondary fs-6">
                            {parameters?.crawler_max_pages || crawlerMaxPages}{" "}
                            頁
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-center mt-4">
                    <button
                      className="btn btn-primary w-100 py-2 rounded-pill"
                      onClick={() => setUploadSubStep(2)}
                      disabled={
                        activeTab === "file" &&
                        (parameters?.supported_file_types || supportedFileTypes)
                          .length === 0
                      }
                    >
                      下一步：{activeTab === "file" ? "選擇檔案" : "輸入網址"}
                      <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* 步驟 2: 上傳介面 */}
              {uploadSubStep === 2 && (
                <div className="step-upload fade-in">
                  <div className="d-flex align-items-center mb-4">
                    <button
                      className="btn btn-link text-decoration-none p-0 me-3 text-secondary"
                      onClick={() => setUploadSubStep(1)}
                      title="返回設定"
                    >
                      <i className="bi bi-arrow-left fs-4"></i>
                    </button>
                    <h5 className="card-title mb-0 fw-bold text-primary">
                      {activeTab === "file"
                        ? "步驟 2/2: 上傳檔案"
                        : "步驟 2/2: 開始爬取"}
                    </h5>
                  </div>

                  {activeTab === "file" ? (
                    <div
                      className={`file-upload-dropzone bg-white ${
                        isDragging ? "dragging" : ""
                      } ${disabled ? "disabled" : ""}`}
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
                        className="upload-screen-hidden-input"
                      />

                      <div className="dropzone-content text-center">
                        <div className="dropzone-icon-large mb-3">
                          <i className="bi bi-cloud-upload-fill text-primary fs-1"></i>
                        </div>
                        <p className="mb-2 fw-medium">
                          {isDragging
                            ? t("upload.dropzone.drop", "拖放檔案到此區域")
                            : t(
                                "upload.dropzone.dragOrClick",
                                "拖放檔案到此區域，或點擊進入"
                              )}
                        </p>
                        <small className="text-muted d-block">
                          {getSupportedFormatsText()}
                        </small>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded shadow-sm">
                      <WebsiteCrawlerPanel
                        onCrawl={handleCrawlerSubmit}
                        isLoading={crawlerLoading}
                        error={crawlerError}
                        crawlResults={crawlerResults}
                        maxTokens={
                          parameters?.crawler_max_tokens || crawlerMaxTokens
                        }
                        maxPages={
                          parameters?.crawler_max_pages || crawlerMaxPages
                        }
                        disabled={disabled}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadScreen;
