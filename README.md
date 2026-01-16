# 🤖 Multilingual RAG-Powered Chatbot

> A production-ready multilingual chatbot demonstrating Retrieval-Augmented Generation (RAG) capabilities with strict context-based responses, session management, and real-time metrics tracking.

**Portfolio Project** | **Feature Branch**: `001-multilingual-rag-chatbot`  
**Status**: ✅ MVP Complete (Phase 1-7) | 🔄 Phase 8-9 In Progress

---

## 📸 Features

### ✨ Core Capabilities (MVP - Phases 1-5)

| Feature | Status | Details |
|---------|--------|---------|
| **🔐 Session Management** | ✅ Complete | Auto session creation, 30min TTL, manual controls |
| **📄 Document Upload** | ✅ Complete | PDF, Text files, URL content extraction |
| **🛡️ Content Moderation** | ✅ Complete | Gemini Safety API integration, automated filtering |
| **🤖 RAG Query Engine** | ✅ Complete | Vector search (≥0.7 similarity), strict context-based responses |
| **🌍 Multilingual UI** | ✅ Complete | 4 languages: English, Français, 繁體中文, 简体中文 |
| **📊 Metrics Dashboard** | ✅ Complete | Real-time token usage, query statistics, performance tracking |
| **♿ Accessibility** | ✅ Complete | WCAG AA compliance (6.8:1 contrast ratio), responsive design |

### 🚀 Enhancement Features (Phases 6-7)

- Real-time language switching
- Advanced metrics display with visual indicators
- Session control buttons (Leave/Restart) with confirmations
- Responsive design (Mobile/Tablet/Desktop)

---

## 🏗️ Architecture

### Backend Stack
- **Framework**: FastAPI 0.104+
- **Vector DB**: Qdrant (embedded/Docker for dev, Cloud for production)
- **LLM/Embedding**: Google Gemini API
- **Task Scheduling**: APScheduler (session TTL cleanup)
- **Language**: Python 3.11+

### Frontend Stack
- **Framework**: React 18+ with TypeScript 5.x
- **Build Tool**: Vite 5+
- **UI Framework**: Bootstrap 5+
- **Internationalization**: react-i18next
- **HTTP Client**: Axios

### Database
- **Qdrant Vector Database** (768-dimensional embeddings)
  - Development: Embedded or Docker mode
  - Production: Qdrant Cloud (1GB free tier)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (Frontend)
