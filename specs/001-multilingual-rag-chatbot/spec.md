# Feature Specification: Multilingual RAG-Powered Chatbot

**Feature Branch**: `001-multilingual-rag-chatbot`  
**Created**: 2025-12-07  
**Status**: Draft  
**Input**: User description: "Build a multilingual RAG-powered chatbot that demonstrates embedding, vector database, and strict RAG capabilities for AI Engineer portfolio"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Session Creation (Priority: P1) 🎯 MVP Core

When a user first accesses the chatbot, the system automatically creates an isolated session with a unique Qdrant collection. This forms the foundation for all subsequent interactions.

**Why this priority**: Without session management, no other features can function. This is the absolute minimum required for the application to start.

**Independent Test**: Navigate to the application URL and verify a session ID is generated and a dedicated Qdrant collection is created. The session expires after 30 minutes of inactivity.

**Acceptance Scenarios**:

1. **Given** user opens the chatbot URL, **When** the application loads, **Then** a unique session ID is generated and stored
2. **Given** a new session is created, **When** the backend initializes, **Then** a dedicated Qdrant collection is created for this session
3. **Given** a session has been inactive for 30 minutes, **When** the TTL expires, **Then** all session data and the Qdrant collection are deleted automatically
4. **Given** a user clicks "Restart" button, **When** the action is confirmed, **Then** the current session is terminated and a new session is created

---

### User Story 2 - Document Upload and Content Moderation (Priority: P2) 🎯 MVP Core

Users upload documents (PDF, text files) or provide URLs to build the knowledge base. All content must pass Gemini Safety moderation before processing. Uploaded content is displayed as a processing summary.

**Why this priority**: Core RAG functionality - without document upload and embedding, there's no knowledge base for the chatbot to query.

**Independent Test**: Upload a valid PDF file and verify it passes moderation, gets chunked, embedded, and stored in Qdrant. Upload prohibited content and verify it gets blocked with appropriate error message.

**Acceptance Scenarios**:

1. **Given** user is on the initial upload screen, **When** user uploads a valid PDF/text file, **Then** system extracts text content
2. **Given** extracted text content, **When** sent to Gemini Safety API, **Then** content is checked for harmful/inappropriate material
3. **Given** content passes moderation, **When** processing begins, **Then** text is chunked into appropriate segments
4. **Given** chunked content, **When** embedding process runs, **Then** each chunk is converted to vector embeddings via Gemini API
5. **Given** embeddings are generated, **When** storing to database, **Then** vectors are saved to the user's dedicated Qdrant collection
6. **Given** user provides a URL, **When** system fetches content, **Then** web content is extracted and follows the same moderation → chunking → embedding flow
7. **Given** content fails moderation, **When** blocked content is detected, **Then** user receives error message ERR_MODERATION_BLOCKED and returns to upload screen
8. **Given** URL fetch fails, **When** network error occurs, **Then** user receives error message ERR_FETCH_FAILED
9. **Given** PDF extraction fails, **When** corrupted or unsupported file is uploaded, **Then** user receives error message ERR_EXTRACT_FAILED
10. **Given** upload processing completes successfully, **When** all content is embedded, **Then** user sees a summary of uploaded content and confirmation dialog to start chatting

---

### User Story 3 - Strict RAG Query Response (Priority: P3) 🎯 MVP Core

Users ask questions and receive answers strictly based on the uploaded documents stored in the vector database. The system performs similarity search and only responds when relevant context is found.

**Why this priority**: This is the core chatbot interaction demonstrating RAG capabilities. Depends on US-02 being complete.

**Independent Test**: Upload a specific document, ask questions that are answerable from the document (should get accurate responses) and questions outside the document scope (should get "no information available" response).

**Acceptance Scenarios**:

1. **Given** user has uploaded documents, **When** user types a question in the chat input, **Then** the query is converted to an embedding vector
2. **Given** query embedding is created, **When** vector search runs, **Then** Qdrant returns the most similar document chunks based on cosine similarity
3. **Given** search results are returned, **When** similarity scores are checked, **Then** only chunks above the similarity threshold are included in the prompt
4. **Given** relevant chunks are found, **When** building the LLM prompt, **Then** the prompt includes the retrieved context plus the user's question
5. **Given** prompt is constructed, **When** sent to Gemini API, **Then** LLM generates response strictly based on provided context
6. **Given** no relevant chunks meet the similarity threshold, **When** responding to user, **Then** system responds "I cannot answer this question based on the uploaded documents"
7. **Given** LLM response is generated, **When** displaying to user, **Then** response appears in the chat interface with timestamp
8. **Given** response is completed, **When** metrics are available, **Then** token usage, context usage, and vector count are displayed

