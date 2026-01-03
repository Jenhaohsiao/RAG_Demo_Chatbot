# Data Model: Multilingual RAG Chatbot

**Feature**: 001-multilingual-rag-chatbot  
**Phase**: 1 (Design)  
**Date**: 2025-12-08  
**Status**: Complete

## Overview

This document defines all data entities, their attributes, relationships, validation rules, and state transitions for the Multilingual RAG Chatbot system. All entities are designed to be ephemeral (Session TTL: 30 minutes) with no persistent storage beyond active sessions.

---

## Entity 1: Session

**Purpose**: Represents a user's isolated chatbot instance with unique ID, TTL tracking, and associated Qdrant collection.

### Attributes

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `session_id` | `str` (UUID4) | Yes | Auto-generated | UUID format | Unique session identifier |
| `created_at` | `datetime` | Yes | `datetime.utcnow()` | ISO 8601 | Session creation timestamp |
| `last_activity` | `datetime` | Yes | `datetime.utcnow()` | ISO 8601 | Last user interaction timestamp |
| `expires_at` | `datetime` | Yes | `created_at + 30min` | ISO 8601 | Automatic expiration timestamp |
| `state` | `enum` | Yes | `INITIALIZING` | See states below | Current session state |
| `qdrant_collection_name` | `str` | Yes | `session_{session_id}` | Valid collection name | Associated Qdrant collection |
| `document_count` | `int` | Yes | `0` | `>= 0` | Number of uploaded documents |
| `vector_count` | `int` | Yes | `0` | `>= 0` | Total vectors in collection |
| `language` | `str` | Yes | `en` | ISO 639-1 code | Current UI language preference |

### States

```
INITIALIZING → READY_FOR_UPLOAD → PROCESSING → READY_FOR_CHAT → CHATTING
                                ↓
                          ERROR (moderation fail, extraction fail, etc.)
                                ↓
                          READY_FOR_UPLOAD (reset after error)
```

| State | Description | Valid Transitions |
|-------|-------------|-------------------|
| `INITIALIZING` | Session just created, Qdrant collection being created | → `READY_FOR_UPLOAD` |
| `READY_FOR_UPLOAD` | Ready to accept document/URL upload | → `PROCESSING` |
| `PROCESSING` | Upload being processed (extract → moderate → chunk → embed) | → `READY_FOR_CHAT`, `ERROR` |
| `ERROR` | Processing failed (moderation, extraction, etc.) | → `READY_FOR_UPLOAD` |
| `READY_FOR_CHAT` | Documents embedded, ready for queries | → `CHATTING` |
| `CHATTING` | Active conversation | → `PROCESSING` (new upload), → `CHATTING` (more queries) |

### Relationships
- **1:1 with Qdrant Collection**: Each session has exactly one collection (`session_{session_id}`)
- **1:N with Documents**: One session can have multiple uploaded documents
- **1:N with ChatMessages**: One session can have multiple query-response pairs

### Validation Rules
- `session_id` must be globally unique
- `last_activity` must be updated on every API call
- `expires_at` must be exactly 30 minutes after `created_at`
- `qdrant_collection_name` must match pattern `session_*`
- `state` transitions must follow valid flow (no arbitrary jumps)

### Cleanup on Expiry
When `datetime.utcnow() > expires_at`:
1. Delete Qdrant collection (`qdrant_collection_name`)
2. Remove session from in-memory registry
3. All associated data (documents, chunks, messages) automatically garbage collected

---

## Entity 2: Document

**Purpose**: Represents uploaded content (PDF, text file, or URL) with extraction status and moderation result.

### Attributes

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `document_id` | `str` (UUID4) | Yes | Auto-generated | UUID format | Unique document identifier |
| `session_id` | `str` (UUID4) | Yes | From session | Valid session UUID | Parent session reference |
| `source_type` | `enum` | Yes | - | `PDF`, `TEXT`, `URL` | Type of uploaded content |
| `source_reference` | `str` | Yes | - | - | Original filename or URL |
| `raw_content` | `str` | No | - | - | Extracted text content (transient) |
| `upload_timestamp` | `datetime` | Yes | `datetime.utcnow()` | ISO 8601 | When upload occurred |
| `extraction_status` | `enum` | Yes | `PENDING` | See statuses | Extraction processing status |
| `moderation_status` | `enum` | Yes | `PENDING` | See statuses | Gemini Safety check status |
| `moderation_categories` | `List[str]` | No | `[]` | - | Blocked categories if failed |
| `chunk_count` | `int` | Yes | `0` | `>= 0` | Number of chunks created |
| `error_code` | `str` | No | - | - | Error code if failed (ERR_*) |
| `error_message` | `str` | No | - | - | Human-readable error message |

### Extraction Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Upload received, not yet processed |
| `EXTRACTING` | Text extraction in progress |
| `EXTRACTED` | Text successfully extracted |
| `FAILED` | Extraction failed (ERR_EXTRACT_FAILED, ERR_FETCH_FAILED) |

