/**
 * Metrics entity types
 * Matches backend/src/models/metrics.py
 */

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

export type MetricsColorCode = 'green' | 'yellow' | 'red';

export const getMetricsColor = (tokenPercent: number): MetricsColorCode => {
  if (tokenPercent < 50) return 'green';
  if (tokenPercent < 80) return 'yellow';
  return 'red';
};

export const isWarningLevel = (tokenPercent: number): boolean => {
  return tokenPercent > 80.0;
};
