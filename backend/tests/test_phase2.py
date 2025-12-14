"""
Phase 2: Foundational Architecture - Model Import Tests
Tests basic imports and configurations of all core models
Uses pytest framework (Constitution Principle XV)
"""
import pytest
from uuid import uuid4
from pathlib import Path
import sys

# Add backend/src to Python path
backend_dir = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(backend_dir))


# ============================================================================
# Test 1: Config Module
# ============================================================================
def test_config_module_imports():
    """Test that config module and Settings class can be imported"""
    from core.config import Settings
    assert Settings is not None
    assert hasattr(Settings, '__name__')


# ============================================================================
# Test 2: Session Model
# ============================================================================
def test_session_model_imports():
    """Test that session models can be imported"""
    from models.session import Session, SessionState, SessionResponse
    assert Session is not None
    assert SessionState is not None
    assert SessionResponse is not None


def test_session_state_enum():
    """Test that SessionState enum has expected values"""
    from models.session import SessionState
    # Verify enum values exist
    assert hasattr(SessionState, 'READY_FOR_UPLOAD')
    assert hasattr(SessionState, 'READY_FOR_CHAT')
    # Can iterate enum
    states = list(SessionState)
    assert len(states) > 0


# ============================================================================
# Test 3: Document Model
# ============================================================================
def test_document_model_imports():
    """Test that document models can be imported"""
    from models.document import Document, DocumentChunk, SourceType
    assert Document is not None
    assert DocumentChunk is not None
    assert SourceType is not None


def test_source_type_enum():
    """Test that SourceType enum has expected values"""
    from models.document import SourceType
    assert hasattr(SourceType, 'PDF')
    assert hasattr(SourceType, 'TEXT')
    assert hasattr(SourceType, 'URL')


# ============================================================================
# Test 4: Chat Model
# ============================================================================
def test_chat_model_imports():
    """Test that chat models can be imported"""
    from models.chat import ChatMessage, ResponseType, RetrievedChunk
    assert ChatMessage is not None
    assert ResponseType is not None
    assert RetrievedChunk is not None


def test_response_type_enum():
    """Test that ResponseType enum has expected values"""
    from models.chat import ResponseType
    assert hasattr(ResponseType, 'ANSWERED')
    assert hasattr(ResponseType, 'CANNOT_ANSWER')


# ============================================================================
# Test 5: Metrics Model
# ============================================================================
def test_metrics_model_imports():
    """Test that metrics model can be imported"""
    from models.metrics import Metrics
    assert Metrics is not None


# ============================================================================
# Test 6: Create Model Instances
# ============================================================================
def test_session_instance_creation():
    """Test creating a Session instance"""
    from models.session import Session
    
    session = Session(
        session_id=uuid4(),
        language="en"
    )
    assert session is not None
    assert session.session_id is not None
    assert session.language == "en"


def test_metrics_instance_creation():
    """Test creating a Metrics instance"""
    from models.metrics import Metrics
    
    metrics = Metrics(
        token_input=100,
        token_output=50,
        context_tokens=80,
        vector_count=10
    )
    assert metrics is not None
    assert metrics.token_input == 100
    assert metrics.token_output == 50
    assert metrics.token_total == 150  # 100 + 50


def test_metrics_calculation():
    """Test metrics percentage calculation"""
    from models.metrics import Metrics
    
    metrics = Metrics(
        token_input=100,
        token_output=50,
        context_tokens=80,
        vector_count=10
    )
    # Test token percentage (should be between 0-100)
    assert hasattr(metrics, 'token_percent')
    assert 0 <= metrics.token_percent <= 100
