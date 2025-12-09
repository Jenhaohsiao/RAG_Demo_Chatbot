

# Quickstart Testing Guide
**Feature**: 001-multilingual-rag-chatbot  
**Purpose**: Manual testing scenarios for each user story  
**Last Updated**: 2025-12-08

---

## Prerequisites

### 1. Environment Setup

```powershell
# Clone repository
git clone <repository-url>
cd RAG_Demo_Chatbot

# Checkout feature branch
git checkout 001-multilingual-rag-chatbot

# Install backend dependencies
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Install frontend dependencies
cd ..\frontend
npm install
```

### 2. Qdrant Setup (Development)

```powershell
# Option A: Embedded mode (for quick testing)
# No setup needed - Qdrant client runs in-memory

# Option B: Docker mode (recommended)
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

### 3. Configuration

Create `.env` file in `backend/` directory:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional (defaults shown)
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_MODE=docker  # Options: embedded, docker, cloud
SESSION_TTL_MINUTES=30
SIMILARITY_THRESHOLD=0.7
```

**Get Gemini API Key**: https://ai.google.dev/

### 4. Start Services

```powershell
# Terminal 1: Start backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn src.main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend
npm run dev
```

**Expected output**:
- Backend: `INFO: Application startup complete` at http://localhost:8000
- Frontend: `Local: http://localhost:5173`

---

## Test Scenarios

### US-01: Session Creation (P1 - MVP Core)

**Goal**: Verify session lifecycle management and Qdrant collection creation

#### Test 1.1: Create New Session

```bash
# Request
curl -X POST http://localhost:8000/api/v1/session/create \
  -H "Content-Type: application/json"

# Expected Response (200 OK)
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "state": "READY_FOR_UPLOAD",
  "created_at": "2025-12-08T10:00:00Z",
  "expires_at": "2025-12-08T10:30:00Z",
  "qdrant_collection": "session_a1b2c3d4e5f67890abcdef1234567890"
}
```

**Verification**:
1. Check Qdrant collection exists:
   ```bash
   curl http://localhost:6333/collections/session_a1b2c3d4e5f67890abcdef1234567890
   ```
2. Verify `vectors_count: 0` (empty collection)
3. Save `session_id` for subsequent tests

#### Test 1.2: Get Session Status

```bash
# Request
curl http://localhost:8000/api/v1/session/{session_id}

# Expected Response (200 OK)
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "state": "READY_FOR_UPLOAD",
  "language": "en",
  "metrics": {
    "token_input": 0,
    "token_output": 0,
    "token_total": 0,
    "token_limit": 32000,
    "token_percent": 0.0,
    "context_tokens": 0,
    "context_percent": 0.0,
    "vector_count": 0
  }
}
```

#### Test 1.3: Heartbeat (Keep-Alive)

```bash
# Wait 5 seconds, then send heartbeat
sleep 5
curl -X POST http://localhost:8000/api/v1/session/{session_id}/heartbeat

# Expected Response (200 OK)
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "last_activity": "2025-12-08T10:00:05Z",
  "expires_at": "2025-12-08T10:30:05Z"
}
```

**Verification**: `expires_at` timestamp updated (+30 minutes from heartbeat)

---

### US-02: Upload & Moderation (P2 - MVP Core)

**Goal**: Test document upload pipeline with extraction, moderation, chunking, and embedding

#### Test 2.1: Upload Valid PDF

**Preparation**: Create test PDF with safe content

```bash
# Request
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/file \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-ml-intro.pdf"

# Expected Response (202 Accepted)
{
  "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
  "status": "processing",
  "message": "Document uploaded, processing started"
}
```

#### Test 2.2: Poll Processing Status

```bash
# Request (poll every 2 seconds)
curl http://localhost:8000/api/v1/upload/{session_id}/status/{document_id}

# Expected Response - Processing (200 OK)
{
  "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
  "source_type": "PDF",
  "extraction_status": "processing",
  "moderation_status": "pending",
  "processing_progress": 35,
  "chunk_count": 0
}

# Expected Response - Complete (200 OK)
{
  "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
  "source_type": "PDF",
  "extraction_status": "complete",
  "moderation_status": "approved",
  "processing_progress": 100,
  "chunk_count": 12,
  "summary": "Introduction to Machine Learning algorithms..."
}
```

**Verification**:
1. Check session state updated:
   ```bash
   curl http://localhost:8000/api/v1/session/{session_id}
   # state should be "READY_FOR_CHAT"
   ```
