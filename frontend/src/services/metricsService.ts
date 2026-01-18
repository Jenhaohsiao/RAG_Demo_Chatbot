/**
 * Metrics Service
 * Get and manage Session operational metrics (Token usage, query stats, warning status)
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
 * Get Session Metrics
 * @param sessionId - Session ID
 * @returns Object containing all operational metrics
 */
export const getSessionMetrics = async (sessionId: string): Promise<SessionMetrics> => {
  try {
    const response = await axios.get<SessionMetrics>(
      `${API_BASE_URL}/chat/${sessionId}/metrics`
    );
    return response.data;
  } catch (error) {
    // Return default values instead of throwing error
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
 * Format Token count (display as K or M)
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
 * Calculate Token usage percentage
 */
export const getTokenPercentage = (current: number, threshold: number): number => {
  if (threshold === 0) return 0;
  return Math.min((current / threshold) * 100, 100);
};

/**
 * Format unanswered ratio as percentage
 */
export const formatUnansweredRatio = (ratio: number): string => {
  return `${(ratio * 100).toFixed(1)}%`;
};
