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
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";

export interface UploadScreenProps {
  sessionId: string;
  onFileSelected: (file: File) => void;
  onUrlSubmitted: (url: string) => void;
  maxFileSizeMB?: number;
  supportedFileTypes?: string[];
  crawlerMaxTokens?: number;
  crawlerMaxPages?: number;
  disabled?: boolean;
  hasUploadedContent?: boolean; // Whether there is uploaded content
  uploadedFiles?: any[]; // Uploaded files list
  crawledUrls?: any[]; // Crawled URLs list
  onTabChange?: (tab: "file" | "crawler") => void; // Tab switch callback
  // Added: Callback for updating crawler result status only
  onCrawlerSuccess?: (result: any) => void;
  // Added: Parameter settings props
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
  maxFileSizeMB = 3,
  supportedFileTypes = ["pdf", "txt"],
  crawlerMaxTokens = 100000,
  crawlerMaxPages = 10,
  disabled = false,
  hasUploadedContent = false,
  uploadedFiles = [],
  crawledUrls = [],
  onTabChange,

  onCrawlerSuccess,

  parameters,
  onParameterChange,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"file" | "crawler">("file"); // Remove URL option
  const tabTitle =
    activeTab === "file"
      ? t("uploadWizard.tabs.file", "File Upload")
      : t("uploadWizard.tabs.crawler", "Website Crawler");