---

### User Story 4 - Real-time Multilingual UI Language Switching (Priority: P4)

Users can switch the interface language between 7 languages (English, Chinese, Korean, Spanish, Japanese, Arabic, French). The language selector button text cycles through language names every second. When language is changed, all UI elements update immediately while preserving chat history content in original languages.

**Why this priority**: Demonstrates internationalization capability but not essential for core RAG functionality. Can be added after chatbot works.

**Independent Test**: Select different languages from the dropdown and verify all UI labels, buttons, and system messages update accordingly. Verify button text animation cycles through languages.

**Acceptance Scenarios**:

1. **Given** user is on any screen, **When** viewing the language selector button, **Then** the button text cycles through "English, 中文, 한국어, Español, 日本語, العربية, Français" every 1 second
2. **Given** user clicks the language dropdown, **When** dropdown opens, **Then** all 7 language options are displayed in their native scripts
3. **Given** user selects a different language, **When** language change is applied, **Then** all UI text (buttons, labels, placeholders, system messages) update to selected language
4. **Given** chat history exists, **When** language is changed, **Then** previous chat messages remain in their original language
5. **Given** language is changed, **When** user sends a new message, **Then** system responses and UI elements appear in the newly selected language
6. **Given** user changes language mid-conversation, **When** interacting with the system, **Then** subsequent interactions use the new language until changed again

---

### User Story 5 - Real-time Metrics Display (Priority: P5)

Throughout the upload and chat experience, users see real-time metrics including token input/output counts, token usage percentage, context usage, and vector database size. This provides transparency into resource consumption.

**Why this priority**: Educational and transparency feature. Nice to have for portfolio demonstration but not blocking core functionality.

**Independent Test**: Monitor the metrics panel during document upload and chat interactions to verify all metrics update accurately and in real-time.

**Acceptance Scenarios**:

1. **Given** user is on the processing screen, **When** document is being uploaded and embedded, **Then** metrics panel shows vector_count increasing in real-time
2. **Given** user is chatting, **When** each query/response cycle completes, **Then** token_used, token_limit, and token_percent are updated
3. **Given** metrics are displayed, **When** context window is used, **Then** context_used and context_percent show current utilization
4. **Given** metrics panel exists, **When** viewing at any time, **Then** all metrics are clearly labeled with current values and percentages where applicable
5. **Given** token limit is approaching, **When** token_percent exceeds 80%, **Then** visual warning indicator appears (color change or icon)

---

### User Story 6 - Session Management Controls (Priority: P6)

Users can explicitly close their session via a "Leave" button or restart the entire experience via a "Restart" button. Both actions trigger immediate cleanup of session data and Qdrant collection.

**Why this priority**: Important for data privacy compliance but the automatic TTL (US-01) handles most cases. Manual controls are enhancement.

**Independent Test**: Click "Leave" button and verify session is terminated and data is deleted. Click "Restart" and verify new session is created with clean state.

**Acceptance Scenarios**:

1. **Given** user is in any state, **When** user clicks "Leave" button, **Then** confirmation dialog appears
2. **Given** user confirms leave action, **When** backend processes the request, **Then** POST /api/session/close is called
3. **Given** session close is triggered, **When** cleanup executes, **Then** Qdrant collection is deleted and all session data is removed
4. **Given** user clicks "Restart" button, **When** action is confirmed, **Then** current session is closed and a new session is immediately created
5. **Given** restart is complete, **When** user sees the UI, **Then** they are back at the initial upload screen with empty state

---

### Edge Cases

