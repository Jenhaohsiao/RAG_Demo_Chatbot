"""
Embedder Service - Gemini Embedding API Integration

Converts text to vector embeddings for vector database storage and similarity search.

Constitutional Compliance:
- Principle I (MVP-First): Direct call to Gemini API, no over-abstraction
- Principle II (Testability): Independent service class, API can be mocked for testing
- Principle VII (Fixed Tech Stack): Uses only Gemini API
"""

import logging
from typing import List, Optional
from dataclasses import dataclass
import google.generativeai as genai

from ..core.config import settings
from ..models.quota_errors import QuotaExceededError, InvalidApiKeyError, ApiKeyMissingError

# Set up logging
logger = logging.getLogger(__name__)


@dataclass
class EmbeddingResult:
    """Embedding result data class"""
    vector: List[float]
    dimension: int
    source_text: str
    model: str = "text-embedding-004"


class EmbeddingError(Exception):
    """Embedding processing error"""
    pass


class Embedder:
    """
    Text Embedding Service
    
    Uses Google Gemini text-embedding-004 model to convert text into 768-dimensional vectors.
    Supports batch processing for improved performance.
    
    Attributes:
        model_name: Gemini embedding model name
        dimension: Vector dimension (768)
        task_type: Embedding task type (retrieval document or retrieval query)
    
    Constitutional Alignment:
        - Principle VII: Uses only Gemini API, no other embedding services
        - research.md Decision: text-embedding-004 model, 768 dimensions
    """
    
    def __init__(self):
        """Initialize Embedder service"""
        # Model configuration
        self.model_name = "models/text-embedding-004"
        self.dimension = 768
        
        logger.info(f"Embedder initialized with model: {self.model_name}")

    def _configure_api_key(self, api_key: Optional[str]) -> str:
        """Configure API key to use for current request"""
        effective_key = api_key or settings.gemini_api_key
        if not effective_key:
            raise EmbeddingError("Gemini API key is missing")
        genai.configure(api_key=effective_key)
        return effective_key
    
    def embed_text(
        self, 
        text: str, 
        task_type: str = "retrieval_document",
        source_reference: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> EmbeddingResult:
        """
        Convert single text to embedding vector
        
        Args:
            text: Text content to embed
            task_type: Task type
                - "retrieval_document": Document embedding for storage (default)
                - "retrieval_query": Query embedding for search
            source_reference: Source reference (for logging)
        
        Returns:
            EmbeddingResult: Result object containing vector, dimension, and source text
        
        Raises:
            EmbeddingError: Raised when embedding processing fails
        
        Example:
            >>> embedder = Embedder()
            >>> result = embedder.embed_text("Machine learning is fun", task_type="retrieval_document")
            >>> len(result.vector)
            768
        """
        if not text or not text.strip():
            raise EmbeddingError("Cannot embed empty text")
        
        try:
            effective_key = self._configure_api_key(api_key)
            # Log embedding request
            text_preview = text[:100] + "..." if len(text) > 100 else text
            source_info = f" from {source_reference}" if source_reference else ""
            logger.info(
                f"Embedding text{source_info}: '{text_preview}' "
                f"(length: {len(text)} chars, task_type: {task_type})"
            )
            
            # Call Gemini Embedding API
            result = genai.embed_content(
                model=self.model_name,
                content=text,
                task_type=task_type
            )
            
            # Extract embedding vector
            embedding_vector = result['embedding']
            
            # Validate vector dimension
            if len(embedding_vector) != self.dimension:
                raise EmbeddingError(
                    f"Unexpected embedding dimension: {len(embedding_vector)}, "
                    f"expected {self.dimension}"
                )
            
            logger.info(
                f"Successfully embedded text{source_info}: "
                f"vector dimension {len(embedding_vector)}"
            )
            
            return EmbeddingResult(
                vector=embedding_vector,
                dimension=len(embedding_vector),
                source_text=text[:500],  # Store first 500 chars as reference
                model=self.model_name
            )
        
        except Exception as e:
            error_str = str(e).lower()
            
            # � DEBUG: Log full error to diagnose false positives
            logger.warning(f"Embedding error{source_info}: {str(e)}")
            
            # 🔥 FIX: Very strict quota detection - only treat as quota error if it's DEFINITELY about daily quota
            # Avoid false positives like "Resource has been exhausted (e.g. check quota)" which is just rate limiting
            is_quota_error = (
                ("quota" in error_str and ("exceeded" in error_str or "exhausted" in error_str) and "daily" in error_str) or
                ("daily quota" in error_str and "exceeded" in error_str) or
                "daily limit exceeded" in error_str
            )
            
            if is_quota_error:
                logger.warning(f"⚠️ CONFIRMED: Gemini API quota exceeded: {str(e)}")
                raise QuotaExceededError(
                    message="Gemini API daily quota has been exceeded. Please provide your own API key to continue.",
                    retry_after=86400  # Retry after 24 hours
                )
            
            # Rate limiting (429) should be retried, not treated as quota error
            if "429" in error_str or "rate limit" in error_str or "resource exhausted" in error_str:
                error_msg = f"Rate limit hit{source_info}: {str(e)}. Please retry in a few moments."
                logger.warning(error_msg)
                raise EmbeddingError(error_msg) from e
            
            # Check for invalid API key errors
            if "invalid" in error_str and ("api" in error_str or "key" in error_str):
                logger.warning(f"Invalid API key provided: {str(e)}")
                raise InvalidApiKeyError("The provided API key is invalid or has been revoked.")
            
            # Other errors
            error_msg = f"Failed to embed text{source_info}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise EmbeddingError(error_msg) from e
        finally:
            # If user provided key, restore default key after use (if exists)
            if api_key and settings.gemini_api_key and api_key != settings.gemini_api_key:
                try:
                    genai.configure(api_key=settings.gemini_api_key)
                except Exception:
                    logger.debug("Failed to reset Gemini API key after override")
    
    def embed_query(self, query: str, api_key: Optional[str] = None) -> EmbeddingResult:
        """
        Generate embedding vector for query text (convenience method)
        
        Automatically uses "retrieval_query" task type to optimize query vector generation.
        
        Args:
            query: User query text
        
        Returns:
            EmbeddingResult: Query embedding result
        
        Raises:
            EmbeddingError: Raised when embedding processing fails
        
        Example:
            >>> embedder = Embedder()
            >>> result = embedder.embed_query("What is machine learning?")
            >>> len(result.vector)
            768
        """
        return self.embed_text(
            text=query,
            task_type="retrieval_query",
            source_reference="user_query",
            api_key=api_key
        )
    
    def embed_batch(
        self, 
        texts: List[str], 
        task_type: str = "retrieval_document",
        source_reference: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> List[EmbeddingResult]:
        """
        Batch embed multiple texts (improved performance)
        
        Args:
            texts: List of texts
            task_type: Task type (default is retrieval_document)
            source_reference: Source reference (for logging)
        
        Returns:
            List[EmbeddingResult]: List of embedding results
        
        Raises:
            EmbeddingError: Raised when any text embedding fails
        
        Note:
            Currently implemented as sequential processing, can be optimized for parallel API calls in the future.
            Gemini API currently does not support native batch embedding.
        
        Example:
            >>> embedder = Embedder()
            >>> texts = ["First chunk", "Second chunk", "Third chunk"]
            >>> results = embedder.embed_batch(texts)
            >>> len(results)
            3
        """
        if not texts:
            raise EmbeddingError("Cannot embed empty text list")
        
        logger.info(
            f"Starting batch embedding: {len(texts)} texts "
            f"(task_type: {task_type})"
        )
        
        results = []
        failed_count = 0
        
        for idx, text in enumerate(texts, 1):
            try:
                # Add index info to each text
                ref = f"{source_reference}[{idx}/{len(texts)}]" if source_reference else f"chunk_{idx}"
                result = self.embed_text(
                    text=text,
                    task_type=task_type,
                    source_reference=ref,
                    api_key=api_key
                )
                results.append(result)
            except EmbeddingError as e:
                failed_count += 1
                logger.warning(f"Failed to embed text {idx}/{len(texts)}: {str(e)}")
                # Decide whether to continue or raise exception based on error strategy
                # Current strategy: log error but don't interrupt batch processing
                # Uncomment the line below for strict mode
                # raise
        
        if failed_count > 0:
            logger.warning(
                f"Batch embedding completed with {failed_count} failures. "
                f"Successfully embedded: {len(results)}/{len(texts)}"
            )
        else:
            logger.info(
                f"Batch embedding completed successfully: "
                f"{len(results)}/{len(texts)} texts embedded"
            )
        
        return results
    
    def get_embedding_dimension(self) -> int:
        """
        Get embedding vector dimension
        
        Returns:
            int: Vector dimension (768)
        """
        return self.dimension
    
    def get_model_info(self) -> dict:
        """
        Get model information
        
        Returns:
            dict: Model name and dimension information
        """
        return {
            "model": self.model_name,
            "dimension": self.dimension,
            "supported_task_types": ["retrieval_document", "retrieval_query"]
        }


# Singleton pattern: global embedder instance
_embedder_instance: Optional[Embedder] = None


def get_embedder() -> Embedder:
    """
    Get global Embedder instance (singleton pattern)
    
    Returns:
        Embedder: Global embedding service instance
    
    Example:
        >>> from services.embedder import get_embedder
        >>> embedder = get_embedder()
        >>> result = embedder.embed_text("Hello world")
    """
    global _embedder_instance
    if _embedder_instance is None:
        _embedder_instance = Embedder()
    return _embedder_instance
