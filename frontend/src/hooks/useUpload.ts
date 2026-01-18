/**
 * useUpload Hook
 * Upload workflow integration and state management
 * 
 * Constitutional Compliance:
 * - Principle II (Testability): Independent Hook logic
 * - User Story US2: Document Upload complete workflow
 */

import { useState, useCallback } from 'react';
import {
  uploadFile,
  uploadUrl,
  uploadWebsite,
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
 * Upload workflow management Hook
 * 
 * @param sessionId - Session ID
 * @param onComplete - Completion callback
 * @param onError - Error callback
 * @returns Upload state and action functions
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
   * Reset state
   */
  const reset = useCallback(() => {
    setUploadState(UploadState.IDLE);
    setUploadResponse(null);
    setStatusResponse(null);
    setError(null);
  }, []);

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setUploadState(UploadState.UPLOADING);
        setError(null);

        // Upload file
        const response = await uploadFile(sessionId, file);
        setUploadResponse(response);

        // Start polling status
        setUploadState(UploadState.PROCESSING);

        const finalStatus = await pollUploadStatus(
          sessionId,
          response.document_id,
          (status) => {
            // Update progress
            setStatusResponse(status);
          }
        );

        // Completed
        setUploadState(UploadState.COMPLETED);
        setStatusResponse(finalStatus);
        onComplete?.(finalStatus);
      } catch (err) {
        setUploadState(UploadState.FAILED);
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    },
    [sessionId, onComplete, onError]
  );

  /**
   * Handle URL upload
   */
  const handleUrlUpload = useCallback(
    async (url: string) => {
      try {
        setUploadState(UploadState.UPLOADING);
        setError(null);

        // Upload URL
        const response = await uploadUrl(sessionId, url);
        setUploadResponse(response);

        // Start polling status
        setUploadState(UploadState.PROCESSING);

        const finalStatus = await pollUploadStatus(
          sessionId,
          response.document_id,
          (status) => {
            // Update progress
            setStatusResponse(status);
          }
        );

        // Completed
        setUploadState(UploadState.COMPLETED);
        setStatusResponse(finalStatus);
        onComplete?.(finalStatus);
      } catch (err) {
        setUploadState(UploadState.FAILED);
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    },
    [sessionId, onComplete, onError]
  );

  return {
    uploadState,
    uploadResponse,
    statusResponse,
    error,
    handleFileUpload,
    handleUrlUpload,
    reset,
    isUploading: uploadState === UploadState.UPLOADING,
    isProcessing: uploadState === UploadState.PROCESSING,
    isCompleted: uploadState === UploadState.COMPLETED,
    isFailed: uploadState === UploadState.FAILED,
  };
};
