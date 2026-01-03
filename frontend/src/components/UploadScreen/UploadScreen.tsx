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
          <div className="alert alert-success mb-4" role="alert">
            <h6 className="alert-heading mb-3">
              <i className="bi bi-check-circle-fill me-2"></i>
              資料上傳完成
            </h6>
            <p className="mb-0 small">
              已成功上傳內容，您可以進入下一步驟進行內容審核。如需重新上傳，請重新啟動會話。
            </p>
          </div>

          {/* 文件上傳結果 */}
          {uploadedFiles.length > 0 && (
            <div className="card mb-3">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-file-earmark-check me-2"></i>
                  已上傳文件 ({uploadedFiles.length})
                </h6>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="list-group-item px-0 py-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="fw-medium text-truncate">
                            {file.filename}
                          </div>
                          <small className="text-muted">
                            {formatFileSize(file.size)} •{" "}
                            {new Date(file.uploadTime).toLocaleString()}
                          </small>
                        </div>
                        <span className="badge bg-success ms-2">
                          <i className="bi bi-check me-1"></i>
                          {file.chunks || 0} chunks
                        </span>
                      </div>
                      {file.preview && file.preview !== "文件內容預覽..." && (
                        <div className="mt-2">
                          <small className="text-muted">
                            <strong>預覽：</strong>
                            {file.preview.substring(0, 100)}
                            {file.preview.length > 100 ? "..." : ""}
                          </small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 網站爬蟲結果 */}
          {crawledUrls.length > 0 && (
            <div className="card">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-globe-americas me-2"></i>
                  已爬取網站 ({crawledUrls.length})
                </h6>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {crawledUrls.map((site, index) => (
                    <div key={index} className="list-group-item px-0 py-2">
                      <div className="d-flex justify-content-between align-items-start">
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
                        <span className="badge bg-info ms-2">
                          <i className="bi bi-check me-1"></i>
                          {site.chunks || 0} chunks
                        </span>
                      </div>
                      {site.summary && site.summary !== "網站內容摘要..." && (
                        <div className="mt-2">
                          <small className="text-muted">
                            <strong>摘要：</strong>
                            {site.summary.substring(0, 150)}
                            {site.summary.length > 150 ? "..." : ""}
                          </small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 如果沒有上傳內容，顯示上傳界面 */}
      {!hasUploadedContent && (
        <>
          {/* Upload tabs */}
          <ul className="nav nav-tabs mb-0">
            <li className="nav-item">
              <button
                className={`nav-link text-start ${
                  activeTab === "file" ? "active" : ""
                }`}
                onClick={() => {
                  setActiveTab("file");
                  onTabChange?.("file");
                }}
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
                onClick={() => {
                  setActiveTab("crawler");
                  onTabChange?.("crawler");
                }}
                disabled={disabled}
              >
                <i className="bi bi-globe me-2"></i>
                {t("upload.tab.crawler", "網站爬蟲")}
              </button>
            </li>
          </ul>

          {/* Tab content with border */}
          <div className="tab-content-wrapper border border-top-0 rounded-bottom p-4">
            {/* 檔案上傳 Tab */}
            {activeTab === "file" && (
              <div className="row g-4">
                {/* 左側 - 檔案上傳參數設定 */}
                <div className="col-12 col-lg-5">
                  <div className="parameter-section">
                    {/* 檔案大小限制 */}
                    <div className="mb-4">
                      <h6 className="mb-3">
                        <i className="bi bi-hdd me-2"></i>
                        檔案大小限制
                      </h6>
                      <div className="text-center mb-2">
                        <strong className="text-primary fs-5">
                          {parameters?.max_file_size_mb || maxFileSizeMB} MB
                        </strong>
                      </div>
                      <input
                        type="range"
                        className="form-range"
                        min="1"
                        max="10"
                        step="1"
                        value={parameters?.max_file_size_mb || maxFileSizeMB}
                        onChange={(e) =>
                          onParameterChange?.(
                            "max_file_size_mb",
                            parseInt(e.target.value)
                          )
                        }
                        disabled={!onParameterChange}
                      />
                      <div className="d-flex justify-content-between small text-muted">
                        <span>1MB</span>
                        <span>10MB</span>
                      </div>
                    </div>

                    {/* 支援檔案類型 */}
                    <div>
                      <h6 className="mb-3">
                        <i className="bi bi-file-earmark-check me-2"></i>
                        支援檔案類型
                      </h6>
                      <p className="text-muted small mb-3">
                        選擇系統支援的檔案格式類型
                      </p>

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
                                  <strong className="text-uppercase">
                                    {fileType}
                                  </strong>
                                  <div className="small text-muted">
                                    {fileType === "pdf" && "Adobe PDF 文件"}
                                    {fileType === "txt" && "純文字檔案"}
                                    {fileType === "docx" && "Word 文件"}
                                    {fileType === "md" && "Markdown 文件"}
                                    {fileType === "csv" && "CSV 表格檔"}
                                    {fileType === "xlsx" && "Excel 表格檔"}
                                  </div>
                                </label>
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      {/* 已選檔案類型摘要 */}
                      <div className="mt-3 p-2 bg-light rounded">
                        <small className="text-muted">
                          <i className="bi bi-check-circle me-1"></i>
                          已選擇{" "}
                          {
                            (
                              parameters?.supported_file_types ||
                              supportedFileTypes
                            ).length
                          }{" "}
                          種檔案類型
                        </small>
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          {(
                            parameters?.supported_file_types ||
                            supportedFileTypes
                          ).map((type) => (
                            <span
                              key={type}
                              className="badge bg-primary text-uppercase"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                        {(
                          parameters?.supported_file_types || supportedFileTypes
                        ).length === 0 && (
                          <small className="text-danger d-block mt-2">
                            ⚠️ 請至少選擇一種檔案類型
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右側 - 檔案上傳區 */}
                <div className="col-12 col-lg-7">
                  <div
                    className={`file-upload-dropzone ${
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

                    <div className="dropzone-content">
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
                      <small className="text-muted">
                        {getSupportedFormatsText()}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 網站爬蟲 Tab */}
            {activeTab === "crawler" && (
              <div className="row g-4">
                {/* 左側 - 爬蟲參數設定 */}
                <div className="col-12 col-lg-5">
                  <div className="parameter-section">
                    <h6 className="mb-3">
                      <i className="bi bi-gear me-2"></i>
                      網站爬蟲參數
                    </h6>

                    {/* 網站爬蟲最大Token */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="text-muted">最大 Token 數</small>
                        <strong className="text-primary">
                          {(
                            parameters?.crawler_max_tokens || crawlerMaxTokens
                          ).toLocaleString()}
                        </strong>
                      </div>
                      <input
                        type="range"
                        className="form-range"
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
                      <div className="d-flex justify-content-between small text-muted">
                        <span>1K</span>
                        <span>200K</span>
                      </div>
                    </div>

                    {/* 網站爬蟲最大頁面數 */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="text-muted">最大頁面數</small>
                        <strong className="text-primary">
                          {parameters?.crawler_max_pages || crawlerMaxPages} 頁
                        </strong>
                      </div>
                      <input
                        type="range"
                        className="form-range"
                        min="1"
                        max="30"
                        step="1"
                        value={parameters?.crawler_max_pages || crawlerMaxPages}
                        onChange={(e) =>
                          onParameterChange?.(
                            "crawler_max_pages",
                            parseInt(e.target.value)
                          )
                        }
                        disabled={!onParameterChange}
                      />
                      <div className="d-flex justify-content-between small text-muted">
                        <span>1</span>
                        <span>30</span>
                      </div>
                    </div>

                    {/* 爬蟲參數說明 */}
                    <div className="alert alert-info small mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>提示：</strong>
                      <ul className="mb-0 mt-2 ps-3">
                        <li>Token 數越大，可爬取的內容越多</li>
                        <li>頁面數限制爬蟲深度</li>
                        <li>建議先小範圍測試</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 右側 - 網站爬蟲輸入區 */}
                <div className="col-12 col-lg-7">
                  <div className="crawler-section">
                    <div className="text-center mb-3">
                      <div className="dropzone-icon-large">
                        <i className="bi bi-globe text-success"></i>
                      </div>
                    </div>
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
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UploadScreen;
