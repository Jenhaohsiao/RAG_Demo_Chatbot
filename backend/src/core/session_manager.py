"""
Session Manager
Handles session lifecycle: create, get, update, close operations
"""
from datetime import datetime, timedelta
from typing import Dict, Optional
from uuid import UUID, uuid4
import logging

from src.models.session import Session, SessionState, SessionResponse
from src.core.config import settings
from src.core.api_validator import get_default_api_key_status

logger = logging.getLogger(__name__)


class SessionManager:
    """
    In-memory session storage and management
    Provides CRUD operations for session lifecycle
    """
    
    def __init__(self):
        """Initialize session storage"""
        self._sessions: Dict[UUID, Session] = {}
        logger.info("SessionManager initialized")
    
    def create_session(self, language: str = "en", similarity_threshold: float = 0.5, custom_prompt: str | None = None) -> Session:
        """
        Create a new session with unique ID and Qdrant collection
        
        Args:
            language: Initial UI language (default: en, supported: en, fr, zh-TW, zh-CN)
            similarity_threshold: RAG similarity threshold (default: 0.5)
            custom_prompt: Custom prompt template (default: None)
            
        Returns:
            Session: Newly created session
        """
        session = Session(
            session_id=uuid4(),
            language=language,
            similarity_threshold=similarity_threshold,
            custom_prompt=custom_prompt,
            state=SessionState.INITIALIZING
        )

        # 設定預設 API Key 狀態（來自環境變數）
        session.has_valid_api_key = get_default_api_key_status()
        session.api_key_source = "env" if session.has_valid_api_key else "none"
        
        self._sessions[session.session_id] = session
        
        logger.info(f"[Session Created] ID: {session.session_id} | Lang: {language} | Expires: {session.expires_at}")
        return session
    
    def get_session(self, session_id: UUID) -> Optional[Session]:
        """
        Retrieve session by ID
        
        Args:
            session_id: UUID of the session
            
        Returns:
            Session if found, None otherwise
        """
        session = self._sessions.get(session_id)
        
        if session and session.is_expired():
            logger.warning(f"[Session Expired Access] ID: {session_id} | Expired At: {session.expires_at}")
            return None
        
        return session
    
    def update_activity(self, session_id: UUID) -> bool:
        """
        Update last_activity timestamp and extend expires_at by TTL
        
        Args:
            session_id: UUID of the session
            
        Returns:
            bool: True if updated, False if session not found
        """
        session = self.get_session(session_id)
        if not session:
            logger.warning(f"[Session Update Failed] ID: {session_id} not found or expired")
            return False
        
        old_expires = session.expires_at
        session.update_activity()
        logger.info(f"[Session Heartbeat] ID: {session_id} | Extended: {old_expires} -> {session.expires_at}")
        return True
    
    def update_state(self, session_id: UUID, state: SessionState) -> bool:
        """
        Update session state
        
        Args:
            session_id: UUID of the session
            state: New session state
            
        Returns:
            bool: True if updated, False if session not found
        """
        session = self.get_session(session_id)
        if not session:
            return False
        
        old_state = session.state
        session.state = state
        logger.info(f"Session {session_id} state: {old_state} -> {state}")
        return True
    
    def update_language(self, session_id: UUID, language: str) -> bool:
        """
        Update session language preference
        
        Args:
            session_id: UUID of the session
            language: New language code (en, zh, ko, es, ja, ar, fr)
            
        Returns:
            bool: True if updated, False if session not found or invalid language
        """
        session = self.get_session(session_id)
        if not session:
            return False
        
        try:
            old_language = session.language
            session.language = language
            logger.info(f"Session {session_id} language: {old_language} -> {language}")
            return True
        except ValueError as e:
            logger.error(f"Invalid language '{language}': {e}")
            return False
    
    def increment_document_count(self, session_id: UUID) -> bool:
        """
        Increment document count after successful upload
        
        Args:
            session_id: UUID of the session
            
        Returns:
            bool: True if updated, False if session not found
        """
        session = self.get_session(session_id)
        if not session:
            return False
        
        session.document_count += 1
        logger.debug(f"Session {session_id} document_count: {session.document_count}")
        return True
    
    def update_vector_count(self, session_id: UUID, count: int) -> bool:
        """
        Update total vector count in session
        
        Args:
            session_id: UUID of the session
            count: New vector count
            
        Returns:
            bool: True if updated, False if session not found
        """
        session = self.get_session(session_id)
        if not session:
            return False
        
        session.vector_count = count
        logger.debug(f"Session {session_id} vector_count: {count}")
        return True

    def set_api_key(self, session_id: UUID, api_key: str) -> bool:
        """
        Store a user-provided Gemini API key for this session.

        Args:
            session_id: UUID of the session
            api_key: validated Gemini API key

        Returns:
            bool: True if stored, False if session not found
        """
        session = self.get_session(session_id)
        if not session:
            return False

        session.gemini_api_key = api_key
        session.has_valid_api_key = True
        session.api_key_source = "user"
        logger.info(f"Session {session_id} stored user API key (masked)")
        return True

    def get_effective_api_key(self, session_id: UUID) -> str | None:
        """Return user-provided key if present, otherwise default env key."""
        session = self.get_session(session_id)
        if session and session.gemini_api_key:
            return session.gemini_api_key
        return settings.gemini_api_key
    
    def close_session(self, session_id: UUID) -> bool:
        """
        Remove session from storage
        Note: Qdrant collection cleanup should be handled separately
        
        Args:
            session_id: UUID of the session
            
        Returns:
            bool: True if removed, False if session not found
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"[Session Closed] ID: {session_id} removed from memory")
            return True
        
        logger.warning(f"[Session Close Failed] ID: {session_id} not found")
        return False
    
    def get_expired_sessions(self) -> list[UUID]:
        """
        Get list of expired session IDs for cleanup
        
        Returns:
            list[UUID]: List of expired session IDs
        """
        now = datetime.utcnow()
        expired = [
            session_id 
            for session_id, session in self._sessions.items()
            if session.expires_at < now
        ]
        
        if expired:
            logger.info(f"Found {len(expired)} expired sessions")
        
        return expired
    
    def get_session_count(self) -> int:
        """
        Get total number of active sessions
        
        Returns:
            int: Number of sessions
        """
        return len(self._sessions)
    
    def to_response(self, session: Session) -> SessionResponse:
        """
        Convert Session model to API response format
        
        Args:
            session: Session model
            
        Returns:
            SessionResponse: API response format
        """
        return SessionResponse(
            session_id=session.session_id,
            state=session.state,
            created_at=session.created_at,
            expires_at=session.expires_at,
            last_activity=session.last_activity,
            qdrant_collection_name=session.qdrant_collection_name,
            language=session.language,
            similarity_threshold=session.similarity_threshold,
            document_count=session.document_count,
            vector_count=session.vector_count,
            custom_prompt=session.custom_prompt,
            has_valid_api_key=session.has_valid_api_key,
            api_key_source=session.api_key_source
        )


# Global session manager instance
session_manager = SessionManager()
