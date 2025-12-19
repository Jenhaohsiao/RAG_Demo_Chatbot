# Tasks: Multilingual RAG-Powered Chatbot

**Input**: Design documents from `/specs/001-multilingual-rag-chatbot/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅  
**Feature Branch**: `001-multilingual-rag-chatbot`  
**Generated**: 2025-12-08

**Tests**: Tests are OPTIONAL in this implementation plan. Test tasks are included as examples but can be skipped if focusing on MVP demonstration.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **Checkbox**: `- [ ]` for markdown task tracking
- **[ID]**: Sequential task number (T001, T002, T003...)
- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3...) - ONLY for user story phases
- **Description**: Clear action with exact file path

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create project structure and install dependencies

- [ ] T001 Create backend directory structure: `backend/src/{api,core,services,models}`, `backend/tests/{unit,integration,contract}`
- [ ] T002 Create frontend directory structure: `frontend/src/{components,hooks,services,i18n,types}`, `frontend/tests/{unit,e2e}`
- [ ] T003 [P] Initialize backend Python project in `backend/requirements.txt` with FastAPI, qdrant-client, google-generativeai, PyPDF2, beautifulsoup4, APScheduler, python-dotenv, pytest
- [ ] T004 [P] Initialize frontend Node.js project in `frontend/package.json` with React 18, TypeScript 5, Vite 5, Bootstrap 5, axios, react-i18next, Jest, Playwright
- [ ] T005 [P] Create `.env.example` file in repository root with GEMINI_API_KEY, QDRANT_HOST, QDRANT_PORT, SESSION_TTL_MINUTES, SIMILARITY_THRESHOLD
- [ ] T006 [P] Create `.gitignore` with `.env`, `__pycache__/`, `node_modules/`, `venv/`, `.pytest_cache/`, `dist/`, `build/`
- [ ] T007 [P] Create `docker-compose.yml` with Qdrant service configuration (port 6333:6333, 6334:6334)
- [ ] T008 Create `backend/pytest.ini` with test configuration and coverage settings
- [ ] T009 Create `frontend/tsconfig.json` with TypeScript compiler options
- [ ] T010 Create `frontend/vite.config.ts` with Vite configuration and Bootstrap import

**Checkpoint**: Project structure ready - foundational code can now be written

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Create configuration module in `backend/src/core/config.py` loading environment variables (GEMINI_API_KEY, Qdrant settings, session TTL, similarity threshold)
- [ ] T012 [P] Create Pydantic models in `backend/src/models/session.py` for Session entity (session_id, created_at, expires_at, state enum, qdrant_collection_name, language)
- [ ] T013 [P] Create Pydantic models in `backend/src/models/document.py` for Document and DocumentChunk entities
- [ ] T014 [P] Create Pydantic models in `backend/src/models/chat.py` for ChatMessage and response schemas
- [ ] T015 [P] Create Pydantic models in `backend/src/models/metrics.py` for Metrics entity
- [ ] T016 Create FastAPI app initialization in `backend/src/main.py` with CORS middleware, error handlers, and lifespan events
- [ ] T017 Create API router structure in `backend/src/api/__init__.py` including session, upload, and chat routers
- [ ] T018 [P] Create TypeScript types in `frontend/src/types/session.ts` matching backend Session schema
- [ ] T019 [P] Create TypeScript types in `frontend/src/types/document.ts` matching backend Document schema
- [ ] T020 [P] Create TypeScript types in `frontend/src/types/chat.ts` matching backend ChatMessage schema
- [ ] T021 [P] Create TypeScript types in `frontend/src/types/metrics.ts` matching backend Metrics schema
- [ ] T022 Create Axios client configuration in `frontend/src/services/api.ts` with base URL and error interceptors
- [ ] T023 Create i18n configuration in `frontend/src/i18n/config.ts` with react-i18next setup for 8 languages
- [ ] T024 [P] Create English translations in `frontend/src/i18n/locales/en.json` with all UI strings
- [ ] T025 [P] Create Traditional Chinese translations in `frontend/src/i18n/locales/zh-TW.json`
- [ ] T025b [P] Create Simplified Chinese translations in `frontend/src/i18n/locales/zh-CN.json`
- [ ] T026 [P] Create Korean translations in `frontend/src/i18n/locales/ko.json`
- [ ] T027 [P] Create Spanish translations in `frontend/src/i18n/locales/es.json`
- [ ] T028 [P] Create Japanese translations in `frontend/src/i18n/locales/ja.json`
- [ ] T029 [P] Create Arabic translations in `frontend/src/i18n/locales/ar.json` with RTL support
- [ ] T030 [P] Create French translations in `frontend/src/i18n/locales/fr.json`

**Checkpoint**: Foundation ready - user story implementation can now begin in priority order

---

## Phase 3: User Story 1 - Automatic Session Creation (P1) 🎯 MVP Core

**Goal**: Implement session lifecycle management with unique ID generation, Qdrant collection creation, 30-minute TTL, and automatic cleanup

**Independent Test**: Navigate to application URL and verify session ID is generated, Qdrant collection is created, session expires after 30 minutes with data cleanup

### Implementation for User Story 1

- [ ] T034 [P] [US1] Implement session manager in `backend/src/core/session_manager.py` with create_session, get_session, update_activity, close_session methods
- [ ] T035 [P] [US1] Implement Qdrant client wrapper in `backend/src/services/vector_store.py` with create_collection, delete_collection, get_collection_info methods
- [ ] T036 [US1] Implement session TTL scheduler in `backend/src/core/scheduler.py` using APScheduler with cleanup job checking expired sessions every 1 minute
- [ ] T037 [US1] Implement POST /session/create endpoint in `backend/src/api/routes/session.py` returning session_id, state, created_at, expires_at, qdrant_collection
- [ ] T038 [US1] Implement GET /session/{session_id} endpoint in `backend/src/api/routes/session.py` returning session state and metrics
- [ ] T039 [US1] Implement POST /session/{session_id}/heartbeat endpoint in `backend/src/api/routes/session.py` updating last_activity and expires_at
- [ ] T040 [US1] Implement POST /session/{session_id}/close endpoint in `backend/src/api/routes/session.py` deleting Qdrant collection and session data
- [ ] T041 [US1] Implement POST /session/{session_id}/restart endpoint in `backend/src/api/routes/session.py` closing current and creating new session
- [ ] T042 [US1] Implement PUT /session/{session_id}/language endpoint in `backend/src/api/routes/session.py` updating language preference
- [ ] T043 [US1] Create useSession custom hook in `frontend/src/hooks/useSession.ts` managing session state, create, close, restart actions
- [ ] T044 [US1] Create session service in `frontend/src/services/sessionService.ts` with API calls for all session endpoints
- [ ] T045 [US1] Create Header component in `frontend/src/components/Header.tsx` with app name, language selector, Leave button, Restart button
- [ ] T046 [US1] Create LanguageSelector component in `frontend/src/components/LanguageSelector.tsx` with cycling animation (1-second interval through 7 languages)
- [ ] T047 [US1] Create useLanguage custom hook in `frontend/src/hooks/useLanguage.ts` managing i18n language changes and persistence

**Checkpoint**: Session management complete - users can create sessions with automatic TTL and manual controls

---

## Phase 4: User Story 2 - Document Upload and Content Moderation (P2) 🎯 MVP Core

**Goal**: Implement document upload pipeline with extraction (PDF/text/URL), Gemini Safety moderation, chunking, embedding, and Qdrant storage

**Independent Test**: Upload valid PDF and verify it passes moderation, gets chunked, embedded, stored. Upload prohibited content and verify ERR_MODERATION_BLOCKED error

### API Key Management (Required for Gemini API calls)

- [ ] T031 [P] Create API key validator in `backend/src/core/api_validator.py` to check Gemini API key validity
- [ ] T032 [P] Create ApiKeyInput component in `frontend/src/components/ApiKeyInput.tsx` for user to input Gemini API key if not configured or invalid
- [ ] T033 Update `backend/src/main.py` startup to handle missing/invalid API key gracefully (show UI prompt instead of crash)

### Implementation for User Story 2

- [ ] T034 [P] [US2] Implement PDF extractor in `backend/src/services/extractor.py` extract_pdf method using PyPDF2 returning text content
- [ ] T035 [P] [US2] Implement text file extractor in `backend/src/services/extractor.py` extract_text method reading plain text files
- [ ] T036 [P] [US2] Implement URL extractor in `backend/src/services/extractor.py` extract_url method using BeautifulSoup4 fetching and parsing HTML
- [ ] T037 [US2] Implement content moderation service in `backend/src/services/moderation.py` check_content method calling Gemini Safety API, returning APPROVED/BLOCKED with categories
- [ ] T038 [US2] Implement text chunker in `backend/src/services/chunker.py` chunk_text method using RecursiveCharacterTextSplitter (512 tokens, 128 overlap) from research.md
- [ ] T039 [US2] Implement embedder service in `backend/src/services/embedder.py` embed_text method calling Gemini text-embedding-004 API returning 768-dim vectors
- [ ] T040 [US2] Implement vector store upsert in `backend/src/services/vector_store.py` upsert_chunks method storing DocumentChunk embeddings in Qdrant with payload metadata
- [ ] T041 [US2] Implement POST /upload/{session_id}/file endpoint in `backend/src/api/routes/upload.py` accepting multipart file upload, validating format (PDF/text only, max 10MB), returning 202 with document_id
- [ ] T042 [US2] Implement POST /upload/{session_id}/url endpoint in `backend/src/api/routes/upload.py` accepting URL, validating format, returning 202 with document_id
- [ ] T043 [US2] Implement GET /upload/{session_id}/status/{document_id} endpoint in `backend/src/api/routes/upload.py` returning extraction_status, moderation_status, chunk_count, processing_progress (0-100%), error_code
- [ ] T044 [US2] Implement GET /upload/{session_id}/documents endpoint in `backend/src/api/routes/upload.py` listing all documents with chunk counts
- [ ] T045 [US2] Implement document processing pipeline orchestrator coordinating: extract → moderate → chunk → embed → store flow with progress tracking and error handling
- [ ] T046 [US2] Create upload service in `frontend/src/services/uploadService.ts` with uploadFile, uploadUrl, getStatus, getDocuments API calls
- [ ] T047 [US2] Create UploadScreen component in `frontend/src/components/UploadScreen.tsx` with file picker, URL input, drag-drop support, format validation UI
- [ ] T048 [US2] Create ProcessingScreen component in `frontend/src/components/ProcessingScreen.tsx` with progress bar, status display, error messages (ERR_EXTRACT_FAILED, ERR_FETCH_FAILED, ERR_MODERATION_BLOCKED)
- [ ] T049 [US2] Implement status polling logic in ProcessingScreen checking GET /upload/{session_id}/status/{document_id} every 2 seconds until complete or failed

**Checkpoint**: Document upload pipeline complete - users can upload PDF/text/URLs, pass moderation, and see processing progress

---

## Phase 5: User Story 3 - Strict RAG Query Response (P3) 🎯 MVP Core

**Goal**: Implement RAG query pipeline with query embedding, Qdrant similarity search (≥0.7 threshold), prompt building, Gemini LLM response, and "cannot answer" fallback

**Independent Test**: Upload specific document, ask answerable questions (should get accurate responses with retrieved chunks), ask unanswerable questions (should get "I cannot answer based on uploaded documents")

### Implementation for User Story 3

- [ ] T061 [P] [US3] Implement vector search in `backend/src/services/vector_store.py` search_similar method querying Qdrant with cosine similarity, filtering by score_threshold ≥0.7
- [ ] T062 [P] [US3] Implement RAG prompt builder in `backend/src/services/rag_engine.py` build_prompt method combining retrieved chunks + user query
- [ ] T063 [US3] Implement RAG response generator in `backend/src/services/rag_engine.py` generate_response method calling Gemini gemini-pro with temperature=0.1 (per research.md)
- [ ] T064 [US3] Implement metrics calculator in `backend/src/services/metrics_service.py` calculate_metrics method extracting token counts from Gemini response metadata, calculating percentages
- [ ] T065 [US3] Implement memory manager in `backend/src/services/memory_manager.py` with sliding window summary logic (per research.md) triggering at 80% token threshold
- [ ] T066 [US3] Implement POST /chat/{session_id}/query endpoint in `backend/src/api/routes/chat.py` accepting user_query, returning ChatResponse with llm_response, response_type (ANSWERED/CANNOT_ANSWER), retrieved_chunks, similarity_scores, metrics
- [ ] T067 [US3] Implement GET /chat/{session_id}/history endpoint in `backend/src/api/routes/chat.py` returning paginated chat message history with limit/offset
- [ ] T068 [US3] Create chat service in `frontend/src/services/chatService.ts` with sendQuery, getHistory API calls
- [ ] T069 [US3] Create ChatScreen component in `frontend/src/components/ChatScreen.tsx` with message list, scroll-to-bottom, loading indicators
- [ ] T070 [US3] Create ChatMessage component in `frontend/src/components/ChatMessage.tsx` displaying user query and LLM response with timestamp, styling ANSWERED vs CANNOT_ANSWER differently
- [ ] T071 [US3] Create ChatInput component in `frontend/src/components/ChatInput.tsx` with textarea, send button, character count, Enter-to-send support
- [ ] T072 [US3] Implement query submission flow in ChatScreen calling sendQuery, appending to message list, handling CANNOT_ANSWER responses with appropriate styling

**Checkpoint**: RAG query pipeline complete - users can ask questions and receive strict context-based responses with "cannot answer" fallback

---

## Phase 6: User Story 4 - Real-time Multilingual UI Language Switching (P4)

**Goal**: Implement complete UI language switching with cycling animation on language selector button and instant UI updates preserving chat history

**Independent Test**: Select different languages and verify all UI labels update, button text cycles through 7 languages every 1 second, Arabic shows RTL layout, chat history preserved

### Implementation for User Story 4

- [ ] T073 [P] [US4] Implement language cycling animation in LanguageSelector component using setInterval (1-second cycle through ["English", "中文", "한국어", "Español", "日本語", "العربية", "Français"])
- [ ] T074 [P] [US4] Add RTL layout support in `frontend/src/App.tsx` detecting `ar` language and applying `dir="rtl"` attribute to root element
- [ ] T075 [US4] Implement language change handler in useLanguage hook calling i18n.changeLanguage and PUT /session/{session_id}/language endpoint
- [ ] T076 [US4] Verify all components use i18n translation keys (t('key')) instead of hardcoded strings in Header, UploadScreen, ProcessingScreen, ChatScreen, ChatInput, MetricsPanel
- [ ] T077 [US4] Test language switching flow: click dropdown → select language → verify UI updates <500ms → verify chat history preserved → verify subsequent interactions use new language

**Checkpoint**: Multilingual UI complete - users can switch between 7 languages with instant UI updates and cycling animation

---

## Phase 7: User Story 5 - Real-time Metrics Display (P5)

**Goal**: Implement comprehensive metrics panel showing token_input, token_output, token_total, token_percent, context_tokens, context_percent, vector_count with real-time updates and visual indicators

**Independent Test**: Monitor metrics panel during upload and chat, verify all values update accurately in real-time, verify progress bars and color coding (green <50%, yellow 50-80%, red >80%)

### Implementation for User Story 5

- [ ] T078 [P] [US5] Create useMetrics custom hook in `frontend/src/hooks/useMetrics.ts` managing metrics state from session GET and chat responses
- [ ] T079 [US5] Create MetricsPanel component in `frontend/src/components/MetricsPanel.tsx` displaying all 8 metrics with labels, current values, progress bars for percentages
- [ ] T080 [US5] Implement progress bar color logic in MetricsPanel: green (<50%), yellow (50-80%), red (>80%) for token_percent and context_percent
- [ ] T081 [US5] Integrate MetricsPanel into ProcessingScreen showing vector_count increasing during upload
- [ ] T082 [US5] Integrate MetricsPanel into ChatScreen updating after each query-response cycle
- [ ] T083 [US5] Implement visual warning for token_percent >80% with icon or color change per success criteria SC-005

**Checkpoint**: Metrics display complete - users see transparent real-time resource usage throughout upload and chat

---

## Phase 8: User Story 6 - Session Management Controls (P6)

**Goal**: Implement Leave and Restart buttons with confirmation dialogs, session closure, and data cleanup

**Independent Test**: Click Leave → verify confirmation → verify session deleted and Qdrant collection removed. Click Restart → verify new session created with clean state

### Implementation for User Story 6

- [x] T084 [P] [US6] Implement Leave button handler in Header component showing confirmation dialog ("Are you sure you want to leave? All session data will be deleted.") ✅ 完成 (2025-12-18)
- [x] T085 [P] [US6] Implement Restart button handler in Header component showing confirmation dialog ("Restart will create a new session. Current chat history will be lost.") ✅ 完成 (2025-12-18)
- [x] T086 [US6] Connect Leave button to useSession hook calling closeSession action → POST /session/{session_id}/close → redirect to home/new session ✅ 完成 (2025-12-18)
- [x] T087 [US6] Connect Restart button to useSession hook calling restartSession action → POST /session/{session_id}/restart → update session_id → reset UI to UploadScreen ✅ 完成 (2025-12-18)
- [x] T088 [US6] Verify Qdrant collection deletion in session close flow checking collection no longer exists after Leave/Restart ✅ 驗證完成，自動化測試 11/11 PASSED (2025-12-18)

**Checkpoint**: Session controls complete - users can manually close or restart sessions with immediate cleanup

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

- [x] T089 [P] Add comprehensive error handling in all API routes with proper HTTP status codes (400, 404, 409, 410, 500) per OpenAPI contracts
- [x] T090 [P] Add request validation middleware in FastAPI using Pydantic models for all endpoints
- [x] T091 [P] Implement logging throughout backend services using Python logging module with INFO/ERROR levels
- [ ] T092 [P] Add loading states and spinners in all frontend components during API calls
- [ ] T093 [P] Implement error boundary in `frontend/src/App.tsx` catching React errors with user-friendly fallback UI
- [ ] T094 [P] Add responsive design breakpoints in Bootstrap components for mobile/tablet/desktop
- [ ] T095 [P] Implement file type validation rejecting image files and unsupported formats with UNSUPPORTED_FORMAT error per edge cases
- [ ] T096 [P] Add file size validation rejecting files >10MB with FILE_TOO_LARGE error per edge cases
- [ ] T097 [P] Handle empty/scanned PDFs with EMPTY_FILE error per edge cases
- [ ] T098 [P] Add network timeout handling for URL fetch with 30-second timeout per edge cases
- [ ] T099 [P] Implement rate limit handling for Gemini API with retry logic and user-friendly error messages
- [ ] T100 [P] Add Qdrant connection error handling with fallback messages
- [x] T101 Create README.md with project description, setup instructions, environment variables, Qdrant setup (embedded/Docker/Cloud), running instructions
- [ ] T102 Run manual testing scenarios from `specs/001-multilingual-rag-chatbot/quickstart.md` validating all 6 user stories + 6 edge cases
- [ ] T103 Verify all 10 success criteria from spec.md are met (SC-001 to SC-010)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - START HERE ✅
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Can start immediately after Phase 2
- **User Story 2 (Phase 4)**: Depends on Foundational - Can start after Phase 2 (independent of US1)
- **User Story 3 (Phase 5)**: Depends on Foundational + US2 (needs uploaded documents) - Start after US2 complete
- **User Story 4 (Phase 6)**: Depends on Foundational - Can start after Phase 2 (independent, but best after US1-3 for testing)
- **User Story 5 (Phase 7)**: Depends on US2 and US3 (needs metrics from upload and chat) - Start after US2+US3 complete
- **User Story 6 (Phase 8)**: Depends on US1 (needs session management) - Start after US1 complete
- **Polish (Phase 9)**: Depends on all desired user stories - FINAL PHASE

### Recommended Execution Order (MVP-First)

**Sprint 1 - Core Infrastructure**:
1. Phase 1: Setup (T001-T010)
2. Phase 2: Foundational (T011-T030)

**Sprint 2 - MVP Core (P1-P3)**:
3. Phase 3: US1 Session Creation (T031-T044) - **CRITICAL PATH**
4. Phase 4: US2 Upload & Moderation (T045-T060) - **CRITICAL PATH**
5. Phase 5: US3 RAG Query (T061-T072) - **CRITICAL PATH**

**Sprint 3 - Enhancements (P4-P6)**:
6. Phase 6: US4 Multilingual UI (T073-T077)
7. Phase 7: US5 Metrics Display (T078-T083)
8. Phase 8: US6 Session Controls (T084-T088)

**Sprint 4 - Production Ready**:
9. Phase 9: Polish (T089-T103)

### MVP Definition

**Minimum Viable Product** includes:
- Phase 1: Setup ✅
- Phase 2: Foundational ✅
- Phase 3: US1 Session Creation (P1) ✅
- Phase 4: US2 Upload & Moderation (P2) ✅
- Phase 5: US3 RAG Query (P3) ✅

This MVP demonstrates core RAG capabilities: session isolation, document upload with moderation, strict context-based responses.

### Parallel Opportunities

**Within Setup (Phase 1)**:
- T003 (backend requirements) + T004 (frontend package.json) + T005 (env) + T006 (gitignore) + T007 (docker-compose) can run in parallel

**Within Foundational (Phase 2)**:
- T012-T015 (all Pydantic models) can run in parallel
- T018-T021 (all TypeScript types) can run in parallel
- T024-T030 (all i18n translations) can run in parallel

**Within User Story 2 (Phase 4)**:
- T045-T047 (all extractor methods) can run in parallel after T011 config ready

**Within User Story 5 (Phase 7)**:
- T078 (hook) + T079 (component) + T080 (color logic) can run in parallel

**Within Polish (Phase 9)**:
- T089-T100 (all error handling and validation tasks) can run in parallel

### Critical Path

The longest dependency chain is:
```
Setup (T001-T010) 
→ Foundational (T011-T030) 
→ US1 Session (T031-T044) 
→ US2 Upload (T045-T060) 
→ US3 RAG Query (T061-T072) 
→ Polish (T089-T103)
```

Estimated: ~10-15 days for solo developer working MVP-first approach

---

## Parallel Example: User Story 2 Upload Pipeline

If working with a team, these US2 tasks can run in parallel:

**Developer A - Backend Extraction**:
- T045: PDF extractor
- T046: Text extractor  
- T047: URL extractor

**Developer B - Backend Processing**:
- T048: Moderation service
- T049: Chunker service
- T050: Embedder service
- T051: Vector store upsert

**Developer C - Backend API**:
- T052: POST /upload file endpoint
- T053: POST /upload URL endpoint
- T054: GET /status endpoint
- T055: GET /documents endpoint

**Developer D - Frontend**:
- T057: Upload service
- T058: UploadScreen component
- T059: ProcessingScreen component

All converge at T056 (pipeline orchestrator) and T060 (polling logic).

---

## Implementation Strategy

### Test-First Approach (Optional)

If following TDD, for each user story:
1. Write contract tests validating OpenAPI schema compliance
2. Write integration tests for complete user journeys
3. **Ensure tests FAIL** before implementation
4. Implement features to make tests pass
5. Refactor while keeping tests green

### File Organization

**Backend** (`backend/src/`):
- `models/`: Pydantic schemas matching data-model.md entities
- `services/`: Business logic (extractor, moderation, chunker, embedder, vector_store, rag_engine, memory_manager, metrics_service)
- `core/`: Infrastructure (config, session_manager, scheduler)
- `api/routes/`: FastAPI endpoints (session.py, upload.py, chat.py)

**Frontend** (`frontend/src/`):
- `components/`: React UI components (Header, LanguageSelector, UploadScreen, ProcessingScreen, ChatScreen, ChatMessage, ChatInput, MetricsPanel)
- `hooks/`: Custom React hooks (useSession, useLanguage, useMetrics)
- `services/`: API clients (api.ts, sessionService.ts, uploadService.ts, chatService.ts)
- `types/`: TypeScript interfaces matching backend schemas
- `i18n/`: Internationalization config and translation files

### Quality Gates

Before marking each phase complete:
- [ ] All tasks in phase have checkboxes marked ✅
- [ ] Code follows project structure from plan.md
- [ ] All new API endpoints match contracts/*.openapi.yaml specifications
- [ ] All Pydantic models match data-model.md entity definitions
- [ ] All TypeScript types match backend schemas
- [ ] Manual testing scenarios from quickstart.md validated for that phase
- [ ] No console errors in browser dev tools
- [ ] No Python exceptions in backend logs

---

## Task Count Summary

- **Total Tasks**: 103
- **Phase 1 (Setup)**: 10 tasks
- **Phase 2 (Foundational)**: 20 tasks
- **Phase 3 (US1 - P1 MVP)**: 14 tasks ← CRITICAL
- **Phase 4 (US2 - P2 MVP)**: 16 tasks ← CRITICAL
- **Phase 5 (US3 - P3 MVP)**: 12 tasks ← CRITICAL
- **Phase 6 (US4 - P4)**: 5 tasks
- **Phase 7 (US5 - P5)**: 6 tasks
- **Phase 8 (US6 - P6)**: 5 tasks
- **Phase 9 (Polish)**: 15 tasks

**MVP Task Count**: Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 = **72 tasks** (70% of total)

**Parallel Opportunities**: 47 tasks marked [P] can run in parallel within their phase

---

## Next Steps

1. ✅ Review this task list for completeness
2. ✅ Confirm all tasks have proper file paths
3. ✅ Verify task dependencies match user story priorities
4. ▶️ **START IMPLEMENTATION** with Phase 1: Setup (T001)
5. Work through tasks sequentially within each phase
6. Mark checkboxes as tasks complete
7. Validate each phase against quickstart.md scenarios
8. Run full validation after Phase 9 complete

**Ready to begin?** Start with `T001: Create backend directory structure`

---

**Branch**: `001-multilingual-rag-chatbot`  
**Tasks Location**: `specs/001-multilingual-rag-chatbot/tasks.md`  
**Status**: ✅ Task Generation Complete - Ready for Implementation