- **Python** 3.11+ (Backend)
- **Docker** (for Qdrant - recommended)
- **Gemini API Key** (https://ai.google.dev)

### 1. Clone & Install

```bash
git clone https://github.com/Jenhaohsiao/RAG_Demo_Chatbot.git
cd RAG_Demo_Chatbot

# Backend setup
cd backend
pip install -r requirements.txt
cd ..

# Frontend setup
cd frontend
npm install
cd ..
```

### 2. Environment Configuration

```bash
# Create .env.local (git-ignored) with your secrets
cp .env.example .env.local

# Edit .env.local:
# GEMINI_API_KEY=your_key_here
# QDRANT_URL=http://127.0.0.1:6333 (if local)
# SESSION_TTL_MINUTES=30
# SIMILARITY_THRESHOLD=0.7
```

### 3. Start Qdrant

```bash
# Using Docker (recommended)
docker-compose up -d qdrant

# Verify Qdrant is running
docker ps | grep qdrant
```

### 4. Run Backend & Frontend

```bash
# Terminal 1: Backend (port 8000)
cd backend
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend (port 5173)
cd frontend
npm run dev
```

### 5. Access Application

Open browser to: **http://localhost:5173**

---

## 📖 User Guide

### Basic Workflow

1. **Application Launch** → Auto-creates isolated session (30-min TTL)
2. **Upload Documents** → PDF/Text files or URL content
3. **Content Moderation** → Automatic safety check via Gemini API
4. **Ask Questions** → Vector search retrieves relevant chunks
5. **Get Answers** → LLM generates context-based responses
6. **Track Metrics** → Real-time token usage & performance stats
7. **Switch Language** → 4-language UI with instant translation
8. **Close Session** → Auto-cleanup after 30 minutes or manual leave

### Language Support

- 🇬🇧 **English** (en)
- 🇫🇷 **French** (fr)
- 🇹🇼 **Traditional Chinese** (zh-TW)
- 🇨🇳 **Simplified Chinese** (zh-CN)

---

## 🔧 API Reference

### Session Management

```bash
# Create session
POST /api/v1/session/create
→ { session_id, state, created_at, expires_at, qdrant_collection }

# Get session status
GET /api/v1/session/{session_id}
→ { session_id, state, language, created_at, expires_at, last_activity }

# Heartbeat (keep-alive)
POST /api/v1/session/{session_id}/heartbeat
→ { expires_at }

# Close session
POST /api/v1/session/{session_id}/close
→ { status: "closed" }

# Restart session
POST /api/v1/session/{session_id}/restart
→ { session_id, state, created_at, expires_at }

# Update language
PUT /api/v1/session/{session_id}/language
→ { language }
```

### Document Upload

```bash
# Upload file
POST /api/v1/upload/{session_id}/file
(multipart/form-data: file)
→ { document_id, status, progress }

# Upload URL
POST /api/v1/upload/{session_id}/url
(json: { url })
→ { document_id, status, progress }

# Get upload status
GET /api/v1/upload/{session_id}/status/{document_id}
→ { status, progress, chunks_count, error }

# List documents
GET /api/v1/upload/{session_id}/documents
→ [{ document_id, filename, chunks_count, created_at }]
```

### RAG Query

```bash
# Submit query
POST /api/v1/chat/{session_id}/query
(json: { query })
→ { 
    response, 
    response_type: "ANSWERED|CANNOT_ANSWER",
    retrieved_chunks, 
    similarity_scores,
    tokens_input, tokens_output, tokens_total
  }

# Get chat history
GET /api/v1/chat/{session_id}/history?limit=20&offset=0
→ [{ role, content, timestamp }]

# Get metrics
GET /api/v1/chat/{session_id}/metrics
→ { 
    tokens_total, tokens_input, tokens_output,
    total_queries, answered_queries, unanswered_queries,
    avg_similarity_score, warnings
  }
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
python -m pytest tests/ -v --no-cov

# Run specific phase
python -m pytest tests/test_phase5.py -v

# Run with coverage
python -m pytest tests/ --cov=src --cov-report=html
```

### Frontend Tests

```bash
cd frontend

# Run unit tests
npm run test

# Run e2e tests (requires backend running)
npm run test:e2e

# Run linter
npm run lint
```

### Manual Integration Test

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive manual test scenarios.

---

## 📊 System Architecture

### Data Flow

```
┌─ Frontend (React) ─────┐
│  - Session Mgmt        │
│  - File Upload (UI)    │
│  - Chat Interface      │
│  - i18n Switching      │
└────────────┬───────────┘
             │ HTTP/REST
             ↓
┌─ Backend API (FastAPI) ─────────┐
│  - Session Manager              │
│  - Upload Pipeline              │
│  - RAG Query Engine             │
│  - Error Handling               │
└────────┬─────────────────────────┘
         │
    ┌────┴──────────────┬─────────────────┐
    ↓                   ↓                 ↓
┌─ Qdrant ───┐  ┌─ Gemini API ──┐  ┌─ Scheduler ─┐
│ - Vectors  │  │ - Embedding   │  │ - TTL       │
│ - Chunks   │  │ - LLM         │  │ - Cleanup   │
│ - Search   │  │ - Safety      │  │ - Health    │
└────────────┘  └───────────────┘  └─────────────┘
```

### Session Lifecycle

```
1. User Opens App
   ↓
2. Session Created (READY_FOR_UPLOAD state)
   - Unique session_id generated
   - Qdrant collection created
   - 30-min TTL timer started
   ↓
3. User Uploads Documents
   - File/URL extracted
   - Content moderated (Gemini Safety API)
   - Text chunked (2000 chars, 500 overlap)
   - Chunks embedded (Gemini text-embedding-004)
   - Stored in Qdrant (session-specific collection)
   - State → READY_FOR_CHAT
   ↓
4. User Asks Questions
   - Query embedded (same Gemini model)
   - Vector search in Qdrant (similarity ≥ 0.7)
   - Top chunks retrieved
   - LLM generates response (Gemini 1.5 Flash)
   - Metrics tracked (tokens, queries, chunks)
   ↓
5. Session Cleanup
   - Auto-closes after 30-min inactivity (TTL)
   - OR manual close (Leave button)
   - Qdrant collection deleted
   - Session data purged
```

### Constitutional Principles

This project adheres to 15 core principles (see [constitution.md](./.specify/memory/constitution.md)):

1. **MVP-First** - Minimum viable product focus
2. **Testability** - All components independently testable
3. **Ephemeral Data** - 30-min session TTL, no persistent storage
4. **Session Isolation** - Per-user Qdrant collections
5. **Strict RAG** - No hallucination, context-only responses
6. **Moderation First** - Gemini Safety API as gatekeeper
7. **Fixed Tech Stack** - FastAPI, React, Qdrant only
8. **API Contract Stability** - Formal versioning (/api/v1/)
9. **Secrets Management** - .env files, no hardcoded keys
10. **Phase-End Integration Testing** - Quality gates between phases
11. **Progress Tracking** - PROGRESS.md mandatory updates
12. **Chinese Communication** - Traditional Chinese documentation
13. **Dependency Verification** - Pre-install dependency checks
14. **Code Review Standards** - English comments, 2-reviewer approval
15. **Web Accessibility** - WCAG AA compliance (6.8:1 contrast)

---

## 🐛 Troubleshooting

### Backend Server Auto-Shutdown (Resolved)

**Symptom**: Server shuts down after ~30 seconds or on first HTTP request

**Solution**:
1. Ensure Docker Desktop is running
2. Start Qdrant: `docker-compose up -d qdrant`
3. Verify Docker connection: `docker ps`
4. Use Python 3.11 (if 3.12 issues persist)

See [TROUBLESHOOTING_GUIDE.md](./docs/TROUBLESHOOTING_GUIDE.md) for detailed solutions.

### Qdrant Connection Issues

**Solution**: Use Docker mode (recommended)
```bash
# .env.local
QDRANT_MODE=docker
QDRANT_URL=http://127.0.0.1:6333
```

### Gemini API Rate Limits

**Solution**: Implement retry logic with exponential backoff
- Default: 60 requests/minute for Gemini API
- System automatically retries failed requests
- Check `GEMINI_API_KEY` validity in logs

---

## 📈 Performance Metrics

### Target Performance

| Metric | Target | Status |
|--------|--------|--------|
| Document Processing | <30s per 3-5 page PDF | ✅ Met |
| Query Response Time | <3s (embedding + search + LLM) | ✅ Met |
| Language Switching | <500ms UI update | ✅ Met |
| Metrics Update | <1s latency | ✅ Met |
| Concurrent Sessions | 10+ without degradation | ✅ Met |

### Real-Time Monitoring

Access metrics dashboard during chat:
- **Toggle Button**: Top-right corner
- **Metrics Displayed**:
  - Token Usage: Current, Input, Output, Average
  - Query Stats: Total, Answered, Unanswered, Avg Chunks
  - Progress Bars: Color-coded (Green <50%, Yellow 50-80%, Red >80%)

---

## 🔐 Security Considerations

### Data Privacy

- ✅ No persistent user data storage
- ✅ 30-minute automatic session expiration
- ✅ All uploaded content deleted on session close
- ✅ Session-isolated Qdrant collections
- ✅ Content moderation via Gemini Safety API

### API Security

- ✅ CORS middleware restricts origins
- ✅ Environment variables for secrets (.env.local)
- ✅ No API keys in version control
- ✅ Input validation on all endpoints
- ✅ Rate limiting on file uploads (10MB max)

### Infrastructure

- ✅ Runs in containerized Docker environment
- ✅ Optional cloud deployment (Qdrant Cloud, Gemini API)
- ✅ Health checks on all service dependencies

---

## 📦 Deployment

### Development

```bash
# Docker Compose (recommended)
docker-compose up -d qdrant
cd backend && python -m uvicorn src.main:app --reload
cd frontend && npm run dev
```

### Production

#### Option 1: Docker Containers

```bash
# Build backend container
docker build -t rag-chatbot:latest ./backend

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

#### Option 2: Cloud Deployment

**Backend**: Deploy FastAPI to:
- Railway.app
- Render
- Fly.io
- AWS Lambda + API Gateway

**Frontend**: Deploy React to:
- Vercel
- Netlify
- GitHub Pages

**Vector Database**: Use Qdrant Cloud
- Free tier: 1GB storage (supports 50-200 demo sessions)
- https://cloud.qdrant.io

---

## 📚 Documentation

- [Development Setup](./docs/TROUBLESHOOTING_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Qdrant Setup](./docs/qdrant-setup-guide.md)
- [Metrics Dashboard](./docs/METRICS_DASHBOARD_GUIDE.md)
- [Language Testing](./docs/PHASE6_LANGUAGE_TESTING.md)
- [Project Progress](./docs/PROGRESS.md)
- [Architecture Plan](./specs/001-multilingual-rag-chatbot/plan.md)
- [Feature Spec](./specs/001-multilingual-rag-chatbot/spec.md)

---

## 🤝 Contributing

This is a portfolio project. For improvements or bug reports, please open an issue or submit a pull request.

### Code Standards

- **Backend**: Python 3.11+, FastAPI conventions, async/await
- **Frontend**: TypeScript, React hooks, component-driven
- **Comments**: English (code readability)
- **Commits**: English + descriptive messages

### Testing Before PR

```bash
# Backend
cd backend && python -m pytest tests/ -v --no-cov

# Frontend
cd frontend && npm run lint && npm run test

# Integration
See TESTING_GUIDE.md for manual E2E scenarios
```

---

## 📄 License

MIT License - Portfolio project for demonstration purposes

---

## 👤 Author

**Jen Hao Hsiao** (@Jenhaohsiao)  
AI Engineer | Portfolio Project  
GitHub: https://github.com/Jenhaohsiao/RAG_Demo_Chatbot

---

## 🙏 Acknowledgments

- **Gemini API**: For LLM, embedding, and safety moderation capabilities
- **Qdrant**: For vector database solution
- **FastAPI**: For modern Python web framework
- **React**: For UI framework
- **Bootstrap**: For responsive design

---

**Last Updated**: 2025-12-18  
**Status**: ✅ MVP Complete | 🔄 Phase 8-9 In Progress | 📋 Final Polish

