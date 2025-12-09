"""
ChatMessage entity models
Based on data-model.md Entity 4: ChatMessage
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4


class ResponseType(str, Enum):
    """Chat response type"""
    ANSWERED = "ANSWERED"
    CANNOT_ANSWER = "CANNOT_ANSWER"


class ChatRole(str, Enum):
    """Chat message role (for frontend display)"""
    USER = "USER"
    ASSISTANT = "ASSISTANT"


class RetrievedChunk(BaseModel):
    """Retrieved chunk information for context"""
    chunk_id: UUID
    text_content: str
    similarity_score: float = Field(ge=0.7, le=1.0)
    document_id: UUID
    chunk_index: int = Field(ge=0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "chunk_id": "c1d2e3f4-a5b6-7890-cdef-123456789012",
                "text_content": "Machine learning is a subset of AI...",
                "similarity_score": 0.89,
                "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
                "chunk_index": 3
            }
        }


class ChatMessage(BaseModel):
    """ChatMessage entity representing a query-response pair"""
    message_id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_query: str = Field(min_length=1)
    query_embedding: list[float] = Field(default_factory=list)
    retrieved_chunks: list[RetrievedChunk] = Field(default_factory=list)
    similarity_scores: list[float] = Field(default_factory=list)
    llm_response: str = Field(min_length=1)
    response_type: ResponseType
    token_metrics: dict  # Will be Metrics model
    
    @field_validator('query_embedding')
    @classmethod
    def validate_query_embedding(cls, v: list[float]) -> list[float]:
        """Validate query embedding has 768 dimensions"""
        if len(v) > 0 and len(v) != 768:
            raise ValueError("Query embedding must have 768 dimensions")
        return v
    
    @field_validator('similarity_scores')
    @classmethod
    def validate_similarity_scores(cls, v: list[float]) -> list[float]:
        """Ensure all similarity scores >= 0.7 (strict RAG threshold)"""
        for score in v:
            if score < 0.7:
                raise ValueError("All similarity scores must be >= 0.7")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "timestamp": "2025-12-08T10:15:00Z",
                "user_query": "What is machine learning?",
                "llm_response": "Based on the uploaded document...",
                "response_type": "ANSWERED",
                "retrieved_chunks": [],
                "similarity_scores": [0.89, 0.82],
                "token_metrics": {}
            }
        }


class QueryRequest(BaseModel):
    """Request to submit a query"""
    query: str = Field(min_length=1, max_length=1000)
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "What is machine learning?"
            }
        }


class ChatResponse(BaseModel):
    """Chat query response"""
    message_id: UUID
    session_id: UUID
    timestamp: datetime
    user_query: str
    llm_response: str
    response_type: ResponseType
    retrieved_chunks: list[RetrievedChunk]
    metrics: dict  # Metrics model
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "timestamp": "2025-12-08T10:15:00Z",
                "user_query": "What is machine learning?",
                "llm_response": "Based on the uploaded document, machine learning is...",
                "response_type": "ANSWERED",
                "retrieved_chunks": [
                    {
                        "chunk_id": "c1d2e3f4-a5b6-7890-cdef-123456789012",
                        "text_content": "Machine learning is a subset of AI...",
                        "similarity_score": 0.89,
                        "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
                        "chunk_index": 3
                    }
                ],
                "metrics": {
                    "token_input": 256,
                    "token_output": 128,
                    "token_total": 384,
                    "token_limit": 32000,
                    "token_percent": 1.2,
                    "context_tokens": 180,
                    "context_percent": 0.56,
                    "vector_count": 13
                }
            }
        }


class ChatHistoryMessage(BaseModel):
    """Simplified message for history list"""
    message_id: UUID
    timestamp: datetime
    user_query: str
    llm_response: str
    response_type: ResponseType
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
                "timestamp": "2025-12-08T10:15:00Z",
                "user_query": "What is machine learning?",
                "llm_response": "Based on the uploaded document...",
                "response_type": "ANSWERED"
            }
        }


# Simplified message for chat history API (role-based)
class ChatMessage(BaseModel):
    """Chat message with role (USER or ASSISTANT)"""
    message_id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    role: ChatRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "role": "USER",
                "content": "What is machine learning?",
                "timestamp": "2025-12-08T10:15:00Z"
            }
        }


class ChatHistoryResponse(BaseModel):
    """Chat history response"""
    session_id: UUID
    messages: list[ChatHistoryMessage]
    total_messages: int
    limit: int
    offset: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "messages": [],
                "total_messages": 2,
                "limit": 50,
                "offset": 0
            }
        }
