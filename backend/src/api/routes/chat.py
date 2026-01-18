"""
Chat API Routes
Handles RAG queries and chat history

Constitutional Compliance:
- Principle V (Strict RAG): Answer based on retrieved content only, similarity ≥0.7
- Principle VIII (API Contract Stability): Follows contracts/chat.openapi.yaml

T089: Enhanced error handling with appropriate HTTP status codes
"""

import logging
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel, Field

from ...models.chat import ChatMessage, ChatRole
from ...models.session import SessionState
from ...models.errors import ErrorCode, get_error_response, get_http_status_code
from ...models.quota_errors import QuotaExceededError, InvalidApiKeyError, ApiKeyMissingError
from ...core.session_manager import session_manager
from ...services.rag_engine import get_rag_engine, RAGError

logger = logging.getLogger(__name__)

# Create chat router (prefix handled by parent router in api/__init__.py)
router = APIRouter()

# Global service instances
rag_engine = get_rag_engine()


class QueryRequest(BaseModel):
    """Query request model"""
    user_query: str = Field(..., min_length=1, max_length=2000, description="User query text")
    language: str = Field(default="en", description="UI language code (en, zh-TW, ko, es, ja, ar, fr, zh-CN)")


class RetrievedChunkResponse(BaseModel):
    """Retrieved document chunk response"""
    chunk_id: str
    text: str
    similarity_score: float
    document_id: str
    source_reference: str
    chunk_index: int


class ChatResponse(BaseModel):
    """Chat response model"""
    message_id: str
    session_id: str
    llm_response: str
    response_type: str  # "ANSWERED" or "CANNOT_ANSWER"
    retrieved_chunks: List[RetrievedChunkResponse]
    similarity_scores: List[float]
    token_input: int
    token_output: int
    token_total: int
    timestamp: str
    suggestions: Optional[List[str]] = None  # Suggested questions (provided when cannot answer)


class ChatHistoryResponse(BaseModel):
    """Chat history response"""
    messages: List[ChatMessage]
    total_count: int


class MetricsResponse(BaseModel):
    """Session metrics response"""
    session_id: str
    total_queries: int
    total_tokens: int
    total_input_tokens: int
    total_output_tokens: int
    avg_tokens_per_query: float
    avg_chunks_retrieved: float
    unanswered_ratio: float
    token_warning_threshold: int
    is_token_warning: bool
    is_unanswered_warning: bool


# Chat history storage (should use database in production)
_chat_history: dict[UUID, List[ChatMessage]] = {}


