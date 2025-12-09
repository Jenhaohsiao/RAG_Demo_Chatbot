# Implementation Plan: Multilingual RAG-Powered Chatbot

**Branch**: `001-multilingual-rag-chatbot` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-multilingual-rag-chatbot/spec.md`

## Summary

Build a production-ready multilingual RAG-powered chatbot for AI Engineer portfolio demonstration. The system automatically creates isolated sessions, allows users to upload documents (PDF/text/URLs), validates content through Gemini Safety API, embeds content into Qdrant vector database with per-session isolation, and responds to queries strictly based on retrieved context (no hallucination). Supports 7 languages with real-time UI switching, displays resource metrics transparently, and implements automatic 30-minute session TTL with complete data cleanup.

**Technical Approach**: Web application with React/TypeScript/Vite frontend and FastAPI Python backend. Backend implements modular architecture with dedicated services for session management, content extraction, moderation, chunking, embedding, vector storage, RAG pipeline, memory management, metrics tracking, and automated cleanup scheduling. Uses Qdrant Vector Database (embedded mode for development, Docker for integration testing, Qdrant Cloud for production) with per-session collection isolation. Gemini API provides LLM, embedding, and safety moderation capabilities.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend)

**Primary Dependencies**:
- **Backend**: FastAPI 0.104+, qdrant-client, google-generativeai, PyPDF2, beautifulsoup4, python-dotenv, APScheduler
- **Frontend**: React 18+, Vite 5+, Bootstrap 5+, axios, react-i18next

**Storage**: 
- **Vector Database**: Qdrant Vector Database (embedded/Docker for dev/test) + Qdrant Cloud (1GB free tier for production)
- **Session State**: In-memory (FastAPI application state) with scheduled cleanup
- **No persistent user data** (ephemeral by constitutional requirement)

**Testing**: 
- **Backend**: pytest, pytest-asyncio, pytest-cov, httpx (for FastAPI testing)
- **Frontend**: Jest, React Testing Library, Playwright (E2E)

**Target Platform**: 
- **Development**: Windows/macOS/Linux with Docker
- **Production**: Together.ai or similar containerized platform (pay-per-use model)
- **Browsers**: Modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)

**Project Type**: Web application (frontend + backend)

**Performance Goals**:
- Document processing: <30 seconds for 3-5 page PDFs
- Query response time: <3 seconds (embedding + vector search + LLM generation)
- UI language switching: <500ms
- Metrics update latency: <1 second
- Concurrent sessions: 10+ without degradation

**Constraints**:
- **Gemini API Key Management**: Developer provides API key via .env file OR user inputs key in UI if missing/invalid
- Session TTL: Fixed 30 minutes (constitutional requirement)
- Similarity threshold: ≥0.7 for RAG context inclusion
- Context window management via summary memory
- Strict RAG enforcement (no responses outside uploaded documents)
- All content must pass Gemini Safety moderation
- Token/context/vector metrics must be visible in real-time

**Scale/Scope**:
- **Users**: 10-50 concurrent demo sessions
- **Document size**: 5-20 pages typical, <10MB files
- **Vector storage**: ~5-20MB per session
- **Qdrant Cloud free tier**: 1GB total (supports ~50-200 demo sessions)
- **Code size**: Estimated ~3,000-5,000 LOC (backend + frontend)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Principle I: MVP-First
**Status**: PASS
- Architecture focuses on core RAG functionality (P1-P3 user stories)
- P4-P6 features (multilingual UI, metrics, manual session controls) marked as enhancements
- No premature optimization or over-engineering in design

### ✅ Principle II: Testability  
**Status**: PASS
- Modular backend architecture (Session Manager, Extractor, Moderation, Chunker, Embedder, Vector Store, RAG Engine, Memory Manager, Metrics Service, Scheduler)
- Each module independently testable
- Frontend components isolated and testable
- Contract tests for API endpoints planned

### ✅ Principle III: Ephemeral Data
**Status**: PASS
- 30-minute session TTL implemented via APScheduler
- Automatic Qdrant collection deletion on session expiry
- No persistent user data storage
- In-memory session state only

### ✅ Principle IV: Session Isolation
**Status**: PASS
- Each session gets dedicated Qdrant collection (`session_{session_id}`)
- No cross-session data sharing
- Collection-level isolation enforced

### ✅ Principle V: Strict RAG
**Status**: PASS
- Similarity threshold ≥0.7 enforced
- Context-only prompts to Gemini API
- Explicit "cannot answer" response when no relevant context found
- No fallback to general knowledge

### ✅ Principle VI: Moderation First
**Status**: PASS
- Gemini Safety API check before any content processing
- Upload flow: Extract → Moderate → Chunk → Embed
- Moderation failures return ERR_MODERATION_BLOCKED
- No embedding of unmoderated content

### ✅ Principle VII: Fixed Technology Stack
**Status**: PASS
- Backend: FastAPI ✅
- Frontend: React + TypeScript + Vite ✅
- AI/LLM: Gemini API (LLM + Embeddings + Safety) ✅
- Vector DB: Qdrant Vector Database (dev/test) + Qdrant Cloud (prod) ✅
- Testing: pytest (backend), Jest/Playwright (frontend) ✅

### ✅ Principle VIII: API Contract Stability
**Status**: PASS
- API contracts defined in `/contracts` directory
- REST API with versioning capability (`/api/v1/...`)
- OpenAPI/Swagger documentation generation planned

### ✅ Principle IX: Secrets Management
**Status**: PASS
- `.env` file for all secrets (GEMINI_API_KEY, QDRANT_API_KEY, etc.)
- `.gitignore` configured to exclude `.env`
- Environment-based configuration loading

**GATE RESULT**: ✅ ALL CONSTITUTIONAL PRINCIPLES SATISFIED - PROCEED TO PHASE 0

## Project Structure

### Documentation (this feature)

```text
specs/001-multilingual-rag-chatbot/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── session.openapi.yaml
│   ├── upload.openapi.yaml
│   └── chat.openapi.yaml
├── checklists/
│   └── requirements.md  # Already created
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
RAG_Demo_Chatbot/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── session.py       # Session creation, closure, restart
│   │   │   │   ├── upload.py        # Document/URL upload endpoints
│   │   │   │   └── chat.py          # Query endpoints
│   │   │   ├── dependencies.py      # FastAPI dependencies
│   │   │   └── middleware.py        # CORS, error handling
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py            # Environment config, settings
│   │   │   ├── session_manager.py   # Session lifecycle management
│   │   │   └── scheduler.py         # APScheduler for TTL cleanup
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── extractor.py         # PDF/text/URL extraction
│   │   │   ├── moderation.py        # Gemini Safety API
│   │   │   ├── chunker.py           # Text chunking logic
│   │   │   ├── embedder.py          # Gemini Embedding API
│   │   │   ├── vector_store.py      # Qdrant client wrapper
│   │   │   ├── rag_engine.py        # RAG pipeline (search + prompt building)
│   │   │   ├── memory_manager.py    # Summary memory for context window
│   │   │   └── metrics_service.py   # Token/context/vector tracking
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── session.py           # Session Pydantic models
│   │   │   ├── document.py          # Document/chunk models
│   │   │   ├── chat.py              # Query/response models
│   │   │   └── metrics.py           # Metrics models
│   │   └── main.py                  # FastAPI app entry point
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── test_extractor.py
│   │   │   ├── test_moderation.py
│   │   │   ├── test_chunker.py
│   │   │   ├── test_embedder.py
│   │   │   └── test_rag_engine.py
│   │   ├── integration/
│   │   │   ├── test_upload_flow.py
│   │   │   ├── test_query_flow.py
│   │   │   └── test_session_lifecycle.py
│   │   └── contract/
│   │       ├── test_session_api.py
│   │       ├── test_upload_api.py
│   │       └── test_chat_api.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pytest.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx           # App name, language selector, Leave, Restart buttons
│   │   │   ├── LanguageSelector.tsx # Animated cycling dropdown
│   │   │   ├── UploadScreen.tsx     # Initial file/URL upload UI
│   │   │   ├── ProcessingScreen.tsx # Progress bar, metrics during upload
│   │   │   ├── ChatScreen.tsx       # Main chat interface
│   │   │   ├── ChatMessage.tsx      # Individual message component
│   │   │   ├── ChatInput.tsx        # User input field
│   │   │   └── MetricsPanel.tsx     # Token/context/vector display
│   │   ├── hooks/
│   │   │   ├── useSession.ts        # Session state management
│   │   │   ├── useLanguage.ts       # i18n language switching
│   │   │   └── useMetrics.ts        # Metrics state management
│   │   ├── services/
│   │   │   ├── api.ts               # Axios client configuration
│   │   │   ├── sessionService.ts    # Session API calls
│   │   │   ├── uploadService.ts     # Upload API calls
│   │   │   └── chatService.ts       # Chat API calls
│   │   ├── i18n/
│   │   │   ├── config.ts            # react-i18next setup
│   │   │   └── locales/
│   │   │       ├── en.json          # English translations
│   │   │       ├── zh.json          # Chinese translations
│   │   │       ├── ko.json          # Korean translations
│   │   │       ├── es.json          # Spanish translations
│   │   │       ├── ja.json          # Japanese translations
│   │   │       ├── ar.json          # Arabic translations
│   │   │       └── fr.json          # French translations
│   │   ├── types/
│   │   │   ├── session.ts
│   │   │   ├── document.ts
│   │   │   ├── chat.ts
│   │   │   └── metrics.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── Header.test.tsx
│   │   │   ├── LanguageSelector.test.tsx
│   │   │   └── ChatScreen.test.tsx
│   │   └── e2e/
│   │       ├── upload-flow.spec.ts
│   │       ├── chat-flow.spec.ts
│   │       └── language-switch.spec.ts
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── jest.config.js
│   └── playwright.config.ts
├── .env.example
├── .gitignore
├── docker-compose.yml          # Qdrant + Backend + Frontend for local testing
├── README.md
└── .github/
    └── workflows/
        └── ci.yml              # GitHub Actions for testing

