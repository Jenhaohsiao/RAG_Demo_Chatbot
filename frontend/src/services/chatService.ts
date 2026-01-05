/**
 * Chat API Service
 * 處理 RAG 查詢與聊天歷史
 */

import api from './api';
import type { ChatResponse, ChatHistoryResponse } from '../types/chat';

/**
 * 提交查詢
 */
export async function submitQuery(
  sessionId: string,
  userQuery: string,
  language?: string
): Promise<ChatResponse> {
  const lang = language || 'en';
  console.log('[chatService] Submitting query with language:', lang);
  
  const response = await api.post<ChatResponse>(
    `/chat/${sessionId}/query`,
    { 
      user_query: userQuery,
      language: lang
    }
  );
  return response.data;
}

/**
 * 取得聊天歷史
 */
export async function getChatHistory(
  sessionId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ChatHistoryResponse> {
  const response = await api.get<ChatHistoryResponse>(
    `/chat/${sessionId}/history`,
    { params: { limit, offset } }
  );
  return response.data;
}

/**
 * 清除聊天歷史
 */
export async function clearHistory(sessionId: string): Promise<void> {
  await api.delete(`/chat/${sessionId}/history`);
}

/**
 * 取得建議問題
 */
export async function getSuggestions(
  sessionId: string,
  language?: string
): Promise<string[]> {
  const lang = language || 'en';
  const response = await api.get<string[]>(
    `/chat/${sessionId}/suggestions`,
    { params: { language: lang } }
  );
  return response.data;
}

/**
 * 驗證查詢輸入
 */
export function validateQuery(query: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = query.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  
  if (trimmed.length > 2000) {
    return { valid: false, error: 'Query exceeds maximum length (2000 characters)' };
  }
  
  return { valid: true };
}

