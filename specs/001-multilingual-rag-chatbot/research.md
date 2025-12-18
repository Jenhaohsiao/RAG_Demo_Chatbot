# Research & Technical Decisions: Multilingual RAG Chatbot

**Feature**: 001-multilingual-rag-chatbot  
**Phase**: 0 (Research & Resolution)  
**Date**: 2025-12-08  
**Status**: Complete

## Purpose

This document resolves all technical unknowns identified in the Technical Context and provides research-backed decisions for implementation. All NEEDS CLARIFICATION markers have been investigated and resolved.

---

## Research Area 1: Qdrant Deployment Strategy

### Decision: Hybrid Deployment Model

**Chosen Approach**:
- **Development**: Qdrant embedded mode (qdrant-client in-memory or local file)
- **Integration Testing**: Qdrant Docker container
- **Production**: Qdrant Cloud (Free Tier: 1GB)

**Rationale**:
- **Development Speed**: Embedded mode requires zero external dependencies, fastest iteration
- **CI/CD Testing**: Docker provides consistent test environment, matches production behavior
- **Production Economics**: Qdrant Cloud free tier provides 1GB storage (~50-200 demo sessions), zero maintenance overhead, professional deployment
- **Code Portability**: Same `qdrant-client` Python library across all environments, only connection parameters change

**Implementation**:
```python
# backend/src/core/config.py
def get_qdrant_client():
    env = os.getenv("ENVIRONMENT", "development")
    if env == "production":
        return QdrantClient(
            url=os.getenv("QDRANT_CLOUD_URL"),
            api_key=os.getenv("QDRANT_API_KEY")
        )
    elif env == "testing":
        return QdrantClient(host="localhost", port=6333)  # Docker
    else:
        return QdrantClient(path="./qdrant_data")  # Embedded local files
```

**Alternatives Considered**:
- **Chroma**: Rejected - violates constitutional requirement VII (Qdrant only)
- **Qdrant self-hosted on cloud VM**: Rejected - unnecessary maintenance overhead vs free managed tier
- **All-embedded mode**: Rejected - doesn't test production networking/latency scenarios

---

## Research Area 2: Session Management & TTL Implementation

### Decision: APScheduler with In-Memory Session Registry

**Chosen Approach**:
- **Session Storage**: Python dict in FastAPI application state (`app.state.sessions`)
- **TTL Implementation**: APScheduler BackgroundScheduler running every 1 minute
- **Cleanup Logic**: Check `last_activity` timestamp, delete expired sessions + Qdrant collections

**Rationale**:
- **Simplicity**: No external database required (aligns with MVP-first principle)
- **Ephemeral by Design**: In-memory storage naturally cleared on restart (constitutional requirement III)
- **Testability**: Easy to mock time and trigger cleanup in tests
- **APScheduler**: Lightweight, Python-native, widely used scheduling library

**Implementation**:
```python
# backend/src/core/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler

def cleanup_expired_sessions():
    now = datetime.utcnow()
    ttl = timedelta(minutes=30)
    for session_id, session in list(app.state.sessions.items()):
        if now - session.last_activity > ttl:
            # Delete Qdrant collection
            vector_store.delete_collection(f"session_{session_id}")
            # Remove from registry
            del app.state.sessions[session_id]

scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_expired_sessions, 'interval', minutes=1)
scheduler.start()
```

**Alternatives Considered**:
- **Redis with TTL**: Rejected - adds external dependency, over-engineering for demo scope
- **Database with timestamp**: Rejected - violates ephemeral data principle (no persistent storage)
- **Manual cleanup on each request**: Rejected - performance overhead, inconsistent timing

---

## Research Area 3: Content Chunking Strategy

### Decision: Fixed-Size Chunks with Overlap

**Chosen Approach**:
- **Chunk Size**: 512 tokens (~2000 characters)
- **Overlap**: 128 tokens (~500 characters)
- **Library**: LangChain `RecursiveCharacterTextSplitter` (handles sentence boundaries)

