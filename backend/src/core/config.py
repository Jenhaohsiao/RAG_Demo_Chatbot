"""
Configuration module for RAG Demo Chatbot
Loads environment variables and provides settings throughout the application
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Literal


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Gemini API Configuration (Optional - can be provided via UI if missing)
    gemini_api_key: str | None = None  # Optional: fallback to UI input
    gemini_model: str = "gemini-1.5-flash"  # Cheapest model for RAG Q&A
    gemini_embedding_model: str = "text-embedding-004"
    gemini_temperature: float = 0.1
    
    # Qdrant Configuration
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_mode: Literal["embedded", "docker", "cloud"] = "docker"
    qdrant_api_key: str | None = None  # For cloud mode
    qdrant_url: str | None = None  # For cloud mode
    
    # Session Configuration
    session_ttl_minutes: int = 30
    
    # RAG Configuration
    similarity_threshold: float = 0.7
    chunk_size: int = 512
    chunk_overlap: int = 128
    
    # Token Configuration
    token_limit: int = 1000000  # Gemini-1.5-flash limit (1M tokens)
    token_warning_threshold: float = 0.8  # 80%
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"
    
    # CORS Configuration
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    class Config:
        # Load both .env (defaults) and .env.local (secrets)
        # .env.local takes precedence over .env
        env_file = (".env", ".env.local")
        case_sensitive = False


# Global settings instance
settings = Settings()