@router.post("/{session_id}/query", response_model=ChatResponse)
async def query(
    session_id: UUID,
    request: QueryRequest,
    x_user_api_key: Optional[str] = Header(None, description="User-provided API Key (optional)")
):
    """
    Execute RAG query
    
    Flow:
    1. Validate session exists and state is READY_FOR_CHAT
    2. Execute RAG query (embed → search → generate)
    3. Save chat history
    4. Return response
    
    User-provided API Key support:
    - When system API Key quota is exhausted, user can provide their own key in header
    - Header: X-User-API-Key: your_api_key_here
    - User's key is only used for current request, not stored
    
    T089: Enhanced error handling:
    - 404 if session not found
    - 400 if query empty
    - 409 if session in invalid state
    - 429 if quota exceeded (requires user to provide API Key)
    - 500 if RAG processing fails
    """
    # Delayed import to avoid circular dependency
    from ...main import AppException
    
    # Validate session exists
    session = session_manager.get_session(session_id)
    if not session:
        logger.warning(f"Session {session_id} not found")
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=ErrorCode.SESSION_NOT_FOUND,
            message=f"Session {session_id} not found or expired"
        )
    
    # Validate session state (allow READY_FOR_CHAT or CHATTING)
    if session.state not in (SessionState.READY_FOR_CHAT, SessionState.CHATTING):
        logger.warning(f"Session {session_id} in invalid state: {session.state}")
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            error_code=ErrorCode.SESSION_INVALID_STATE,
            message=f"Session is in {session.state.value} state, expected READY_FOR_CHAT or CHATTING",
            details={"current_state": session.state.value}
        )
    
    # Validate query is not empty
    user_query = request.user_query.strip()
    if not user_query:
        logger.warning(f"Empty query from session {session_id}")
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code=ErrorCode.QUERY_EMPTY,
            message="Query cannot be empty"
        )
    
    try:
        # Execute RAG query (use session-specific similarity_threshold and custom_prompt)
        # If user provides API Key, pass it to RAG engine
        logger.debug(
            f"[{session_id}] Processing query (threshold={session.similarity_threshold}, "
            f"language={request.language}, custom_prompt={bool(session.custom_prompt)})"
        )
        
        rag_response = rag_engine.query(
            session_id=session_id,
            user_query=user_query,
            similarity_threshold=session.similarity_threshold,
            language=request.language,
            custom_prompt=session.custom_prompt,
            api_key=x_user_api_key  # Pass user's API Key (if provided)
        )
        
        # Create user message
        user_message = ChatMessage(
            session_id=session_id,
            role=ChatRole.USER,
            content=user_query
        )
        
        # Create assistant message
        assistant_message = ChatMessage(
            session_id=session_id,
            role=ChatRole.ASSISTANT,
            content=rag_response.llm_response
        )
        
        # Save chat history
        if session_id not in _chat_history:
            _chat_history[session_id] = []
        
        _chat_history[session_id].append(user_message)
        _chat_history[session_id].append(assistant_message)
        
        # Update session state
        session_manager.update_state(session_id, SessionState.CHATTING)
        session_manager.update_activity(session_id)
        
        # Convert retrieved chunks to response format
        retrieved_chunks_response = [
            RetrievedChunkResponse(
                chunk_id=chunk.chunk_id,
                text=chunk.text,
                similarity_score=chunk.similarity_score,
                document_id=chunk.document_id,
                source_reference=chunk.source_reference,
                chunk_index=chunk.chunk_index
            )
            for chunk in rag_response.retrieved_chunks
        ]
        
        # Log metrics (if warning threshold exceeded)
        if rag_response.metrics and rag_response.metrics.unanswered_ratio >= 0.8:
            logger.warning(
                f"[{session_id}] HIGH UNANSWERED RATIO: {rag_response.metrics.unanswered_ratio:.1%}"
            )
        
        logger.info(
            f"[{session_id}] Query completed: {rag_response.response_type}, "
            f"tokens={rag_response.token_total}"
        )
        
        return ChatResponse(
            message_id=str(assistant_message.message_id),
            session_id=str(session_id),
            llm_response=rag_response.llm_response,
            response_type=rag_response.response_type,
            retrieved_chunks=retrieved_chunks_response,
            similarity_scores=rag_response.similarity_scores,
            token_input=rag_response.token_input,
            token_output=rag_response.token_output,
            token_total=rag_response.token_total,
            timestamp=assistant_message.timestamp.isoformat() + "Z",
            suggestions=rag_response.suggestions
        )
    
    except QuotaExceededError as e:
        # Quota exceeded error - return 429 to trigger API Key input dialog on frontend
        logger.warning(f"[{session_id}] API quota exceeded: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error_code": "QUOTA_EXCEEDED",
                "message": e.message,
                "retry_after": e.retry_after,
                "requires_user_api_key": True
            }
        )
    
    except InvalidApiKeyError as e:
        # User-provided API Key is invalid
        logger.warning(f"[{session_id}] Invalid API key provided: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_API_KEY",
                "message": e.message
            }
        )
    
    except RAGError as e:
        logger.error(f"[{session_id}] RAG query failed: {str(e)}")
        error = get_error_response(
            ErrorCode.SEARCH_FAILED,
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SEARCH_FAILED),
            detail=error.dict()
        )
    
    except Exception as e:
        logger.error(f"[{session_id}] Query processing failed: {str(e)}", exc_info=True)
        error = get_error_response(
            ErrorCode.LLM_API_FAILED,
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.LLM_API_FAILED),
            detail=error.dict()
        )


