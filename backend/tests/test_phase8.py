"""
Phase 8: US6 - Session Controls Testing
Tests for Leave/Restart button functionality with confirmation dialogs and session cleanup
"""

import pytest
import asyncio
from uuid import UUID
from datetime import datetime
from backend.src.core.session_manager import SessionManager
from backend.src.services.vector_store import VectorStore
from backend.src.models.session import Session, SessionState


@pytest.fixture
def session_manager():
    """Create a fresh SessionManager instance for testing"""
    return SessionManager()


@pytest.fixture
def vector_store():
    """Create a VectorStore instance for testing"""
    return VectorStore()


@pytest.fixture
def test_session(session_manager, vector_store):
    """Create a test session (Qdrant collection creation requires Docker running)"""
    session = session_manager.create_session(language='en')
    
    # Note: Collection creation via vector_store requires Docker Qdrant running
    # Tests that depend on actual Qdrant should skip if Docker is not available
    # This fixture provides a session for testing SessionManager logic
    # (which doesn't require Qdrant to be running)
    
    return session


class TestSessionLeave:
    """Tests for session leave/close functionality"""
    
    def test_close_session_removes_session_from_manager(self, test_session, session_manager):
        """
        Test that close_session removes session from SessionManager
        (Note: Qdrant collection deletion is tested in integration tests with Docker)
        """
        session_id = test_session.session_id
        
        # Verify session exists
        session = session_manager.get_session(session_id)
        assert session is not None, "Session should exist before close"
        assert session.session_id == session_id
        
        # Close session
        session_manager.close_session(session_id)
        
        # Verify session is gone
        closed_session = session_manager.get_session(session_id)
        assert closed_session is None, "Session should be removed after close"
    
    def test_close_nonexistent_session_handles_gracefully(self, session_manager):
        """
        Test that closing a non-existent session doesn't raise an error
        """
        fake_session_id = UUID('00000000-0000-0000-0000-000000000000')
        
        # Should not raise exception
        try:
            session_manager.close_session(fake_session_id)
        except Exception as e:
            pytest.fail(f"close_session should handle non-existent session gracefully: {e}")


class TestSessionRestart:
    """Tests for session restart functionality"""
    
    def test_restart_session_creates_new_session(self, test_session, session_manager):
        """
        Test that restarting a session creates a new session with fresh state
        and closes the old one
        """
        old_session_id = test_session.session_id
        
        # Verify old session exists
        old = session_manager.get_session(old_session_id)
        assert old is not None, "Old session should exist"
        
        # Close old session
        session_manager.close_session(old_session_id)
        
        # Create new session (simulating Restart button)
        new_session = session_manager.create_session(language='en')
        
        # Verify new session is different
        assert new_session.session_id != old_session_id, "New session should have different ID"
        assert new_session.state == SessionState.INITIALIZING, "New session should be in INITIALIZING state"
        
        # Verify old session is gone
        old_again = session_manager.get_session(old_session_id)
        assert old_again is None, "Old session should be deleted"
        
        # Verify new session exists
        new_again = session_manager.get_session(new_session.session_id)
        assert new_again is not None, "New session should exist"
        assert new_again.session_id == new_session.session_id
    
    def test_restart_session_new_collection_name(self, test_session, session_manager):
        """
        Test that restarting creates a session with a different collection name
        """
        old_collection = test_session.qdrant_collection_name
        
        # Close and restart
        session_manager.close_session(test_session.session_id)
        new_session = session_manager.create_session(language='en')
        
        # Verify new collection name is different
        assert new_session.qdrant_collection_name != old_collection, \
            "New session should have different collection name"


class TestSessionStateTransitions:
    """Tests for session state management during leave/restart operations"""
    
    def test_session_state_after_creation(self, session_manager):
        """
        Test that new session starts in INITIALIZING state
        (will transition to READY_FOR_UPLOAD after Qdrant collection creation)
        """
        session = session_manager.create_session(language='en')
        assert session.state == SessionState.INITIALIZING
    
    def test_session_language_persistence(self, session_manager):
        """
        Test that session language is set correctly on creation
        """
        session = session_manager.create_session(language='zh-TW')
        assert session.language == 'zh-TW'
        
        # Verify language can be updated
        session_manager.update_language(session.session_id, 'ja')
        updated = session_manager.get_session(session.session_id)
        assert updated.language == 'ja'
    
    def test_session_timestamps(self, session_manager):
        """
        Test that session creation and expiry timestamps are properly set
        """
        session = session_manager.create_session(language='en')
        
        assert session.created_at is not None
        assert isinstance(session.created_at, datetime)
        assert session.expires_at is not None
        assert isinstance(session.expires_at, datetime)
        assert session.expires_at > session.created_at


class TestConfirmDialogIntegration:
    """Tests for UI confirmation dialog integration"""
    
    def test_session_close_flow(self, test_session, session_manager):
        """
        Simulate the complete Leave button flow:
        1. User clicks "Leave" button
        2. ConfirmDialog appears (frontend)
        3. User confirms deletion
        4. Backend receives close_session request
        5. Session is cleaned up
        """
        session_id = test_session.session_id
        
        # Step 1-3: UI handles confirmation (not tested here)
        # Step 4: Backend receives close_session request
        session_manager.close_session(session_id)
        
        # Step 5: Verify cleanup
        session = session_manager.get_session(session_id)
        assert session is None, "Session should be deleted"
    
    def test_session_restart_ui_flow(self, test_session, session_manager):
        """
        Simulate the Restart button flow:
        1. User clicks "Restart" button
        2. ConfirmDialog appears (frontend)
        3. User confirms restart
        4. Backend closes old session, creates new one
        5. Frontend resets UI to UploadScreen
        """
        old_session_id = test_session.session_id
        
        # Step 1-3: UI handles confirmation (not tested here)
        
        # Step 4: Backend process
        session_manager.close_session(old_session_id)
        new_session = session_manager.create_session(language=test_session.language)
        
        # Step 5: Verify state for frontend
        # Old session gone
        assert session_manager.get_session(old_session_id) is None
        
        # New session ready
        new = session_manager.get_session(new_session.session_id)
        assert new is not None
        assert new.language == test_session.language


class TestEdgeCases:
    """Tests for edge cases and error scenarios"""
    
    def test_rapid_session_creation_and_deletion(self, session_manager, vector_store):
        """
        Test that rapid creation and deletion doesn't cause issues
        (simulating user repeatedly clicking Restart)
        """
        sessions = []
        for i in range(5):
            session = session_manager.create_session(language='en')
            sessions.append(session)
        
        # Verify all sessions exist
        for session in sessions:
            assert session_manager.get_session(session.session_id) is not None
        
        # Delete all sessions
        for session in sessions:
            session_manager.close_session(session.session_id)
        
        # Verify all are deleted
        for session in sessions:
            assert session_manager.get_session(session.session_id) is None
    
    def test_session_collection_name_uniqueness(self, session_manager):
        """
        Test that each session gets a unique Qdrant collection name
        """
        sessions = [session_manager.create_session(language='en') for _ in range(3)]
        collections = [s.qdrant_collection_name for s in sessions]
        
        # Verify all collection names are unique
        assert len(collections) == len(set(collections)), \
            "Each session should have a unique collection name"


# Run with: pytest tests/test_phase8.py -v --no-cov
if __name__ == '__main__':
    pytest.main([__file__, '-v', '--no-cov'])
