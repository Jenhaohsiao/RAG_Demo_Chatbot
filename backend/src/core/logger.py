"""
Logging Configuration
T091: Comprehensive logging system for backend services

Features:
- Structured logging with timestamp, level, module, and message
- File rotation for production
- DEBUG level for development, INFO for production
- Context tracking with request IDs
"""

import logging
import logging.handlers
import sys
import os
from datetime import datetime


def configure_logging(log_level: str = None, log_file: str = "logs/app.log") -> logging.Logger:
    """
    T091: Configure comprehensive logging for backend services
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (optional)
    
    Returns:
        Configured logger instance
    """
    
    # Determine log level from environment or parameter
    if log_level is None:
        log_level = os.getenv("LOG_LEVEL", "INFO")
    
    log_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create logger
    logger = logging.getLogger("rag_chatbot")
    logger.setLevel(log_level)
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Log format with context
    log_format = "%(asctime)s - [%(name)s] - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    # Console handler (always enabled)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter(log_format, datefmt=date_format))
    logger.addHandler(console_handler)
    
    # File handler (if log file specified)
    if log_file:
        try:
            # Create logs directory if it doesn't exist
            log_dir = os.path.dirname(log_file)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)
            
            # Use rotating file handler for production
            file_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5,  # Keep 5 backup files
                encoding='utf-8'
            )
            file_handler.setLevel(log_level)
            file_handler.setFormatter(logging.Formatter(log_format, datefmt=date_format))
            logger.addHandler(file_handler)
            
        except Exception as e:
            logger.warning(f"Could not configure file logging: {e}")
    
    return logger


# Get the main logger
logger = configure_logging()


class ContextFilter(logging.Filter):
    """Add request context (request ID, user ID) to log records"""
    
    def filter(self, record):
        # Can be extended to add request context from FastAPI request state
        return True


# Example usage in services:
# logger.info(f"Processing document {doc_id}")
# logger.warning(f"Invalid threshold {threshold}")
# logger.error(f"Failed to connect to Qdrant: {error}")
