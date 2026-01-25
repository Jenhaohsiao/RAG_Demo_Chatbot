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
    gemini_model: str = "gemini-2.5-flash"  # 🔥 UPDATED: Migrated from 2.0-flash-exp to 2.5-flash (higher rate limits, better performance)
    gemini_embedding_model: str = "text-embedding-004"
    gemini_temperature: float = 0.1
    
    # Content Moderation Configuration
    enable_content_moderation: bool = True  # Set to False to skip moderation during testing
    
    # Qdrant Configuration
    # IMPORTANT: ONLY cloud mode is supported. No embedded or docker mode.
    # All environments (dev/test/prod) MUST use Qdrant Cloud to avoid:
    # - Windows file locking issues (embedded mode)
    # - Docker dependency complexity (docker mode)
    # - Data persistence problems (embedded mode uses temp directories)
    qdrant_mode: Literal["cloud"] = "cloud"  # FIXED: Only cloud mode allowed
    qdrant_api_key: str | None = None  # Required: Qdrant Cloud API key
    qdrant_url: str | None = None  # Required: Qdrant Cloud URL (e.g., https://xxx.cloud.qdrant.io:6333)
    
    # Deprecated: These are kept for backward compatibility but NOT USED
    qdrant_host: str = "localhost"  # DEPRECATED: Not used in cloud mode
    qdrant_port: int = 6333  # DEPRECATED: Not used in cloud mode
    
    # Session Configuration
    session_ttl_minutes: int = 10
    
    # RAG Configuration
    similarity_threshold: float = 0.5  # Lowered from 0.7 to improve recall
    chunk_size: int = 512
    chunk_overlap: int = 128
    
    # Token Configuration
    token_limit: int = 1000000  # Gemini-1.5-flash limit (1M tokens)
    token_warning_threshold: float = 0.8  # 80%
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"
    
    # Email Configuration for Contact Form
    contact_email_recipient: str = "jenhao.hsiao2@gmail.com"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str | None = None  # Gmail account
    smtp_password: str | None = None  # Gmail app password
    
    # T091: Logging Configuration
    log_level: str = "INFO"  # Can be DEBUG, INFO, WARNING, ERROR, CRITICAL
    
    # CORS Configuration
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"
    
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