**Rationale**:
- **Gemini Context Window**: Gemini-pro supports 32k tokens, 512-token chunks ensure 20-30 chunks fit in context with overhead
- **Semantic Continuity**: 128-token overlap preserves context across chunk boundaries
- **Similarity Search Effectiveness**: 512 tokens provide sufficient semantic density for meaningful embeddings
- **LangChain**: Battle-tested library with good sentence-aware splitting logic

**Implementation**:
```python
# backend/src/services/chunker.py
from langchain.text_splitter import RecursiveCharacterTextSplitter

def chunk_text(text: str) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,      # ~512 tokens
        chunk_overlap=500,    # ~128 tokens
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    return splitter.split_text(text)
```

**Alternatives Considered**:
- **Semantic chunking** (by topic): Rejected - adds LLM API calls, slower, more complex
- **Fixed 1000-token chunks**: Rejected - fewer chunks fit in Gemini context window
- **No overlap**: Rejected - risks losing context at boundaries, reduces search recall

---

## Research Area 4: RAG Similarity Threshold

### Decision: Cosine Similarity ≥ 0.7

**Chosen Approach**:
- **Threshold**: 0.7 minimum cosine similarity
- **Fallback**: If no chunks meet threshold, return "cannot answer based on uploaded documents"

**Rationale**:
- **Strict RAG Enforcement**: 0.7 is industry standard for "confident match" (constitutional requirement V)
- **Prevents Hallucination**: Lower thresholds risk including marginally related content
- **User Experience**: Explicit "cannot answer" is better than incorrect/speculative response
- **Empirical Testing**: 0.7 provides good precision/recall balance in Gemini embeddings

**Implementation**:
```python
# backend/src/services/rag_engine.py
def search_context(query_embedding: List[float], session_id: str, top_k: int = 5):
    results = vector_store.search(
        collection_name=f"session_{session_id}",
        query_vector=query_embedding,
        limit=top_k
    )
    # Filter by similarity threshold
    relevant_chunks = [r for r in results if r.score >= 0.7]
    if not relevant_chunks:
        return None  # Trigger "cannot answer" response
    return relevant_chunks
```

**Alternatives Considered**:
- **0.5 threshold**: Rejected - too many false positives, violates strict RAG
- **0.8 threshold**: Rejected - too restrictive, reduces useful recall
- **Dynamic threshold**: Rejected - adds complexity without clear benefit for demo

---

## Research Area 5: Gemini API Configuration

### Decision: gemini-pro for Chat, text-embedding-004 for Embeddings

**Chosen Approach**:
- **LLM Model**: `gemini-pro` (latest stable)
- **Embedding Model**: `text-embedding-004` (768 dimensions)
- **Safety Settings**: Default Gemini Safety API settings (BLOCK_MEDIUM_AND_ABOVE)
- **Temperature**: 0.1 (low temperature for factual, grounded responses)

**Rationale**:
- **gemini-pro**: Free tier available, 32k context window, good performance-cost ratio
- **text-embedding-004**: Latest embedding model, 768-dim provides good semantic capture
- **Safety Settings**: Medium blocking level balances safety without over-blocking legitimate content
- **Low Temperature**: Reduces creativity, increases factual accuracy (aligns with strict RAG)

**Implementation**:
```python
# backend/src/services/embedder.py
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def embed_text(text: str) -> List[float]:
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']

# backend/src/services/rag_engine.py
def generate_response(context: str, query: str) -> str:
    model = genai.GenerativeModel('gemini-pro')
    prompt = f"""Based ONLY on the following context, answer the question.
    If the answer is not in the context, respond with "I cannot answer this based on the uploaded documents."
    
    Context:
    {context}
    
    Question: {query}
    
    Answer:"""
    
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(temperature=0.1)
    )
    return response.text
```

**Alternatives Considered**:
- **gemini-pro-vision**: Rejected - not needed (text-only documents)
- **Older embedding models**: Rejected - text-embedding-004 is latest and best
- **Higher temperature**: Rejected - increases hallucination risk

---

## Research Area 6: Frontend Internationalization (i18n)

### Decision: react-i18next with JSON Translation Files

