"""
Phase 2 Test Script
Tests basic imports and configurations without requiring full dependencies
"""
import sys
from pathlib import Path

# Add backend/src to Python path
backend_dir = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(backend_dir))

print("=" * 60)
print("Phase 2 Test - Basic Imports")
print("=" * 60)

try:
    # Test 1: Config module
    print("\n[Test 1] Importing config module...")
    from core.config import Settings
    print("✓ Config module imported successfully")
    print(f"  - Settings class available: {Settings.__name__}")
    
    # Test 2: Session model
    print("\n[Test 2] Importing session model...")
    from models.session import Session, SessionState, SessionResponse
    print("✓ Session model imported successfully")
    print(f"  - Session class: {Session.__name__}")
    print(f"  - SessionState enum: {list(SessionState)}")
    
    # Test 3: Document model
    print("\n[Test 3] Importing document model...")
    from models.document import Document, DocumentChunk, SourceType
    print("✓ Document model imported successfully")
    print(f"  - Document class: {Document.__name__}")
    print(f"  - SourceType enum: {list(SourceType)}")
    
    # Test 4: Chat model
    print("\n[Test 4] Importing chat model...")
    from models.chat import ChatMessage, ResponseType, RetrievedChunk
    print("✓ Chat model imported successfully")
    print(f"  - ChatMessage class: {ChatMessage.__name__}")
    print(f"  - ResponseType enum: {list(ResponseType)}")
    
    # Test 5: Metrics model
    print("\n[Test 5] Importing metrics model...")
    from models.metrics import Metrics
    print("✓ Metrics model imported successfully")
    print(f"  - Metrics class: {Metrics.__name__}")
    
    # Test 6: Create sample instances
    print("\n[Test 6] Creating sample model instances...")
    from datetime import datetime
    from uuid import uuid4
    
    # Create a session
    session = Session(
        session_id=uuid4(),
        language="en"
    )
    print(f"✓ Session created: {session.session_id}")
    print(f"  - State: {session.state}")
    print(f"  - Collection: {session.qdrant_collection_name}")
    
    # Create metrics
    metrics = Metrics(
        token_input=100,
        token_output=50,
        context_tokens=80,
        vector_count=10
    )
    print(f"✓ Metrics created")
    print(f"  - Total tokens: {metrics.token_total}")
    print(f"  - Token percent: {metrics.token_percent:.2f}%")
    print(f"  - Color code: {metrics.get_color_code()}")
    
    print("\n" + "=" * 60)
    print("✅ All Phase 2 tests passed!")
    print("=" * 60)
    
except ImportError as e:
    print(f"\n❌ Import Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Test Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
