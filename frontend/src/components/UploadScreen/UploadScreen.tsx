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
  hasUploadedContent?: boolean; // 是否已有上傳內容
  uploadedFiles?: any[]; // 已上傳文件列表
  crawledUrls?: any[]; // 已爬取URL列表
  onTabChange?: (tab: "file" | "crawler") => void; // tab 切換回調
  // 新增：僅用於更新爬蟲結果狀態的回調
  onCrawlerSuccess?: (result: any) => void;
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
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false); // 錯誤對話框狀態
  const [errorDialogMessage, setErrorDialogMessage] = useState<string>(""); // 錯誤對話框訊息
  const [errorDialogTitle, setErrorDialogTitle] =
    useState<string>("檔案上傳失敗"); // 錯誤對話框標題
  const [activeTab, setActiveTab] = useState<"file" | "crawler">("file"); // 移除 URL 選項
  const [uploadSubStep, setUploadSubStep] = useState<1 | 2>(1); // 1: 參數設定, 2: 上傳介面
  const [crawlerLoading, setCrawlerLoading] = useState(false); // Added: Crawler loading state
  const [crawlerError, setCrawlerError] = useState<string | null>(null); // Added: Crawler error
  const [crawlerResults, setCrawlerResults] = useState<any | null>(null); // Added: Crawler results
  const [hasCrawlerFailed, setHasCrawlerFailed] = useState(false); // 標記爬蟲是否失敗
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 動態檔案大小限制（根據參數設定）
  const MAX_FILE_SIZE = maxFileSizeMB * 1024 * 1024;

  // 檢查爬蟲是否已完成且有有效內容
  const isCrawlerCompleted =
    crawlerResults &&
    // 必須是成功狀態，不能是 FAILED
    crawlerResults.extraction_status !== "FAILED" &&
    crawlerResults.error_code !== "ERR_PROCESSING_FAILED" &&
    crawlerResults.crawled_pages &&
    crawlerResults.crawled_pages.length > 0 &&
    crawlerResults.total_tokens > 0 &&
    (crawlerResults.crawl_status === "completed" ||
      crawlerResults.crawl_status === "token_limit_reached" ||
      crawlerResults.crawl_status === "page_limit_reached");

  // Log crawler state
  // 處理使用範例文件
  const handleUseSampleFile = async () => {
    try {
      setError(null);
      // 從 public 目錄獲取範例文件
      const response = await fetch("/docs/Alices Adventures in wonderland.txt");
      if (!response.ok) {
        throw new Error("無法載入範例文件");
      }
      const blob = await response.blob();
      const file = new File([blob], "Alices Adventures in wonderland.txt", {
        type: "text/plain",
      });

      // 驗證文件
      if (!validateDynamicFileType(file)) {
        setError(t("upload.error.type", "不支援的檔案格式"));
        return;
      }

      if (!validateFileSize(file, MAX_FILE_SIZE)) {
        setError(
          t(
            "upload.error.size",
            `檔案大小超過限制 (${formatFileSize(MAX_FILE_SIZE)})`
          )
        );
        return;
      }

      onFileSelected(file);
      setError(null);
    } catch (err) {
      setError("無法載入範例文件，請手動上傳檔案");
    }
  };

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
        const errorMsg = `${getFileTypeErrorMessage()}\n\n請使用其他檔案或點擊下方「使用範例檔案」按鈕。`;
        setErrorDialogTitle("檔案格式不支援");
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
          errorMsg = `檔案是空的，無法上傳。\n\n請使用其他檔案或點擊下方「使用範例檔案」按鈕。`;
        } else {
          errorMsg = `檔案太大：${fileSizeFormatted}（超過限制 ${maxSizeFormatted}）\n\n請使用其他檔案或點擊下方「使用範例檔案」按鈕。`;
        }

        setErrorDialogTitle("檔案上傳失敗");
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
    setCrawlerResults(null); // 清空之前的結果
    setHasCrawlerFailed(false); // 清除失敗標記
    setCrawlerLoading(true);

    try {
      const response = await uploadWebsite(sessionId, url, maxTokens, maxPages);
      // 驗證爬蟲結果 - 優先檢查 extraction_status 和 error_code
      // 確保大小寫不敏感
      const status = response.extraction_status?.toUpperCase();
      const isFailed = status === "FAILED";
      const hasErrorCode = response.error_code === "ERR_PROCESSING_FAILED";

      // 檢查是否有有效內容 (必須要有頁面且 Token > 0)
      // 放寬檢查：如果有 pages_found > 0 也視為有頁面（兼容後端可能未返回 crawled_pages 的情況）
      const hasPages =
        (response.crawled_pages && response.crawled_pages.length > 0) ||
        (response.pages_found && response.pages_found > 0);

      const totalTokens = response.total_tokens || 0;
      const hasTokens = totalTokens > 0;

      // 最小 token 數量檢查 (至少需要 50 tokens 才能形成有效的向量資料庫)
      const MIN_TOKENS_REQUIRED = 50;
      const hasSufficientTokens = totalTokens >= MIN_TOKENS_REQUIRED;

      const noCrawledPages = !hasPages;
      const noTokens = !hasTokens;
      const insufficientTokens = hasTokens && !hasSufficientTokens;
      // 檢查資料量是否過少（有 tokens 但不足最低要求）
      if (insufficientTokens) {
        setCrawlerResults(null);
        throw new Error(`INSUFFICIENT_DATA:${totalTokens}`);
      }

      if (isFailed || hasErrorCode || noCrawledPages || noTokens) {
        // 爬蟲失敗或沒有獲取到有效內容，視為失敗
        // 使用 API 返回的錯誤訊息，如果沒有則使用默認訊息
        // 構建詳細的錯誤原因以便調試
        const failureReasons = [];
        if (isFailed) failureReasons.push(`Status: ${status}`);
        if (hasErrorCode) failureReasons.push(`Error: ${response.error_code}`);
        if (noCrawledPages)
          failureReasons.push(
            `No pages found (found: ${response.pages_found}, list: ${response.crawled_pages?.length})`
          );
        if (noTokens) failureReasons.push(`No tokens (count: ${totalTokens})`);

        const debugInfo =
          failureReasons.length > 0 ? ` (${failureReasons.join(", ")})` : "";
        const errorMsg =
          (response.error_message || "Cannot embed empty text list") +
          debugInfo;
        // 確保清除先前的結果
        setCrawlerResults(null);
        throw new Error(errorMsg);
      }

      // 只有驗證通過後才設置成功狀態
      setCrawlerResults(response);

      // Auto-submit crawler results for processing
      // Crawler has already uploaded content, now just start processing flow
      // 優先使用 onCrawlerSuccess 回調（如果父組件有提供）以避免重複 API 呼叫
      if (onCrawlerSuccess) {
        onCrawlerSuccess(response);
      } else {
        // 向後兼容：如果沒有 onCrawlerSuccess，才調用 onUrlSubmitted
        // 但注意這可能會觸發父組件的 uploadUrl API 造成錯誤
        onUrlSubmitted(url);
      }
    } catch (err) {
      // 設置失敗標記
      setHasCrawlerFailed(true);

      // 清空爬蟲結果，確保不顯示舊的成功畫面
      setCrawlerResults(null);

      // 增強錯誤訊息，包含防爬提示
      const errorMessage =
        err instanceof Error ? err.message : "Failed to crawl website";
      // 檢查是否為資料量過少錯誤
      const isInsufficientDataError =
        errorMessage.startsWith("INSUFFICIENT_DATA:");

      // 檢查是否為防爬相關錯誤
      const isBlockedError =
        errorMessage.toLowerCase().includes("blocked") ||
        errorMessage.toLowerCase().includes("forbidden") ||
        errorMessage.toLowerCase().includes("403") ||
        errorMessage.toLowerCase().includes("access denied") ||
        errorMessage.toLowerCase().includes("robot") ||
        errorMessage.toLowerCase().includes("empty text list");

      let errorMsg: string;
      if (isInsufficientDataError) {
        // 解析實際的 token 數量
        const actualTokens = errorMessage.split(":")[1] || "少於 50";
        errorMsg = `爬取的網頁內容過少（僅 ${actualTokens} tokens），無法形成有效的資料建檔。\n\n請提供內容更豐富的網頁，或點擊下方「使用範例網站」按鈕。`;
        setErrorDialogTitle("資料量不足");
      } else if (isBlockedError) {
        errorMsg = `此網站無法被爬取（網站可能有防爬蟲機制）。\n\n請使用其他網站或點擊下方「使用範例網站」按鈕。`;
        setErrorDialogTitle("網頁爬取失敗");
      } else {
        errorMsg = `爬取失敗：${errorMessage}\n\n請使用其他網站或點擊下方「使用範例網站」按鈕。`;
        setErrorDialogTitle("網頁爬取失敗");
      }
      // 使用對話框顯示錯誤
      setErrorDialogMessage(errorMsg);
      setShowErrorDialog(true);
      // 不調用 onUrlSubmitted，避免設置父組件的成功狀態
    } finally {
      setCrawlerLoading(false);
    }
  };

  /**
   * 關閉錯誤對話框
   */
  const handleCloseErrorDialog = () => {
    setShowErrorDialog(false);
    setCrawlerResults(null); // 清除爬蟲結果
    setCrawlerError(null); // 清除爬蟲錯誤
    setHasCrawlerFailed(false); // 清除失敗標記
    // 確保回到初始的爬蟲輸入界面，不顯示任何成功訊息
  };

  return (
    <div className=" p-0">
      {/* 錯誤對話框 */}
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
                  確定
                </button>
              </div>
            </div>
          </div>
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
              disabled={disabled || isCrawlerCompleted}
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
              disabled={disabled || isCrawlerCompleted}
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
                    {/* 只在爬蟲未完成時顯示返回按鈕 */}
                    {!(
                      activeTab === "crawler" &&
                      isCrawlerCompleted &&
                      !hasCrawlerFailed &&
                      !showErrorDialog
                    ) && (
                      <button
                        className="btn btn-link text-decoration-none p-0 me-3 text-secondary"
                        onClick={() => setUploadSubStep(1)}
                        title="返回設定"
                      >
                        <i className="bi bi-arrow-left fs-4"></i>
                      </button>
                    )}
                    <h5 className="card-title mb-0 fw-bold text-primary">
                      {activeTab === "file"
                        ? "步驟 2/2: 上傳檔案"
                        : isCrawlerCompleted &&
                          !hasCrawlerFailed &&
                          !showErrorDialog
                        ? "爬取完成"
                        : "步驟 2/2: 開始爬取"}
                    </h5>
                  </div>

                  {/* 爬蟲完成時顯示結果摘要 */}
                  {activeTab === "crawler" &&
                    isCrawlerCompleted &&
                    !hasCrawlerFailed &&
                    !showErrorDialog && (
                      <div className="crawler-completed-summary">
                        <div className="alert alert-success d-flex align-items-center mb-4">
                          <i className="bi bi-check-circle-fill me-2 fs-4"></i>
                          <div>
                            <strong>網站爬取成功！</strong>
                            <p className="mb-0 mt-1">
                              已成功爬取 {crawlerResults.pages_found} 個頁面，共{" "}
                              {(crawlerResults.total_tokens / 1000).toFixed(1)}K
                              tokens。
                              資料已上傳至系統，請點擊下方「下一步」按鈕繼續處理流程。
                            </p>
                          </div>
                        </div>

                        <div className="card mb-3 border shadow-sm">
                          <div className="card-header bg-light border-bottom">
                            <h6 className="mb-0 fw-bold">
                              <i className="bi bi-file-earmark-text me-2"></i>
                              爬取結果詳情
                            </h6>
                          </div>
                          <div className="card-body">
                            <div className="row">
                              <div className="col-md-4 mb-3">
                                <div className="text-center p-3 bg-light rounded">
                                  <i className="bi bi-globe text-primary fs-3"></i>
                                  <div className="mt-2 fw-bold">站點頁面</div>
                                  <div className="fs-4 text-primary">
                                    {crawlerResults.pages_found}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4 mb-3">
                                <div className="text-center p-3 bg-light rounded">
                                  <i className="bi bi-file-text text-info fs-3"></i>
                                  <div className="mt-2 fw-bold">
                                    總 TOKEN 數
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
                                  <div className="mt-2 fw-bold">狀態</div>
                                  <div className="fs-6 text-success">
                                    {crawlerResults.crawl_status ===
                                      "completed" && "完成"}
                                    {crawlerResults.crawl_status ===
                                      "token_limit_reached" &&
                                      "達到 Token 限制"}
                                    {crawlerResults.crawl_status ===
                                      "page_limit_reached" && "達到頁面限制"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 完成提示 */}
                        <div className="text-center mt-4">
                          <div className="alert alert-info">
                            <i className="bi bi-info-circle me-2"></i>
                            資料已自動上傳至系統，系統將自動進入下一步「內容審核」流程。
                          </div>
                        </div>
                      </div>
                    )}

                  {/* 爬蟲未完成或文件上傳時顯示原有界面 */}
                  {!(activeTab === "crawler" && isCrawlerCompleted) && (
                    <>
                      {activeTab === "file" && (
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
                            使用範例文件（Alice in Wonderland）
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

      {/* 爬蟲執行中的 Loading Overlay */}
      <LoadingOverlay
        isVisible={crawlerLoading}
        message="正在爬取網站內容，請稍候..."
      />
    </div>
  );
};

export default UploadScreen;
