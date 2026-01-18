# Multilingual RAG Chatbot

**AI Engineering Portfolio Project** - Exploring how RAG technology reduces LLM hallucinations for more focused, evidence-based AI responses

---

## Project Purpose

This is a research-oriented AI engineering portfolio project demonstrating how **RAG (Retrieval-Augmented Generation)** technology optimizes large language model output quality.

### Core Concept

**Enforcing AI Logic**: Forces AI to search a knowledge base before answering, ensuring responses are grounded in relevant content rather than hallucinated information.

### RAG Implementation Workflow

This project implements the complete RAG pipeline:

1. **Document Processing**: Upload files or crawl web content
2. **Content Moderation**: Filter inappropriate content via Gemini Safety API
3. **Text Chunking**: Split documents into 2000-character segments (500-char overlap)
4. **Vectorization**: Convert text to 768-dimensional vectors using Gemini text-embedding-004
5. **Vector Storage**: Store embeddings in Qdrant Vector DB with semantic indexing
6. **Semantic Retrieval**: Vectorize user queries and search for relevant document chunks
7. **LLM Response Validation**: Pass retrieved context to Gemini LLM for grounded answers

The final **LLM chat interface** allows users to validate RAG effectiveness by verifying that AI responses are strictly based on uploaded content, not fabricated information.

---

## Tech Stack

### Frontend
- **React 18+**: Modern UI framework with Hooks architecture
- **TypeScript 5.x**: Type-safe development experience
- **SCSS**: Modular styling system
- **Vite 5+**: Fast development and build tooling
- **Bootstrap 5+**: Responsive UI components
- **i18next**: Multilingual support (English, French, Traditional Chinese, Simplified Chinese)

### Backend
- **FastAPI**: High-performance async Python web framework
- **Qdrant**: Vector database for semantic search
- **Google Gemini API**: 
  - LLM: gemini-2.0-flash-exp
  - Embedding: text-embedding-004
- **APScheduler**: Session management and auto-cleanup (30-minute TTL)

### DevOps
- **Docker & Docker Compose**: Containerized deployment
- **Git**: Version control
- **Render.com**: Backend cloud deployment (free tier)
- **A2 Hosting**: Frontend static file hosting
- **Qdrant Cloud**: Vector database cloud service (free 1GB)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker
- Gemini API Key

### Setup Instructions

1. **Start Vector Database**
```bash
docker-compose up -d qdrant
```

2. **Configure Environment** (backend/.env.local)
```bash
GEMINI_API_KEY=your_key_here
QDRANT_MODE=docker
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

3. **Start Backend** (port 8000)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn src.main:app --reload
```

4. **Start Frontend** (port 5173)
```bash
cd frontend
npm install
npm run dev
```

---

## Key Features

- **Session Isolation**: Each user gets dedicated Qdrant collection
- **Auto-Cleanup**: All data deleted after 30 minutes
- **Content Moderation**: Automatic filtering of inappropriate content
- **Semantic Search**: Cosine similarity search (default threshold 0.6)
- **Multilingual UI**: Support for 4 languages with instant switching
- **API Quota Management**: User can provide own API key when system quota exhausted
- **Real-time Metrics**: Display token usage and query statistics

---

## Documentation

- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- [Quick Start Guide](./docs/QUICK_START_GUIDE.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING_GUIDE.md)

---

## License

MIT License - Portfolio Demonstration Project

**Author**: Jen Hao Hsiao (@Jenhaohsiao)  
**GitHub**: https://github.com/Jenhaohsiao/RAG_Demo_Chatbot