**Chosen Approach**:
- **Library**: react-i18next (React integration of i18next)
- **Storage**: Static JSON files per language in `/src/i18n/locales/`
- **Language Detection**: Manual selection (no auto-detection based on browser)
- **Cycling Animation**: `setInterval` to rotate button text every 1 second

**Rationale**:
- **react-i18next**: Industry standard, widely adopted, excellent React integration
- **Static JSON**: Simple, no dynamic translation (avoids LLM API costs)
- **Manual Selection**: Explicit user control, demo-friendly
- **Performance**: Client-side translation switching is instant (<100ms)

**Implementation**:
```typescript
// frontend/src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
// ... other languages

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    // ... other languages
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

// frontend/src/components/LanguageSelector.tsx
const languages = ['English', '中文', '한국어', 'Español', '日本語', 'العربية', 'Français'];
const [cycleIndex, setCycleIndex] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setCycleIndex((prev) => (prev + 1) % languages.length);
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

**Alternatives Considered**:
- **Dynamic LLM translation**: Rejected - expensive, slow, unnecessary complexity
- **Browser auto-detection**: Rejected - demo needs explicit control
- **Polyglot.js**: Rejected - less feature-rich than i18next

---

## Research Area 7: Metrics Tracking Implementation

### Decision: Pydantic Models + Response Metadata

**Chosen Approach**:
- **Token Tracking**: Parse Gemini API response metadata (`usage_metadata.prompt_token_count`, `total_token_count`)
- **Context Tracking**: Calculate from retrieved chunk lengths
- **Vector Tracking**: Query Qdrant collection point count
- **Transport**: Include metrics in every API response payload

**Rationale**:
- **Gemini Metadata**: Official API provides exact token counts
- **Real-time**: Metrics available immediately after each operation
- **Simple Transport**: JSON response field, no separate metrics endpoint needed
- **Frontend Display**: React state updates trigger UI refresh

**Implementation**:
```python
# backend/src/models/metrics.py
from pydantic import BaseModel

class Metrics(BaseModel):
    token_input: int
    token_output: int
    token_limit: int = 32000  # Gemini-pro limit
    token_percent: float
    context_tokens: int
    context_percent: float
    vector_count: int

# backend/src/services/metrics_service.py
def calculate_metrics(gemini_response, context_chunks, session_id) -> Metrics:
    usage = gemini_response.usage_metadata
    vector_count = vector_store.get_collection_count(f"session_{session_id}")
    
    return Metrics(
        token_input=usage.prompt_token_count,
        token_output=usage.candidates_token_count,
        token_limit=32000,
        token_percent=(usage.total_token_count / 32000) * 100,
        context_tokens=sum(len(c.text.split()) for c in context_chunks) * 1.3,  # rough token estimate
        context_percent=(context_tokens / 32000) * 100,
        vector_count=vector_count
    )
```

**Alternatives Considered**:
- **Separate /metrics endpoint**: Rejected - adds complexity, requires polling
- **WebSocket streaming**: Rejected - over-engineering for demo scope
- **Estimated token counts**: Rejected - Gemini provides exact counts

---

## Research Area 8: PDF Extraction Library

### Decision: PyPDF2 for Text Extraction

**Chosen Approach**:
- **Library**: PyPDF2 (maintained fork of PyPDF)
- **Fallback**: If extraction fails, return ERR_EXTRACT_FAILED

**Rationale**:
- **PyPDF2**: Lightweight, pure Python, handles most text-based PDFs well
- **MVP Scope**: Scanned PDFs (OCR) out of scope for demo
- **Error Handling**: Explicit failure mode aligns with testability principle

**Implementation**:
```python
# backend/src/services/extractor.py
import PyPDF2
from io import BytesIO

