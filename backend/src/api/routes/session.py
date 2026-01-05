"""
Session API Routes
Handles session lifecycle endpoints

T089: Enhanced error handling with appropriate HTTP status codes
"""
from fastapi import APIRouter, HTTPException, status, Request
from uuid import UUID
import logging

from src.core.session_manager import session_manager
from src.services.vector_store import vector_store
from src.models.session import (
    Session, SessionState, SessionResponse, 
    SessionWithMetrics, LanguageUpdateRequest
)
from src.models.metrics import Metrics
from src.models.errors import ErrorCode
from src.core.logger import session_activity_logger

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/create", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(request: Request, language: str = "en", similarity_threshold: float = 0.5, custom_prompt: str | None = None):
    """
    Create a new session with unique ID and Qdrant collection
    
    Args:
        language: Initial UI language (default: en, supported: en, zh-TW, ko, es, ja, ar, fr, zh-CN)
        similarity_threshold: RAG similarity threshold (0.0-1.0, default: 0.5)
        custom_prompt: Custom prompt template (optional)
        
    Returns:
        SessionResponse: Session details
    """
    # Get client IP for logging
    client_ip = request.client.host if request.client else "unknown"
    
    try:
        # Validate similarity_threshold
        if not 0.0 <= similarity_threshold <= 1.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="similarity_threshold must be between 0.0 and 1.0"
            )
        
        # Create session
        session = session_manager.create_session(
            language=language, 
            similarity_threshold=similarity_threshold,
            custom_prompt=custom_prompt
        )
        
        # Create Qdrant collection
        collection_created = vector_store.create_collection(
            collection_name=session.qdrant_collection_name
        )
        
        if not collection_created:
            logger.error(f"Failed to create Qdrant collection for session {session.session_id}")
            # Continue anyway - collection creation can be retried
        
        # Update state to READY_FOR_UPLOAD
        session_manager.update_state(session.session_id, SessionState.READY_FOR_UPLOAD)
        
        # Log session creation with structured logger
        session_activity_logger.session_created(
            session.session_id, client_ip, language, similarity_threshold
        )
        
        logger.info(f"Session {session.session_id} created and ready")
        return session_manager.to_response(session)
        
    except Exception as e:
        logger.error(f"Failed to create session: {e}", exc_info=True)
        session_activity_logger.error(None, "SESSION_CREATE_FAILED", str(e), client_ip)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session"
        )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: UUID):
    """
    Get session details by ID
    
    Args:
        session_id: UUID of the session
        
    Returns:
        SessionResponse: Session details
        
    Raises:
        404: Session not found or expired (T089)
    """
    # 延遲導入以避免循環導入
    from src.main import AppException
    
    session = session_manager.get_session(session_id)
    
    if not session:
        logger.warning(f"Session {session_id} not found or expired")
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=ErrorCode.SESSION_NOT_FOUND,
            message=f"Session {session_id} not found or expired"
        )
    
    return session_manager.to_response(session)


@router.get("/{session_id}/metrics", response_model=SessionWithMetrics)
async def get_session_with_metrics(session_id: UUID):
    """
    Get session details including resource metrics
    
    Args:
        session_id: UUID of the session
        
    Returns:
        SessionWithMetrics: Session with metrics
    """
    session = session_manager.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found or expired"
        )
    
    # Get vector count from Qdrant
    vector_count = vector_store.get_vector_count(session.qdrant_collection_name)
    if vector_count is None:
        vector_count = 0  # Default to 0 if collection doesn't exist or is empty
    session_manager.update_vector_count(session_id, vector_count)
    
    # Create metrics (placeholder values for now, will be updated during chat)
    metrics = Metrics(
        token_input=0,
        token_output=0,
        context_tokens=0,
        vector_count=vector_count
    )
    
    response = session_manager.to_response(session)
    
    return SessionWithMetrics(
        **response.model_dump(),
        metrics=metrics.model_dump()
    )


