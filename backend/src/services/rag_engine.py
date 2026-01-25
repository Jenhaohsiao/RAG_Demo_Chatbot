"""
RAG Engine Service
RAG Query Engine: Vector search, Prompt construction, LLM generation, Metrics tracking

Constitutional Compliance:
- Principle V (Strict RAG): Answer only based on retrieved content, similarity threshold >= 0.6
- Principle III (Gemini-Only): Use Gemini model (gemini-1.5-pro - cost-efficient)
"""

import logging
import time
from dataclasses import dataclass, field
from typing import List, Optional
from uuid import UUID
from collections import deque

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

from ..core.config import settings
from ..services.vector_store import VectorStore
from ..services.embedder import Embedder
from ..models.quota_errors import QuotaExceededError, InvalidApiKeyError

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    """Retrieved text chunk"""
    chunk_id: str
    text: str
    similarity_score: float
    document_id: str
    source_reference: str
    chunk_index: int


@dataclass
class SessionMetrics:
    """Session metrics"""
    total_queries: int = 0
    total_tokens: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    avg_tokens_per_query: float = 0.0
    total_documents: int = 0
    avg_chunks_retrieved: float = 0.0
    unanswered_ratio: float = 0.0


@dataclass
class RAGResponse:
    """RAG Response Result"""
    llm_response: str
    response_type: str  # "ANSWERED" or "CANNOT_ANSWER"
    retrieved_chunks: List[RetrievedChunk]
    similarity_scores: List[float]
    token_input: int
    token_output: int
    token_total: int
    metrics: Optional[SessionMetrics] = None
    suggestions: Optional[List[str]] = None  # Suggested questions (provided when unable to answer)


