"""
Session TTL Scheduler
Automatic cleanup of expired sessions using APScheduler
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from src.core.session_manager import session_manager
from src.services.vector_store import vector_store

logger = logging.getLogger(__name__)


class SessionScheduler:
    """
    Background scheduler for session TTL enforcement
    Runs cleanup job every 1 minute to remove expired sessions
    """
    
    def __init__(self):
        """Initialize APScheduler"""
        self.scheduler = BackgroundScheduler()
        self._setup_jobs()
    
    def _setup_jobs(self):
        """Configure scheduled jobs"""
        # Cleanup job: Check expired sessions every 1 minute
        self.scheduler.add_job(
            func=self._cleanup_expired_sessions,
            trigger=IntervalTrigger(minutes=1),
            id="session_cleanup",
            name="Clean up expired sessions",
            replace_existing=True
        )
        
        logger.info("Scheduler jobs configured: session_cleanup (every 1 minute)")
    
    def _cleanup_expired_sessions(self):
        """
        Job: Find and remove expired sessions
        Also deletes associated Qdrant collections
        """
        try:
            expired_ids = session_manager.get_expired_sessions()
            
            if not expired_ids:
                logger.debug("No expired sessions found")
                return
            
            logger.info(f"Cleaning up {len(expired_ids)} expired sessions")
            
            for session_id in expired_ids:
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
            
            logger.info(f"Cleanup complete: {len(expired_ids)} sessions removed")
            
        except Exception as e:
            logger.error(f"Error during session cleanup: {e}", exc_info=True)
    
    def start(self):
        """Start the scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Session scheduler started")
    
    def shutdown(self):
        """Shutdown the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Session scheduler stopped")
    
    def get_job_info(self):
        """Get information about scheduled jobs"""
        jobs = self.scheduler.get_jobs()
        return [
            {
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time
            }
            for job in jobs
        ]


# Global scheduler instance
scheduler = SessionScheduler()
