# RAG Demo Chatbot Documentation

**Project**: RAG-Powered Chatbot  
**Branch**: `001-multilingual-rag-chatbot`  
**Last Updated**: 2026-01-20  
**UI Language**: English only (LLM conversation supports any language)

---

## 📚 Documentation Index

| Document | Purpose | Target Audience |
|----------|---------|-----------------|
| [🚀 Quick Start](QUICK_START_GUIDE.md) | Launch complete system in 5 minutes | All users |
| [📈 Project Progress](PROGRESS.md) | Feature completion status & system overview | Project management |
| [🔧 Troubleshooting](TROUBLESHOOTING_GUIDE.md) | Common issues & solutions | All users |
| [👥 User Testing](USER_TESTING_SETUP.md) | Test environment setup | Testers |
| [🛡️ Content Moderation](CONTENT_MODERATION_TEST_GUIDE.md) | Security feature testing guide | Developers |
| [🕷️ Website Crawler](WEBSITE_CRAWLER_FEATURE.md) | Website crawler complete guide | Developers |
| [📊 Similarity Threshold](SIMILARITY_THRESHOLD_FEATURE.md) | RAG precision control feature | Developers |
| [📋 Workflow Guide](WORKFLOW_STEPPER_GUIDE.md) | 6-step RAG process explanation | Users |
| [🧹 Multilingual Cleanup](MULTILINGUAL_CLEANUP_SUMMARY.md) | UI language simplification summary | Developers |

---

## 🚀 Quick Start

### 1️⃣ Launch System (if not running)
```powershell
cd C:\Projects\AI_projects\RAG_Demo_Chatbot
docker-compose up -d  # Start all services
docker ps  # Verify containers are running
```
**System Requirements**: Python 3.14, Docker, Node.js

### 2️⃣ Configure API Key
Set in `backend/.env`:
```bash
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 3️⃣ Check Backend Status
```powershell
# Backend runs in Docker
docker ps  # Confirm rag-chatbot-backend and rag-chatbot-qdrant are running
curl http://localhost:8000/health  # Check health status
```
✅ Response `{"status":"healthy"}` → Backend running normally

### 4️⃣ Start Frontend (Terminal)
```powershell
cd frontend
npm run dev
```
✅ See "Local: http://localhost:5175" → Frontend started

### 5️⃣ Start Using
- Open browser: **http://localhost:5175**
- System automatically creates new session
- Click "Start" button to begin

---

## ⚙️ Environment Setup

### Qdrant Setup
- **Recommended**: Docker Mode (avoids Windows file locking issues)
- **Port**: 6333
- **Health Check**: `http://localhost:6333/health`

Details: [qdrant-setup-guide.md](qdrant-setup-guide.md)

### Frontend-Backend Integration Testing
Includes complete troubleshooting guide and environment verification steps.

Details: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)

---

## 📊 Features

### Metrics Dashboard
Real-time system performance metrics:
- 🔋 Token Usage (total/input/output/average)
- 📊 Query Statistics (total/answered/unanswered)
- 📄 Document Status (count/processing status)
- ⏱️ Performance Metrics (average response time)

Details: [METRICS_DASHBOARD_GUIDE.md](METRICS_DASHBOARD_GUIDE.md)

---

## 🔧 Troubleshooting

### Common Issues
1. **Backend 404 Error** → Check Python dependencies and route registration
2. **Qdrant Connection Failed** → Confirm Docker containers running
3. **Frontend Proxy Error** → Check Vite config and backend status
4. **API Key Error** → Verify `.env` file configuration

Details: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)

---

## 📈 Progress Tracking

### Completed Phases
- ✅ **Phase 1**: Project Initialization (10/10)
- ✅ **Phase 2**: Foundation (20/20) - Tests passed 11/11
- ✅ **Phase 3**: Session Management (17/17) - Tests passed 1/1  
- ✅ **Phase 4**: Document Upload (16/16) - Tests passed 1/1
- ✅ **Phase 5**: RAG Query (12/12) - Partially tested 4/15

### Test Status
- **Automated Tests**: Phase 2-4 all passed (100%)
- **Phase 5**: Need to fix 11 test cases
- **Frontend-Backend Integration**: ✅ Fully functional

Details: [PROGRESS.md](PROGRESS.md)

---

## 🎯 Usage Flow

1. **Create Session** → Auto-creates and assigns UUID
2. **Upload Documents** → Supports PDF, text files, URLs
3. **Process Documents** → Auto-extract, moderate, chunk, embed
4. **RAG Query** → Semantic search and answers based on document content
5. **UI Language** → English only (LLM conversations support any language)
6. **Metrics Monitoring** → Real-time system performance

---

**Contact**: For issues, check troubleshooting guide or relevant documentation.