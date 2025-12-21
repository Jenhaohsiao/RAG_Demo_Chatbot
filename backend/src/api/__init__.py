"""
API router aggregation
Combines all API route modules
"""
from fastapi import APIRouter

# Import route modules
from src.api.routes import session, upload, chat, prompt

# Create main API router
router = APIRouter()

# Include route modules
router.include_router(session.router, prefix="/session", tags=["Session"])
router.include_router(upload.router, prefix="/upload", tags=["Upload"])
router.include_router(chat.router, prefix="/chat", tags=["Chat"])
router.include_router(prompt.router, prefix="/prompt", tags=["Prompt"])

# Placeholder endpoint
@router.get("/status")
async def api_status():
    """API status endpoint"""
    return {"status": "Phase 3-5 Session, Upload, Chat & Prompt API ready"}


