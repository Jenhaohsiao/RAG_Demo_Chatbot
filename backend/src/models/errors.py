"""
Error Codes and Error Response Models
統一的錯誤代碼定義與錯誤回應模型

Constitutional Compliance:
- Principle VIII (API Contract Stability): 統一錯誤代碼確保 API 穩定性
"""

from enum import Enum
from pydantic import BaseModel


class ErrorCode(str, Enum):
    """
    錯誤代碼枚舉
    
    命名規範：ERR_<CATEGORY>_<SPECIFIC_ERROR>
    """
    # Session Errors (4xx)
    SESSION_NOT_FOUND = "ERR_SESSION_NOT_FOUND"
    SESSION_EXPIRED = "ERR_SESSION_EXPIRED"
    SESSION_INVALID_STATE = "ERR_SESSION_INVALID_STATE"
    
    # Upload Errors (4xx)
    FILE_TOO_LARGE = "ERR_FILE_TOO_LARGE"
    UNSUPPORTED_FORMAT = "ERR_UNSUPPORTED_FORMAT"
    INVALID_URL = "ERR_INVALID_URL"
    EMPTY_FILE = "ERR_EMPTY_FILE"
    DOCUMENT_NOT_FOUND = "ERR_DOCUMENT_NOT_FOUND"
    
    # Extraction Errors (5xx - Processing)
    EXTRACT_FAILED = "ERR_EXTRACT_FAILED"
    FETCH_FAILED = "ERR_FETCH_FAILED"
    PDF_CORRUPTED = "ERR_PDF_CORRUPTED"
    URL_TIMEOUT = "ERR_URL_TIMEOUT"
    URL_TOO_LARGE = "ERR_URL_TOO_LARGE"
    
    # Moderation Errors (4xx - Content Policy)
    MODERATION_BLOCKED = "ERR_MODERATION_BLOCKED"
    MODERATION_API_FAILED = "ERR_MODERATION_API_FAILED"
    
    # Processing Errors (5xx)
    CHUNKING_FAILED = "ERR_CHUNKING_FAILED"
    EMBEDDING_FAILED = "ERR_EMBEDDING_FAILED"
    VECTOR_STORE_FAILED = "ERR_VECTOR_STORE_FAILED"
    PROCESSING_FAILED = "ERR_PROCESSING_FAILED"
    
    # RAG Query Errors (4xx/5xx)
    QUERY_EMPTY = "ERR_QUERY_EMPTY"
    NO_DOCUMENTS = "ERR_NO_DOCUMENTS"
    SEARCH_FAILED = "ERR_SEARCH_FAILED"
    LLM_API_FAILED = "ERR_LLM_API_FAILED"
    
    # Generic Errors (5xx)
    INTERNAL_ERROR = "ERR_INTERNAL_ERROR"
    API_KEY_MISSING = "ERR_API_KEY_MISSING"
    API_KEY_INVALID = "ERR_API_KEY_INVALID"


class ErrorResponse(BaseModel):
    """
    標準錯誤回應格式
    
    符合 OpenAPI 規格中的 Error schema
    """
    error_code: ErrorCode
    message: str
    details: dict | None = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "error_code": "ERR_MODERATION_BLOCKED",
                "message": "Content violates safety policies",
                "details": {
                    "blocked_categories": ["harassment", "hate-speech"]
                }
            }
        }


