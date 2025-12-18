"""
Document and DocumentChunk entity models
Based on data-model.md Entity 2: Document and Entity 3: DocumentChunk
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4


class SourceType(str, Enum):
    """Document source type"""
    PDF = "PDF"
    TEXT = "TEXT"
    URL = "URL"


class ExtractionStatus(str, Enum):
    """Document extraction status"""
    PENDING = "PENDING"
    EXTRACTING = "EXTRACTING"
    EXTRACTED = "EXTRACTED"
    FAILED = "FAILED"


class ModerationStatus(str, Enum):
    """Content moderation status"""
    PENDING = "PENDING"
    CHECKING = "CHECKING"
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"


class Document(BaseModel):
    """Document entity representing uploaded content"""
    document_id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    source_type: SourceType
    source_reference: str  # Filename or URL
    raw_content: str | None = None  # Transient, extracted text
    summary: str | None = None  # LLM 生成的摘要
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow)
    extraction_status: ExtractionStatus = Field(default=ExtractionStatus.PENDING)
    moderation_status: ModerationStatus = Field(default=ModerationStatus.PENDING)
    moderation_categories: list[str] = Field(default_factory=list)
    chunk_count: int = Field(default=0, ge=0)
    error_code: str | None = None
    error_message: str | None = None
    
    @field_validator('source_reference')
    @classmethod
    def validate_source_reference(cls, v: str, info) -> str:
        """Validate URL format if source_type is URL"""
        # Note: info.data contains other field values
        if 'source_type' in info.data and info.data['source_type'] == SourceType.URL:
            if not (v.startswith('http://') or v.startswith('https://')):
                raise ValueError("URL must start with http:// or https://")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "source_type": "PDF",
                "source_reference": "machine_learning_intro.pdf",
                "upload_timestamp": "2025-12-08T10:05:00Z",
                "extraction_status": "EXTRACTED",
                "moderation_status": "APPROVED",
                "chunk_count": 12
            }
        }


class DocumentChunk(BaseModel):
    """DocumentChunk entity representing a segment of processed document"""
    chunk_id: UUID = Field(default_factory=uuid4)
    document_id: UUID
    session_id: UUID
    chunk_index: int = Field(ge=0)
    text_content: str = Field(min_length=1)
    char_start: int = Field(ge=0)
    char_end: int
    embedding_vector: list[float] = Field(default_factory=list)
    embedding_timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = Field(default_factory=dict)
    
    @field_validator('char_end')
    @classmethod
    def validate_char_range(cls, v: int, info) -> int:
        """Ensure char_end > char_start"""
        if 'char_start' in info.data and v <= info.data['char_start']:
            raise ValueError("char_end must be greater than char_start")
        return v
    
    @field_validator('embedding_vector')
    @classmethod
    def validate_embedding_dimension(cls, v: list[float]) -> list[float]:
        """Validate embedding has 768 dimensions (Gemini text-embedding-004)"""
        if len(v) > 0 and len(v) != 768:
            raise ValueError("Embedding vector must have exactly 768 dimensions")
        return v
    
    def to_qdrant_point(self) -> dict:
        """Convert to Qdrant point format"""
        return {
            "id": str(self.chunk_id),
            "vector": self.embedding_vector,
            "payload": {
                "document_id": str(self.document_id),
                "chunk_index": self.chunk_index,
                "text_content": self.text_content,
                "char_start": self.char_start,
                "char_end": self.char_end,
                "metadata": self.metadata
            }
        }
    
    class Config:
        json_schema_extra = {
            "example": {
                "chunk_id": "c1d2e3f4-a5b6-7890-cdef-123456789012",
                "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "chunk_index": 0,
                "text_content": "Machine learning is a subset of AI...",
                "char_start": 0,
                "char_end": 2000,
                "embedding_timestamp": "2025-12-08T10:06:00Z",
                "metadata": {"page": 1}
            }
        }


class DocumentStatusResponse(BaseModel):
    """Document processing status response"""
    document_id: UUID
    source_type: SourceType
    extraction_status: ExtractionStatus
    moderation_status: ModerationStatus
    processing_progress: int = Field(ge=0, le=100)  # 0-100%
    chunk_count: int = Field(ge=0)
    summary: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
                "source_type": "PDF",
                "extraction_status": "EXTRACTED",
                "moderation_status": "APPROVED",
                "processing_progress": 100,
                "chunk_count": 12,
                "summary": "Introduction to Machine Learning algorithms..."
            }
        }


class DocumentListResponse(BaseModel):
    """List of documents in a session"""
    session_id: UUID
    documents: list[dict]
    total_documents: int
    total_chunks: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "documents": [
                    {
                        "document_id": "d1e2f3a4-b5c6-7890-def0-123456789abc",
                        "source_type": "PDF",
                        "moderation_status": "APPROVED",
                        "chunk_count": 12
                    }
                ],
                "total_documents": 1,
                "total_chunks": 12
            }
        }
