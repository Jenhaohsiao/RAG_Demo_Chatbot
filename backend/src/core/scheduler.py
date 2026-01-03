"""
Session TTL Scheduler
Automatic cleanup of expired sessions using threading
Fixed: Avoid APScheduler event loop conflicts with Uvicorn
"""
import logging
import threading
import time
from typing import Optional

from src.core.session_manager import session_manager
from src.services.vector_store import vector_store

logger = logging.getLogger(__name__)


class SessionScheduler:
    """
    Background scheduler for session TTL enforcement
    Uses threading instead of APScheduler to avoid event loop conflicts
    Runs cleanup job every 1 minute to remove expired sessions
    """
    
    def __init__(self):
        """Initialize ThreadPool-based scheduler"""
        self.cleanup_thread: Optional[threading.Thread] = None
        self.is_running = False
        self.cleanup_interval = 60  # 1 minute in seconds
        logger.info("SessionScheduler initialized (thread-based, APScheduler-free)")
    
    def _cleanup_expired_sessions(self):
        """
        Worker: Find and remove expired sessions
        Also deletes associated Qdrant collections
        Runs in background thread
        """
        try:
            expired_ids = session_manager.get_expired_sessions()
            
            if not expired_ids:
                logger.debug("No expired sessions found")
                return
            
            logger.info(f"Cleaning up {len(expired_ids)} expired sessions")
            
            for session_id in expired_ids:
                try:
                    # Get session before deletion to access collection name
                    session = session_manager._sessions.get(session_id)
                    if not session:
                        continue
                    
                    collection_name = session.qdrant_collection_name
                    
                    # Delete Qdrant collection
                    if vector_store.collection_exists(collection_name):
                        success = vector_store.delete_collection(collection_name)
                        if success:
                            logger.info(f"Deleted Qdrant collection: {collection_name}")
                        else:
                            logger.error(f"Failed to delete collection: {collection_name}")
                    
                    # Remove session from manager
                    session_manager.close_session(session_id)
                except Exception as e:
                    logger.error(f"Error cleaning session {session_id}: {e}")
            
            logger.info(f"Cleanup complete: {len(expired_ids)} sessions removed")
            
        except Exception as e:
            logger.error(f"Error during session cleanup: {e}", exc_info=True)
    
    def _cleanup_loop(self):
        """
        Background loop: Runs cleanup jobs at regular intervals
        Executes in separate thread, non-blocking
        """
        logger.info(f"Cleanup loop started (interval: {self.cleanup_interval}s)")
        
        while self.is_running:
            try:
                # Run cleanup
                self._cleanup_expired_sessions()
                
                # Sleep in small intervals to allow quick shutdown
                for _ in range(self.cleanup_interval):
                    if not self.is_running:
                        break
                    time.sleep(1)
                    
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}", exc_info=True)
                # Continue running despite errors
                time.sleep(5)
        
        logger.info("Cleanup loop stopped")
    
    def start(self):
        """Start the scheduler"""
        if self.is_running:
            logger.warning("Scheduler already running")
            return
        
        self.is_running = True
        self.cleanup_thread = threading.Thread(
            target=self._cleanup_loop,
            name="SessionCleanupThread",
            daemon=True
        )
        self.cleanup_thread.start()
        logger.info("Session scheduler started (thread-based)")
    
    def shutdown(self):
        """Shutdown the scheduler"""
        if not self.is_running:
            logger.warning("Scheduler not running")
            return
        
        self.is_running = False
        
        # Wait for thread to finish (max 10 seconds)
        if self.cleanup_thread and self.cleanup_thread.is_alive():
            self.cleanup_thread.join(timeout=10)
        
        logger.info("Session scheduler stopped")
    
    def get_job_info(self):
        """Get information about scheduled jobs"""
        return {
            "is_running": self.is_running,
            "cleanup_interval": self.cleanup_interval,
            "cleanup_thread": {
                "name": self.cleanup_thread.name if self.cleanup_thread else None,
                "is_alive": self.cleanup_thread.is_alive() if self.cleanup_thread else False
            }
        }


# Global scheduler instance
scheduler = SessionScheduler()
