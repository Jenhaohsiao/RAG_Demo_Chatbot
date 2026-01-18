/**
 * Content Moderation Service
 * Content Moderation Service - Calls backend Gemini Safety API to detect inappropriate content
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ContentModerationRequest {
  content: string;
  source_reference?: string;
  academic_mode?: boolean; // Added academic mode parameter
}

export interface ContentModerationResponse {
  status: 'APPROVED' | 'BLOCKED';
  is_approved: boolean;
  blocked_categories: string[];
  reason?: string;
}

export interface ModerationError extends Error {
  status?: number;
  detail?: string;
}

/**
 * Check if content contains inappropriate material
 */
export const moderateContent = async (
  sessionId: string,
  request: ContentModerationRequest
): Promise<ContentModerationResponse> => {
  try {
    const response = await axios.post<ContentModerationResponse>(
      `${API_BASE_URL}/api/v1/upload/${sessionId}/moderate`,
      {
        content: request.content,
        source_reference: request.source_reference || 'user_input',
        academic_mode: request.academic_mode || false
      }
    );
    return response.data;
    
  } catch (error: any) {
    const moderationError: ModerationError = new Error(
      error.response?.data?.detail || error.message || 'Content moderation failed'
    );
    moderationError.status = error.response?.status;
    moderationError.detail = error.response?.data?.detail;
    
    throw moderationError;
  }
};

/**
 * Check multiple content items
 */
export const moderateMultipleContent = async (
  sessionId: string,
  contents: Array<{ content: string; source_reference: string }>,
  academicMode: boolean = false
): Promise<Array<ContentModerationResponse & { source_reference: string }>> => {
  const results: Array<ContentModerationResponse & { source_reference: string }> = [];
  
  for (const item of contents) {
    try {
      const result = await moderateContent(sessionId, {
        ...item,
        academic_mode: academicMode
      });
      results.push({
        ...result,
        source_reference: item.source_reference
      });
    } catch (error) {
      // If a single item fails, mark as blocked
      results.push({
        status: 'BLOCKED',
        is_approved: false,
        blocked_categories: ['MODERATION_ERROR'],
        reason: `Moderation process failed: ${error}`,
        source_reference: item.source_reference
      });
    }
  }
  
  return results;
};