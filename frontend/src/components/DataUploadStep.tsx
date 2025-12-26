/**
 * Step 3: Data Upload Component
 * 資訊上傳步驟 - 整合其它設定、支援檔案類型和檔案上傳
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import UploadScreen from "./UploadScreen";

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
}

const DataUploadStep: React.FC<DataUploadStepProps> = ({
  parameters,
  onParameterChange,
  sessionId,
  onFileUpload,
  onUrlUpload,
  onCrawlerUpload,
}) => {
  const { t } = useTranslation();
  const [activeLeftTab, setActiveLeftTab] = useState<"system" | "files">(
    "system"
  );

  return (
    <div className="data-upload-step">
      <div className="row g-3">
        {/* 左側區域 - 系統設定和檔案類型 (40%) */}
        <div className="col-12 col-lg-5">
          {/* 左側標籤頁導航 */}
          <ul className="nav nav-tabs mb-3" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${
                  activeLeftTab === "system" ? "active" : ""
                }`}
                onClick={() => setActiveLeftTab("system")}
                type="button"
              >
                <i className="bi bi-gear me-2"></i>
                系統設定
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${
                  activeLeftTab === "files" ? "active" : ""
                }`}
                onClick={() => setActiveLeftTab("files")}
                type="button"
              >
                <i className="bi bi-file-earmark me-2"></i>
                檔案類型
              </button>
            </li>
          </ul>

          {/* 左側標籤頁內容 */}
          <div className="tab-content">
            {/* 系統設定標籤 */}
            {activeLeftTab === "system" && (
              <div className="card">
                <div className="card-header bg-success text-white">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-gear me-2"></i>
                    系統設定
                  </h5>
                </div>
                <div className="card-body">
                  {/* Session存活時間 */}
                  <div className="mb-4">
                    <label className="form-label">Session存活時間</label>
                    <select
                      className="form-select"
                      value={parameters.session_ttl_minutes}
                      onChange={(e) =>
                        onParameterChange(
                          "session_ttl_minutes",
                          parseInt(e.target.value)
                        )
                      }
                    >
                      <option value={5}>5分鐘</option>
                      <option value={10}>10分鐘</option>
                      <option value={20}>20分鐘</option>
                      <option value={30}>30分鐘</option>
                    </select>
                    <div className="form-text">
                      會話閒置超過此時間將自動過期
                    </div>
                  </div>

                  {/* 檔案大小限制 */}
                  <div className="mb-4">
                    <label className="form-label">
                      檔案大小限制<small> (上傳檔案)</small>:{" "}
                      {parameters.max_file_size_mb} MB
                    </label>
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

                  {/* 網站爬蟲最大Token */}
                  <div className="mb-4">
                    <label className="form-label">
                      網站爬蟲最大 Token<small> (爬取內容)</small>:{" "}
                      {parameters.crawler_max_tokens.toLocaleString()}
                    </label>
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
                    <label className="form-label">
                      網站爬蟲最大頁面數<small> (爬取範圍)</small>:{" "}
                      {parameters.crawler_max_pages}
                    </label>
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
                </div>
              </div>
            )}

            {/* 檔案類型標籤 */}
            {activeLeftTab === "files" && (
              <div className="card">
                <div className="card-header bg-warning text-dark">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-file-earmark me-2"></i>
                    支援檔案類型
                  </h5>
                </div>
                <div className="card-body">
                  <p className="text-muted mb-3">選擇系統支援的檔案格式類型</p>

                  <div className="row">
                    {["pdf", "txt", "docx", "md", "csv", "xlsx"].map(
                      (fileType) => (
                        <div key={fileType} className="col-6 mb-3">
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
                              <strong>{fileType.toUpperCase()}</strong>
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
                  <div className="mt-4 p-3 bg-light rounded">
                    <h6>
                      <i className="bi bi-check-circle me-2"></i>
                      已選檔案類型 ({parameters.supported_file_types.length}個)
                    </h6>
                    <div className="d-flex flex-wrap gap-2">
                      {parameters.supported_file_types.map((type) => (
                        <span key={type} className="badge bg-primary">
                          {type.toUpperCase()}
                        </span>
                      ))}
                    </div>
                    {parameters.supported_file_types.length === 0 && (
                      <small className="text-danger">
                        ⚠️ 請至少選擇一種檔案類型
                      </small>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右側區域 - 上傳資料 (60%) */}
        <div className="col-12 col-lg-7">
          <div className="card h-100">
            <div className="card-header bg-info text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-cloud-upload me-2"></i>
                上傳資料
              </h5>
            </div>
            <div className="card-body">
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
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 配置摘要 */}
      <div className="mt-4 p-3 bg-light rounded">
        <h6 className="mb-3">
          <i className="bi bi-info-circle me-2"></i>
          當前上傳配置摘要
        </h6>
        <div className="row">
          <div className="col-6 col-md-3">
            <small>
              <strong>Session時長:</strong> {parameters.session_ttl_minutes}分鐘
            </small>
          </div>
          <div className="col-6 col-md-3">
            <small>
              <strong>檔案大小:</strong> 最大{parameters.max_file_size_mb}MB
            </small>
          </div>
          <div className="col-6 col-md-3">
            <small>
              <strong>爬蟲Token:</strong>{" "}
              {(parameters.crawler_max_tokens / 1000).toFixed(0)}K
            </small>
          </div>
          <div className="col-6 col-md-3">
            <small>
              <strong>爬蟲頁數:</strong> {parameters.crawler_max_pages}頁
            </small>
          </div>
          <div className="col-12 mt-2">
            <small>
              <strong>支援格式:</strong>{" "}
              {parameters.supported_file_types.join(", ").toUpperCase()}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUploadStep;
