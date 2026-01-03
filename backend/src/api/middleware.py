"""
FastAPI Middleware Layer
T090: Request validation middleware for enhanced error handling

Responsibilities:
- Request logging with ID tracking
- Request validation before routing
- Response enrichment with request metadata
- CORS and security headers
"""

import logging
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import status

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """T090: Log all requests and add request ID to context"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Log request
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
        
        try:
            response = await call_next(request)
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            # Log response
            logger.info(f"[{request_id}] Response: {response.status_code}")
            
            return response
            
        except Exception as e:
            logger.error(f"[{request_id}] Exception: {type(e).__name__}: {e}", exc_info=True)
            raise


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """T090: Validate request format before routing"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get request ID from logging middleware
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Validate Content-Type for POST/PUT requests with body
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            
            # Skip validation for multipart/form-data (file uploads)
            if "multipart/form-data" in content_type:
                return await call_next(request)
            
            # For JSON endpoints, validate content-type
            if request.url.path.startswith("/api/") and "application/json" not in content_type:
                logger.warning(
                    f"[{request_id}] Invalid Content-Type for {request.method} {request.url.path}: {content_type}"
                )
                return JSONResponse(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    content={
                        "error": {
                            "code": "ERR_INVALID_CONTENT_TYPE",
                            "message": "Content-Type must be application/json for API endpoints",
                            "request_id": request_id
                        }
                    }
                )
        
        # Continue to next middleware/route
        response = await call_next(request)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """T090: Add security headers to responses"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # 修復 CSP 設定以支持 Swagger UI
        if request.url.path.startswith("/api/docs") or request.url.path.startswith("/api/redoc"):
            # 文檔頁面允許框架嵌入並不設定 CSP
            response.headers["X-Frame-Options"] = "SAMEORIGIN"  # 允許同域框架
            # 完全禁用 CSP 來測試 Swagger UI - 臨時措施
            # response.headers["Content-Security-Policy"] = "default-src 'self'"
            pass  # 不設定 CSP 讓 Swagger UI 能完全載入
        else:
            # API 端點使用嚴格的安全設定
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response
