/**
 * Upload Service
 * 文件上傳 API 呼叫封裝
 * 
 * Constitutional Compliance:
 * - Principle II (Testability): 獨立服務模組
 * - Principle VIII (API Contract Stability): 遵循 contracts/upload.openapi.yaml
 */

import api from './api';
import { SourceType, ExtractionStatus, ModerationStatus } from '../types/document';

/**
 * 上傳回應（202 Accepted）
 */
export interface UploadResponse {
  document_id: string;
  session_id: string;
  source_type: SourceType;
  source_reference: string;
  upload_timestamp: string;
  extraction_status: ExtractionStatus;
  moderation_status: ModerationStatus;
}

/**
 * 上傳狀態查詢回應
 */
export interface UploadStatusResponse {
  document_id: string;
  source_type: SourceType;
  source_reference: string;
  extraction_status: ExtractionStatus;
  moderation_status: ModerationStatus;
  chunk_count: number;
  processing_progress: number; // 0-100
  summary?: string;
  error_code?: string;
  error_message?: string;
  moderation_categories: string[];
}

/**
 * URL 上傳請求
 */
export interface UrlUploadRequest {
  url: string;
}

/**
 * 爬蟲抓取的單個頁面
 */
export interface CrawledPage {
  url: string;
  title: string;
  tokens: number;
  content: string;  // 頁面內容預覽（前 200 字）
}

/**
 * 網站爬蟲上傳請求
 */
export interface WebsiteUploadRequest {
  url: string;
  max_tokens?: number;  // 默認 100K
  max_pages?: number;   // 默認 100
}

/**
 * 網站爬蟲上傳回應
 */
export interface WebsiteUploadResponse extends UploadResponse {
  pages_found: number;
  total_tokens: number;
  crawl_status: string;  // pending, crawling, completed, token_limit_reached, page_limit_reached
  crawled_pages: CrawledPage[];
}

/**
 * 上傳檔案
 * 
 * @param sessionId - Session ID
 * @param file - 檔案物件（PDF 或 TXT）
 * @returns 上傳回應
 * @throws Error 當上傳失敗時
 */
export const uploadFile = async (
  sessionId: string,
  file: File
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<UploadResponse>(
    `/upload/${sessionId}/file`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

/**
 * 上傳 URL
 * 
 * @param sessionId - Session ID
 * @param url - URL 地址
 * @returns 上傳回應
 * @throws Error 當上傳失敗時
 */
export const uploadUrl = async (
  sessionId: string,
  url: string
): Promise<UploadResponse> => {
  const response = await api.post<UploadResponse>(
    `/upload/${sessionId}/url`,
    { url }
  );

  return response.data;
};

/**
 * 爬蟲網站內容
 * 
 * @param sessionId - Session ID
 * @param url - 網站 URL
 * @param maxTokens - 最大 Token 數（默認 100K）
 * @param maxPages - 最大頁面數（默認 100）
 * @returns 爬蟲上傳回應（包含 URL 列表）
 * @throws Error 當爬蟲失敗時
 */
export const uploadWebsite = async (
  sessionId: string,
  url: string,
  maxTokens: number = 100000,
  maxPages: number = 100
): Promise<WebsiteUploadResponse> => {
  const response = await api.post<WebsiteUploadResponse>(
    `/upload/${sessionId}/website`,
    {
      url,
      max_tokens: maxTokens,
      max_pages: maxPages,
    }
  );

  return response.data;
};

/**
 * 查詢上傳狀態
 * 
 * @param sessionId - Session ID
 * @param documentId - Document ID
 * @returns 狀態回應
 * @throws Error 當查詢失敗時
 */
export const getUploadStatus = async (
  sessionId: string,
  documentId: string
): Promise<UploadStatusResponse> => {
  const response = await api.get<UploadStatusResponse>(
    `/upload/${sessionId}/status/${documentId}`
  );

  // 調試日誌：檢查摘要是否在響應中（一定會顯示）
  console.warn('[getUploadStatus] Response Summary Check:', {
    hasSummary: !!response.data.summary,
    summaryLength: response.data.summary?.length,
    summary: response.data.summary?.substring(0, 100),
    processing_progress: response.data.processing_progress
  });

  return response.data;
};

/**
 * 列出 session 中的所有文件
 * 
 * @param sessionId - Session ID
 * @returns 文件清單
 * @throws Error 當查詢失敗時
 */
export const listDocuments = async (
  sessionId: string
): Promise<UploadStatusResponse[]> => {
  const response = await api.get<UploadStatusResponse[]>(
    `/upload/${sessionId}/documents`
  );

  return response.data;
};

/**
 * 輪詢上傳狀態直到完成或失敗
 * 
 * @param sessionId - Session ID
 * @param documentId - Document ID
 * @param onProgress - 進度回調函式
 * @param interval - 輪詢間隔（毫秒），預設 2000ms
 * @param maxAttempts - 最大輪詢次數，預設 150（5 分鐘）
 * @returns 最終狀態
 * @throws Error 當達到最大輪詢次數或處理失敗時
 */
export const pollUploadStatus = async (
  sessionId: string,
  documentId: string,
  onProgress?: (status: UploadStatusResponse) => void,
  interval: number = 2000,
  maxAttempts: number = 150
): Promise<UploadStatusResponse> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await getUploadStatus(sessionId, documentId);

    // 呼叫進度回調
    if (onProgress) {
      onProgress(status);
    }

    // 檢查是否完成
    if (status.processing_progress === 100) {
      console.warn('[pollUploadStatus] COMPLETED - Returning:', {
        hasSummary: !!status.summary,
        summaryLength: status.summary?.length,
        summary: status.summary?.substring(0, 50)
      });
      return status;
    }

    // 檢查是否失敗
    if (status.extraction_status === ExtractionStatus.FAILED) {
      throw new Error(
        status.error_message || 'Document processing failed'
      );
    }

    // 檢查是否被審核阻擋
    if (status.moderation_status === ModerationStatus.BLOCKED) {
      throw new Error(
        `Content blocked: ${status.error_message || 'Moderation failed'}`
      );
    }

    // 等待下次輪詢
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }

  throw new Error('Upload status polling timeout');
};

/**
 * 驗證檔案類型
 * 
 * @param file - 檔案物件
 * @returns true 如果檔案類型有效
 */
export const validateFileType = (file: File): boolean => {
  const allowedExtensions = ['.pdf', '.txt'];
  const fileName = file.name.toLowerCase();
  return allowedExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * 驗證檔案大小
 * 
 * @param file - 檔案物件
 * @param maxSizeBytes - 最大檔案大小（位元組），預設 10MB
 * @returns true 如果檔案大小有效
 */
export const validateFileSize = (
  file: File,
  maxSizeBytes: number = 10 * 1024 * 1024
): boolean => {
  return file.size <= maxSizeBytes && file.size > 0;
};

/**
 * 驗證 URL 格式
 * 
 * @param url - URL 字串
 * @returns true 如果 URL 格式有效
 */
export const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * 格式化檔案大小
 * 
 * @param bytes - 位元組數
 * @returns 格式化的字串（例如："5.2 MB"）
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default {
  uploadFile,
  uploadUrl,
  uploadWebsite,
  getUploadStatus,
  listDocuments,
  pollUploadStatus,
  validateFileType,
  validateFileSize,
  validateUrl,
  formatFileSize,
};