### Moderation Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Not yet sent to Gemini Safety API |
| `CHECKING` | Moderation check in progress |
| `APPROVED` | Content passed safety checks |
| `BLOCKED` | Content failed moderation (ERR_MODERATION_BLOCKED) |

### Relationships
- **N:1 with Session**: Many documents belong to one session
- **1:N with DocumentChunks**: One document produces multiple chunks

### Validation Rules
- `source_type` must be one of: `PDF`, `TEXT`, `URL`
- If `source_type == URL`, `source_reference` must be valid URL format
- If `extraction_status == FAILED`, `error_code` must be set
- If `moderation_status == BLOCKED`, `moderation_categories` must not be empty
- `chunk_count` must match actual number of related DocumentChunks

### State Transition Flow
```
PENDING → EXTRACTING → EXTRACTED → CHECKING → APPROVED → (Chunking) → COMPLETE
                    ↓              ↓
                  FAILED       BLOCKED
```

---

## Entity 3: DocumentChunk

**Purpose**: Represents a segment of processed document with text, vector embedding, and metadata for RAG retrieval.

### Attributes

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `chunk_id` | `str` (UUID4) | Yes | Auto-generated | UUID format | Unique chunk identifier |
| `document_id` | `str` (UUID4) | Yes | From parent | Valid document UUID | Parent document reference |
| `session_id` | `str` (UUID4) | Yes | From session | Valid session UUID | Session reference |
| `chunk_index` | `int` | Yes | Sequential | `>= 0` | Order within parent document |
| `text_content` | `str` | Yes | - | `len > 0` | Chunk text (512 tokens ~2000 chars) |
| `char_start` | `int` | Yes | - | `>= 0` | Start position in original document |
| `char_end` | `int` | Yes | - | `> char_start` | End position in original document |
| `embedding_vector` | `List[float]` | Yes | - | `len == 768` | Gemini text-embedding-004 output |
| `embedding_timestamp` | `datetime` | Yes | `datetime.utcnow()` | ISO 8601 | When embedding was generated |
| `metadata` | `dict` | No | `{}` | - | Additional metadata (e.g., page number for PDFs) |

### Relationships
- **N:1 with Document**: Many chunks belong to one document
- **Stored in Qdrant**: Each chunk becomes a point in Qdrant collection

### Validation Rules
- `chunk_index` must be sequential within `document_id` (0, 1, 2, ...)
- `text_content` length should be approximately 2000 chars (512 tokens)
- `char_end` must be greater than `char_start`
- `embedding_vector` must have exactly 768 dimensions (Gemini embedding-004)
- All chunks from same document must be in same Qdrant collection (`session_{session_id}`)

### Qdrant Storage Format
```json
{
  "id": "<chunk_id>",
  "vector": [0.123, 0.456, ...],  // 768 floats
  "payload": {
    "document_id": "<document_id>",
    "chunk_index": 0,
    "text_content": "The actual chunk text...",
    "char_start": 0,
    "char_end": 2000,
    "metadata": {}
  }
}
```

---

## Entity 4: ChatMessage

**Purpose**: Represents a single query-response pair with user query, LLM response, retrieved context, and token metrics.

### Attributes

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `message_id` | `str` (UUID4) | Yes | Auto-generated | UUID format | Unique message identifier |
| `session_id` | `str` (UUID4) | Yes | From session | Valid session UUID | Session reference |
| `timestamp` | `datetime` | Yes | `datetime.utcnow()` | ISO 8601 | Message creation time |
| `user_query` | `str` | Yes | - | `len > 0` | User's question |
| `query_embedding` | `List[float]` | Yes | - | `len == 768` | Query embedding vector |
| `retrieved_chunks` | `List[dict]` | Yes | - | - | Chunks used for context |
| `similarity_scores` | `List[float]` | Yes | - | `all >= 0.7` | Cosine similarity scores |
| `llm_response` | `str` | Yes | - | `len > 0` | Gemini-generated response |
| `response_type` | `enum` | Yes | - | `ANSWERED`, `CANNOT_ANSWER` | Response category |
| `token_metrics` | `Metrics` | Yes | - | - | Token/context/vector usage |

### Response Types

| Type | Description | Condition |
|------|-------------|-----------|
| `ANSWERED` | Successfully answered from context | `len(retrieved_chunks) > 0` and `max(similarity_scores) >= 0.7` |
| `CANNOT_ANSWER` | No relevant context found | `max(similarity_scores) < 0.7` or `len(retrieved_chunks) == 0` |

### Retrieved Chunk Format
```python
{
  "chunk_id": "<UUID>",
  "text_content": "Chunk text used in context",
  "similarity_score": 0.85,
  "document_id": "<UUID>",
  "chunk_index": 3
}
```

### Relationships
- **N:1 with Session**: Many messages belong to one session
- **N:N with DocumentChunks**: Each message references multiple chunks (via retrieved_chunks)

