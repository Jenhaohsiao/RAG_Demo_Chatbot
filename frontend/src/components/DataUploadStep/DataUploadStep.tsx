/**
 * Step 3: Data Upload Component
 * è³‡è?ä¸Šå‚³æ­¥é? - ?´å??ƒæ•¸è¨­å??Œæ?æ¡ˆä???
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
  // ?°å?ï¼šè??†çˆ¬?²æ??Ÿç??èª¿
  onCrawlerSuccess?: (result: any) => void;
  documents?: any[]; // å·²ä??³æ?ä»¶å?è¡?
  crawledUrls?: any[]; // å·²çˆ¬?–URL?—è¡¨
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

  // æª¢æŸ¥?¯å¦?‰ä??³å…§å®¹ï?å¿…é??‰æ?ä»¶ä??€?‰æ?ä»¶éƒ½å·²å??è??†ï?
  const hasAnyContent =
    (documents && documents.length > 0) ||
    (crawledUrls && crawledUrls.length > 0);

  // æª¢æŸ¥?€?‰æ?ä»¶æ˜¯?¦éƒ½å·²å??è??†ï?chunks > 0 è¡¨ç¤º?•ç?å®Œæ?ï¼?
  const allFilesProcessed = documents.every(
    (doc) => doc.chunks && doc.chunks > 0
  );
  const allCrawlsProcessed = crawledUrls.every(
    (url) => url.chunks && url.chunks > 0
  );

  // ?ªæ??¨æ??§å®¹ä¸”å…¨?¨è??†å??æ??é¡¯ç¤ºã€Œä??³å??ã€?
  const hasUploadedContent =
    hasAnyContent && allFilesProcessed && allCrawlsProcessed;

  //   documents: documents?.length || 0,
  //   crawledUrls: crawledUrls?.length || 0,
  //   allFilesProcessed,
  //   allCrawlsProcessed,
  // });

  return (
    <div className="data-upload-step">
      {/* ?´æ¥é¡¯ç¤º UploadScreenï¼Œå??¸è¨­å®šå·²?´å??°å? tab */}
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
          // ?³é??ƒæ•¸è¨­å??¸é? props
          parameters={parameters}
          onParameterChange={onParameterChange}
        />
      )}
    </div>
  );
};

export default DataUploadStep;