@router.get("/{session_id}/history", response_model=ChatHistoryResponse)
async def get_history(
    session_id: UUID,
    limit: int = 50,
    offset: int = 0
):
    """
    Get chat history
    
    Args:
        session_id: Session ID
        limit: Items per page (default 50)
        offset: Offset for pagination (default 0)
    
    Returns:
        ChatHistoryResponse: Chat history
    """
    # Validate session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # Get chat history
    messages = _chat_history.get(session_id, [])
    total_count = len(messages)
    
    # Pagination
    paginated_messages = messages[offset:offset + limit]
    
    logger.info(
        f"[{session_id}] Retrieved {len(paginated_messages)} messages "
        f"(total: {total_count})"
    )
    
    return ChatHistoryResponse(
        messages=paginated_messages,
        total_count=total_count
    )


@router.delete("/{session_id}/history")
async def clear_history(session_id: UUID):
    """
    Clear chat history
    
    Args:
        session_id: Session ID
    
    Returns:
        dict: Success message
    """
    # Validate session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # Clear history
    if session_id in _chat_history:
        del _chat_history[session_id]
    
    logger.info(f"[{session_id}] Chat history cleared")
    
    return {"message": "Chat history cleared successfully"}


@router.get("/{session_id}/metrics", response_model=MetricsResponse)
async def get_metrics(session_id: UUID):
    """
    Get session metrics (token usage, query statistics, warning states)
    
    Flow:
    1. Validate session exists
    2. Get metrics from RAG Engine
    3. Calculate warning states
    4. Return detailed statistics
    
    Returns:
        MetricsResponse: Contains all operational metrics
    """
    # Validate session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    try:
        # Get metrics from RAG Engine
        metrics = rag_engine.get_session_metrics(session_id)
        
        if metrics is None:
            # If no metrics yet, return initial values
            metrics = {
                'total_queries': 0,
                'total_tokens': 0,
                'total_input_tokens': 0,
                'total_output_tokens': 0,
                'avg_tokens_per_query': 0.0,
                'avg_chunks_retrieved': 0.0,
                'unanswered_ratio': 0.0,
            }
        
        # Get token threshold
        token_threshold = rag_engine.token_threshold
        is_token_warning = metrics.get('total_tokens', 0) >= token_threshold
        is_unanswered_warning = metrics.get('unanswered_ratio', 0) >= 0.8
        
        logger.info(
            f"[{session_id}] Metrics retrieved: "
            f"queries={metrics.get('total_queries')}, "
            f"tokens={metrics.get('total_tokens')}, "
            f"unanswered_ratio={metrics.get('unanswered_ratio', 0):.1%}"
        )
        
        return MetricsResponse(
            session_id=str(session_id),
            total_queries=metrics.get('total_queries', 0),
            total_tokens=metrics.get('total_tokens', 0),
            total_input_tokens=metrics.get('total_input_tokens', 0),
            total_output_tokens=metrics.get('total_output_tokens', 0),
            avg_tokens_per_query=metrics.get('avg_tokens_per_query', 0.0),
            avg_chunks_retrieved=metrics.get('avg_chunks_retrieved', 0.0),
            unanswered_ratio=metrics.get('unanswered_ratio', 0.0),
            token_warning_threshold=token_threshold,
            is_token_warning=is_token_warning,
            is_unanswered_warning=is_unanswered_warning,
        )
        
    except Exception as e:
        logger.error(f"[{session_id}] Error retrieving metrics: {str(e)}")
        error = get_error_response(ErrorCode.INTERNAL_SERVER_ERROR)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.INTERNAL_SERVER_ERROR),
            detail=error.dict()
        )


@router.get("/{session_id}/suggestions", response_model=List[str])
def get_suggestions(
    session_id: UUID,
    language: str = "en"
):
    """
    Get initial suggested questions based on uploaded documents.
    """
    # Verify session exists
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_response(ErrorCode.SESSION_NOT_FOUND).dict()
        )
        
    # Generate suggestions
    try:
        suggestions = rag_engine.generate_initial_suggestions(session_id, language)
        return suggestions
    except Exception as e:
        logger.error(f"Error generating suggestions: {e}")
        return []

