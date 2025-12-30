/**
 * Content Moderation Service
 * 內容審核服務 - 調用後端Gemini Safety API檢測不當內容
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ContentModerationRequest {
  content: string;
  source_reference?: string;
  academic_mode?: boolean; // 新增學術模式參數
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
 * 檢查內容是否包含不當材料
 */
export const moderateContent = async (
  sessionId: string,
  request: ContentModerationRequest
): Promise<ContentModerationResponse> => {
  try {
    console.log(`[ModerationService] Checking content safety for ${request.source_reference}${request.academic_mode ? ' (Academic Mode)' : ''}`);
    
    const response = await axios.post<ContentModerationResponse>(
      `${API_BASE_URL}/api/v1/upload/${sessionId}/moderate`,
      {
        content: request.content,
        source_reference: request.source_reference || 'user_input',
        academic_mode: request.academic_mode || false
      }
    );

    console.log(`[ModerationService] Moderation result:`, response.data);
    return response.data;
    
  } catch (error: any) {
    console.error(`[ModerationService] Moderation failed:`, error);
    
    const moderationError: ModerationError = new Error(
      error.response?.data?.detail || error.message || 'Content moderation failed'
    );
    moderationError.status = error.response?.status;
    moderationError.detail = error.response?.data?.detail;
    
    throw moderationError;
  }
};

/**
 * 檢查多個內容項目
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
      console.error(`Failed to moderate ${item.source_reference}:`, error);
      // 如果單個項目失敗，標記為已阻擋
      results.push({
        status: 'BLOCKED',
        is_approved: false,
        blocked_categories: ['MODERATION_ERROR'],
        reason: `審核過程失敗: ${error}`,
        source_reference: item.source_reference
      });
    }
  }
  
  return results;
};