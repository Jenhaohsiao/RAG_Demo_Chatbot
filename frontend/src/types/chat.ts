/**
 * ChatMessage entity types
 * Matches backend/src/models/chat.py and backend/src/api/routes/chat.py
 */

export enum ResponseType {
  ANSWERED = 'ANSWERED',
  CANNOT_ANSWER = 'CANNOT_ANSWER',
}

export enum ChatRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
}

export interface RetrievedChunk {
  chunk_id: string;
  text: string; // Matches backend RetrievedChunkResponse
  similarity_score: number; // 0.7 - 1.0
  document_id: string;
  source_reference: string;
  chunk_index: number;
}

// Chat message for history API (role-based, matches backend ChatMessage)
export interface ChatMessage {
  message_id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  timestamp: string; // ISO 8601 datetime
}

export interface QueryRequest {
  user_query: string; // Matches backend QueryRequest
}

// Chat response from POST /chat/{session_id}/query
export interface ChatResponse {
  message_id: string;
  session_id: string;
  llm_response: string;
  response_type: ResponseType;
  retrieved_chunks: RetrievedChunk[];
  similarity_scores: number[];
  token_input: number;
  token_output: number;
  token_total: number;
  timestamp: string;
  suggestions?: string[]; // Suggested questions (from LLM if requested)
}

// Chat history from GET /chat/{session_id}/history
export interface ChatHistoryResponse {
  messages: ChatMessage[];
  total_count: number;
}
