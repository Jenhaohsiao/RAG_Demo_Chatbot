/**
 * useUpload Hook
 * 上傳流程整合與狀態管理
 * 
 * Constitutional Compliance:
 * - Principle II (Testability): 獨立 Hook 邏輯
 * - User Story US2: Document Upload 完整流程
 */

import { useState, useCallback } from 'react';
import {
  uploadFile,
  uploadUrl,
  pollUploadStatus,
  UploadResponse,
  UploadStatusResponse,
} from '../services/uploadService';

export enum UploadState {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface UseUploadReturn {
  // State
  uploadState: UploadState;
  uploadResponse: UploadResponse | null;
  statusResponse: UploadStatusResponse | null;
  error: string | null;

  // Actions
  handleFileUpload: (file: File) => Promise<void>;
  handleUrlUpload: (url: string) => Promise<void>;
  reset: () => void;

  // Helpers
  isUploading: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

/**
 * 上傳流程管理 Hook
 * 
 * @param sessionId - Session ID
 * @param onComplete - 完成回調函式
 * @param onError - 錯誤回調函式
 * @returns 上傳狀態與操作函式
 */
export const useUpload = (
  sessionId: string,
  onComplete?: (status: UploadStatusResponse) => void,
  onError?: (error: string) => void
): UseUploadReturn => {
  const [uploadState, setUploadState] = useState<UploadState>(UploadState.IDLE);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [statusResponse, setStatusResponse] = useState<UploadStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 重置狀態
   */
  const reset = useCallback(() => {
    setUploadState(UploadState.IDLE);
    setUploadResponse(null);
    setStatusResponse(null);
    setError(null);
  }, []);

  /**
   * 處理檔案上傳
   */
  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setUploadState(UploadState.UPLOADING);
        setError(null);

        // 上傳檔案
        const response = await uploadFile(sessionId, file);
        setUploadResponse(response);

        // 開始輪詢狀態
        setUploadState(UploadState.PROCESSING);

        const finalStatus = await pollUploadStatus(
          sessionId,
          response.document_id,
          (status) => {
            // 更新進度
            setStatusResponse(status);
          }
        );

        // 完成
        setStatusResponse(finalStatus);
        setUploadState(UploadState.COMPLETED);

        if (onComplete) {
          onComplete(finalStatus);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        setUploadState(UploadState.FAILED);

        if (onError) {
          onError(errorMessage);
        }
      }
    },
    [sessionId, onComplete, onError]
  );

  /**
   * 處理 URL 上傳
   */
  const handleUrlUpload = useCallback(
    async (url: string) => {
      try {
        setUploadState(UploadState.UPLOADING);
        setError(null);

        // 上傳 URL
        const response = await uploadUrl(sessionId, url);
        setUploadResponse(response);

        // 開始輪詢狀態
        setUploadState(UploadState.PROCESSING);

        const finalStatus = await pollUploadStatus(
          sessionId,
          response.document_id,
          (status) => {
            // 更新進度
            setStatusResponse(status);
          }
        );

        // 完成
        setStatusResponse(finalStatus);
        setUploadState(UploadState.COMPLETED);

        if (onComplete) {
          onComplete(finalStatus);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        setUploadState(UploadState.FAILED);

        if (onError) {
          onError(errorMessage);
        }
      }
    },
    [sessionId, onComplete, onError]
  );

  /**
   * 輔助計算屬性
   */
  const isUploading = uploadState === UploadState.UPLOADING;
  const isProcessing = uploadState === UploadState.PROCESSING;
  const isCompleted = uploadState === UploadState.COMPLETED;
  const isFailed = uploadState === UploadState.FAILED;

  return {
    uploadState,
    uploadResponse,
    statusResponse,
    error,
    handleFileUpload,
    handleUrlUpload,
    reset,
    isUploading,
    isProcessing,
    isCompleted,
    isFailed,
  };
};

export default useUpload;
