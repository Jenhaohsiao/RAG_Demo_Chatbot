/**
 * Chat API Service
 * Handles RAG queries and chat history
 */

import api from './api';
import type { ChatResponse, ChatHistoryResponse } from '../types/chat';

/**
 * Submit query
 * 支援用戶自帶 API Key（當系統配額用完時）
 */
export async function submitQuery(
  sessionId: string,
  userQuery: string,
  language?: string,
  userApiKey?: string // 可選的用戶 API Key
): Promise<ChatResponse> {
  const lang = language || 'en';
  
  // 構建 headers
  const headers: Record<string, string> = {};
  if (userApiKey) {
    headers['X-User-API-Key'] = userApiKey;
  }
  
  const response = await api.post<ChatResponse>(
    `/chat/${sessionId}/query`,
    { 
      user_query: userQuery,
      language: lang
    },
    { headers }
  );
  return response.data;
}

/**
 * Get chat history
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
 * Clear chat history
 */
export async function clearHistory(sessionId: string): Promise<void> {
  await api.delete(`/chat/${sessionId}/history`);
}

/**
 * Get suggested questions
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
 * Validate query input
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
