"""
FastAPI application initialization
Entry point for the RAG Demo Chatbot backend
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
import google.generativeai as genai
import logging

from src.core.config import settings
from src.core.scheduler import scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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


# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors()
        }
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 Not Found errors"""
    logger.warning(f"404 Not Found: {request.url}")
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": "Resource not found"}
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle 500 Internal Server errors"""
    logger.error(f"500 Internal Server Error on {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler"""
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred"}
    )


# Include API routers FIRST (before defining other routes)
from src.api import router as api_router
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
