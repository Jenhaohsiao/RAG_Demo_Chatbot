/**
 * Upload Service
 * File upload API call wrapper
 * 
 * Constitutional Compliance:
 * - Principle II (Testability): Independent service module
 * - Principle VIII (API Contract Stability): Follows contracts/upload.openapi.yaml
 */

import api from './api';
import { SourceType, ExtractionStatus, ModerationStatus } from '../types/document';

/**
 * Normalize URL - automatically add protocol prefix
 * 
 * @param url - User input URL
 * @returns Full URL with protocol
 */
export const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  
  // Return directly if protocol exists
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  
  // Automatically add https:// prefix
  return 'https://' + trimmed;
};

/**
 * Upload response (202 Accepted)
 */
export interface UploadResponse {
  document_id: string;
  session_id: string;
  source_type: SourceType;
  source_reference: string;
  upload_timestamp: string;
  extraction_status: ExtractionStatus;
  moderation_status: ModerationStatus;
  chunk_count?: number;
  content_size?: number;
  preview?: string;
  error_code?: string;
  error_message?: string;
}

/**
 * Single crawled page
 */
export interface CrawledPage {
  url: string;
  title: string;
  tokens: number;
  content?: string;
}

/**
 * Upload status query response
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
  // T089+: Token tracking fields
  tokens_used?: number;
  pages_crawled?: number;
  // Crawler specific fields
  crawled_pages?: CrawledPage[];
  crawl_status?: string;
  avg_tokens_per_page?: number;
  crawl_duration_seconds?: number;
}

/**
 * URL upload request
 */
export interface UrlUploadRequest {
  url: string;
}

/**
 * Website crawler upload request
 */
export interface WebsiteUploadRequest {
  url: string;
  max_tokens?: number;  // Default 100K
  max_pages?: number;   // Default 100
}

/**
 * Website crawler upload response
 */
export interface WebsiteUploadResponse extends UploadResponse {
  pages_found: number;
  total_tokens: number;
  crawl_status: string;  // pending, crawling, completed, token_limit_reached, page_limit_reached
  crawled_pages: CrawledPage[];
  content_size?: number;
  summary?: string;
}

/**
 * Upload file
 * 
 * @param sessionId - Session ID
 * @param file - File object (PDF or TXT)
 * @returns Upload response
 * @throws Error when upload fails
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
 * Upload URL
 * 
 * @param sessionId - Session ID
 * @param url - URL address
 * @returns Upload response
 * @throws Error when upload fails
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
 * Crawl website content
 * 
 * @param sessionId - Session ID
 * @param url - Website URL
 * @param maxTokens - Max token count (default 100K)
 * @param maxPages - Max page count (default 100)
 * @returns Crawler upload response (including URL list)
 * @throws Error when crawl fails
 */
export const uploadWebsite = async (
  sessionId: string,
  url: string,
  maxTokens: number = 100000,
  maxPages: number = 100
): Promise<WebsiteUploadResponse> => {
  // Normalize URL - automatically add protocol prefix
  const normalizedUrl = normalizeUrl(url);
  
  const response = await api.post<WebsiteUploadResponse>(
    `/upload/${sessionId}/website`,
    {
      url: normalizedUrl,
      max_tokens: maxTokens,
      max_pages: maxPages,
    }
  );

  return response.data;
};

/**
 * Query upload status
 * 
 * @param sessionId - Session ID
 * @param documentId - Document ID
 * @returns Status response
 * @throws Error when query fails
 */
export const getUploadStatus = async (
  sessionId: string,
  documentId: string
): Promise<UploadStatusResponse> => {
  const response = await api.get<UploadStatusResponse>(
    `/upload/${sessionId}/status/${documentId}`
  );

  // Debug log: Check if summary is in response (it should be)
  return response.data;
};

/**
 * List all documents in session
 * 
 * @param sessionId - Session ID
 * @returns Document list
 * @throws Error when query fails
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
 * Poll upload status until complete or failed
 * 
 * @param sessionId - Session ID
 * @param documentId - Document ID
 * @param onProgress - Progress callback function
 * @param interval - Polling interval (ms), default 2000ms
 * @param maxAttempts - Max polling attempts, default 150 (5 minutes)
 * @returns Final status
 * @throws Error when max attempts reached or processing failed
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

    // Call progress callback
    if (onProgress) {
      onProgress(status);
    }

    // Check if completed
    if (status.processing_progress === 100) {
      return status;
    }

    // Check if failed
    if (status.extraction_status === ExtractionStatus.FAILED) {
      throw new Error(
        status.error_message || 'Document processing failed'
      );
    }

    // Check if blocked by moderation
    if (status.moderation_status === ModerationStatus.BLOCKED) {
      throw new Error(
        `Content blocked: ${status.moderation_categories.join(', ')}`
      );
    }

    // Wait for next poll
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }

  throw new Error('Upload status polling timeout');
};

/**
 * Validate file type
 * 
 * @param file - File object
 * @returns true if file type is valid
 */
export const validateFileType = (file: File): boolean => {
  const allowedExtensions = ['.pdf', '.txt'];
  const fileName = file.name.toLowerCase();
  return allowedExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Validate file size
 * 
 * @param file - File object
 * @param maxSizeBytes - Max file size (bytes), default 10MB
 * @returns true if file size is valid
 */
export const validateFileSize = (
  file: File,
  maxSizeBytes: number = 10 * 1024 * 1024
): boolean => {
  return file.size <= maxSizeBytes && file.size > 0;
};

/**
 * Validate URL format
 * 
 * @param url - URL string
 * @returns true if URL format is valid
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
 * Format file size
 * 
 * @param bytes - Bytes
 * @returns Formatted string (e.g. "5.2 MB")
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
