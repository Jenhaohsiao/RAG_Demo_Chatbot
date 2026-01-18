/**
 * Step 3: Data Upload Component
 * Data Upload Step - Parameter settings and file management
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
  // Note: Crawler success callback
  onCrawlerSuccess?: (result: any) => void;
  documents?: any[]; // Uploaded document list
  crawledUrls?: any[]; // Crawled URL list
}

const DataUploadStep: React.FC<DataUploadStepProps> = ({
  parameters,
  onParameterChange,
  sessionId,
  onFileUpload,
  onUrlUpload,
  onCrawlerUpload,
  onCrawlerSuccess,
  documents = [],
  crawledUrls = [],
}) => {
  const { t } = useTranslation();

  // Check if there is any content (must have at least one file or crawled website)
  const hasAnyContent =
    (documents && documents.length > 0) ||
    (crawledUrls && crawledUrls.length > 0);

  // Check if all files are processed (chunks > 0 indicates processing complete)
  const allFilesProcessed = documents.every(
    (doc) => doc.chunks && doc.chunks > 0
  );
  const allCrawlsProcessed = crawledUrls.every(
    (url) => url.chunks && url.chunks > 0
  );

  // If there is content and all are processed, show "Ready"
  const hasUploadedContent =
    hasAnyContent && allFilesProcessed && allCrawlsProcessed;

  return (
    <div className="data-upload-step">
      {/* Directly show UploadScreen, integrating settings tab */}
      {sessionId && (
        <UploadScreen
          sessionId={sessionId}
          onFileSelected={(file) => {
            onFileUpload?.(file);
          }}
          onUrlSubmitted={(url) => {
            onUrlUpload?.(url);
          }}
          onCrawlerSuccess={(result) => {
            onCrawlerSuccess?.(result);
          }}
          maxFileSizeMB={parameters.max_file_size_mb}
          supportedFileTypes={parameters.supported_file_types}
          crawlerMaxTokens={parameters.crawler_max_tokens}
          crawlerMaxPages={parameters.crawler_max_pages}
          hasUploadedContent={hasUploadedContent}
          uploadedFiles={documents}
          crawledUrls={crawledUrls}
          // Parameter settings props
          parameters={parameters}
          onParameterChange={onParameterChange}
        />
      )}
    </div>
  );
};

export default DataUploadStep;
