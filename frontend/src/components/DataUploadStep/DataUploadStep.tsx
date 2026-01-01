/**
 * Step 3: Data Upload Component
 * 資訊上傳步驟 - 整合其它設定、支援檔案類型和檔案上傳
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import UploadScreen from "../UploadScreen/UploadScreen";

export interface DataUploadStepProps {
  parameters: {
    session_ttl_minutes: number;
    max_file_size_mb: number;
    crawler_max_tokens: number;
    crawler_max_pages: number;
    supported_file_types: string[];
  };
  onParameterChange: (parameter: string, value: any) => void;
  sessionId?: string;
  onFileUpload?: (file: File) => void;
  onUrlUpload?: (url: string) => void;
  onCrawlerUpload?: (url: string, maxTokens: number, maxPages: number) => void;
  documents?: any[]; // 新增：已上傳文件列表
  crawledUrls?: any[]; // 新增：已爬取URL列表
}

const DataUploadStep: React.FC<DataUploadStepProps> = ({
  parameters,
  onParameterChange,
  sessionId,
  onFileUpload,
  onUrlUpload,
  onCrawlerUpload,
  documents = [],
  crawledUrls = [],
}) => {
  const { t } = useTranslation();

  // 追蹤當前上傳模式 (檔案上傳 或 網站爬蟲)
  const [uploadMode, setUploadMode] = useState<"file" | "crawler">("file");

  // 檢查是否有上傳內容
  const hasUploadedContent =
    (documents && documents.length > 0) ||
    (crawledUrls && crawledUrls.length > 0);

  console.log("[DataUploadStep] hasUploadedContent:", hasUploadedContent, {
    documents: documents?.length || 0,
    crawledUrls: crawledUrls?.length || 0,
  });

  return (
    <div className="data-upload-step">
      {/* 統一的上傳資料區塊 */}
      <div className="card">
        <div className="card-header bg-info text-white">
          <h5 className="card-title mb-0">
            <i className="bi bi-cloud-upload me-2"></i>
            上傳資料
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-4">
            {/* 左側 - 參數設定區塊 (根據模式動態顯示) */}
            <div className="col-12 col-lg-5">
              {uploadMode === "file" ? (
                /* 檔案上傳模式 - 顯示檔案大小限制和支援檔案類型 */
                <div className="parameter-section">
                  {/* 檔案大小限制 */}
                  <div className="mb-4">
                    <h6 className="mb-3">
                      <i className="bi bi-hdd me-2"></i>
                      檔案大小限制
                    </h6>
                    <div className="text-center mb-2">
                      <strong className="text-primary fs-5">
                        {parameters.max_file_size_mb} MB
                      </strong>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="1"
                      max="10"
                      step="1"
                      value={parameters.max_file_size_mb}
                      onChange={(e) =>
                        onParameterChange(
                          "max_file_size_mb",
                          parseInt(e.target.value)
                        )
                      }
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
                                checked={parameters.supported_file_types.includes(
                                  fileType
                                )}
                                onChange={(e) => {
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
                                }}
                                id={`fileType-${fileType}`}
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
                        已選擇 {parameters.supported_file_types.length}{" "}
                        種檔案類型
                      </small>
                      <div className="d-flex flex-wrap gap-1 mt-2">
                        {parameters.supported_file_types.map((type) => (
                          <span
                            key={type}
                            className="badge bg-primary text-uppercase"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                      {parameters.supported_file_types.length === 0 && (
                        <small className="text-danger d-block mt-2">
                          ⚠️ 請至少選擇一種檔案類型
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* 網站爬蟲模式 - 顯示爬蟲參數 */
                <div className="parameter-section">
                  <h6 className="mb-3">
                    <i className="bi bi-globe me-2"></i>
                    網站爬蟲參數
                  </h6>

                  {/* 網站爬蟲最大Token */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">最大 Token 數</small>
                      <strong className="text-primary">
                        {parameters.crawler_max_tokens.toLocaleString()}
                      </strong>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="1000"
                      max="200000"
                      step="1000"
                      value={parameters.crawler_max_tokens}
                      onChange={(e) =>
                        onParameterChange(
                          "crawler_max_tokens",
                          parseInt(e.target.value)
                        )
                      }
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
                        {parameters.crawler_max_pages} 頁
                      </strong>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="1"
                      max="30"
                      step="1"
                      value={parameters.crawler_max_pages}
                      onChange={(e) =>
                        onParameterChange(
                          "crawler_max_pages",
                          parseInt(e.target.value)
                        )
                      }
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
              )}
            </div>

            {/* 右側 - 上傳區塊 */}
            <div className="col-12 col-lg-7">
              {sessionId && (
                <UploadScreen
                  sessionId={sessionId}
                  onFileSelected={(file) => {
                    console.log("File selected:", file);
                    onFileUpload?.(file);
                  }}
                  onUrlSubmitted={(url) => {
                    console.log("URL submitted:", url);
                    onUrlUpload?.(url);
                  }}
                  maxFileSizeMB={parameters.max_file_size_mb}
                  supportedFileTypes={parameters.supported_file_types}
                  crawlerMaxTokens={parameters.crawler_max_tokens}
                  crawlerMaxPages={parameters.crawler_max_pages}
                  hasUploadedContent={hasUploadedContent}
                  uploadedFiles={documents}
                  crawledUrls={crawledUrls}
                  onTabChange={setUploadMode}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 配置摘要 */}
      {hasUploadedContent && (
        <div className="mt-4 p-3 bg-light rounded">
          <h6 className="mb-3">
            <i className="bi bi-info-circle me-2"></i>
            上傳內容摘要
          </h6>
          <div className="row">
            <div className="col-6 col-md-3">
              <small>
                <strong>上傳文件:</strong> {documents.length} 個
              </small>
            </div>
            <div className="col-6 col-md-3">
              <small>
                <strong>爬取網站:</strong> {crawledUrls.length} 個
              </small>
            </div>
            <div className="col-6 col-md-3">
              <small>
                <strong>總文檔塊:</strong>{" "}
                {documents.reduce((sum, doc) => sum + (doc.chunks || 0), 0) +
                  crawledUrls.reduce((sum, url) => sum + (url.chunks || 0), 0)}
              </small>
            </div>
            <div className="col-6 col-md-3">
              <small>
                <strong>狀態:</strong>
                <span className="text-success ms-1">✓ 準備審核</span>
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataUploadStep;