class RAGEngine:
    """
    RAG Query Engine
    
    Complete workflow:
    1. Query embedding (Embedder)
    2. Vector search (VectorStore, similarity ≥ 0.7)
    3. Prompt construction
    4. LLM generation (Gemini gemini-1.5-flash, temperature=0.1)
    5. "Cannot answer" detection
    6. Metrics calculation and memory management
    """
    
    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        embedder: Optional[Embedder] = None,
        similarity_threshold: float = 0.3,
        max_chunks: int = 5,
        temperature: float = 0.1,
        memory_limit: int = 100,  # Keep max 100 queries
        token_threshold: int = 10000  # Warn at 10000 tokens
    ):
        """
        Initialize RAG Engine
        
        Args:
            vector_store: Vector storage service
            embedder: Embedding service
            similarity_threshold: Similarity threshold (adjusted to 0.3 for better Chinese text matching)
            max_chunks: Maximum retrieval chunks
            temperature: LLM temperature (research.md recommends 0.1)
            memory_limit: Sliding window memory limit (number of queries)
            token_threshold: Token warning threshold
        """
        self.vector_store = vector_store or VectorStore()
        self.embedder = embedder or Embedder()
        self.similarity_threshold = similarity_threshold
        self.max_chunks = max_chunks
        self.temperature = temperature
        self.memory_limit = memory_limit
        self.token_threshold = token_threshold
        
        # Rate limiting configuration (T099)
        # 🔥 INCREASED: Higher delays to avoid Gemini free tier rate limiting (15 req/min)
        self.max_retries = 3  # Max 3 retries
        self.retry_delay = 2  # Initial delay 2 seconds (increased from 1s)
        self.max_retry_delay = 60  # Max delay 60 seconds (increased from 32s)
        
        # Session metrics tracking
        self._session_metrics: dict[UUID, SessionMetrics] = {}
        
        # Session memory management (sliding window)
        self._session_memory: dict[UUID, deque] = {}
        
        # Configure Gemini API
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel(settings.gemini_model)
        
        logger.info(
            f"RAG Engine initialized: model={settings.gemini_model}, threshold={similarity_threshold}, "
            f"max_chunks={max_chunks}, temperature={temperature}, "
            f"memory_limit={memory_limit}, token_threshold={token_threshold}, "
            f"rate_limiting={self.max_retries} retries with exponential backoff"
        )
    
    def _generate_with_retry(self, prompt: str, session_id: UUID, api_key: Optional[str] = None) -> str:
        """
        Call Gemini API with exponential backoff retry logic (T099 Rate Limiting)
        
        Args:
            prompt: The prompt to send to LLM
            session_id: Session ID (for logging)
            api_key: Optional user-provided API key (overrides system key)
            
        Returns:
            LLM generated response text
            
        Raises:
            Exception: Throws the last exception when all retries fail
        """
        retry_count = 0
        current_delay = self.retry_delay
        
        # Use user-provided API key if available, otherwise use system key
        effective_api_key = api_key or settings.gemini_api_key
        if api_key:
            # Temporarily configure with user's API key
            model = genai.GenerativeModel(settings.gemini_model)
        else:
            model = self.model
        
        while retry_count < self.max_retries:
            try:
                logger.debug(f"[{session_id}] Generating LLM response (attempt {retry_count + 1}/{self.max_retries})")
                
                # Configure API key if user-provided
                if api_key:
                    genai.configure(api_key=api_key)
                
                response = model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=self.temperature,
                        max_output_tokens=2048,
                    )
                )
                
                # Restore system API key if we used user's key
                if api_key:
                    genai.configure(api_key=settings.gemini_api_key)
                
                logger.info(f"[{session_id}] LLM response generated successfully")
                return response
                
            except google_exceptions.ResourceExhausted as e:
                # Rate limit error - check if quota is exceeded
                error_str = str(e).lower()
                
                # � DEBUG: Log full error to diagnose false positives
                logger.warning(f"[{session_id}] ResourceExhausted error: {str(e)}")
                
                # 🔥 FIX: Very strict quota detection - only treat as quota error if it's DEFINITELY about daily quota
                # Common false positives to avoid:
                # - "Resource has been exhausted (e.g. check quota)" <- This is just rate limiting advice
                # - "Too many requests" <- Rate limiting
                # - "Concurrent requests" <- Concurrency limit
                is_quota_error = (
                    ("quota" in error_str and ("exceeded" in error_str or "exhausted" in error_str) and "daily" in error_str) or
                    ("daily quota" in error_str and "exceeded" in error_str) or
                    "daily limit exceeded" in error_str
                )
                
                if is_quota_error:
                    logger.error(f"[{session_id}] ⚠️ CONFIRMED: Gemini API daily quota exceeded: {str(e)}")
                    raise QuotaExceededError(
                        message="Gemini API daily quota has been exceeded. Please provide your own API key to continue.",
                        retry_after=86400
                    )
                
                # General rate limit (request frequency limit), attempt retry
                logger.warning(
                    f"[{session_id}] Rate limit hit (attempt {retry_count + 1}/{self.max_retries}). "
                    f"Error: {str(e)}. Retrying in {current_delay}s..."
                )
                retry_count += 1
                
                if retry_count >= self.max_retries:
                    logger.error(
                        f"[{session_id}] Max retries exceeded for rate limit. "
                        "Too many API requests in a short time. Please wait a moment."
                    )
                    # Don't raise QuotaExceededError - this is just rate limiting, not quota exhaustion
                    # Let caller handle this gracefully (e.g., skip validation)
                    raise Exception(
                        "API requests are too frequent, please try again in a moment. This is not quota exhaustion, just temporary rate limiting."
                    ) from e
                
                time.sleep(current_delay)
                # Exponential backoff: 1s -> 2s -> 4s -> 8s ...
                current_delay = min(current_delay * 2, self.max_retry_delay)
                
            except google_exceptions.InternalServerError as e:
                # Server error, worth retrying
                logger.warning(
                    f"[{session_id}] API server error (attempt {retry_count + 1}/{self.max_retries}). "
                    f"Retrying in {current_delay}s..."
                )
                retry_count += 1
                
                if retry_count >= self.max_retries:
                    logger.error(f"[{session_id}] Max retries exceeded for server error.")
                    raise Exception(
                        "API server is temporarily unavailable. Please try again later."
                    ) from e
                
                time.sleep(current_delay)
                current_delay = min(current_delay * 2, self.max_retry_delay)
                
            except google_exceptions.ServiceUnavailable as e:
                # Service unavailable, retry
                logger.warning(
                    f"[{session_id}] API service unavailable (attempt {retry_count + 1}/{self.max_retries}). "
                    f"Retrying in {current_delay}s..."
                )
                retry_count += 1
                
                if retry_count >= self.max_retries:
                    logger.error(f"[{session_id}] Max retries exceeded for service unavailable.")
                    raise Exception(
                        "AI service is temporarily unavailable. Please try again later."
                    ) from e
                
                time.sleep(current_delay)
                current_delay = min(current_delay * 2, self.max_retry_delay)
                
            except google_exceptions.DeadlineExceeded as e:
                # Request timeout, retry
                logger.warning(
                    f"[{session_id}] API request timeout (attempt {retry_count + 1}/{self.max_retries}). "
                    f"Retrying in {current_delay}s..."
                )
                retry_count += 1
                
                if retry_count >= self.max_retries:
                    logger.error(f"[{session_id}] Max retries exceeded for timeout.")
                    raise Exception(
                        "Request timeout. Please try again."
                    ) from e
                
                time.sleep(current_delay)
                current_delay = min(current_delay * 2, self.max_retry_delay)

    def _validate_suggestions(self, session_id: UUID, questions: List[str], language: str = "en") -> List[str]:
        """
        Verify that questions are answerable by ACTUALLY EXECUTING the EXACT SAME RAG query.
        This is the ONLY reliable way to ensure suggestions are answerable.
        
        Critical: We must use the EXACT SAME query() method that users will use,
        not a simplified version, to ensure consistent results.
        
        The key insight: We save current metrics, run queries, then restore metrics.
        This way validation uses identical logic but doesn't pollute statistics.
        """
        try:
            validated = []
            
            logger.info(f"[{session_id}] Starting REAL execution validation for {len(questions)} suggestions...")

            # Save current session metrics to restore later
            saved_metrics = self._session_metrics.get(session_id)
            saved_memory = self._session_memory.get(session_id)
            
            for q in questions:
                if len(validated) >= 3:
                    break

                try:
                    # ACTUALLY EXECUTE the EXACT SAME RAG query that users will use
                    logger.debug(f"[{session_id}] Testing suggestion: '{q}'")
                    
                    # Add small delay between validations to avoid rate limiting
                    if len(validated) > 0:
                        time.sleep(0.5)  # 500ms delay between validation queries
                    
                    # Call the SAME query method to ensure identical logic
                    query_response = self.query(
                        session_id=session_id,
                        user_query=q,
                        language=language,
                        similarity_threshold=None,  # Use default threshold
                        custom_prompt=None,
                        api_key=None
                    )
                    
                    # Check if the question is actually answerable
                    if query_response.response_type == "ANSWERED":
                        # Additional check: make sure response is not empty and meaningful
                        response_text = query_response.llm_response.strip()
                        
                        # Check for patterns that indicate "cannot answer" even if type is ANSWERED
                        cannot_answer_indicators = [
                            "the document does not mention", "the document does not cover", "cannot find in document",
                            "cannot answer", "unable to answer", "could not find", "unable to find",
                            "I'm sorry", "I apologize", "no relevant information",
                            "I cannot answer", "cannot find", "not mentioned",
                            "unable to answer", "no information", "I'm sorry",
                            "couldn't find"
                        ]
                        
                        has_cannot_answer = any(indicator.lower() in response_text.lower() for indicator in cannot_answer_indicators)
                        
                        if len(response_text) > 20 and not has_cannot_answer:
                            validated.append(q)
                            logger.info(f"[{session_id}] ✓ VALIDATED: '{q}'")
                            logger.debug(f"    Response preview: {response_text[:100]}...")
                        else:
                            logger.info(f"[{session_id}] ✗ REJECTED (Contains 'cannot answer' phrase): '{q}'")
                            logger.debug(f"    Response: {response_text[:200]}...")
                    else:
                        logger.info(f"[{session_id}] ✗ REJECTED (response_type={query_response.response_type}): '{q}'")
                
                except QuotaExceededError:
                    # If quota is truly exceeded, propagate error to user
                    logger.error(f"[{session_id}] Quota exceeded during validation - stopping validation")
                    raise
                    
                except Exception as e:
                    # For rate limiting or other errors during validation, log and continue
                    # This allows some suggestions to be validated even if rate limits hit
                    error_msg = str(e)
                    if "requests are too frequent" in error_msg or "rate limit" in error_msg.lower():
                        logger.warning(
                            f"[{session_id}] Rate limit hit during validation for '{q}' - "
                            "stopping validation to avoid further rate limiting. "
                            f"Already validated {len(validated)} questions."
                        )
                        # Stop validation to avoid triggering more rate limits
                        break
                    else:
                        logger.warning(f"[{session_id}] Validation execution error for '{q}': {e}")
                        # Continue to next question
            
            # Restore original metrics and memory after validation
            if saved_metrics:
                self._session_metrics[session_id] = saved_metrics
            elif session_id in self._session_metrics:
                del self._session_metrics[session_id]
            
            if saved_memory:
                self._session_memory[session_id] = saved_memory
            elif session_id in self._session_memory:
                del self._session_memory[session_id]

            logger.info(f"[{session_id}] Final validated count: {len(validated)} out of {len(questions)}")
            
            # Graceful degradation: If validation failed due to rate limiting but we have unvalidated questions,
            # return the unvalidated questions (better than showing nothing)
            if len(validated) == 0 and len(questions) > 0:
                logger.warning(
                    f"[{session_id}] No questions validated (likely due to rate limiting). "
                    "Returning first 3 unvalidated questions as fallback."
                )
                return questions[:3]
            
            return validated
            
        except Exception as e:
            logger.error(f"[{session_id}] Suggestion validation process failed: {e}")
            return []  # Return empty on error - safer than returning unvalidated questions

    def _generate_suggestions(
        self,
        session_id: UUID,
        user_query: str,
        retrieved_chunks: List[RetrievedChunk],
        language: str = "en"
    ) -> List[str]:
        """
        Generate suggested questions based on document content and user query
        
        Args:
            session_id: Session ID
            user_query: Original user query
            retrieved_chunks: Retrieved document chunks (used to analyze document topics)
            language: UI language code
        
        Returns:
            List[str]: 2-3 suggested questions
        """
        # System only supports English
        response_language = "English"
        
        # Build document content summary for analysis - increase length to provide more context
        doc_summary = ""
        if retrieved_chunks:
            # Increase character count per chunk from 500 to 800, use first 8 chunks total for richer context
            doc_texts = [chunk.text[:800] for chunk in retrieved_chunks[:8]]
            doc_summary = "\n\n--- Section ---\n\n".join(doc_texts)
        
        prompt = f"""You are generating suggested questions for a RAG chatbot. These questions WILL BE ASKED BACK TO YOU, so they MUST be answerable using ONLY the document content provided below.

**Available Document Content**:
{doc_summary if doc_summary else "No document content available yet."}

**CRITICAL Requirements**:
1. Generate questions in English ONLY
2. Questions MUST be grammatically correct and natural-sounding
3. Questions MUST ask about SPECIFIC FACTS that appear EXPLICITLY and CLEARLY in the content above
4. Each question must be DIRECTLY ANSWERABLE by quoting or paraphrasing MULTIPLE sentences from the content
5. Focus on PROMINENT details that appear in MULTIPLE places or are explained in detail:
   - Main characters, locations, or objects that are described extensively
   - Key events or actions that are explained with context
   - Important facts that are repeated or emphasized
6. DO NOT ask about:
   - Minor details mentioned only once in passing
   - Background information not clearly stated
   - Themes, interpretations, or analysis
   - Information that requires inference
7. Before finalizing each question, verify:
   ✓ Can I find CLEAR and EXPLICIT answer in the content above?
   ✓ Is this fact explained with enough context?
   ✓ Would I be confident answering this question based on the content?
8. Return ONLY 2-3 questions, one per line, no numbering or bullets

**Good Examples** (specific, prominent, clearly answerable):
- What is the name of the main character? (if the protagonist is mentioned and described multiple times)
- Which characters did Alice meet in the garden? (if the text lists characters in detail)
- What did Alice drink to become smaller? (if the text clearly describes this event)

**Bad Examples** (vague, obscure, or requires inference):
- Who stole the tarts according to the accusation? (may only be mentioned briefly, lacking context)
- What is this story trying to express? (requires interpretation and analysis)
- Why did the author write it this way? (not explicitly stated in the text)

**Your Suggested Questions** (must be confidently answerable from the content above):"""

        try:
            response = self._generate_with_retry(prompt, session_id)
            # Use candidates API to avoid UTF-16 encoding issues
            try:
                suggestions_text = response.candidates[0].content.parts[0].text.strip()
            except (IndexError, AttributeError):
                suggestions_text = response.text.strip()
            
            # Parse suggested questions
            suggestions = [s.strip() for s in suggestions_text.split('\n') if s.strip()]
            # Clean format (remove leading numbers, symbols, etc.)
            cleaned = []
            for s in suggestions:
                # Remove leading numbers, dots, dashes, etc.
                s = s.lstrip('0123456789.-•）) \t')
                if s and len(s) > 5:  # Filter out too short
                    cleaned.append(s)
            
            logger.info(f"[{session_id}] Generated {len(cleaned)} follow-up suggestions")
            
            # Validate generated suggestions (T094)
            try:
                validated = self._validate_suggestions(session_id, cleaned, language)
                if len(validated) > 0:
                    return validated
                else:
                    # Fallback: return unvalidated if validation failed
                    logger.warning(f"[{session_id}] Validation failed, returning unvalidated suggestions")
                    return cleaned[:3]
            except Exception as validation_error:
                logger.error(f"[{session_id}] Validation error: {validation_error}")
                return cleaned[:3]
                
        except Exception as e:
            logger.error(f"[{session_id}] Failed to generate suggestions: {e}", exc_info=True)
            return []

    def generate_initial_suggestions(
        self,
        session_id: UUID,
        language: str = "en"
    ) -> List[str]:
        """
        Generate initial suggested questions based on uploaded documents.
        Used for "Default Question Bubbles" feature.
        """
        try:
            # 1. Get comprehensive document context
            # Use scroll to get diverse chunks from the entire document
            # This ensures questions can be generated from any part of the document
            clean_session_id = str(session_id).replace("-", "")
            collection_name = f"session_{clean_session_id}"
            
            # Use scroll to get a diverse sample of document chunks
            # This is better than searching for "summary" which may miss specific details
            try:
                points, _ = self.vector_store.client.scroll(
                    collection_name=collection_name,
                    limit=15,  # Get more chunks for better coverage
                    with_payload=True,
                    with_vectors=False
                )
                if not points:
                    return []
                    
                retrieved_chunks = [
                    RetrievedChunk(
                        chunk_id=str(point.id),
                        text=point.payload.get('text', ''),
                        similarity_score=1.0,  # Scroll doesn't provide similarity scores
                        document_id=point.payload.get('document_id', ''),
                        source_reference=point.payload.get('source_reference', ''),
                        chunk_index=point.payload.get('chunk_index', 0)
                    ) for point in points
                ]
            except Exception as scroll_error:
                logger.warning(f"[{session_id}] Scroll failed, falling back to search: {scroll_error}")
                # Fallback: search with generic query
                query_embedding = self.embedder.embed_text("main content overview details")
                results = self.vector_store.search_similar(
                    collection_name=collection_name,
                    query_vector=query_embedding.vector,
                    limit=15,
                    score_threshold=0.0
                )
                if not results:
                    return []
                    
                retrieved_chunks = [
                    RetrievedChunk(
                        chunk_id=str(r['id']),
                        text=r['payload'].get('text', ''),
                        similarity_score=r['score'],
                        document_id=r['payload'].get('document_id', ''),
                        source_reference=r['payload'].get('source_reference', ''),
                        chunk_index=r['payload'].get('chunk_index', 0)
                    ) for r in results
                ]
            
            # 2. Generate suggestions (English only)
            response_language = "English"
            
            # Use full chunk text (up to 2000 chars) for maximum context
            # This ensures generated questions have complete information
            doc_summary = "\n\n--- Section ---\n\n".join([chunk.text[:2000] for chunk in retrieved_chunks])
            
            prompt = f"""You are generating questions for a RAG chatbot. The questions you generate WILL BE ASKED BACK TO YOU, and you must be able to answer them using ONLY the document content provided below.

**Document Content**:
{doc_summary}

**CRITICAL Requirements**:
1. Generate questions in {response_language} ONLY
2. Questions MUST be DIRECTLY ANSWERABLE using ONLY the content shown above
3. Each question should ask about SPECIFIC FACTS that appear EXPLICITLY in the document:
   - Names of people, places, or things mentioned MULTIPLE times
   - Specific actions or events that are CLEARLY described
   - Concrete details that appear in MULTIPLE sections
   - Direct quotes or statements that are PROMINENTLY featured
4. Questions must be ROBUST to different phrasings:
   - The answer should be findable even if the question is asked differently
   - Focus on CENTRAL facts that appear in multiple chunks
   - Avoid obscure details mentioned only once
5. DO NOT ask about:
   - Themes, meanings, or interpretations
   - Information not present in the document
   - Opinions or analysis
   - General summaries or overviews
   - Obscure details mentioned only once
   - Minor side characters or events
6. Before finalizing each question, verify:
   ✓ Can I find the EXACT answer in MULTIPLE places in the document?
   ✓ Is this a CENTRAL fact that the document emphasizes?
   ✓ Would different phrasings of this question still find the answer?
   ✓ Is the answer a specific fact, not a general concept?
7. Return 5 questions (we will test and select the best 3), one per line, no numbering or bullets

**Good Examples** (central, prominent facts):
- What did Alice use to fan herself? (if fans/leaves are mentioned multiple times)
- What is the name of the main character? (main character, appears frequently)
- What did Alice drink to become smaller? (key plot point)

**Bad Examples** (obscure or one-time mentions):
- Who stole the tarts according to the accusation? (may only be mentioned once, easy to miss)
- What color clothes did the third servant wear? (minor detail)

**Bad Examples** (too vague or interpretive):
- What is this story about?
- How does Alice feel?
- What is the theme of this text?

**IMPORTANT**: These questions will be tested automatically. Only questions with clear answers in the document above will pass validation.

**Suggested Questions**:"""

            response = self._generate_with_retry(prompt, session_id)
            # Use candidates API to avoid UTF-16 encoding issues
            try:
                suggestions_text = response.candidates[0].content.parts[0].text.strip()
            except (IndexError, AttributeError):
                suggestions_text = response.text.strip()
            
            suggestions = [s.strip() for s in suggestions_text.split('\n') if s.strip()]
            cleaned = []
            for s in suggestions:
                s = s.lstrip('0123456789.-•）) \t')
                if s and len(s) > 5:
                    cleaned.append(s)
            
            logger.info(f"[{session_id}] Generated {len(cleaned)} raw suggestions: {cleaned[:5]}")
            
            # 🔥 DISABLED: Validation triggers rate limiting (4-6 API calls in rapid succession)
            # Each validation requires: 1x embedding + 1x LLM generation = 2 API calls × 3 suggestions = 6 calls
            # Gemini free tier rate limit: ~15 requests per minute
            # Solution: Skip validation and return raw suggestions directly (same as production)
            #
            # Original T094 validation code commented out:
            # try:
            #     validated = self._validate_suggestions(session_id, cleaned, language)
            #     if len(validated) > 0:
            #         return validated
            #     else:
            #         return cleaned[:3]
            # except Exception as validation_error:
            #     return cleaned[:3]
            
            # Fast path: return first 3 suggestions without validation
            result = cleaned[:3]
            logger.info(f"[{session_id}] Returning {len(result)} suggestions (validation disabled to avoid rate limiting)")
            return result
            
        except Exception as e:
            logger.error(f"[{session_id}] Failed to generate initial suggestions: {e}", exc_info=True)
            return []
    
    def query(
        self,
        session_id: UUID,
        user_query: str,
        similarity_threshold: Optional[float] = None,
        language: str = "en",
        custom_prompt: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> RAGResponse:
        """
        Execute RAG query
        
        Args:
            session_id: Session ID
            user_query: User query
            similarity_threshold: Session specific similarity threshold (overrides default)
            language: UI language code
            custom_prompt: Custom prompt template (overrides default)
            api_key: Optional user-provided API key (for per-request authentication)
        
        Returns:
            RAGResponse: RAG response result
        
        Raises:
            ValueError: When query is empty
            Exception: When RAG processing fails
        """
        if not user_query or not user_query.strip():
            raise ValueError("Query cannot be empty")
        
        # Use session-specific threshold or default
        threshold = similarity_threshold if similarity_threshold is not None else self.similarity_threshold
        
        logger.info(f"[{session_id}] RAG query: {user_query[:100]} (threshold={threshold})")
        
        # Detect if it's a friendly conversation (e.g., "hello", "thank you", etc.)
        greeting_patterns = [
            '你好', '您好', 'hello', 'hi', 'hey', '안녕', 'hola', 'bonjour', 'こんにちは',
            '謝謝', '感謝', 'thank', 'thanks', '감사', 'gracias', 'merci', 'ありがとう',
            '再見', 'bye', 'goodbye', '안녕히', 'adiós', 'au revoir', 'さようなら'
        ]
        is_greeting = any(pattern in user_query.lower() for pattern in greeting_patterns) and len(user_query) < 20
        
        # If it's a friendly conversation, return friendly response directly
        if is_greeting:
            logger.info(f"[{session_id}] Greeting detected, returning friendly response")
            greeting_response = self._get_greeting_response(user_query, language)
            
            # Even for greetings, generate suggested questions to help user start quickly
            suggestions = None
            try:
                # Use scroll to get some document samples for generating suggestions
                points, _ = self.vector_store.client.scroll(
                    collection_name=collection_name,
                    limit=3,
                    with_payload=True,
                    with_vectors=False
                )
                if points:
                    sample_chunks = [
                        RetrievedChunk(
                            chunk_id=str(point.id),
                            text=point.payload.get('text', ''),
                            similarity_score=1.0,  # Dummy score for scroll results
                            document_id=point.payload.get('document_id', ''),
                            source_reference=point.payload.get('source_reference', ''),
                            chunk_index=point.payload.get('chunk_index', 0)
                        ) for point in points
                    ]
                    suggestions = self._generate_suggestions(session_id, user_query, sample_chunks, language)
                    logger.info(f"[{session_id}] Generated {len(suggestions) if suggestions else 0} suggestions for greeting")
            except Exception as e:
                logger.warning(f"[{session_id}] Failed to generate suggestions for greeting: {e}")
            
            # Create a simple response without counting into metrics
            return RAGResponse(
                llm_response=greeting_response,
                response_type="ANSWERED",
                retrieved_chunks=[],
                similarity_scores=[],
                token_input=0,
                token_output=0,
                token_total=0,
                metrics=None,
                suggestions=suggestions
            )
        
        # Detect if it's a general document request (e.g., "explain document content", "summarize this file", etc.)
        general_query_patterns = [
            '說明', '總結', '摘要', '概述', '介紹', '描述', '解釋', '內容',
            'summarize', 'summary', 'explain', 'describe', 'overview', 'content',
            '文件', '文檔', '文章', 'document', 'file', '再說一次', '重新說明'
        ]
        is_general_query = any(pattern in user_query.lower() for pattern in general_query_patterns)
        
        try:
            # Step 1: Query embedding
            logger.debug(f"[{session_id}] Embedding query...")
            query_embedding = self.embedder.embed_query(user_query)
            
            # Step 2: Vector search
            logger.debug(f"[{session_id}] Searching similar chunks...")
            # Remove hyphens from session_id for valid Qdrant collection name
            clean_session_id = str(session_id).replace("-", "")
            collection_name = f"session_{clean_session_id}"
            
            search_results = self.vector_store.search_similar(
                collection_name=collection_name,
                query_vector=query_embedding.vector,
                limit=self.max_chunks,
                score_threshold=threshold
            )
            
            # If no results or too few results, retry with lower threshold
            if not search_results or len(search_results) < 3:
                retry_threshold = 0.1 if not search_results else 0.2
                logger.info(f"[{session_id}] Found only {len(search_results)} results, retrying with threshold {retry_threshold}")
                search_results = self.vector_store.search_similar(
                    collection_name=collection_name,
                    query_vector=query_embedding.vector,
                    limit=self.max_chunks,
                    score_threshold=retry_threshold
                )
            
            # Convert to RetrievedChunk
            retrieved_chunks = []
            similarity_scores = []
            
            for result in search_results:
                chunk = RetrievedChunk(
                    chunk_id=str(result['id']),  # Convert to string (Qdrant returns integer IDs)
                    text=result['payload'].get('text', ''),
                    similarity_score=result['score'],
                    document_id=result['payload'].get('document_id', ''),
                    source_reference=result['payload'].get('source_reference', ''),
                    chunk_index=result['payload'].get('chunk_index', 0)
                )
                retrieved_chunks.append(chunk)
                similarity_scores.append(result['score'])
            
            logger.info(
                f"[{session_id}] Retrieved {len(retrieved_chunks)} chunks "
                f"(scores: {[f'{s:.3f}' for s in similarity_scores]})"
            )
            
            # Step 3: Build prompt (let LLM attempt to answer even if no documents retrieved)
            prompt = self._build_prompt(user_query, retrieved_chunks, language, custom_prompt)
            
            # Step 4: LLM generation (with T099 rate limiting & retry logic)
            logger.debug(f"[{session_id}] Generating LLM response...")
            response = self._generate_with_retry(prompt, session_id, api_key)
            
            # Fix Unicode encoding issue: use candidates API instead of response.text
            # response.text may have UTF-16 surrogate pair errors causing emoji to replace Chinese characters
            try:
                llm_response = response.candidates[0].content.parts[0].text
            except (IndexError, AttributeError):
                # Fallback to response.text if structure is different
                llm_response = response.text
            
            # Extract token usage
            token_input = response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0
            token_output = response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0
            token_total = token_input + token_output
            
            logger.info(
                f"[{session_id}] LLM response generated "
                f"(tokens: {token_input} + {token_output} = {token_total})"
            )
            
            # Determine response type: whether it's "cannot answer"
            # More precise judgment: must match "system cannot answer" expressions, not just "cannot" descriptions in content
            cannot_answer_patterns = [
                # Traditional Chinese: explicit system cannot answer expressions
                "文件中沒有提到", "文件中未提到", "文件中找不到", "文件中沒有相關", 
                "文件中無相關", "無法從文件", "無法在文件", "未能找到", "沒有找到相關",
                "不在.*文件中", "答案不在.*文件", "問題.*答案.*不在",
                "我接觸的文件中", "我所接觸的文件", "提供的文件",
                "抱歉.*無法", "抱歉.*找不到", "對不起.*無法", "對不起.*找不到",
                "沒有.*資訊", "無.*資訊",
                
                # Simplified Chinese: simplified-specific expressions
                "文件中没有提到", "文件中未提到", "文件中找不到", "文件中没有相关",
                "无法从文件", "无法在文件", "未能找到", "没有找到相关",
                "答案不在.*文件", "我接触的文件",
                "抱歉.*无法", "抱歉.*找不到", "对不起.*无法", "对不起.*找不到",
                "没有.*信息", "无.*信息",
                
                # 英文：English patterns
                "document does not mention", "document doesn't mention", 
                "not in.*document", "answer.*not.*in.*document",
                "cannot find.*document", "no relevant.*found", "unable to find",
                "no information", "not mentioned", "not available",
                "sorry.*cannot", "sorry.*unable", "i'm sorry",
                "cannot answer.*based on", "cannot answer.*document",
                
                # 法文：French patterns
                "document ne mentionne pas", "ne trouve pas.*document",
                "pas d'information", "aucune information",
                "ne peut pas répondre", "impossible de répondre",
                "désolé.*ne peut pas", "désolé.*impossible",
                "absent.*document", "manque.*document"
            ]
            
            import re
            # Use regular expressions for more precise pattern matching
            has_cannot_answer_indicator = any(
                re.search(pattern, llm_response, re.IGNORECASE) 
                for pattern in cannot_answer_patterns
            )
            
            # Only mark as CANNOT_ANSWER if content was retrieved but response has clear "cannot answer" expression
            # Also mark as CANNOT_ANSWER if no content was retrieved at all
            is_cannot_answer = has_cannot_answer_indicator or len(retrieved_chunks) == 0
            response_type = "CANNOT_ANSWER" if is_cannot_answer else "ANSWERED"
            
            logger.info(f"[{session_id}] Response type: {response_type} (has_indicator={has_cannot_answer_indicator}, chunks={len(retrieved_chunks)})")
            
            # If unable to answer, generate suggested questions
            suggestions = None
            if is_cannot_answer:
                logger.info(f"[{session_id}] Generating suggestions for unanswered query...")
                # Try with lower threshold to get some document content for generating suggestions
                sample_chunks = []
                try:
                    sample_results = self.vector_store.search_similar(
                        collection_name=collection_name,
                        query_vector=query_embedding.vector,
                        limit=5,
                        score_threshold=0.05  # 非常低的閾值，只是為了獲取文檔樣本
                    )
                    sample_chunks = [
                        RetrievedChunk(
                            chunk_id=str(r['id']),
                            text=r['payload'].get('text', ''),
                            similarity_score=r['score'],
                            document_id=r['payload'].get('document_id', ''),
                            source_reference=r['payload'].get('source_reference', ''),
                            chunk_index=r['payload'].get('chunk_index', 0)
                        ) for r in sample_results
                    ]
                    logger.debug(f"[{session_id}] Found {len(sample_chunks)} sample chunks via search")
                except Exception as e:
                    logger.warning(f"[{session_id}] Search failed for suggestions: {e}")
                
                # If search doesn't find anything, use scroll to get any document content
                if not sample_chunks:
                    try:
                        points, _ = self.vector_store.client.scroll(
                            collection_name=collection_name,
                            limit=5,
                            with_payload=True,
                            with_vectors=False
                        )
                        sample_chunks = [
                            RetrievedChunk(
                                chunk_id=str(point.id),
                                text=point.payload.get('text', ''),
                                similarity_score=1.0,
                                document_id=point.payload.get('document_id', ''),
                                source_reference=point.payload.get('source_reference', ''),
                                chunk_index=point.payload.get('chunk_index', 0)
                            ) for point in points
                        ]
                        logger.debug(f"[{session_id}] Found {len(sample_chunks)} sample chunks via scroll")
                    except Exception as e:
                        logger.warning(f"[{session_id}] Scroll failed for suggestions: {e}")
                
                # Generate suggested questions
                try:
                    suggestions = self._generate_suggestions(session_id, user_query, sample_chunks, language)
                    logger.info(f"[{session_id}] Generated {len(suggestions) if suggestions else 0} suggestions")
                except Exception as e:
                    logger.error(f"[{session_id}] Failed to generate suggestions: {e}")
                    suggestions = None
            
            # Update memory and metrics
            self._update_memory(session_id, user_query, response_type, token_total)
            metrics = self._calculate_metrics(
                session_id, token_input, token_output, 
                len(retrieved_chunks), response_type=response_type
            )
            
            return RAGResponse(
                llm_response=llm_response,
                response_type=response_type,
                retrieved_chunks=retrieved_chunks,
                similarity_scores=similarity_scores,
                token_input=token_input,
                token_output=token_output,
                token_total=token_total,
                metrics=metrics,
                suggestions=suggestions
            )
        
        except Exception as e:
            logger.error(f"[{session_id}] RAG query failed: {str(e)}", exc_info=True)
            raise
    
    def generate_summary(
        self,
        session_id: UUID,
        document_content: str,
        language: str = "en",
        max_tokens: int = 300
    ) -> str:
        """
        Generate document summary
        
        Args:
            session_id: Session ID
            document_content: Document content
            language: UI language code (en, zh-TW, zh-CN, ko, es, ja, ar, fr)
            max_tokens: Maximum token count for summary
        
        Returns:
            str: Generated summary
        
        Raises:
            ValueError: When document content is empty
            Exception: When summary generation fails
        """
        if not document_content or not document_content.strip():
            raise ValueError("Document content cannot be empty")
        
        # Don't perform language mapping, use the passed language code directly
        logger.info(f"[{session_id}] Generating summary (language={language}, max_tokens={max_tokens})")
        
        try:
            # Multi-language summary prompts (Traditional Chinese, Simplified Chinese, English, French)
            summary_prompts = {
                "zh-TW": """請為以下文檔內容提供一段完整的摘要（約 150-200 字）。摘要應該：
1. 使用繁體中文寫作
2. 包含主要主題和關鍵點
3. 簡潔清晰，適合快速瀏覽
4. 完整描述，不要使用「...」或「等等」結尾
5. 字數控制在 150-200 字左右

文檔內容：
""",
                "zh-CN": """请为以下文档内容提供一段完整的摘要（约 150-200 字）。摘要应该：
1. 使用简体中文写作
2. 包含主要主题和关键点
3. 简洁清晰，适合快速浏览
4. 完整描述，不要使用「...」或「等等」结尾
5. 字数控制在 150-200 字左右

文档内容：
""",
                "en": """Please provide a complete summary of the following document (approximately 150-200 words). The summary should:
1. Be written in English
2. Include main topics and key points
3. Be clear and suitable for quick scanning
4. End with a complete sentence, DO NOT use "..." or "etc." at the end
5. Target around 150-200 words

Document content:
""",
                "fr": """Veuillez fournir un résumé complet du document suivant (environ 150-200 mots). Le résumé doit:
1. Être rédigé en français
2. Inclure les sujets principaux et les points clés
3. Être clair et approprié pour un balayage rapide
4. Se terminer par une phrase complète, NE PAS utiliser "..." ou "etc." à la fin
5. Viser environ 150-200 mots

Contenu du document:
"""
            }
            
            # Get language-specific prompt, fallback to English if not found
            system_prompt = summary_prompts.get(language, summary_prompts["en"])
            
            # If document is too long, only take the first part
            max_content_length = 4000  # Limit input content length to control cost
            content_to_summarize = document_content[:max_content_length]
            if len(document_content) > max_content_length:
                content_to_summarize += "\n[... 文檔已截斷 ...]"
            
            full_prompt = system_prompt + content_to_summarize
            
            # Call Gemini API to generate summary (with T099 rate limiting & retry logic)
            logger.debug(f"[{session_id}] Calling Gemini API for summary...")
            response = self._generate_with_retry(full_prompt, session_id)
            
            # Note: _generate_with_retry already handles temperature as 0.1,
            # but for summary we might want to pass it as parameter in future
            
            # Use candidates API to avoid UTF-16 encoding issues
            try:
                summary = response.candidates[0].content.parts[0].text.strip()
            except (IndexError, AttributeError):
                summary = response.text.strip()
            
            # Extract token usage (for logging)
            token_usage = 0
            if hasattr(response, 'usage_metadata'):
                token_usage = (
                    response.usage_metadata.prompt_token_count + 
                    response.usage_metadata.candidates_token_count
                )
            
            logger.info(
                f"[{session_id}] Summary generated successfully "
                f"({len(summary)} chars, {token_usage} tokens)"
            )
            
            return summary
            
        except Exception as e:
            logger.error(f"[{session_id}] Summary generation failed: {str(e)}", exc_info=True)
            raise
    
    def _detect_query_language(self, user_query: str) -> Optional[str]:
        """
        Detect language of user query
        
        Args:
            user_query: User query text
            
        Returns:
            Optional[str]: Detected language code (zh-TW, zh-CN, en, ko, ja, fr, es) or None
        """
        # Count characters for each language
        zh_count = len([c for c in user_query if '\u4e00' <= c <= '\u9fff'])  # Chinese characters
        ja_count = len([c for c in user_query if '\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff'])  # Japanese hiragana/katakana
        ko_count = len([c for c in user_query if '\uac00' <= c <= '\ud7af'])  # Korean
        
        total_chars = len(user_query.replace(' ', ''))  # Total characters after removing spaces
        
        if total_chars == 0:
            return None
        
        # If Chinese characters exceed 30%, determine as Chinese
        if zh_count / total_chars > 0.3:
            # Detect Traditional/Simplified: if contains Traditional-specific characters, determine as Traditional
            traditional_chars = ['為', '麼', '條', '説', '國', '學', '們', '個', '處', '這', '那', '與', '習', '無', '會', '來']
            simplified_chars = ['为', '么', '条', '说', '国', '学', '们', '个', '处', '这', '那', '与', '习', '无', '会', '来']
            
            has_traditional = any(c in user_query for c in traditional_chars)
            has_simplified = any(c in user_query for c in simplified_chars)
            
            if has_traditional and not has_simplified:
                return 'zh-TW'
            elif has_simplified and not has_traditional:
                return 'zh-CN'
            else:
                # Default to Traditional (or when indistinguishable)
                return 'zh-TW'
        
        # Japanese
        if ja_count / total_chars > 0.2:
            return 'ja'
        
        # Korean
        if ko_count / total_chars > 0.3:
            return 'ko'
        
        # Unable to detect, return None (use UI language)
        return None
    
    def _build_prompt(
        self,
        user_query: str,
        retrieved_chunks: List[RetrievedChunk],
        language: str = "en",
        custom_prompt: Optional[str] = None
    ) -> str:
        """
        Build RAG Prompt
        
        Constitutional Principle V: Strictly answer based on retrieved content (but allow answering reasonable general questions)
        
        Args:
            user_query: User query
            retrieved_chunks: Retrieved text chunks
            language: UI language code
            custom_prompt: Custom prompt template (takes priority)
                          Supported variables: {{language}}, {{context}}, {{query}}, {{persona}}
        
        Returns:
            str: Complete Prompt
        """
        # Auto-detect user query language (takes priority over UI language setting)
        detected_lang = self._detect_query_language(user_query)
        if detected_lang:
            logger.info(f"Detected user query language: {detected_lang}, overriding UI language: {language}")
            language = detected_lang
        
        # If custom prompt is provided, use it directly with variable substitution
        if custom_prompt:
            logger.info(f"Using custom_prompt (length={len(custom_prompt)}, preview={custom_prompt[:200]}...)")
            # Language mapping (supports full language codes like zh-TW, zh-CN)
            language_names = {
                "zh-TW": "Traditional Chinese (繁體中文)",
                "zh-CN": "Simplified Chinese (简体中文)",
                "zh": "Traditional Chinese (繁體中文)",
                "en": "English",
                "ko": "Korean (한국어)",
                "es": "Spanish (Español)",
                "ja": "Japanese (日本語)",
                "fr": "French (Français)"
            }
            response_language = language_names.get(language, language_names.get(language.split('-')[0], "English"))
            
            # Combine retrieved content
            context_parts = []
            for i, chunk in enumerate(retrieved_chunks, 1):
                context_parts.append(
                    f"[Document {i}] (Similarity: {chunk.similarity_score:.3f})\n"
                    f"Source: {chunk.source_reference}\n"
                    f"Content: {chunk.text}\n"
                )
            context = "\n---\n".join(context_parts) if context_parts else "No documents retrieved."
            
            # Replace variables in custom prompt
            prompt = custom_prompt.replace('{{language}}', response_language)
            prompt = prompt.replace('{{context}}', context)
            prompt = prompt.replace('{{query}}', user_query)
            # {{persona}} variable is replaced directly when frontend generates custom_prompt, not handled here
            
            return prompt
        
        # Default prompt logic (existing code)
        # Language mapping: UI language code -> Language name (supports full language codes like zh-TW, zh-CN)
        language_names = {
            "zh-TW": "Traditional Chinese (繁體中文)",
            "zh-CN": "Simplified Chinese (简体中文)",
            "zh": "Traditional Chinese (繁體中文)",
            "en": "English",
            "ko": "Korean (한국어)",
            "es": "Spanish (Español)",
            "ja": "Japanese (日本語)",
            "fr": "French (Français)"
        }
        
        # Try full language code, then try language prefix
        response_language = language_names.get(language, language_names.get(language.split('-')[0] if '-' in language else language, "English"))
        
        # Combine retrieved content
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            context_parts.append(
                f"[Document {i}] (Similarity: {chunk.similarity_score:.3f})\n"
                f"Source: {chunk.source_reference}\n"
                f"Content: {chunk.text}\n"
            )
        
        context = "\n---\n".join(context_parts) if context_parts else "No documents retrieved."
        
        # Build Prompt (strictly answer based on document content - Strict RAG)
        # Define terminology (to help LLM understand "document" definition)
        # Get language-corresponding key (supports zh-TW -> zh mapping)
        lang_key = language if language in ["en", "zh", "ko", "es", "ja", "fr"] else (language.split('-')[0] if '-' in language else "en")
        
        document_definition = {
            "zh": """**術語定義**:
- **文檔 (Documents)**: 用戶上傳到系統中的內容，包括網頁、PDF、文本文件等。這些內容已被提取、清理、分塊和索引。
- **分塊 (Chunks)**: 文檔被分成的小段落，以便進行語義搜索。

**重要指示**:
- 請勿在回答中包含引用標記（如 [Document 1], [文件1] 等）。
- 直接回答問題即可。""",
            "en": """**Term Definitions**:
- **Documents**: Content uploaded by the user (webpages, PDFs, text files, etc.) that has been extracted, cleaned, chunked and indexed.
- **Chunks**: Small passages that documents are split into for semantic search.

**Important Instructions**:
- Do NOT include citation markers (e.g., [Document 1]) in your response.
- Just answer the question directly.""",
            "ko": """**용어 정의**:
- **문서**: 사용자가 시스템에 업로드한 콘텐츠(웹페이지, PDF, 텍스트 파일 등)로, 추출, 정리, 청크 분할 및 인덱싱되었습니다.
- **청크**: 의미론적 검색을 위해 문서를 분할한 작은 구절입니다.

**중요 지침**:
- 답변에 인용 표시(예: [Document 1])를 포함하지 마십시오.
- 질문에 직접 답변하십시오.""",
            "es": """**Definiciones de términos**:
- **Documentos**: Contenido cargado por el usuario (páginas web, PDF, archivos de texto, etc.) que ha sido extraído, limpiado, dividido y indexado.
- **Fragmentos**: Pasajes pequeños en los que se dividen los documentos para la búsqueda semántica.

**Instrucciones importantes**:
- NO incluya marcadores de cita (por ejemplo, [Document 1]) en su respuesta.
- Responda directamente a la pregunta.""",
            "ja": """**用語定義**:
- **文書**: ユーザーがシステムにアップロードしたコンテンツ（Webページ、PDF、テキストファイルなど）で、抽出、クリーニング、チャンク分割、インデックス化されています。
- **チャンク**: セマンティック検索のために文書を分割した小さな段落です。

**重要な指示**:
- 回答に引用マーカー（例：[Document 1]）を含めないでください。
- 質問に直接回答してください。""",
            "fr": """**Définitions des termes**:
- **Documents**: Contenu téléchargé par l'utilisateur (pages web, PDF, fichiers texte, etc.) qui a été extrait, nettoyé, divisé en chunks et indexé.
- **Chunks**: Petits passages dans lesquels les documents sont divisés pour la recherche sémantique."""
        }
        
        # Also use lang_key when getting document_definition
        doc_def = document_definition.get(lang_key, document_definition['en'])
        
        if not retrieved_chunks:
            # Prompt when no relevant document chunks retrieved - use standardized expressions
            prompt = f"""You are a RAG (Retrieval-Augmented Generation) assistant.

{doc_def}

**CRITICAL RULES - YOU MUST FOLLOW**:
1. **Response Language**: ALWAYS respond ONLY in {response_language}. This is mandatory.
2. **Standard Response**: Since no relevant document passages were found, you MUST respond with this EXACT phrase structure:
   - For Chinese: "文件中沒有提到 [topic]，所以無法回答您的問題。"
   - For English: "I cannot answer this question based on the uploaded documents."
3. **NO Variations**: Do NOT use creative rephrasing. Use the EXACT standard phrase above.
4. **Replace [topic]**: Replace [topic] with what the user is asking about.
5. **SINGLE LANGUAGE ONLY**: Your entire response must be in {response_language} only.

**User Question**:
{user_query}

**Your Answer** (MUST use the EXACT standard phrase in {response_language}):"""
        else:
            # Standard RAG Prompt when documents exist - STRICT RAG with precise answer matching
            prompt = f"""You are a RAG (Retrieval-Augmented Generation) assistant that ONLY answers based on uploaded documents.

{doc_def}

**CRITICAL RULES - YOU MUST FOLLOW**:
1. **Response Language**: ALWAYS respond ONLY in {response_language}. This is mandatory. DO NOT include any other language in your response. DO NOT include English translations or explanations in parentheses.

2. **STRICT RAG POLICY**: ONLY answer based on the retrieved documents below.

3. **DO NOT make up information** or use knowledge outside the documents.

4. **WHEN TO SAY "CANNOT ANSWER"**: If the documents do NOT contain the specific information requested, you MUST respond with:
   - For Chinese: "文件中沒有提到 [topic]，所以無法回答您的問題。"
   - For English: "I cannot answer this question based on the uploaded documents."
   DO NOT try to answer from your own knowledge or make inferences.

5. **ANSWER THE QUESTION DIRECTLY (only if information IS in documents)**: 
   - Read the user's question CAREFULLY and understand EXACTLY what they are asking
   - If they ask "是什麼" (what is), describe WHAT it is, not what it does
   - If they ask "做了什麼" (what did), describe the ACTIONS, not the identity
   - If they ask "為什麼" (why), explain the REASON, not just the fact
   - ALWAYS answer the SPECIFIC aspect of the question being asked
   - DO NOT give irrelevant information even if it's about the same topic

6. **CONTENT TRANSFORMATION REQUESTS ARE ALLOWED**: If the user asks you to present the document content in a different way (e.g., "用5歲小孩也能懂的方式說", "simplify this", "explain like I'm 5", "用詩的形式", "make it funny"), you SHOULD do so based on the document content below.

7. **GENERAL REQUESTS**: If the user asks to "explain", "summarize", or "describe" the document content (with or without a specific style/tone like "健身教練口氣"), provide a summary based on the retrieved document chunks below.

8. **STYLE REQUESTS**: If the user requests a specific tone, persona, audience level, or format (e.g., "用老師口氣", "用健身教練口氣", "用朋友口吻", "for a 5-year-old", "in poem format"), adapt your response style accordingly while still basing content ONLY on the documents.

9. **PARTIAL MATCH HANDLING**: If the documents contain related information but NOT the specific answer requested:
   - First clearly state: "文件中沒有提到 [specific thing asked]"
   - Then optionally add: "但文件中有提到 [related information available]"
   - Example: "文件中沒有描述獅鷲的外觀特徵，但有提到獅鷲做了這些事..."

10. **CITE document numbers** when using information (e.g., [Document 1]).

11. Be accurate, precise, and directly answer what is asked.

12. **SINGLE LANGUAGE ONLY**: Your entire response must be in {response_language} only. No bilingual content, no mixed languages.

**Retrieved Documents**:
{context}

**User Question**:
{user_query}

**Your Answer** (MUST be ONLY in {response_language}, based ONLY on the documents above. If information is NOT in documents, use the standard "cannot answer" phrase. If information IS in documents, answer the SPECIFIC question asked):"""
        
        return prompt
    
    def _get_greeting_response(self, user_query: str, language: str = "en") -> str:
        """
        Get friendly conversation response
        
        Args:
            user_query: User query
            language: UI language code
        
        Returns:
            str: Friendly response message
        """
        # Detect if it's thanks or greeting
        is_thanks = any(word in user_query.lower() for word in ['謝謝', '感謝', 'thank', 'thanks', '감사', 'gracias', 'merci', 'ありがとう'])
        
        if is_thanks:
            messages = {
                "zh-TW": "不客氣！我很樂意協助您。如果您有任何關於已上傳文件內容的問題，隨時都可以提問喔！",
                "zh-CN": "不客气！我很乐意协助您。如果您有任何关于已上传文件内容的问题，随时都可以提问哦！",
                "zh": "不客氣！我很樂意協助您。如果您有任何關於已上傳文件內容的問題，隨時都可以提問喔！",
                "en": "You're welcome! I'm happy to help. Feel free to ask me anything about the uploaded documents!",
                "ko": "천만에요! 기꺼이 도와드리겠습니다. 업로드된 문서에 대해 궁금한 점이 있으시면 언제든지 물어보세요!",
                "es": "¡De nada! Estoy feliz de ayudar. ¡Pregúntame cualquier cosa sobre los documentos cargados!",
                "ja": "どういたしまして！お手伝いできて嬉しいです。アップロードされたドキュメントについて何でも聞いてください！",
                "fr": "Je vous en prie ! Je suis heureux d'aider. N'hésitez pas à me poser des questions sur les documents téléchargés !"
            }
        else:
            # Greeting messages
            messages = {
                "zh-TW": "您好！我是您的文件助理。我可以幫您回答關於已上傳文件內容的問題。請隨時提問吧！",
                "zh-CN": "您好！我是您的文件助理。我可以帮您回答关于已上传文件内容的问题。请随时提问吧！",
                "zh": "您好！我是您的文件助理。我可以幫您回答關於已上傳文件內容的問題。請隨時提問吧！",
                "en": "Hello! I'm your document assistant. I can help answer questions about the content of your uploaded documents. Feel free to ask me anything!",
                "ko": "안녕하세요! 저는 문서 도우미입니다. 업로드된 문서 내용에 대한 질문에 답변해 드릴 수 있습니다. 무엇이든 물어보세요!",
                "es": "¡Hola! Soy tu asistente de documentos. Puedo ayudarte a responder preguntas sobre el contenido de tus documentos cargados. ¡Pregúntame lo que quieras!",
                "ja": "こんにちは！私はドキュメントアシスタントです。アップロードされたドキュメントの内容についての質問にお答えできます。何でも聞いてください！",
                "fr": "Bonjour ! Je suis votre assistant de documents. Je peux vous aider à répondre aux questions sur le contenu de vos documents téléchargés. N'hésitez pas à me demander quoi que ce soit !"
            }
        
        # Use language mapping logic
        lang_key = language
        if language.startswith('zh'):
            if 'CN' in language or 'Hans' in language:
                lang_key = 'zh-CN'
            else:
                lang_key = 'zh-TW'
        elif language not in messages:
            lang_key = 'en'
        
        return messages.get(lang_key, messages['en'])
    
    def _get_cannot_answer_message(self, language: str = "en") -> str:
        """
        Get "cannot answer" message
        
        Args:
            language: UI language code (supports full codes like zh-TW, zh-CN)
        
        Returns:
            str: Standard "cannot answer" message (according to language)
        """
        messages = {
            "zh-TW": "抱歉，我無法在已上傳的文檔中找到與您問題相關的內容。",
            "zh-CN": "抱歉，我无法在已上传的文档中找到与您问题相关的内容。",
            "zh": "抱歉，我無法在已上傳的文檔中找到與您問題相關的內容。",
            "en": "I'm sorry, I couldn't find relevant information in the uploaded documents to answer this question.",
            "ko": "죄송합니다. 업로드된 문서에서 관련 정보를 찾을 수 없습니다.",
            "es": "Lo siento, no pude encontrar información relevante en los documentos cargados.",
            "ja": "申し訳ありませんが、アップロードされた文書に関連する情報が見つかりませんでした。",
            "fr": "Désolé, je n'ai pas pu trouver d'informations pertinentes dans les documents téléchargés."
        }
        # Try full language code, then language prefix
        lang_key = language if language in messages else (language.split('-')[0] if '-' in language else language)
        return messages.get(lang_key, messages["en"])
    
    def _calculate_metrics(
        self,
        session_id: UUID,
        token_input: int,
        token_output: int,
        chunks_retrieved: int,
        response_type: str = "ANSWERED"
    ) -> SessionMetrics:
        """
        Calculate and update session metrics
        
        Args:
            session_id: Session ID
            token_input: Number of input tokens
            token_output: Number of output tokens
            chunks_retrieved: Number of chunks retrieved
            response_type: Response type (ANSWERED or CANNOT_ANSWER)
        
        Returns:
            SessionMetrics: Updated session metrics
        """
        token_total = token_input + token_output
        
        # Initialize or get metrics
        if session_id not in self._session_metrics:
            self._session_metrics[session_id] = SessionMetrics()
        
        metrics = self._session_metrics[session_id]
        
        # Update metrics
        metrics.total_queries += 1
        metrics.total_tokens += token_total
        metrics.total_input_tokens += token_input
        metrics.total_output_tokens += token_output
        metrics.avg_tokens_per_query = metrics.total_tokens / metrics.total_queries
        metrics.avg_chunks_retrieved = (
            (metrics.avg_chunks_retrieved * (metrics.total_queries - 1) + chunks_retrieved) 
            / metrics.total_queries
        )
        
        # Track "unanswered" ratio
        if response_type == "CANNOT_ANSWER":
            unanswered_count = sum(
                1 for q in self._session_memory.get(session_id, [])
                if q.get('type') == 'CANNOT_ANSWER'
            ) + 1
            metrics.unanswered_ratio = unanswered_count / metrics.total_queries
        
        logger.info(
            f"[{session_id}] Metrics updated: "
            f"queries={metrics.total_queries}, "
            f"tokens={metrics.total_tokens}, "
            f"avg_per_query={metrics.avg_tokens_per_query:.1f}, "
            f"unanswered={metrics.unanswered_ratio:.1%}"
        )
        
        # Check if token usage exceeds threshold
        if metrics.total_tokens >= self.token_threshold:
            logger.warning(
                f"[{session_id}] Token usage WARNING: "
                f"{metrics.total_tokens} >= {self.token_threshold}"
            )
        
        return metrics
    
    def _update_memory(
        self,
        session_id: UUID,
        user_query: str,
        response_type: str,
        token_total: int
    ) -> None:
        """
        Update session memory (sliding window)
        
        Args:
            session_id: Session ID
            user_query: User query
            response_type: Response type
            token_total: Total tokens
        """
        # Initialize or get memory
        if session_id not in self._session_memory:
            self._session_memory[session_id] = deque(maxlen=self.memory_limit)
        
        memory = self._session_memory[session_id]
        
        # Add query record
        memory.append({
            'query': user_query[:100],  # Keep only first 100 characters
            'type': response_type,
            'tokens': token_total
        })
        
        logger.debug(
            f"[{session_id}] Memory updated: "
            f"{len(memory)}/{self.memory_limit} queries in window"
        )
    
    def get_session_metrics(self, session_id: UUID) -> Optional[dict]:
        """
        Get session metrics
        
        Args:
            session_id: Session ID
        
        Returns:
            dict: Session metrics dictionary, None if not found
        """
        metrics = self._session_metrics.get(session_id)
        if metrics is None:
            return None
        
        # Convert to dict for API response
        return {
            'total_queries': metrics.total_queries,
            'total_tokens': metrics.total_tokens,
            'total_input_tokens': metrics.total_input_tokens,
            'total_output_tokens': metrics.total_output_tokens,
            'avg_tokens_per_query': metrics.avg_tokens_per_query,
            'total_documents': metrics.total_documents,
            'avg_chunks_retrieved': metrics.avg_chunks_retrieved,
            'unanswered_ratio': metrics.unanswered_ratio,
        }
    
    def clear_session(self, session_id: UUID) -> None:
        """
        Clear session metrics and memory
        
        Args:
            session_id: Session ID
        """
        if session_id in self._session_metrics:
            del self._session_metrics[session_id]
        
        if session_id in self._session_memory:
            del self._session_memory[session_id]
        
        logger.info(f"[{session_id}] Session metrics and memory cleared")



class RAGError(Exception):
    """RAG processing error"""
    pass


# Global singleton
_rag_engine: Optional[RAGEngine] = None


def get_rag_engine() -> RAGEngine:
    """
    Get RAG Engine singleton
    
    Returns:
        RAGEngine: RAG engine instance
    """
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine()
    return _rag_engine

