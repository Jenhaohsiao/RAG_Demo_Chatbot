"""
FastAPI application initialization
Entry point for the RAG Demo Chatbot backend

T089: Global error handling with correct HTTP status codes
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
import google.generativeai as genai
import logging
from typing import Dict, Any

from .core.config import settings
from .core.scheduler import scheduler
from .models.errors import ErrorCode

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Custom exception classes for Phase 9
class AppException(Exception):
    """Base exception for application"""
    def __init__(self, status_code: int, error_code: ErrorCode, message: str, details: Dict[str, Any] = None):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events for startup and shutdown
    """
    # Startup: Verify Gemini API key
    logger.info("Starting up RAG Demo Chatbot backend...")
    try:
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            # Test API key by listing models
            models = genai.list_models()
            logger.info(f"Gemini API configured successfully. Available models: {len(list(models))}")
        else:
            logger.warning("Gemini API key not provided - API calls will require user input")
    except Exception as e:
        logger.error(f"Gemini API configuration issue: {e}")
        logger.warning("API key may be invalid - user will need to provide valid key via UI")
    
    # Start session cleanup scheduler
    scheduler.start()
    logger.info("Session TTL scheduler started")
    
    logger.info("Backend startup complete")
    
    yield
    
    # Shutdown: Cleanup resources
    logger.info("Shutting down RAG Demo Chatbot backend...")
    scheduler.shutdown()
    logger.info("Backend shutdown complete")


# Create FastAPI app instance
app = FastAPI(
    title="RAG Demo Chatbot API",
    description="AI Engineer Portfolio Project - RAG-based Q&A system with strict citation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins,
    allow_credentials=False,  # Stateless API, no cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)


# Global exception handlers (T089: Comprehensive error handling)
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Handle application-specific exceptions with error codes"""
    logger.warning(f"AppException on {request.url}: {exc.error_code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code.value,
                "message": exc.message,
                "details": exc.details
            },
            "request_id": request.headers.get("x-request-id", "N/A")
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors (422 Unprocessable Entity)"""
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"][1:]),
            "type": error["type"],
            "message": error["msg"]
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": ErrorCode.QUERY_EMPTY.value,
                "message": "Request validation failed",
                "details": {"validation_errors": errors}
            },
            "request_id": request.headers.get("x-request-id", "N/A")
        }
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 Not Found errors"""
    logger.warning(f"404 Not Found: {request.url}")
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": {
                "code": ErrorCode.SESSION_NOT_FOUND.value,
                "message": "Resource not found",
                "path": str(request.url)
            },
            "request_id": request.headers.get("x-request-id", "N/A")
        }
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle 500 Internal Server errors"""
    logger.error(f"500 Internal Server Error on {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "ERR_INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred",
                "request_id": request.headers.get("x-request-id", "N/A")
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler for unhandled exceptions"""
    logger.error(f"Unhandled exception on {request.url}: {type(exc).__name__}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "ERR_INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "exception_type": type(exc).__name__,
                "request_id": request.headers.get("x-request-id", "N/A")
            }
        }
    )


# Include API routers FIRST (before defining other routes)
from .api import router as api_router
app.include_router(api_router, prefix=settings.api_prefix)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API info"""
    from datetime import datetime
    return {
        "message": "RAG Demo Chatbot API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "server_time": datetime.now().isoformat(),
        "reload_test": "2025-12-10-20:40"  # Change this to verify reload works
    }


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint
    Returns API status and configuration info
    """
    return {
        "status": "healthy",
        "gemini_model": settings.gemini_model,
        "qdrant_mode": settings.qdrant_mode,
        "session_ttl_minutes": settings.session_ttl_minutes
    }
