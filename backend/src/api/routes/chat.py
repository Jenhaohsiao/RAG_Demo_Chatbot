"""
Chat API Routes
處理 RAG 查詢與聊天歷史

Constitutional Compliance:
- Principle V (Strict RAG): 僅基於檢索內容回答，相似度 ≥0.7
- Principle VIII (API Contract Stability): 遵循 contracts/chat.openapi.yaml
"""

import logging
from uuid import UUID
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...models.chat import ChatMessage, ChatRole
from ...models.session import SessionState
from ...models.errors import ErrorCode, get_error_response, get_http_status_code
from ...core.session_manager import session_manager
from ...services.rag_engine import get_rag_engine, RAGError

logger = logging.getLogger(__name__)

# Create chat router (prefix handled by parent router in api/__init__.py)
router = APIRouter()

# 全域服務實例
rag_engine = get_rag_engine()


class QueryRequest(BaseModel):
    """查詢請求"""
    user_query: str = Field(..., min_length=1, max_length=2000, description="使用者查詢")


class RetrievedChunkResponse(BaseModel):
    """檢索到的文字塊回應"""
    chunk_id: str
    text: str
    similarity_score: float
    document_id: str
    source_reference: str
    chunk_index: int


class ChatResponse(BaseModel):
    """Chat 回應"""
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


class ChatHistoryResponse(BaseModel):
    """聊天歷史回應"""
    messages: List[ChatMessage]
    total_count: int


# 聊天歷史儲存（實際應使用資料庫）
_chat_history: dict[UUID, List[ChatMessage]] = {}


@router.post("/{session_id}/query", response_model=ChatResponse)
async def query(
    session_id: UUID,
    request: QueryRequest
):
    """
    執行 RAG 查詢
    
    Flow:
    1. 驗證 session 存在且狀態為 READY_FOR_CHAT
    2. 執行 RAG 查詢 (embed → search → generate)
    3. 儲存聊天歷史
    4. 回傳回應
    """
    # 驗證 session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # 驗證 session 狀態
    if session.state != SessionState.READY_FOR_CHAT:
        error = get_error_response(
            ErrorCode.SESSION_INVALID_STATE,
            details={"current_state": session.state.value, "required_state": "READY_FOR_CHAT"}
        )
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_INVALID_STATE),
            detail=error.dict()
        )
    
    # 驗證查詢非空
    user_query = request.user_query.strip()
    if not user_query:
        error = get_error_response(ErrorCode.QUERY_EMPTY)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.QUERY_EMPTY),
            detail=error.dict()
        )
    
    try:
        # 執行 RAG 查詢
        logger.info(f"[{session_id}] Processing query: {user_query[:100]}")
        
        rag_response = rag_engine.query(
            session_id=session_id,
            user_query=user_query
        )
        
        # 建立使用者訊息
        user_message = ChatMessage(
            session_id=session_id,
            role=ChatRole.USER,
            content=user_query
        )
        
        # 建立助理訊息
        assistant_message = ChatMessage(
            session_id=session_id,
            role=ChatRole.ASSISTANT,
            content=rag_response.llm_response
        )
        
        # 儲存聊天歷史
        if session_id not in _chat_history:
            _chat_history[session_id] = []
        
        _chat_history[session_id].append(user_message)
        _chat_history[session_id].append(assistant_message)
        
        # 更新 session 狀態
        session_manager.update_state(session_id, SessionState.CHATTING)
        session_manager.update_activity(session_id)
        
        # 轉換檢索塊為回應格式
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
            timestamp=assistant_message.timestamp.isoformat() + "Z"
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
    取得聊天歷史
    
    Args:
        session_id: Session ID
        limit: 每頁數量（預設 50）
        offset: 偏移量（預設 0）
    
    Returns:
        ChatHistoryResponse: 聊天歷史
    """
    # 驗證 session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # 取得聊天歷史
    messages = _chat_history.get(session_id, [])
    total_count = len(messages)
    
    # 分頁
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
    清除聊天歷史
    
    Args:
        session_id: Session ID
    
    Returns:
        dict: 成功訊息
    """
    # 驗證 session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # 清除歷史
    if session_id in _chat_history:
        del _chat_history[session_id]
    
    logger.info(f"[{session_id}] Chat history cleared")
    
    return {"message": "Chat history cleared successfully"}
