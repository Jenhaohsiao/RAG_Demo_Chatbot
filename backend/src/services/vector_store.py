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
        """Initialize Qdrant client based on mode (embedded/docker/cloud)
        
        IMPORTANT: Embedded mode on Windows may experience file locking issues.
        For development and production, use Docker mode instead.
        """
        try:
            if settings.qdrant_mode == "embedded":
                # Embedded mode - file-based storage
                # WARNING: On Windows, file locking can prevent restarting the server
                # Use Docker mode for reliable operation
                import platform
                if platform.system() == "Windows":
                    logger.warning(
                        "Embedded mode on Windows may have file locking issues. "
                        "Consider using QDRANT_MODE=docker for better reliability."
                    )
                    # Use temporary directory to avoid lock conflicts
                    import tempfile
                    import uuid
                    qdrant_path = os.path.join(tempfile.gettempdir(), f"qdrant_{uuid.uuid4().hex[:8]}")
                    logger.warning(f"Using temporary path (data will not persist): {qdrant_path}")
                else:
                    qdrant_path = "./qdrant_data"
                
                self.client = QdrantClient(path=qdrant_path)
                logger.info(f"Qdrant client initialized in embedded mode: {qdrant_path}")
                
            elif settings.qdrant_mode == "docker":
                # Docker mode - connect to local Qdrant container
                self.client = QdrantClient(
                    host=settings.qdrant_host,
                    port=settings.qdrant_port
                )
                logger.info(f"Qdrant client initialized in docker mode ({settings.qdrant_host}:{settings.qdrant_port})")
                
            elif settings.qdrant_mode == "cloud":
                # Cloud mode - Qdrant Cloud
                if not settings.qdrant_url or not settings.qdrant_api_key:
                    raise ValueError("Qdrant cloud mode requires QDRANT_URL and QDRANT_API_KEY")
                
                self.client = QdrantClient(
                    url=settings.qdrant_url,
                    api_key=settings.qdrant_api_key
                )
                logger.info(f"Qdrant client initialized in cloud mode ({settings.qdrant_url})")
            
            else:
                raise ValueError(f"Invalid Qdrant mode: {settings.qdrant_mode}")
                
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
        """
        try:
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
        """
        try:
            self.client.delete_collection(collection_name=collection_name)
            logger.info(f"Collection '{collection_name}' deleted successfully")
            return True
            
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
        """
        try:
            info = self.client.get_collection(collection_name=collection_name)
            return {
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": info.status
            }
            
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
        """
        try:
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
        """
        try:
            results = self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold
            )
            
            formatted_results = [
                {
                    "id": result.id,
                    "score": result.score,
                    "payload": result.payload
                }
                for result in results
            ]
            
            logger.debug(f"Found {len(formatted_results)} similar chunks in '{collection_name}'")
            return formatted_results
            
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