2. Check Qdrant vectors:
   ```bash
   curl http://localhost:6333/collections/{qdrant_collection}
   # vectors_count should be 12
   ```

#### Test 2.3: Upload Text File

```bash
# Create test file
echo "Artificial Intelligence is transforming industries." > test.txt

# Upload
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/file \
  -F "file=@test.txt"

# Expected: 202 Accepted with new document_id
```

#### Test 2.4: Upload from URL

```bash
# Request
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://en.wikipedia.org/wiki/Machine_learning"}'

# Expected: 202 Accepted
```

**Verification**: Poll status until `extraction_status: "complete"`

#### Test 2.5: Upload Blocked Content (Moderation)

```bash
# Upload file with unsafe content
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/file \
  -F "file=@unsafe-content.txt"

# Poll status
curl http://localhost:8000/api/v1/upload/{session_id}/status/{document_id}

# Expected Response (200 OK)
{
  "document_id": "d2e3f4a5-b6c7-8901-def1-234567890bcd",
  "extraction_status": "complete",
  "moderation_status": "blocked",
  "processing_progress": 100,
  "chunk_count": 0,
  "error_code": "ERR_MODERATION_BLOCKED",
  "error_message": "Content violates safety policies"
}
```

**Verification**: Session state remains `READY_FOR_UPLOAD` (blocked doc doesn't count)

#### Test 2.6: List All Documents

```bash
# Request
curl http://localhost:8000/api/v1/upload/{session_id}/documents

# Expected Response (200 OK)
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "documents": [
    {
      "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
      "source_type": "PDF",
      "moderation_status": "approved",
      "chunk_count": 12
    },
    {
      "document_id": "d2e3f4a5-b6c7-8901-def1-234567890bcd",
      "source_type": "TEXT",
      "moderation_status": "approved",
      "chunk_count": 1
    }
  ],
  "total_documents": 2,
  "total_chunks": 13
}
```

---

### US-03: RAG Query (P3 - MVP Core)

**Goal**: Test strict RAG query/response with similarity threshold enforcement

#### Test 3.1: Answerable Question

**Prerequisites**: Session with uploaded ML document (Test 2.2)

```bash
# Request
curl -X POST http://localhost:8000/api/v1/chat/{session_id}/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is machine learning?"}'

# Expected Response (200 OK)
{
  "message_id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2025-12-08T10:15:00Z",
  "user_query": "What is machine learning?",
  "llm_response": "Based on the uploaded document, machine learning is a subset of artificial intelligence...",
  "response_type": "ANSWERED",
  "retrieved_chunks": [
    {
      "chunk_id": "c1d2e3f4-a5b6-7890-cdef-123456789012",
      "text_content": "Machine learning is a subset of AI...",
      "similarity_score": 0.89,
      "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
      "chunk_index": 3
    }
  ],
  "metrics": {
    "token_input": 256,
    "token_output": 128,
    "token_total": 384,
    "token_limit": 32000,
    "token_percent": 1.2,
    "context_tokens": 180,
    "context_percent": 0.56,
    "vector_count": 13
  }
}
```

**Verification**:
1. `response_type: "ANSWERED"`
2. `retrieved_chunks` not empty
3. All `similarity_score >= 0.7`
4. Response references uploaded content

#### Test 3.2: Unanswerable Question (Strict RAG)

```bash
# Request - question NOT in uploaded docs
curl -X POST http://localhost:8000/api/v1/chat/{session_id}/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the meaning of life?"}'

# Expected Response (200 OK)
{
  "message_id": "m2a3b4c5-d6e7-8901-abcd-ef2345678901",
  "user_query": "What is the meaning of life?",
  "llm_response": "I cannot answer this question based on the uploaded documents.",
  "response_type": "CANNOT_ANSWER",
  "retrieved_chunks": [],
  "metrics": {
    "token_input": 32,
    "token_output": 15,
    "token_total": 47,
    "context_tokens": 0
  }
}
```

**Verification**: No hallucination - strict adherence to uploaded context

#### Test 3.3: Get Chat History

```bash
# Request
curl http://localhost:8000/api/v1/chat/{session_id}/history

# Expected Response (200 OK)
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "messages": [
    {
      "message_id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "timestamp": "2025-12-08T10:15:00Z",
      "user_query": "What is machine learning?",
      "llm_response": "Based on the uploaded document...",
      "response_type": "ANSWERED"
    },
    {
      "message_id": "m2a3b4c5-d6e7-8901-abcd-ef2345678901",
      "timestamp": "2025-12-08T10:16:00Z",
      "user_query": "What is the meaning of life?",
      "llm_response": "I cannot answer this question...",
      "response_type": "CANNOT_ANSWER"
    }
  ],
  "total_messages": 2
}
```

---

### US-04: Multilingual UI (P4 - Enhancement)

**Goal**: Verify UI language switching and translation completeness

#### Test 4.1: Frontend Language Switching

**Manual UI Test**:
1. Open browser: http://localhost:5173
2. Click language selector dropdown
3. Select each language and verify:
   - **English (en)**: "Upload Document" button
   - **中文 (zh)**: "上傳文件" button
   - **한국어 (ko)**: "문서 업로드" button
   - **Español (es)**: "Cargar Documento" button
   - **日本語 (ja)**: "ドキュメントをアップロード" button
   - **العربية (ar)**: "تحميل المستند" button (RTL layout)
   - **Français (fr)**: "Télécharger le Document" button

**Expected Behavior**:
- Language change applies immediately (<500ms)
- Chat history preserved during language switch
- Metrics labels update to selected language

#### Test 4.2: Backend Language Update

```bash
# Request
curl -X PUT http://localhost:8000/api/v1/session/{session_id}/language \
  -H "Content-Type: application/json" \
  -d '{"language": "zh"}'

# Expected Response (200 OK)
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "language": "zh",
  "updated_at": "2025-12-08T10:20:00Z"
}
```

**Verification**: Subsequent session GET returns `"language": "zh"`

#### Test 4.3: Language Cycling Animation

**Manual UI Test**:
1. Create new session (no language selected yet)
2. Observe language selector cycling through 7 languages
3. Verify 1-second interval between cycles
4. Click any language to stop cycling

---

### US-05: Metrics Display (P5 - Enhancement)

**Goal**: Verify real-time metrics tracking and display

#### Test 5.1: View Session Metrics

```bash
# Request after multiple queries
curl http://localhost:8000/api/v1/session/{session_id}

# Expected Response (200 OK)
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "state": "CHATTING",
  "metrics": {
    "token_input": 512,
    "token_output": 256,
    "token_total": 768,
    "token_limit": 32000,
    "token_percent": 2.4,
    "context_tokens": 360,
    "context_percent": 1.125,
    "vector_count": 13
  }
}
```

**Verification**:
- `token_total = token_input + token_output`
- `token_percent = (token_total / token_limit) * 100`
- `vector_count` matches total chunks from all uploaded docs

#### Test 5.2: Frontend Metrics Display

**Manual UI Test**:
1. Submit multiple queries
2. Observe metrics panel updating in real-time
3. Verify progress bars:
   - Token usage bar color changes: green (<50%), yellow (50-80%), red (>80%)
   - Context usage bar shows chunk token percentage
4. Verify vector count matches backend

---

### US-06: Session Controls (P6 - Enhancement)

**Goal**: Test session termination and restart workflows

#### Test 6.1: Leave Session (Manual Close)

```bash
# Request
curl -X POST http://localhost:8000/api/v1/session/{session_id}/close

# Expected Response (200 OK)
{
  "message": "Session closed successfully",
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "closed_at": "2025-12-08T10:25:00Z"
}
```

**Verification**:
1. Subsequent GET returns 404 or 410 (SESSION_EXPIRED)
2. Qdrant collection deleted:
   ```bash
   curl http://localhost:6333/collections/{qdrant_collection}
   # Expected: 404 Not Found
   ```

#### Test 6.2: Restart Session

```bash
# Request
curl -X POST http://localhost:8000/api/v1/session/{session_id}/restart

# Expected Response (200 OK)
{
  "old_session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "new_session_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "state": "READY_FOR_UPLOAD",
  "created_at": "2025-12-08T10:26:00Z",
  "expires_at": "2025-12-08T10:56:00Z",
  "qdrant_collection": "session_b2c3d4e5f6a78901bcdef12345678901"
}
```

**Verification**:
1. Old session closed (404 on GET)
2. New session created with clean state
3. New Qdrant collection exists
4. Chat history empty

#### Test 6.3: Automatic TTL Expiration

**Test Setup**:
1. Create session
2. Wait 30 minutes (or temporarily set `SESSION_TTL_MINUTES=1` in .env)
3. Attempt to query

**Expected Behavior**:
```bash
curl http://localhost:8000/api/v1/session/{session_id}

# Expected Response (410 Gone)
{
  "error_code": "SESSION_EXPIRED",
  "message": "Session expired and has been cleaned up",
  "expired_at": "2025-12-08T10:30:00Z"
}
```

**Verification**: Qdrant collection automatically deleted by scheduler

---

## Edge Case Testing

### Edge 1: Large File Upload (>10MB)

```bash
# Create 15MB test file
dd if=/dev/zero of=large.pdf bs=1M count=15

# Upload
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/file \
  -F "file=@large.pdf"

# Expected Response (400 Bad Request)
{
  "error_code": "FILE_TOO_LARGE",
  "message": "File size exceeds 10MB limit"
}
```

### Edge 2: Scanned PDF (No Text)

**Test File**: Image-only PDF

```bash
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/file \
  -F "file=@scanned.pdf"

# Expected: Processing completes with warning
{
  "extraction_status": "complete",
  "chunk_count": 0,
  "error_code": "EMPTY_FILE",
  "error_message": "No extractable text found in PDF"
}
```

### Edge 3: Malformed URL

```bash
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/url \
  -d '{"url": "not-a-valid-url"}'

# Expected Response (400 Bad Request)
{
  "error_code": "INVALID_URL",
  "message": "URL must start with http:// or https://"
}
```

### Edge 4: Network Timeout (URL Fetch)

**Test**: URL that times out (e.g., `http://httpstat.us/200?sleep=60000`)

```bash
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/url \
  -d '{"url": "http://httpstat.us/200?sleep=60000"}'

# Poll status
# Expected: timeout_seconds exceeded
{
  "extraction_status": "failed",
  "error_code": "ERR_FETCH_FAILED",
  "error_message": "Request timeout after 30 seconds"
}
```

### Edge 5: Unsupported File Format

```bash
# Upload .docx file
curl -X POST http://localhost:8000/api/v1/upload/{session_id}/file \
  -F "file=@document.docx"

# Expected Response (400 Bad Request)
{
  "error_code": "UNSUPPORTED_FORMAT",
  "message": "Only PDF and plain text files are supported"
}
```

### Edge 6: Arabic RTL Text Rendering

**Manual UI Test**:
1. Switch language to Arabic (ar)
2. Verify UI layout flips to RTL:
   - Text alignment: right
   - Icons mirrored
   - Chat bubbles aligned right
3. Submit query and verify response displays correctly

---

## Success Criteria Validation

| Criterion | Test Reference | Expected Result |
|-----------|---------------|-----------------|
| SC-01: Document processing <30s | Test 2.2 | `processing_progress: 100` in <30s |
| SC-02: 100% moderation accuracy | Test 2.5 | Blocked content returns `ERR_MODERATION_BLOCKED` |
| SC-03: Session TTL 30±1 min | Test 6.3 | Session expires at `created_at + 30min` |
| SC-04: Similarity ≥0.7 | Test 3.1 | All `retrieved_chunks[].similarity_score >= 0.7` |
| SC-05: Language switch <500ms | Test 4.1 | UI updates within 500ms |
| SC-06: Zero hallucination | Test 3.2 | `CANNOT_ANSWER` response when no context |
| SC-07: Metrics real-time update | Test 5.1 | Metrics update after each query |
| SC-08: >90% test coverage | N/A | Run `pytest --cov` in backend |
| SC-09: Clean session restart | Test 6.2 | New session has empty history |
| SC-10: Arabic RTL support | Edge 6 | Layout flips correctly |

---

## Test Completion Checklist

- [ ] All 6 user stories tested (US-01 to US-06)
- [ ] All 6 edge cases validated
- [ ] All 10 success criteria verified
- [ ] Backend test coverage ≥90% (`pytest --cov`)
- [ ] Frontend test coverage ≥80% (`npm run test:coverage`)
- [ ] Manual UI testing complete for all languages
- [ ] Qdrant cleanup verified (no orphaned collections)
- [ ] No Gemini API key exposed in logs/errors

---

## Next Steps

After manual testing:
1. **Automate Tests**: Convert scenarios to pytest (backend) and Playwright (frontend)
2. **Contract Testing**: Validate API responses against OpenAPI schemas
3. **Integration Tests**: Test complete workflows (create → upload → query → close)
4. **GitHub Actions**: Run tests in CI pipeline
5. **Production Deployment**: Test with Qdrant Cloud Free Tier

**Questions?** Refer to `plan.md` for architecture details or `data-model.md` for entity schemas.
