"""
Session entity models
Based on data-model.md Entity 1: Session
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, timedelta
from enum import Enum
from uuid import UUID, uuid4


class SessionState(str, Enum):
    """Session state machine"""
    INITIALIZING = "INITIALIZING"
    READY_FOR_UPLOAD = "READY_FOR_UPLOAD"
    PROCESSING = "PROCESSING"
    ERROR = "ERROR"
    READY_FOR_CHAT = "READY_FOR_CHAT"
    CHATTING = "CHATTING"


class Session(BaseModel):
    """Session entity representing a user's isolated chatbot instance"""
    session_id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default=None)
    state: SessionState = Field(default=SessionState.INITIALIZING)
    qdrant_collection_name: str = Field(default="")
    document_count: int = Field(default=0, ge=0)
    vector_count: int = Field(default=0, ge=0)
    language: str = Field(default="en", pattern="^(en|zh|ko|es|ja|ar|fr)$")
    
    def __init__(self, **data):
        super().__init__(**data)
        if not self.expires_at:
            self.expires_at = self.created_at + timedelta(minutes=30)
        if not self.qdrant_collection_name:
            # Remove hyphens from UUID for valid collection name
            clean_id = str(self.session_id).replace("-", "")
            self.qdrant_collection_name = f"session_{clean_id}"
    
    @field_validator('language')
    @classmethod
    def validate_language(cls, v: str) -> str:
        """Validate language code is one of the 7 supported languages"""
        valid_languages = ["en", "zh", "ko", "es", "ja", "ar", "fr"]
        if v not in valid_languages:
            raise ValueError(f"Language must be one of {valid_languages}")
        return v
    
    def update_activity(self) -> None:
        """Update last_activity and extends expires_at by 30 minutes"""
        self.last_activity = datetime.utcnow()
        self.expires_at = self.last_activity + timedelta(minutes=30)
    
    def is_expired(self) -> bool:
        """Check if session has expired"""
        return datetime.utcnow() > self.expires_at
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "created_at": "2025-12-08T10:00:00Z",
                "last_activity": "2025-12-08T10:00:00Z",
                "expires_at": "2025-12-08T10:30:00Z",
                "state": "READY_FOR_UPLOAD",
                "qdrant_collection_name": "session_a1b2c3d4e5f67890abcdef1234567890",
                "document_count": 0,
                "vector_count": 0,
                "language": "en"
            }
        }


class SessionResponse(BaseModel):
    """Session response schema for API endpoints"""
    session_id: UUID
    state: SessionState
    created_at: datetime
    expires_at: datetime
    last_activity: datetime
    qdrant_collection_name: str
    language: str
    document_count: int = 0
    vector_count: int = 0
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "state": "READY_FOR_UPLOAD",
                "created_at": "2025-12-08T10:00:00Z",
                "expires_at": "2025-12-08T10:30:00Z",
                "qdrant_collection": "session_a1b2c3d4e5f67890abcdef1234567890",
                "language": "en"
            }
        }


class SessionWithMetrics(SessionResponse):
    """Session response with metrics included"""
    metrics: dict  # Will be Metrics model
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "state": "CHATTING",
                "created_at": "2025-12-08T10:00:00Z",
                "expires_at": "2025-12-08T10:30:00Z",
                "qdrant_collection": "session_a1b2c3d4e5f67890abcdef1234567890",
                "language": "en",
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


class LanguageUpdateRequest(BaseModel):
    """Request to update session language"""
    language: str = Field(pattern="^(en|zh|ko|es|ja|ar|fr)$")
    
    class Config:
        json_schema_extra = {
            "example": {
                "language": "zh"
            }
        }