# 錯誤訊息範本
ERROR_MESSAGES = {
    # Session
    ErrorCode.SESSION_NOT_FOUND: "Session not found or expired",
    ErrorCode.SESSION_EXPIRED: "Session has expired (TTL: 30 minutes)",
    ErrorCode.SESSION_INVALID_STATE: "Session is in invalid state for this operation",
    
    # Upload
    ErrorCode.FILE_TOO_LARGE: "File size exceeds 10MB limit",
    ErrorCode.UNSUPPORTED_FORMAT: "Unsupported file format. Only PDF and TXT files are supported",
    ErrorCode.INVALID_URL: "Invalid URL format. Must be http:// or https://",
    ErrorCode.EMPTY_FILE: "File is empty or contains no text",
    ErrorCode.DOCUMENT_NOT_FOUND: "Document not found or does not belong to this session",
    
    # Extraction
    ErrorCode.EXTRACT_FAILED: "Failed to extract text from file",
    ErrorCode.FETCH_FAILED: "Failed to fetch content from URL",
    ErrorCode.PDF_CORRUPTED: "PDF file is corrupted or unreadable",
    ErrorCode.URL_TIMEOUT: "URL request timed out (30 second limit)",
    ErrorCode.URL_TOO_LARGE: "URL content exceeds 10MB limit",
    
    # Moderation
    ErrorCode.MODERATION_BLOCKED: "Content violates safety policies",
    ErrorCode.MODERATION_API_FAILED: "Content moderation service unavailable",
    
    # Processing
    ErrorCode.CHUNKING_FAILED: "Failed to chunk text into segments",
    ErrorCode.EMBEDDING_FAILED: "Failed to generate embeddings",
    ErrorCode.VECTOR_STORE_FAILED: "Failed to store vectors in database",
    ErrorCode.PROCESSING_FAILED: "Document processing failed",
    
    # RAG Query
    ErrorCode.QUERY_EMPTY: "Query cannot be empty",
    ErrorCode.NO_DOCUMENTS: "No documents uploaded yet",
    ErrorCode.SEARCH_FAILED: "Vector similarity search failed",
    ErrorCode.LLM_API_FAILED: "LLM API request failed",
    
    # Generic
    ErrorCode.INTERNAL_ERROR: "An internal error occurred",
    ErrorCode.API_KEY_MISSING: "Gemini API key is missing",
    ErrorCode.API_KEY_INVALID: "Gemini API key is invalid",
}


def get_error_response(
    error_code: ErrorCode, 
    custom_message: str | None = None,
    details: dict | None = None
) -> ErrorResponse:
    """
    建立標準錯誤回應
    
    Args:
        error_code: 錯誤代碼
        custom_message: 自訂錯誤訊息（覆蓋預設訊息）
        details: 額外錯誤細節
    
    Returns:
        ErrorResponse: 標準錯誤回應物件
    
    Example:
        >>> error = get_error_response(
        ...     ErrorCode.MODERATION_BLOCKED,
        ...     details={"blocked_categories": ["harassment"]}
        ... )
        >>> error.error_code
        'ERR_MODERATION_BLOCKED'
    """
    message = custom_message or ERROR_MESSAGES.get(
        error_code, 
        "An error occurred"
    )
    
    return ErrorResponse(
        error_code=error_code,
        message=message,
        details=details
    )


# HTTP 狀態碼映射
ERROR_STATUS_CODES = {
    # 400 Bad Request
    ErrorCode.INVALID_URL: 400,
    ErrorCode.UNSUPPORTED_FORMAT: 400,
    ErrorCode.QUERY_EMPTY: 400,
    ErrorCode.EMPTY_FILE: 400,
    
    # 404 Not Found
    ErrorCode.SESSION_NOT_FOUND: 404,
    ErrorCode.NO_DOCUMENTS: 404,
    ErrorCode.DOCUMENT_NOT_FOUND: 404,
    
    # 410 Gone
    ErrorCode.SESSION_EXPIRED: 410,
    
    # 413 Payload Too Large
    ErrorCode.FILE_TOO_LARGE: 413,
    ErrorCode.URL_TOO_LARGE: 413,
    
    # 422 Unprocessable Entity
    ErrorCode.MODERATION_BLOCKED: 422,
    ErrorCode.SESSION_INVALID_STATE: 422,
    
    # 500 Internal Server Error
    ErrorCode.EXTRACT_FAILED: 500,
    ErrorCode.FETCH_FAILED: 500,
    ErrorCode.CHUNKING_FAILED: 500,
    ErrorCode.EMBEDDING_FAILED: 500,
    ErrorCode.VECTOR_STORE_FAILED: 500,
    ErrorCode.PROCESSING_FAILED: 500,
    ErrorCode.SEARCH_FAILED: 500,
    ErrorCode.LLM_API_FAILED: 500,
    ErrorCode.INTERNAL_ERROR: 500,
    
    # 503 Service Unavailable
    ErrorCode.MODERATION_API_FAILED: 503,
    ErrorCode.API_KEY_MISSING: 503,
    ErrorCode.API_KEY_INVALID: 503,
}


def get_http_status_code(error_code: ErrorCode) -> int:
    """
    取得錯誤代碼對應的 HTTP 狀態碼
    
    Args:
        error_code: 錯誤代碼
    
    Returns:
        int: HTTP 狀態碼（預設 500）
    """
    return ERROR_STATUS_CODES.get(error_code, 500)
