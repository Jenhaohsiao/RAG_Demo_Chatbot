/**
 * Metrics Service
 * 獲取和管理 Session 運作指標（Token 使用、查詢統計、警告狀態）
 */

import axios from 'axios';
import { API_BASE_URL } from './api';

export interface SessionMetrics {
  session_id: string;
  total_queries: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_tokens_per_query: number;
  avg_chunks_retrieved: number;
  unanswered_ratio: number;
  token_warning_threshold: number;
  is_token_warning: boolean;
  is_unanswered_warning: boolean;
}

/**
 * 取得 Session 指標
 * @param sessionId - Session ID
 * @returns 包含所有運作指標的對象
 */
export const getSessionMetrics = async (sessionId: string): Promise<SessionMetrics> => {
  try {
    const response = await axios.get<SessionMetrics>(
      `${API_BASE_URL}/chat/${sessionId}/metrics`
    );
    return response.data;
  } catch (error) {
    // 返回默認值而不是拋出錯誤
    return {
      session_id: sessionId,
      total_queries: 0,
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      avg_tokens_per_query: 0,
      avg_chunks_retrieved: 0,
      unanswered_ratio: 0,
      token_warning_threshold: 10000,
      is_token_warning: false,
      is_unanswered_warning: false,
    };
  }
};

/**
 * 格式化 Token 數量（顯示為 K 或 M）
 */
export const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};

/**
 * 計算 Token 使用百分比
 */
export const getTokenPercentage = (current: number, threshold: number): number => {
  if (threshold === 0) return 0;
  return Math.min((current / threshold) * 100, 100);
};

/**
 * 格式化無法回答的比率為百分比
 */
export const formatUnansweredRatio = (ratio: number): string => {
  return `${(ratio * 100).toFixed(1)}%`;
};