### Validation Rules
- `user_query` must not be empty
- `retrieved_chunks` must be sorted by `similarity_score` (descending)
- All `similarity_scores` must be >= 0.7 (strict RAG threshold)
- If `response_type == CANNOT_ANSWER`, `llm_response` should be "I cannot answer this question based on the uploaded documents."
- `token_metrics` must be populated with valid Metrics object

---

## Entity 5: Metrics

**Purpose**: Represents resource usage including token counts, context usage, and vector database size for transparency.

### Attributes

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `token_input` | `int` | Yes | - | `>= 0` | Input tokens (prompt) |
| `token_output` | `int` | Yes | - | `>= 0` | Output tokens (response) |
| `token_total` | `int` | Yes | `input + output` | `>= 0` | Total tokens used |
| `token_limit` | `int` | Yes | `32000` | Fixed | Gemini-pro token limit |
| `token_percent` | `float` | Yes | `(total/limit)*100` | `0.0 - 100.0` | Percentage of limit used |
| `context_tokens` | `int` | Yes | - | `>= 0` | Tokens in retrieved context |
| `context_percent` | `float` | Yes | `(context/limit)*100` | `0.0 - 100.0` | Context as % of limit |
| `vector_count` | `int` | Yes | - | `>= 0` | Total vectors in session collection |

### Calculation Logic
```python
token_total = token_input + token_output
token_percent = (token_total / token_limit) * 100
context_percent = (context_tokens / token_limit) * 100
```

### Validation Rules
- `token_input` + `token_output` must equal `token_total`
- `token_limit` is fixed at 32000 (Gemini-pro constraint)
- `token_percent` should not exceed 100% (may warn if > 80%)
- `context_tokens` calculated from retrieved chunk lengths
- `vector_count` queried from Qdrant collection size

### UI Display
- Show as progress bars for percentages
- Color-code: Green (<50%), Yellow (50-80%), Red (>80%)
- Update in real-time after each query-response cycle

---

## Entity 6: LanguagePreference

**Purpose**: Represents user's current UI language selection with code and timestamp for frontend i18n.

### Attributes

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `language_code` | `str` | Yes | `en` | ISO 639-1 | Current language code |
| `language_name` | `str` | Yes | Based on code | - | Display name in native script |
| `changed_at` | `datetime` | Yes | `datetime.utcnow()` | ISO 8601 | Last language change timestamp |

### Supported Languages

| Code | Name | Native Script |
|------|------|---------------|
| `en` | English | English |
| `zh` | Chinese | 中文 |
| `ko` | Korean | 한국어 |
| `es` | Spanish | Español |
| `ja` | Japanese | 日本語 |
| `ar` | Arabic | العربية |
| `fr` | French | Français |

### Relationships
- **1:1 with Session** (embedded in Session state, not separate entity)

### Validation Rules
- `language_code` must be one of the 7 supported codes
- `language_name` must match corresponding native name
- Changes only affect UI elements, not chat history content

---

## Relationships Diagram

```
Session (1)
├── has many Documents (N)
│   └── has many DocumentChunks (N) ──> stored in Qdrant Collection
├── has many ChatMessages (N)
│   └── references DocumentChunks (N:N via retrieved_chunks)
├── has one LanguagePreference (1:1, embedded)
└── owns one Qdrant Collection (1:1)
```

---

## Data Flow Summary

### 1. Session Creation
```
POST /api/session/create
→ Generate session_id
→ Create Qdrant collection
→ Initialize Session entity (state: INITIALIZING → READY_FOR_UPLOAD)
```

### 2. Document Upload
```
POST /api/upload (file/URL)
→ Create Document entity (extraction_status: PENDING)
→ Extract text (status: EXTRACTING → EXTRACTED or FAILED)
→ Check moderation (moderation_status: CHECKING → APPROVED or BLOCKED)
→ Chunk text → Create DocumentChunk entities
→ Generate embeddings → Store in Qdrant
→ Update Session (state: PROCESSING → READY_FOR_CHAT, vector_count++)
```

### 3. Chat Query
```
POST /api/chat/query
→ Embed user query
→ Search Qdrant (similarity >= 0.7)
→ Retrieve DocumentChunks
→ Build prompt with context
→ Call Gemini API
→ Calculate Metrics
→ Create ChatMessage entity
→ Return response + metrics
```

### 4. Session Cleanup (TTL Expiry)
```
Scheduler checks every 1 minute
→ Find sessions where now() > expires_at
→ Delete Qdrant collection
→ Remove Session from registry
→ (All related entities garbage collected)
```

---

## Validation Summary

All entities designed with:
- ✅ **Type Safety**: Pydantic models enforce type validation
- ✅ **State Transitions**: Enum-based states with valid transition rules
- ✅ **Referential Integrity**: UUID foreign keys, relationship constraints
- ✅ **Testability**: Each entity independently creatable and verifiable
- ✅ **Ephemeral**: No persistent storage, 30-minute TTL enforced

**Next Phase**: Proceed to API Contract Design
