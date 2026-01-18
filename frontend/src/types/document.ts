/**
 * Document and DocumentChunk entity types
 * Matches backend/src/models/document.py
 */

export enum SourceType {
  PDF = 'PDF',
  TEXT = 'TEXT',
  URL = 'URL',
}

export enum ExtractionStatus {
  PENDING = 'PENDING',
  EXTRACTING = 'EXTRACTING',
  EXTRACTED = 'EXTRACTED',
  SUMMARIZING = 'SUMMARIZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ModerationStatus {
  PENDING = 'PENDING',
  CHECKING = 'CHECKING',
  APPROVED = 'APPROVED',
  BLOCKED = 'BLOCKED',
}

export interface Document {
  document_id: string;
  session_id: string;
  source_type: SourceType;
  source_reference: string; // Filename or URL
  raw_content?: string | null;
  upload_timestamp: string; // ISO 8601 datetime
  extraction_status: ExtractionStatus;
  moderation_status: ModerationStatus;
  moderation_categories: string[];
  chunk_count: number;
  error_code?: string | null;
  error_message?: string | null;
  // T089+ Token tracking fields
  tokens_used?: number;
  pages_crawled?: number;
}

export interface DocumentChunk {
  chunk_id: string;
  document_id: string;
  session_id: string;
  chunk_index: number;
  text_content: string;
  char_start: number;
  char_end: number;
  embedding_vector: number[];
  embedding_timestamp: string; // ISO 8601 datetime
  metadata: Record<string, unknown>;
}

export interface DocumentStatusResponse {
  document_id: string;
  source_type: SourceType;
  extraction_status: ExtractionStatus;
  moderation_status: ModerationStatus;
  processing_progress: number; // 0-100
  chunk_count: number;
  summary?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface DocumentListResponse {
  session_id: string;
  documents: {
    document_id: string;
    source_type: SourceType;
    moderation_status: ModerationStatus;
    chunk_count: number;
  }[];
  total_documents: number;
  total_chunks: number;
}