- What happens when user uploads a very large PDF file (>10MB)?
- How does system handle non-text PDFs (scanned images)?
- What if user tries to upload an image file or unsupported format?
- How does system respond when Gemini API rate limits are hit?
- What happens if Qdrant database connection fails during upload?
- How does system handle malformed URLs or URLs that require authentication?
- What if user's network disconnects during file upload?
- How does system behave when vector similarity search returns zero results?
- What happens if user sends multiple questions rapidly before previous responses complete?
- How does RTL (right-to-left) text rendering work for Arabic language?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically create a unique session with dedicated Qdrant collection when user accesses the application
- **FR-002**: System MUST accept PDF files, text files, and URLs as knowledge base input sources
- **FR-003**: System MUST validate all uploaded content through Gemini Safety API before processing
- **FR-004**: System MUST reject and block content that fails Gemini Safety moderation checks with appropriate error messages
- **FR-005**: System MUST extract text content from uploaded files and URLs
- **FR-006**: System MUST chunk extracted text into appropriately sized segments for embedding
- **FR-007**: System MUST generate vector embeddings for all content chunks using Gemini Embedding API
- **FR-008**: System MUST store embeddings in isolated Qdrant collections per session
- **FR-009**: System MUST convert user queries into embedding vectors using the same embedding model as documents
- **FR-010**: System MUST perform vector similarity search in Qdrant to retrieve relevant context
- **FR-011**: System MUST only include document chunks above similarity threshold in LLM prompts (Strict RAG enforcement)
- **FR-012**: System MUST respond "cannot answer based on uploaded documents" when no relevant context is found
- **FR-013**: System MUST generate responses using Gemini API strictly based on retrieved context
- **FR-014**: System MUST display real-time metrics: token_used, token_limit, token_percent, context_used, context_percent, vector_count
- **FR-015**: System MUST support 7 UI languages: English, Chinese (Traditional), Korean, Spanish, Japanese, Arabic, French
- **FR-016**: System MUST animate language selector button text cycling through language names every 1 second
- **FR-017**: System MUST update all UI elements when language is changed while preserving chat history in original languages
- **FR-018**: System MUST automatically delete session data and Qdrant collection after 30 minutes of inactivity (TTL)
- **FR-019**: System MUST provide manual session termination via "Leave" button with immediate data cleanup
- **FR-020**: System MUST provide session restart via "Restart" button creating new isolated session
- **FR-021**: System MUST display processing progress indicator during document upload and embedding
- **FR-022**: System MUST show confirmation dialog when upload processing completes successfully
- **FR-023**: System MUST return specific error codes: ERR_EXTRACT_FAILED, ERR_FETCH_FAILED, ERR_MODERATION_BLOCKED
- **FR-024**: System MUST maintain persistent UI header with: app name, language selector, Leave button, Restart button across all screens
- **FR-025**: System MUST prevent user from uploading image files or unsupported formats

### Key Entities

- **Session**: Represents a user's isolated chatbot instance with unique ID, creation timestamp, expiry time (TTL), associated Qdrant collection name, and current state (uploading/ready/chatting)
- **Document**: Represents uploaded content with source type (PDF/text/URL), original content, extraction status, moderation result, chunk count, and upload timestamp
- **DocumentChunk**: Represents a segment of processed document with chunk text, vector embedding, chunk index, parent document reference, and embedding timestamp
- **ChatMessage**: Represents a single query-response pair with user query text, LLM response text, timestamp, retrieved context chunks, similarity scores, and token metrics
- **Metrics**: Represents resource usage with token input count, token output count, token limit, token percentage, context size, context percentage, and vector database item count
- **LanguagePreference**: Represents user's current UI language selection with language code and last changed timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a standard PDF document (3-5 pages) and see it processed and embedded within 30 seconds
- **SC-002**: System correctly blocks 100% of content flagged by Gemini Safety API with appropriate error messages
- **SC-003**: Chat responses demonstrate strict RAG - system returns "no information available" for 100% of queries outside uploaded document scope
- **SC-004**: Language switching updates all UI elements within 500ms of selection with no visual glitches
- **SC-005**: System successfully handles 10 concurrent user sessions with isolated Qdrant collections and no data leakage
- **SC-006**: Metrics display updates within 1 second of each query/response cycle completion
- **SC-007**: Session cleanup (manual or automatic) successfully deletes 100% of associated data from Qdrant within 5 seconds
- **SC-008**: Vector similarity search returns relevant context chunks with >0.7 similarity score for queries answerable from documents
- **SC-009**: UI remains responsive (<100ms interaction feedback) during file upload and embedding processing
- **SC-010**: System provides clear error messages for all edge cases (unsupported files, fetch failures, moderation blocks) within 2 seconds of detection

## Assumptions

- Users have stable internet connection for API calls to Gemini and Qdrant
- PDF files are primarily text-based (not scanned images requiring OCR)
- Average document size is 5-20 pages (not books or massive datasets)
- Gemini API has sufficient quota for development and demonstration purposes
- Qdrant instance has sufficient storage for multiple concurrent demo sessions
- Users access the application via modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- Session TTL of 30 minutes is sufficient for typical demonstration scenarios
- Similarity threshold of 0.7 provides good balance between precision and recall for RAG responses
- UI text translations are provided (not generated dynamically by LLM)
- Cloud deployment target supports both frontend (React) and backend (FastAPI) hosting