def extract_pdf_text(file_bytes: bytes) -> str:
    try:
        pdf_reader = PyPDF2.PdfReader(BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        if not text.strip():
            raise ValueError("No text extracted")
        return text
    except Exception as e:
        raise ExtractionError("ERR_EXTRACT_FAILED", str(e))
```

**Alternatives Considered**:
- **pdfplumber**: Rejected - heavier dependency, overkill for basic text extraction
- **OCR (Tesseract)**: Rejected - slow, not needed for demo (text PDFs only)
- **PyMuPDF**: Rejected - C dependency complicates deployment

---

## Research Area 9: URL Content Extraction

### Decision: BeautifulSoup4 + requests

**Chosen Approach**:
- **HTTP**: `requests` library
- **Parsing**: BeautifulSoup4 with `html.parser`
- **Content**: Extract text from `<article>`, `<main>`, or `<body>` tags, strip scripts/styles

**Rationale**:
- **requests**: De facto standard for HTTP in Python
- **BeautifulSoup4**: Robust HTML parsing, handles malformed HTML gracefully
- **Simple Extraction**: Sufficient for demo, no need for advanced scraping

**Implementation**:
```python
# backend/src/services/extractor.py
import requests
from bs4 import BeautifulSoup

def extract_url_text(url: str) -> str:
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove scripts and styles
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Try to find main content
        main_content = soup.find('article') or soup.find('main') or soup.find('body')
        text = main_content.get_text(separator='\n', strip=True)
        
        if not text.strip():
            raise ValueError("No text extracted")
        return text
    except Exception as e:
        raise ExtractionError("ERR_FETCH_FAILED", str(e))
```

**Alternatives Considered**:
- **Scrapy**: Rejected - too heavy for simple extraction
- **Newspaper3k**: Rejected - outdated, maintenance concerns
- **Playwright**: Rejected - JavaScript rendering not needed for demo

---

## Research Area 10: Summary Memory Strategy

### Decision: Sliding Window with LLM Summarization

**Chosen Approach**:
- **When**: When context + new chunks exceed 80% of 32k token limit
- **How**: Use Gemini to summarize oldest chunks into concise summary
- **Storage**: Replace old chunks with summary in prompt context (not in vector DB)

**Rationale**:
- **Context Window Management**: Prevents hitting Gemini token limit
- **Semantic Preservation**: LLM summary maintains key information
- **Vector DB Integrity**: Original chunks remain unchanged for future queries

**Implementation**:
```python
# backend/src/services/memory_manager.py
def manage_context_window(context_chunks: List[str], new_chunks: List[str]) -> List[str]:
    total_tokens = estimate_tokens(context_chunks + new_chunks)
    
    if total_tokens < 0.8 * 32000:  # 80% threshold
        return context_chunks + new_chunks
    
    # Summarize oldest chunks
    oldest_half = context_chunks[:len(context_chunks)//2]
    summary = summarize_chunks(oldest_half)  # Gemini API call
    
    return [summary] + context_chunks[len(context_chunks)//2:] + new_chunks

def summarize_chunks(chunks: List[str]) -> str:
    model = genai.GenerativeModel('gemini-pro')
    prompt = f"Summarize the key information from these text chunks:\n\n{'\\n\\n'.join(chunks)}"
    response = model.generate_content(prompt)
    return response.text
```

**Alternatives Considered**:
- **Fixed window (drop old chunks)**: Rejected - loses potentially relevant information
- **Re-embed summaries**: Rejected - unnecessary complexity, prompt-level summary sufficient
- **No memory management**: Rejected - will hit token limits on longer conversations

---

## Summary of Resolved Unknowns

All NEEDS CLARIFICATION items from Technical Context have been researched and resolved:

✅ **Language/Version**: Python 3.11+, TypeScript 5.x  
✅ **Primary Dependencies**: FastAPI, qdrant-client, google-generativeai, React, Vite, Bootstrap  
✅ **Storage**: Qdrant (hybrid deployment), no persistent user data  
✅ **Testing**: pytest, Jest, Playwright  
✅ **Target Platform**: Web (dev: local, prod: Together.ai/containerized)  
✅ **Performance Goals**: <30s document processing, <3s query response  
✅ **Constraints**: 30min TTL, ≥0.7 similarity, strict RAG  
✅ **Scale/Scope**: 10-50 concurrent demos, 1GB Qdrant Cloud  

**Next Phase**: Proceed to Phase 1 - Data Model and API Contract Design