```

**Structure Decision**: Web application architecture selected due to frontend + backend requirements. Backend implements modular service-oriented architecture for testability (constitutional requirement II). Frontend uses component-based React architecture with hooks for state management and services layer for API communication. Separation of concerns enables independent development and testing of each layer.

## Complexity Tracking

No constitutional violations detected. All complexity decisions align with MVP-First principle:

- **Modular Services**: Each service (Extractor, Moderation, Chunker, etc.) has single responsibility, enabling independent testing and avoiding monolithic complexity
- **REST API**: Standard HTTP-based API avoids unnecessary abstraction over GraphQL or gRPC
- **Docker Compose**: Simple local orchestration instead of Kubernetes complexity
- **Embedded Qdrant for Dev**: Zero-infrastructure development environment vs. requiring cloud setup

All architecture decisions serve testability (Principle II) and fixed technology stack (Principle VII).

## Phase 0-1 Deliverables Summary

✅ **COMPLETE** - All Phase 0 and Phase 1 artifacts generated:

1. **research.md** (Phase 0): 10 technical decisions resolved with code examples and rationale
2. **data-model.md** (Phase 1): 6 entities fully specified with attributes, relationships, state machines
3. **contracts/session.openapi.yaml** (Phase 1): 6 session management endpoints
4. **contracts/upload.openapi.yaml** (Phase 1): 4 document processing endpoints
5. **contracts/chat.openapi.yaml** (Phase 1): 2 RAG query/response endpoints
6. **quickstart.md** (Phase 1): Manual testing scenarios for all 6 user stories + 6 edge cases

## Next Steps

The `/speckit.plan` command is now **COMPLETE**. To proceed with implementation:

### 1. Generate Task Breakdown

Run the `/speckit.tasks` command to create prioritized task list organized by user story.

### 2. Review Generated Artifacts

Before starting implementation, review:
- **plan.md** (this file): Technical context and constitutional compliance
- **research.md**: Technology decisions and code examples
- **data-model.md**: Entity schemas for Pydantic models and TypeScript types
- **contracts/*.openapi.yaml**: API endpoint specifications
- **quickstart.md**: Manual testing scenarios

### 3. Begin Implementation

After task generation, work through tasks.md sequentially, starting with:
- Phase 1: Setup (project initialization)
- Phase 2: Foundational (core infrastructure)
- Phase 3: US-01 Session Creation (P1 MVP core)

### 4. Testing Strategy (Constitutional Requirement II)

**Test-First Approach** (recommended):
1. Write contract tests (validate API responses against OpenAPI schemas)
2. Write integration tests (test complete workflows)
3. Implement features to make tests pass
4. Write unit tests for individual services
5. Run full test suite in GitHub Actions

**Manual Testing**:
- Follow `quickstart.md` scenarios
- Verify all 10 success criteria from `spec.md`
- Test all 6 edge cases

### 5. Deployment Preparation

After MVP implementation (US-01, US-02, US-03):
1. Test with Qdrant Cloud Free Tier
2. Configure GitHub Actions CI pipeline
3. Verify test coverage ≥90% (backend), ≥80% (frontend)
4. Create demo video for portfolio

---

**Branch**: `001-multilingual-rag-chatbot`  
**Plan Location**: `specs/001-multilingual-rag-chatbot/plan.md`  
**Generated Artifacts**: `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Status**: ✅ Planning Phase Complete - Ready for `/speckit.tasks`
