/**
 * Step 3: Data Upload Component
 * 資訊上傳步驟 - 整合參數設定和檔案上傳
 */

import React from "react";
import { useTranslation } from "react-i18next";
import UploadScreen from "../UploadScreen/UploadScreen";
import "./DataUploadStep.scss";

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
  documents?: any[]; // 已上傳文件列表
  crawledUrls?: any[]; // 已爬取URL列表
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

  // 檢查是否有上傳內容（必須有文件且所有文件都已完成處理）
  const hasAnyContent =
    (documents && documents.length > 0) ||
    (crawledUrls && crawledUrls.length > 0);

  // 檢查所有文件是否都已完成處理（chunks > 0 表示處理完成）
  const allFilesProcessed = documents.every(
    (doc) => doc.chunks && doc.chunks > 0
  );
  const allCrawlsProcessed = crawledUrls.every(
    (url) => url.chunks && url.chunks > 0
  );

  // 只有在有內容且全部處理完成時才顯示「上傳完成」
  const hasUploadedContent =
    hasAnyContent && allFilesProcessed && allCrawlsProcessed;

  console.log("[DataUploadStep] hasUploadedContent:", hasUploadedContent, {
    documents: documents?.length || 0,
    crawledUrls: crawledUrls?.length || 0,
    allFilesProcessed,
    allCrawlsProcessed,
  });

  return (
    <div className="data-upload-step">
      {/* 直接顯示 UploadScreen，參數設定已整合到各 tab */}
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
          // 傳遞參數設定相關 props
          parameters={parameters}
          onParameterChange={onParameterChange}
        />
      )}
    </div>
  );
};

export default DataUploadStep;
