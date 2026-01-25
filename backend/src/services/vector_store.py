"""
Qdrant Vector Store Service
Wrapper for Qdrant client operations
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
import os

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from qdrant_client.http import models
from qdrant_client.http.exceptions import UnexpectedResponse

from src.core.config import settings

logger = logging.getLogger(__name__)


class VectorStore:
    """
    Qdrant vector database client wrapper
    Handles collection management and vector operations
    """
    
    def __init__(self):
        """Initialize Qdrant client based on configuration mode"""
        self.client: Optional[QdrantClient] = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Qdrant client in cloud mode only
        
        ARCHITECTURE DECISION (2026-01-22):
        - ONLY cloud mode is supported for all environments (dev/test/prod)
        - Embedded mode removed: Windows file locking issues, no persistence
        - Docker mode removed: Unnecessary complexity, local dependency
        
        T100: Enhanced error handling for Qdrant connection issues
        """
        try:
            # Cloud mode - Qdrant Cloud (ONLY supported mode)
            if not settings.qdrant_url or not settings.qdrant_api_key:
                raise ValueError(
                    "Qdrant Cloud configuration missing. "
                    "Please set QDRANT_URL and QDRANT_API_KEY in .env file. "
                    "Example: QDRANT_URL=https://xxx.cloud.qdrant.io:6333"
                )
            
            try:
                self.client = QdrantClient(
                    url=settings.qdrant_url,
                    api_key=settings.qdrant_api_key,
                    timeout=10.0  # 10-second timeout for cloud
                )
                # Test connection with health check
                logger.info(f"Testing connection to Qdrant Cloud ({settings.qdrant_url})")
                self.client.get_collections()  # Simple health check
                logger.info(f"✅ Qdrant Cloud connected successfully ({settings.qdrant_url})")
                
            except (ConnectionError, TimeoutError, UnexpectedResponse) as e:
                logger.error(
                    f"❌ Failed to connect to Qdrant Cloud at {settings.qdrant_url}: {e}. "
                    "Please check: 1) QDRANT_URL is correct, 2) QDRANT_API_KEY is valid, "
                    "3) Your internet connection is working."
                )
                raise Exception(
                    f"Cannot connect to Qdrant Cloud. Please verify your QDRANT_URL and QDRANT_API_KEY."
                ) from e
                
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant client: {e}")
            raise
    
    def create_collection(self, collection_name: str, vector_size: int = 768) -> bool:
        """
        Create a new Qdrant collection for a session
        
        Args:
            collection_name: Name of the collection (session-specific)
            vector_size: Dimension of embedding vectors (default: 768 for Gemini)
            
        Returns:
            bool: True if created successfully
            
        T100: Enhanced error handling for Qdrant operations
        """
        try:
            if not self.client:
                logger.error("Qdrant client not initialized")
                return False
                
            # Check if collection already exists
            collections = self.client.get_collections().collections
            if any(col.name == collection_name for col in collections):
                logger.warning(f"Collection '{collection_name}' already exists")
                return True
            
            # Create collection with cosine distance metric
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=Distance.COSINE
                )
            )
            
            logger.info(f"Collection '{collection_name}' created successfully")
            return True
            
        except (ConnectionError, TimeoutError, UnexpectedResponse) as e:
            logger.error(
                f"Qdrant connection error while creating collection '{collection_name}': {e}. "
                "Check if Qdrant service is running."
            )
            return False
        except Exception as e:
            logger.error(f"Failed to create collection '{collection_name}': {e}")
            return False
    
    def delete_collection(self, collection_name: str) -> bool:
        """
        Delete a Qdrant collection (session cleanup)
        
        Args:
            collection_name: Name of the collection to delete
            
        Returns:
            bool: True if deleted successfully
            
        T100: Enhanced error handling for Qdrant operations
        """
        try:
            if not self.client:
                logger.error("Qdrant client not initialized")
                return False
                
            self.client.delete_collection(collection_name=collection_name)
            logger.info(f"Collection '{collection_name}' deleted successfully")
            return True
            
        except (ConnectionError, TimeoutError, UnexpectedResponse) as e:
            logger.error(
                f"Qdrant connection error while deleting collection '{collection_name}': {e}. "
                "Collection may not be properly cleaned up."
            )
            return False
        except Exception as e:
            logger.error(f"Failed to delete collection '{collection_name}': {e}")
            return False
    
    def get_collection_info(self, collection_name: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a collection
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            dict: Collection info (vector count, etc.) or None if not found
            
        T100: Enhanced error handling for Qdrant operations
        """
        try:
            if not self.client:
                logger.error("Qdrant client not initialized")
                return None
                
            info = self.client.get_collection(collection_name=collection_name)
            return {
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": info.status
            }
            
        except (ConnectionError, TimeoutError, UnexpectedResponse) as e:
            logger.error(
                f"Qdrant connection error while getting info for '{collection_name}': {e}. "
                "Check if Qdrant service is running."
            )
            return None
        except Exception as e:
            logger.error(f"Failed to get collection info for '{collection_name}': {e}")
            return None
    
    def upsert_chunks(
        self,
        collection_name: str,
        chunks: List[Dict[str, Any]]
    ) -> bool:
        """
        Insert or update document chunks in collection
        
        Args:
            collection_name: Target collection name
            chunks: List of chunks with id, vector, and payload
                   Format: [{"id": str, "vector": List[float], "payload": dict}]
            
        Returns:
            bool: True if upserted successfully
            
        T100: Enhanced error handling for Qdrant operations
        """
        try:
            if not self.client:
                logger.error("Qdrant client not initialized")
                return False
                
            points = [
                PointStruct(
                    id=chunk["id"],
                    vector=chunk["vector"],
                    payload=chunk["payload"]
                )
                for chunk in chunks
            ]
            
            self.client.upsert(
                collection_name=collection_name,
                points=points
            )
            
            logger.info(f"Upserted {len(chunks)} chunks to '{collection_name}'")
            return True
            
        except (ConnectionError, TimeoutError, UnexpectedResponse) as e:
            logger.error(
                f"Qdrant connection error while upserting chunks to '{collection_name}': {e}. "
                "Check if Qdrant service is running."
            )
            return False
        except Exception as e:
            logger.error(f"Failed to upsert chunks to '{collection_name}': {e}")
            return False
    
    def search_similar(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 5,
        score_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors in collection
        
        Args:
            collection_name: Collection to search in
            query_vector: Query embedding vector
            limit: Maximum number of results
            score_threshold: Minimum similarity score (0.7 for strict RAG)
            
        Returns:
            list: Search results with id, score, and payload
            
        T100: Enhanced error handling for Qdrant operations
        """
        try:
            if not self.client:
                logger.error("Qdrant client not initialized")
                return []
                
            logger.info(f"Searching in '{collection_name}' with threshold={score_threshold}, limit={limit}")
            
            # 🔥 FIX: Qdrant Cloud uses query() method, not search()
            results = self.client.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=limit,
                score_threshold=score_threshold
            ).points
            
            logger.info(f"Qdrant returned {len(results)} results")
            if results:
                scores = [r.score for r in results]
                logger.info(f"Scores: {scores}")
            
            formatted_results = [
                {
                    "id": result.id,
                    "score": result.score,
                    "payload": result.payload
                }
                for result in results
            ]
            
            logger.info(f"Found {len(formatted_results)} similar chunks in '{collection_name}'")
            return formatted_results
            
        except (ConnectionError, TimeoutError, UnexpectedResponse) as e:
            logger.error(
                f"Qdrant connection error while searching in '{collection_name}': {e}. "
                "Check if Qdrant service is running."
            )
            return []
        except Exception as e:
            logger.error(f"Failed to search in '{collection_name}': {e}")
            return []
    
    def collection_exists(self, collection_name: str) -> bool:
        """
        Check if collection exists
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            bool: True if exists
        """
        try:
            collections = self.client.get_collections().collections
            return any(col.name == collection_name for col in collections)
        except Exception as e:
            logger.error(f"Failed to check collection existence: {e}")
            return False
    
    def get_vector_count(self, collection_name: str) -> int:
        """
        Get total vector count in collection
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            int: Number of vectors (0 if error or not found)
        """
        info = self.get_collection_info(collection_name)
        return info["vectors_count"] if info else 0


# Global vector store instance
vector_store = VectorStore()
