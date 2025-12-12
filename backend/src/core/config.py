"""
Configuration module for RAG Demo Chatbot
Loads environment variables and provides settings throughout the application
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Literal


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore',
        env_prefix=""  # No prefix for environment variables
    )
    
    # Gemini API Configuration (Optional - can be provided via UI if missing)
    gemini_api_key: str | None = None  # Optional: fallback to UI input
    gemini_model: str = "gemini-1.5-pro"  # Cost-efficient model with full capabilities
    gemini_embedding_model: str = "text-embedding-004"
    gemini_temperature: float = 0.1
    
    # Content Moderation Configuration
    enable_content_moderation: bool = True  # Set to False to skip moderation during testing
    
    # Qdrant Configuration (IMPORTANT: Default to docker mode, NOT embedded)
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_mode: Literal["embedded", "docker", "cloud"] = "docker"  # CRITICAL: Docker is default
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
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    @property
    def get_cors_origins(self) -> list[str]:
        """Parse CORS origins from string"""
        return [origin.strip() for origin in self.cors_origins.split(',')]


# Create settings instance
settings = Settings()

# DEBUG: Print configuration to verify Docker mode is active
import logging
logger = logging.getLogger(__name__)
logger.info(f"Configuration loaded: QDRANT_MODE={settings.qdrant_mode}, ENABLE_CONTENT_MODERATION={settings.enable_content_moderation}")
