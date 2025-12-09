"""
Test Session API endpoints
"""
import sys
sys.path.insert(0, "C:/Projects/AI_projects/RAG_Demo_Chatbot/backend")

from src.api.routes import session
from src.core.session_manager import session_manager
from src.services.vector_store import vector_store

def test_session_api_imports():
    """Test that Session API routes import successfully"""
    print("✓ Session API router imported")
    print(f"  Router: {session.router}")
    print(f"  Routes: {len(session.router.routes)} endpoints")
    
    # List all endpoints
    for route in session.router.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = ', '.join(route.methods)
            print(f"  - {methods} {route.path}")

def test_session_manager_methods():
    """Test that SessionManager has all required methods"""
    print("\n✓ SessionManager methods:")
    required_methods = [
        'create_session',
        'get_session',
        'update_activity',
        'update_state',
        'update_language',
        'increment_document_count',
        'update_vector_count',
        'close_session',
        'get_expired_sessions',
        'to_response'
    ]
    
    for method_name in required_methods:
        assert hasattr(session_manager, method_name), f"Missing method: {method_name}"
        print(f"  - {method_name}")

def test_vector_store_methods():
    """Test that VectorStore has all required methods"""
    print("\n✓ VectorStore methods:")
    required_methods = [
        'create_collection',
        'delete_collection',
        'get_collection_info',
        'get_vector_count',
        'collection_exists'
    ]
    
    for method_name in required_methods:
        assert hasattr(vector_store, method_name), f"Missing method: {method_name}"
        print(f"  - {method_name}")

if __name__ == "__main__":
    print("=== Testing Session API (T037-T042) ===\n")
    
    try:
        test_session_api_imports()
        test_session_manager_methods()
        test_vector_store_methods()
        
        print("\n=== All tests passed! ===")
        print("✓ Session API endpoints created successfully")
        print("✓ SessionManager ready for API calls")
        print("✓ VectorStore ready for collection management")
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