  const cardWrapperClasses =
    "card shadow-sm mx-auto upload-card-wrapper active-card-border";
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false); // Error dialog state
  const [errorDialogMessage, setErrorDialogMessage] = useState<string>(""); // Error dialog message
  const [errorDialogTitle, setErrorDialogTitle] = useState<string>(
    t("uploadWizard.dialog.uploadFailed", "Upload Failed")
  ); // Error dialog title
  const [uploadSubStep, setUploadSubStep] = useState<1 | 2>(1); // 1: Parameters, 2: Upload interface
  const [crawlerLoading, setCrawlerLoading] = useState(false); // Added: Crawler loading state
  const [crawlerError, setCrawlerError] = useState<string | null>(null); // Added: Crawler error
  const [crawlerResults, setCrawlerResults] = useState<any | null>(null); // Added: Crawler results
  const [hasCrawlerFailed, setHasCrawlerFailed] = useState(false); // Flag if crawler failed
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic file size limit (based on settings)
  const MAX_FILE_SIZE = maxFileSizeMB * 1024 * 1024;

  // Check if crawler completed with valid content
  const isCrawlerCompleted =
    crawlerResults &&
    crawlerResults.extraction_status !== "FAILED" &&
    crawlerResults.error_code !== "ERR_PROCESSING_FAILED" &&
    crawlerResults.crawled_pages &&
    crawlerResults.crawled_pages.length > 0 &&
    crawlerResults.total_tokens > 0 &&
    (crawlerResults.crawl_status === "completed" ||
      crawlerResults.crawl_status === "token_limit_reached" ||
      crawlerResults.crawl_status === "page_limit_reached");

  // Handle sample file usage
  const handleUseSampleFile = async () => {
    try {
      setError(null);
      // Get sample file from public directory
      const response = await fetch("/docs/Alices Adventures in wonderland.txt");
      if (!response.ok) {
        throw new Error(
          t(
            "uploadWizard.errors.sampleFileLoad",
            "Unable to load sample file, please upload manually."
          )
        );
      }
      const blob = await response.blob();
      const file = new File([blob], "Alices Adventures in wonderland.txt", {
        type: "text/plain",
      });

      // Validate file
      if (!validateDynamicFileType(file)) {
        setError(t("upload.error.type", "Unsupported file format"));
        return;
      }

      if (!validateFileSize(file, MAX_FILE_SIZE)) {
        setError(
          t(
            "upload.error.size",
            `File size exceeds limit (${formatFileSize(MAX_FILE_SIZE)})`
          )
        );
        return;
      }

      onFileSelected(file);
      setError(null);
    } catch (err) {
      setError(
        t(
          "uploadWizard.errors.sampleFileLoad",
          "Unable to load sample file, please upload manually."
        )
      );
    }
  };

  // Generate supported formats display text
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
      .join(", ");

    return t(
      "uploadWizard.supportedFormats",
      `Supported: ${displayFormats} (Max ${formatFileSize(MAX_FILE_SIZE)})`,
      {
        formats: displayFormats,
        maxSize: formatFileSize(MAX_FILE_SIZE),
      }
    );
  };

  // Generate file accept attribute
  const getAcceptAttribute = () => {
    return supportedFileTypes.map((type) => `.${type}`).join(",");
  };

  // Dynamic file type validation
  const validateDynamicFileType = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split(".").pop();
    return fileExtension
      ? supportedFileTypes.includes(fileExtension.toLowerCase())
      : false;
  };

  // Generate dynamic error message
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
      .join(", ");

    return t(
      "uploadWizard.acceptFormatsOnly",
      `Only supports ${displayFormats} file formats`,
      {
        formats: displayFormats,
      }
    );
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);

      // Validate file type using dynamic validation
      if (!validateDynamicFileType(file)) {
        const errorMsg = t(
          "uploadWizard.errors.unsupportedFormats",
          `${getFileTypeErrorMessage()}\n\nPlease use another file or click "Use Sample File" below.`,
          {
            formats: supportedFileTypes
              .map((type) => type.toUpperCase())
              .join(", "),
          }
        );
        setErrorDialogTitle(
          t("uploadWizard.dialog.invalidFormat", "Unsupported File Format")
        );
        setErrorDialogMessage(errorMsg);
        setShowErrorDialog(true);
        return;
      }

      // Validate file size
      if (!validateFileSize(file, MAX_FILE_SIZE)) {
        const maxSizeFormatted = formatFileSize(MAX_FILE_SIZE);
        const fileSizeFormatted = formatFileSize(file.size);
        let errorMsg: string;

        if (file.size === 0) {
          errorMsg = t(
            "uploadWizard.errors.fileEmpty",
            `File is empty, cannot upload.\n\nPlease use another file or click "Use Sample File" below.`
          );
        } else {
          errorMsg = t(
            "uploadWizard.errors.fileTooLarge",
            `File too large: ${fileSizeFormatted} (Exceeds ${maxSizeFormatted})\n\nPlease use another file or click "Use Sample File" below.`,
            {
              fileSize: fileSizeFormatted,
              maxSize: maxSizeFormatted,
            }
          );
        }

        setErrorDialogTitle(
          t("uploadWizard.dialog.uploadFailed", "Upload Failed")
        );
        setErrorDialogMessage(errorMsg);
        setShowErrorDialog(true);
        return;
      }

      // Call parent component callback
      onFileSelected(file);
    },
    [onFileSelected, t, supportedFileTypes, MAX_FILE_SIZE]
  );

  /**
   * Handle file input change
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
   * Handle drag events
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
   * Trigger file browser
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle website crawler submit
   */
  const handleCrawlerSubmit = async (
    url: string,
    maxTokens: number,
    maxPages: number
  ) => {
    setCrawlerError(null);
    setCrawlerResults(null); // Clear previous results
    setHasCrawlerFailed(false); // Clear failure flag
    setCrawlerLoading(true);

    try {
      const response = await uploadWebsite(sessionId, url, maxTokens, maxPages);
      // Validate crawler results - check extraction_status and error_code
      const status = response.extraction_status?.toUpperCase();
      const isFailed = status === "FAILED";
      const hasErrorCode = response.error_code === "ERR_PROCESSING_FAILED";

      // Check for valid content
      const hasPages =
        (response.crawled_pages && response.crawled_pages.length > 0) ||
        (response.pages_found && response.pages_found > 0);

      const totalTokens = response.total_tokens || 0;
      const hasTokens = totalTokens > 0;

      // Min token check
      const MIN_TOKENS_REQUIRED = 50;
      const hasSufficientTokens = totalTokens >= MIN_TOKENS_REQUIRED;

      const noCrawledPages = !hasPages;
      const noTokens = !hasTokens;
      const insufficientTokens = hasTokens && !hasSufficientTokens;

      if (insufficientTokens) {
        setCrawlerResults(null);
        throw new Error("INSUFFICIENT_DATA:");
      }

      if (isFailed || hasErrorCode || noCrawledPages || noTokens) {
        // Construct detailed error
        const failureReasons = [];
        if (isFailed) failureReasons.push(`Status: ${status}`);
        if (hasErrorCode)
          failureReasons.push(`Error: ${response.error_message}`);
        if (noCrawledPages)
          failureReasons.push(
            `No pages found (found: ${response.pages_found}, list: ${response.crawled_pages?.length})`
          );
        if (noTokens) failureReasons.push(`No tokens (count: ${totalTokens})`);

        const debugInfo =
          failureReasons.length > 0 ? ` (${failureReasons.join(", ")})` : "";
        const errorMsg =
          (response.error_message ||
            t("crawler.error.emptyTextList", "Cannot embed empty text list")) +
          debugInfo;

        setCrawlerResults(null);
        throw new Error(errorMsg);
      }

      setCrawlerResults(response);

      if (onCrawlerSuccess) {
        onCrawlerSuccess(response);
      } else {
        onUrlSubmitted(url);
      }
    } catch (err: any) {
      setHasCrawlerFailed(true);
      setCrawlerResults(null);

      const errorMessage =
        err instanceof Error
          ? err.message
          : t("crawler.error.failed", "Failed to crawl website");

      const isInsufficientDataError =
        errorMessage.startsWith("INSUFFICIENT_DATA:");

      const isBlockedError =
        errorMessage.toLowerCase().includes("blocked") ||
        errorMessage.toLowerCase().includes("forbidden") ||
        errorMessage.toLowerCase().includes("403") ||
        errorMessage.toLowerCase().includes("access denied") ||
        errorMessage.toLowerCase().includes("robot") ||
        errorMessage.toLowerCase().includes("empty text list");

      let errorMsg: string;
      if (isInsufficientDataError) {
        const actualTokens = errorMessage.split(":")[1] || "less than 50";
        errorMsg = t(
          "uploadWizard.errors.crawlerInsufficient",
          `Crawled content too small (only ${actualTokens} tokens), cannot form valid data.\n\nPlease provide content-rich pages or use Sample Website.`,
          { tokens: actualTokens }
        );
        setErrorDialogTitle(
          t("uploadWizard.dialog.uploadFailed", "Insufficient Data")
        );
      } else if (isBlockedError) {
        errorMsg = t(
          "uploadWizard.errors.crawlerBlocked",
          "This website cannot be crawled (anti-crawler mechanism).\n\nPlease use another site or Sample Website."
        );
        setErrorDialogTitle(
          t("uploadWizard.dialog.uploadFailed", "Website Crawl Failed")
        );
      } else {
        errorMsg = t(
          "uploadWizard.errors.crawlerFailed",
          `Crawl failed: ${errorMessage}\n\nPlease use another site or Sample Website.`,
          { reason: errorMessage }
        );
        setErrorDialogTitle(
          t("uploadWizard.dialog.uploadFailed", "Website Crawl Failed")
        );
      }
      setErrorDialogMessage(errorMsg);
      setShowErrorDialog(true);
    } finally {
      setCrawlerLoading(false);
    }
  };

  /**
   * Close error dialog
   */
  const handleCloseErrorDialog = () => {
    setShowErrorDialog(false);
    setCrawlerResults(null);
    setCrawlerError(null);
    setHasCrawlerFailed(false);
  };

  return (
    <div className=" p-0">
      {/* Error Dialog */}
      {showErrorDialog && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {errorDialogTitle}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={handleCloseErrorDialog}
                ></button>
              </div>
              <div className="modal-body">
                <p style={{ whiteSpace: "pre-line" }}>{errorDialogMessage}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCloseErrorDialog}
                >
                  {t(
                    "uploadWizard.dialog.confirm",
                    t("buttons.confirm", "Confirm")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Results Summary */}
      {hasUploadedContent && (
        <div className="upload-results-summary">
          <div className={cardWrapperClasses}>
            <div className="card-body p-4">
              <h5 className="card-title text-center mb-4 fw-bold text-primary">
                {t("uploadWizard.summary.title", "Upload Completed")}
              </h5>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="card mb-3 border active-card-border shadow-sm">
                  <div className="card-header active-card-bg text-white border-bottom-0 pt-3">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-file-earmark-check me-2"></i>
                      {t(
                        "uploadWizard.summary.uploadedFiles",
                        "Uploaded Files ({{count}})",
                        { count: uploadedFiles.length }
                      )}
                    </h6>
                  </div>
                  <div className="card-body pt-0 bg-white">
                    <div className="list-group list-group-flush">
                      {uploadedFiles.map((file, index) => {
                        const fileName =
                          file.filename ||
                          file.name ||
                          t("uploadWizard.summary.unnamed", "Unnamed File");
                        const uploadedAt =
                          file.uploadTime ||
                          file.upload_time ||
                          file.upload_timestamp;
                        const typeLabel =
                          file.type === "url"
                            ? t("uploadWizard.summary.fileType.url", "URL")
                            : t("uploadWizard.summary.fileType.file", "File");
                        const sizeLabel =
                          typeof file.size === "number"
                            ? formatFileSize(file.size)
                            : typeof file.file_size === "number"
                              ? formatFileSize(file.file_size)
                              : null;
                        const metaParts = [
                          typeLabel,
                          sizeLabel
                            ? t(
                                "uploadWizard.summary.sizeLabel",
                                `Size ${sizeLabel}`,
                                { size: sizeLabel }
                              )
                            : null,
                          uploadedAt
                            ? new Date(uploadedAt).toLocaleString()
                            : null,
                        ].filter(Boolean);

                        return (
                          <div
                            key={index}
                            className="list-group-item px-0 py-2 border-0"
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="flex-grow-1">
                                <div className="fw-medium text-truncate">
                                  {fileName}
                                </div>
                                <small className="text-muted">
                                  {metaParts.join("  ") ||
                                    t(
                                      "uploadWizard.summary.completed",
                                      "Completed"
                                    )}
                                </small>
                              </div>
                              <span className="badge bg-success rounded-pill ms-2">
                                <i className="bi bi-check-lg"></i>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Crawler Results */}
              {crawledUrls.length > 0 && (
                <div className="card border active-card-border shadow-sm">
                  <div className="card-header active-card-bg text-white border-bottom-0 pt-3">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-globe-americas me-2"></i>
                      {t(
                        "uploadWizard.summary.uploadedSites",
                        "Crawled Websites ({{count}})",
                        { count: crawledUrls.length }
                      )}
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
                                {t(
                                  "uploadWizard.summary.siteMeta",
                                  `${formatFileSize(site.content_size)}   Pages ${site.pages_found || 1} `,
                                  {
                                    size: formatFileSize(site.content_size),
                                    pages: site.pages_found || 1,
                                    time: new Date(
                                      site.crawl_time
                                    ).toLocaleString(),
                                  }
                                )}
                              </small>
                            </div>
                            <span className="badge bg-success rounded-pill ms-2">
                              <i className="bi bi-check-lg"></i>
                            </span>
                          </div>
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

      {/* Upload Interface */}
      {!hasUploadedContent && (
        <div className="upload-interface-container">
          <div className="upload-mode-toggle d-flex justify-content-center gap-3 mb-4">
            <button
              className={`mode-toggle-btn ${activeTab === "file" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("file");
                setUploadSubStep(1);
                onTabChange?.("file");
              }}
              disabled={disabled || isCrawlerCompleted}
            >
              <span className="icon-circle">
                <i className="bi bi-file-earmark-arrow-up"></i>
              </span>
              <span>{t("upload.tab.file", "File Upload")}</span>
            </button>
            <button
              className={`mode-toggle-btn ${activeTab === "crawler" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("crawler");
                setUploadSubStep(1);
                onTabChange?.("crawler");
              }}
              disabled={disabled || isCrawlerCompleted}
            >
              <span className="icon-circle">
                <i className="bi bi-globe"></i>
              </span>
              <span>{t("upload.tab.crawler", "Website Crawler")}</span>
            </button>
          </div>

          {/* Cards */}
          <div className={cardWrapperClasses}>
            <div className="card-body p-4 ">
              {/* Step 1: Parameters */}
              {uploadSubStep === 1 && (
                <div className="step-parameters fade-in">
                  <div className="section-header mb-4">
                    <div>
                      <div className="eyebrow text-uppercase">
                        {t("uploadWizard.steps.eyebrow", "Step 3  Configure")}
                      </div>
                      <h5 className="mb-0 fw-bold">
                        {t(
                          "uploadWizard.steps.basicParameters",
                          `${tabTitle} Basic Parameters`,
                          { tab: tabTitle }
                        )}
                      </h5>
                    </div>
                    <span className="pill pill-light">
                      {t("uploadWizard.steps.stepIndicator", "Step 1 / 2")}
                    </span>
                  </div>

                  {activeTab === "file" ? (
                    // File Params
                    <div className="parameter-content">
                      <div className="surface-card mb-4">
                        <label className="form-label fw-bold text-dark mb-2">
                          <i className="bi bi-hdd me-2"></i>
                          {t(
                            "uploadWizard.steps.file.maxFileSize",
                            "Max File Size"
                          )}
                        </label>
                        <div className="d-flex align-items-center gap-3">
                          <input
                            type="range"
                            className="form-range flex-grow-1"
                            min="1"
                            max="3"
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
                          <span className="value-chip">
                            {parameters?.max_file_size_mb || maxFileSizeMB} MB
                          </span>
                        </div>
                      </div>

                      <div className="surface-card mb-3">
                        <label className="form-label fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                          <i className="bi bi-file-earmark-check me-2"></i>
                          {t(
                            "uploadWizard.steps.file.supportedTypes",
                            "Supported File Types"
                          )}
                        </label>
                        <div className="row g-2">
                          {["pdf", "txt"].map((fileType) => (
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
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Crawler Params
                    <div className="parameter-content">
                      <div className="surface-card mb-4">
                        <label className="form-label fw-bold text-dark mb-2">
                          <i className="bi bi-cpu me-2"></i>
                          {t(
                            "uploadWizard.steps.crawler.maxTokens",
                            "Max Tokens"
                          )}
                        </label>
                        <div className="d-flex align-items-center gap-3">
                          <input
                            type="range"
                            className="form-range flex-grow-1"
                            min="1000"
                            max="100000"
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
                          <span className="value-chip">
                            {(
                              parameters?.crawler_max_tokens || crawlerMaxTokens
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="surface-card mb-3">
                        <label className="form-label fw-bold text-dark mb-2">
                          <i className="bi bi-layers me-2"></i>
                          {t(
                            "uploadWizard.steps.crawler.maxPages",
                            "Max Pages"
                          )}
                        </label>
                        <div className="d-flex align-items-center gap-3">
                          <input
                            type="range"
                            className="form-range flex-grow-1"
                            min="1"
                            max="10"
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
                          <span className="value-chip">
                            {parameters?.crawler_max_pages || crawlerMaxPages}{" "}
                            {t("uploadWizard.steps.crawler.pageUnit", "Pages")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-center mt-4">
                    <button
                      className="btn btn-primary w-100 py-2 rounded-pill next-btn"
                      onClick={() => setUploadSubStep(2)}
                      disabled={
                        activeTab === "file" &&
                        (parameters?.supported_file_types || supportedFileTypes)
                          .length === 0
                      }
                    >
                      {activeTab === "file"
                        ? t("uploadWizard.steps.next.file", "Next: Select File")
                        : t(
                            "uploadWizard.steps.next.crawler",
                            "Next: Enter URL"
                          )}
                      <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Upload Interface */}
              {uploadSubStep === 2 && (
                <div className="step-upload fade-in">
                  <div className="substep-bar d-flex align-items-center mb-4 justify-content-between">
                    {!(
                      activeTab === "crawler" &&
                      isCrawlerCompleted &&
                      !hasCrawlerFailed &&
                      !showErrorDialog
                    ) && (
                      <button
                        className="btn btn-link text-decoration-none p-0 me-3 text-secondary"
                        onClick={() => setUploadSubStep(1)}
                        title={t("uploadWizard.steps.back", "Back to settings")}
                      >
                        <i className="bi bi-arrow-left fs-4"></i>
                      </button>
                    )}
                    <h5 className="card-title mb-0 fw-bold text-primary">
                      {activeTab === "file"
                        ? t(
                            "uploadWizard.steps.upload.titleFile",
                            "Step 2/2: Upload File"
                          )
                        : isCrawlerCompleted &&
                            !hasCrawlerFailed &&
                            !showErrorDialog
                          ? t(
                              "uploadWizard.steps.upload.crawlerCompleted",
                              "Crawl Completed"
                            )
                          : t(
                              "uploadWizard.steps.upload.titleCrawler",
                              "Step 2/2: Start Crawl"
                            )}
                    </h5>
                  </div>

                  {/* Crawler Completed Summary */}
                  {activeTab === "crawler" &&
                    isCrawlerCompleted &&
                    !hasCrawlerFailed &&
                    !showErrorDialog && (
                      <div className="crawler-completed-summary">
                        <div className="alert alert-success d-flex align-items-center mb-4">
                          <i className="bi bi-check-circle-fill me-2 fs-4"></i>
                          <div>
                            <strong>
                              {t(
                                "uploadWizard.steps.crawlerSuccess.title",
                                "Website Crawl Successful!"
                              )}
                            </strong>
                            <p className="mb-0 mt-1">
                              {t(
                                "uploadWizard.steps.crawlerSuccess.description",
                                `Successfully crawled ${crawlerResults.pages_found} pages, total ${(crawlerResults.total_tokens / 1000).toFixed(1)}K tokens. Data uploaded. Click "Next" to continue.`,
                                {
                                  pages: crawlerResults.pages_found,
                                  tokens: (
                                    crawlerResults.total_tokens / 1000
                                  ).toFixed(1),
                                }
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="card mb-3 border shadow-sm">
                          <div className="card-header bg-light border-bottom">
                            <h6 className="mb-0 fw-bold">
                              <i className="bi bi-file-earmark-text me-2"></i>
                              {t(
                                "uploadWizard.steps.crawlerSuccess.detailsTitle",
                                "Crawl Result Details"
                              )}
                            </h6>
                          </div>
                          <div className="card-body">
                            <div className="row">
                              <div className="col-md-4 mb-3">
                                <div className="text-center p-3 bg-light rounded">
                                  <i className="bi bi-globe text-primary fs-3"></i>
                                  <div className="mt-2 fw-bold">
                                    {t(
                                      "uploadWizard.steps.stats.pages",
                                      "Site Pages"
                                    )}
                                  </div>
                                  <div className="fs-4 text-primary">
                                    {crawlerResults.pages_found}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4 mb-3">
                                <div className="text-center p-3 bg-light rounded">
                                  <i className="bi bi-file-text text-info fs-3"></i>
                                  <div className="mt-2 fw-bold">
                                    {t(
                                      "uploadWizard.steps.stats.tokens",
                                      "Total Tokens"
                                    )}
                                  </div>
                                  <div className="fs-4 text-info">
                                    {(
                                      crawlerResults.total_tokens / 1000
                                    ).toFixed(1)}
                                    K
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4 mb-3">
                                <div className="text-center p-3 bg-light rounded">
                                  <i className="bi bi-check-circle text-success fs-3"></i>
                                  <div className="mt-2 fw-bold">
                                    {t(
                                      "uploadWizard.steps.stats.status",
                                      "Status"
                                    )}
                                  </div>
                                  <div className="fs-6 text-success">
                                    {crawlerResults.crawl_status ===
                                      "completed" &&
                                      t(
                                        "uploadWizard.steps.stats.statusComplete",
                                        "Completed"
                                      )}
                                    {crawlerResults.crawl_status ===
                                      "token_limit_reached" &&
                                      t(
                                        "uploadWizard.steps.stats.statusTokenLimit",
                                        "Token Limit Reached"
                                      )}
                                    {crawlerResults.crawl_status ===
                                      "page_limit_reached" &&
                                      t(
                                        "uploadWizard.steps.stats.statusPageLimit",
                                        "Page Limit Reached"
                                      )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Completed Info */}
                        <div className="text-center mt-4">
                          <div className="alert alert-info">
                            <i className="bi bi-info-circle me-2"></i>
                            {t(
                              "uploadWizard.steps.info.autoNext",
                              "Data automatically uploaded. Proceeding to Content Review."
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Upload Interface if not crawler completed */}
                  {!(activeTab === "crawler" && isCrawlerCompleted) && (
                    <>
                      {activeTab === "file" && (
                        <div
                          className={`file-upload-dropzone bg-white ${isDragging ? "dragging" : ""}`}
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
                                ? t("upload.dropzone.drop", "Drop files here")
                                : t(
                                    "upload.dropzone.dragOrClick",
                                    "Drop files here or click to browse"
                                  )}
                            </p>
                            <small className="text-muted d-block">
                              {getSupportedFormatsText()}
                            </small>
                          </div>
                        </div>
                      )}

                      {activeTab === "file" && (
                        <div className="text-center mt-3">
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseSampleFile();
                            }}
                            disabled={disabled}
                          >
                            <i className="bi bi-file-text me-2"></i>
                            {t(
                              "uploadWizard.steps.sampleFileButton",
                              "Use Sample File (Alice in Wonderland)"
                            )}
                          </button>
                        </div>
                      )}

                      {activeTab === "crawler" && (
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={crawlerLoading}
        message={t("crawler.loading", "Crawling site content, please wait...")}
      />
    </div>
  );
};

export default UploadScreen;
