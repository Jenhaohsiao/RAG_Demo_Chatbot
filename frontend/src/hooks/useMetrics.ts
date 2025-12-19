/**
 * useMetrics Hook
 * Manages metrics state from session GET and chat responses
 * 
 * T078: useMetrics Custom Hook Implementation
 */
import { useState, useCallback, useEffect } from 'react';
import sessionService from '../services/sessionService';
import chatService from '../services/chatService';

export interface Metrics {
  token_input: number;
  token_output: number;
  token_total: number;
  token_limit: number;
  token_percent: number;
  context_tokens: number;
  context_percent: number;
  vector_count: number;
}

interface UseMetricsReturn {
  metrics: Metrics | null;
  updateMetrics: (newMetrics: Partial<Metrics>) => void;
  fetchMetricsFromSession: (sessionId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Default metrics state when no data is available
 */
const DEFAULT_METRICS: Metrics = {
  token_input: 0,
  token_output: 0,
  token_total: 0,
  token_limit: 32000,
  token_percent: 0,
  context_tokens: 0,
  context_percent: 0,
  vector_count: 0,
};

export const useMetrics = (): UseMetricsReturn => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update metrics with new values (partial update)
   */
  const updateMetrics = useCallback((newMetrics: Partial<Metrics>) => {
    setMetrics((prevMetrics) => ({
      ...(prevMetrics || DEFAULT_METRICS),
      ...newMetrics,
    }));
  }, []);

  /**
   * Fetch metrics from session GET endpoint
   */
  const fetchMetricsFromSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const sessionData = await sessionService.getSession(sessionId);
      
      if (sessionData.metrics) {
        setMetrics({
          token_input: sessionData.metrics.token_input || 0,
          token_output: sessionData.metrics.token_output || 0,
          token_total: sessionData.metrics.token_total || 0,
          token_limit: sessionData.metrics.token_limit || 32000,
          token_percent: sessionData.metrics.token_percent || 0,
          context_tokens: sessionData.metrics.context_tokens || 0,
          context_percent: sessionData.metrics.context_percent || 0,
          vector_count: sessionData.metrics.vector_count || 0,
        });
      } else {
        setMetrics(DEFAULT_METRICS);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
      setError(errorMessage);
      console.error('Error fetching metrics:', err);
      setMetrics(DEFAULT_METRICS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update metrics from chat response
   */
  const updateMetricsFromChatResponse = useCallback((responseMetrics: any) => {
    if (responseMetrics) {
      updateMetrics({
        token_input: responseMetrics.token_input || 0,
        token_output: responseMetrics.token_output || 0,
        token_total: responseMetrics.token_total || 0,
        token_limit: responseMetrics.token_limit || 32000,
        token_percent: responseMetrics.token_percent || 0,
        context_tokens: responseMetrics.context_tokens || 0,
        context_percent: responseMetrics.context_percent || 0,
        vector_count: responseMetrics.vector_count || 0,
      });
    }
  }, [updateMetrics]);

  // Initialize metrics on first load
  useEffect(() => {
    setMetrics(DEFAULT_METRICS);
  }, []);

  return {
    metrics,
    updateMetrics,
    fetchMetricsFromSession,
    isLoading,
    error,
  };
};

export default useMetrics;