@router.post("/{session_id}/heartbeat", response_model=SessionResponse)
async def session_heartbeat(session_id: UUID, request: Request):
    """
    Update session activity and extend TTL
    
    Args:
        session_id: UUID of the session
        
    Returns:
        SessionResponse: Updated session details
    """
    client_ip = request.client.host if request.client else "unknown"
    
    success = session_manager.update_activity(session_id)
    
    if not success:
        session_activity_logger.session_not_found(session_id, client_ip, "heartbeat")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found or expired"
        )
    
    session = session_manager.get_session(session_id)
    session_activity_logger.session_heartbeat(session_id, client_ip, session.expires_at)
    return session_manager.to_response(session)


@router.post("/{session_id}/close", status_code=status.HTTP_204_NO_CONTENT)
async def close_session(session_id: UUID, request: Request):
    """
    Close session and delete associated data
    
    Args:
        session_id: UUID of the session
    """
    client_ip = request.client.host if request.client else "unknown"
    
    session = session_manager.get_session(session_id)
    
    if not session:
        session_activity_logger.session_not_found(session_id, client_ip, "close")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    # Delete Qdrant collection
    collection_deleted = vector_store.delete_collection(session.qdrant_collection_name)
    if not collection_deleted:
        logger.warning(f"Failed to delete Qdrant collection: {session.qdrant_collection_name}")
    
    # Clear RAG Engine metrics and memory
    from ...services.rag_engine import get_rag_engine
    rag_engine = get_rag_engine()
    rag_engine.clear_session(session_id)
    
    # Clear chat history
    from .chat import _chat_history
    if session_id in _chat_history:
        del _chat_history[session_id]
    
    # Remove session
    session_manager.close_session(session_id)
    
    # Log session close with structured logger
    session_activity_logger.session_closed(session_id, client_ip, "user_closed")
    logger.info(f"Session {session_id} closed successfully")


@router.post("/{session_id}/restart", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def restart_session(session_id: UUID, request: Request):
    """
    Close current session and create a new one
    
    Args:
        session_id: UUID of the current session
        
    Returns:
        SessionResponse: New session details
    """
    client_ip = request.client.host if request.client else "unknown"
    old_session = session_manager.get_session(session_id)
    
    # Get language from old session (or default to 'en')
    language = old_session.language if old_session else "en"
    
    # Close old session if exists
    if old_session:
        vector_store.delete_collection(old_session.qdrant_collection_name)
        session_manager.close_session(session_id)
        session_activity_logger.session_closed(session_id, client_ip, "restart")
        logger.info(f"Old session {session_id} closed during restart")
    
    # Create new session (reuse create_session logic)
    new_session = session_manager.create_session(language=language)
    vector_store.create_collection(new_session.qdrant_collection_name)
    session_manager.update_state(new_session.session_id, SessionState.READY_FOR_UPLOAD)
    
    # Log new session creation
    session_activity_logger.session_created(new_session.session_id, client_ip, language)
    logger.info(f"New session {new_session.session_id} created after restart")
    return session_manager.to_response(new_session)


@router.put("/{session_id}/language", response_model=SessionResponse)
async def update_language(session_id: UUID, request: LanguageUpdateRequest):
    """
    Update session language preference
    
    Args:
        session_id: UUID of the session
        request: Language update request
        
    Returns:
        SessionResponse: Updated session details
    """
    success = session_manager.update_language(session_id, request.language)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found or invalid language"
        )
    
    session = session_manager.get_session(session_id)
    return session_manager.to_response(session)


@router.put("/{session_id}/prompt", response_model=SessionResponse)
async def update_custom_prompt(session_id: UUID, custom_prompt: str | None = None):
    """
    Update session custom prompt template
    
    Args:
        session_id: UUID of the session
        custom_prompt: Custom prompt template (optional, None to clear)
        
    Returns:
        SessionResponse: Updated session details
    """
    session = session_manager.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    # Update custom prompt
    session.custom_prompt = custom_prompt
    logger.info(f"Session {session_id} custom_prompt updated (has_prompt: {bool(custom_prompt)})")
    
    return session_manager.to_response(session)
