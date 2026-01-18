/**
 * Session entity types
 * Matches backend/src/models/session.py
 */

export enum SessionState {
  INITIALIZING = 'INITIALIZING',
  READY_FOR_UPLOAD = 'READY_FOR_UPLOAD',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
  READY_FOR_CHAT = 'READY_FOR_CHAT',
  CHATTING = 'CHATTING',
}

export interface Session {
  session_id: string;
  created_at: string; // ISO 8601 datetime
  last_activity: string; // ISO 8601 datetime
  expires_at: string; // ISO 8601 datetime
  state: SessionState;
  qdrant_collection_name: string;
  document_count: number;
  vector_count: number;
  language: 'en' | 'zh-TW' | 'zh-CN' | 'fr';
  similarity_threshold: number; // RAG similarity threshold (0.0-1.0)
}

export interface SessionResponse {
  session_id: string;
  state: SessionState;
  created_at: string;
  last_activity: string; // ISO 8601 datetime
  expires_at: string;
  qdrant_collection: string;
  language: 'en' | 'zh-TW' | 'zh-CN' | 'fr';
  similarity_threshold: number; // RAG similarity threshold (0.0-1.0)
  custom_prompt?: string; // Optional custom prompt template
  document_count?: number;
  vector_count?: number;
  metrics?: {
    token_input: number;
    token_output: number;
    token_total: number;
    token_limit: number;
    token_percent: number;
    context_tokens: number;
    context_percent: number;
    vector_count: number;
  };
}

export interface SessionWithMetrics extends SessionResponse {
  metrics: {
    token_input: number;
    token_output: number;
    token_total: number;
    token_limit: number;
    token_percent: number;
    context_tokens: number;
    context_percent: number;
    vector_count: number;
  };
}

export interface LanguageUpdateRequest {
  language: 'en' | 'zh-TW' | 'zh-CN' | 'fr';
}
