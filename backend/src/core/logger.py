"""
Logging Configuration
T091: Comprehensive logging system for backend services

Features:
- Structured logging with timestamp, level, module, and message
- File rotation for production
- DEBUG level for development, INFO for production
- Context tracking with request IDs
- Session activity logging with detailed audit trail
"""

import logging
import logging.handlers
import sys
import os
import json
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


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


class SessionActivityLogger:
    """
    Structured logger for session activities
    Records detailed audit trail for session lifecycle events
    """
    
    def __init__(self):
        self.logger = logging.getLogger("rag_chatbot.session_activity")
    
    def _format_event(self, event_type: str, session_id: Optional[UUID], 
                      client_ip: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> str:
        """Format session event as structured log entry"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event": event_type,
            "session_id": str(session_id) if session_id else None,
            "client_ip": client_ip,
            "details": details or {}
        }
        return json.dumps(event, ensure_ascii=False)
    
    def session_created(self, session_id: UUID, client_ip: str = None, 
                       language: str = None, similarity_threshold: float = None):
        """Log session creation event"""
        self.logger.info(self._format_event(
            "SESSION_CREATED", session_id, client_ip,
            {"language": language, "similarity_threshold": similarity_threshold}
        ))
    
    def session_heartbeat(self, session_id: UUID, client_ip: str = None, 
                         expires_at: datetime = None):
        """Log session heartbeat/activity update"""
        self.logger.debug(self._format_event(
            "SESSION_HEARTBEAT", session_id, client_ip,
            {"expires_at": expires_at.isoformat() if expires_at else None}
        ))
    
    def session_expired(self, session_id: UUID, reason: str = "timeout"):
        """Log session expiration event"""
        self.logger.info(self._format_event(
            "SESSION_EXPIRED", session_id, details={"reason": reason}
        ))
    
    def session_closed(self, session_id: UUID, client_ip: str = None, 
                      reason: str = "user_closed"):
        """Log session close event"""
        self.logger.info(self._format_event(
            "SESSION_CLOSED", session_id, client_ip, {"reason": reason}
        ))
    
    def session_not_found(self, session_id: UUID, client_ip: str = None,
                         action: str = None):
        """Log attempt to access non-existent session"""
        self.logger.warning(self._format_event(
            "SESSION_NOT_FOUND", session_id, client_ip, {"attempted_action": action}
        ))
    
    def document_uploaded(self, session_id: UUID, document_id: str = None,
                         document_type: str = None, filename: str = None):
        """Log document upload event"""
        self.logger.info(self._format_event(
            "DOCUMENT_UPLOADED", session_id, details={
                "document_id": document_id,
                "document_type": document_type,
                "filename": filename
            }
        ))
    
    def chat_message(self, session_id: UUID, message_type: str = "user",
                    token_count: int = None):
        """Log chat message event"""
        self.logger.info(self._format_event(
            "CHAT_MESSAGE", session_id, details={
                "message_type": message_type,
                "token_count": token_count
            }
        ))
    
    def rag_query(self, session_id: UUID, query_length: int = None,
                 results_count: int = None, duration_ms: float = None):
        """Log RAG query event"""
        self.logger.info(self._format_event(
            "RAG_QUERY", session_id, details={
                "query_length": query_length,
                "results_count": results_count,
                "duration_ms": duration_ms
            }
        ))
    
    def error(self, session_id: Optional[UUID], error_code: str = None,
             error_message: str = None, client_ip: str = None):
        """Log error event"""
        self.logger.error(self._format_event(
            "ERROR", session_id, client_ip, {
                "error_code": error_code,
                "error_message": error_message
            }
        ))


# Create singleton instance for session activity logging
session_activity_logger = SessionActivityLogger()


# Example usage in services:
# logger.info(f"Processing document {doc_id}")
# logger.warning(f"Invalid threshold {threshold}")
# logger.error(f"Failed to connect to Qdrant: {error}")
# session_activity_logger.session_created(session_id, "192.168.1.1", "zh-TW", 0.5)
