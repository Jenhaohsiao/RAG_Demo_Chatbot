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
        
        # Fix CSP settings to support Swagger UI
        if request.url.path.startswith("/api/docs") or request.url.path.startswith("/api/redoc"):
            # Documentation pages allow same-origin frame embedding and don't set CSP
            response.headers["X-Frame-Options"] = "SAMEORIGIN"  # Allow same-origin frames
            # Completely disable CSP to test Swagger UI - temporary measure
            # response.headers["Content-Security-Policy"] = "default-src 'self'"
            pass  # Don't set CSP to allow Swagger UI to fully load
        else:
            # API endpoints use strict security settings
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response
