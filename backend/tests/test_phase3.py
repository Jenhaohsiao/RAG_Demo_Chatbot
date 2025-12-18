"""
Phase 3 Integration Test: Session Management E2E
Tests complete session lifecycle with real backend API
"""
import sys
import time
from datetime import datetime

sys.path.insert(0, "C:/Projects/AI_projects/RAG_Demo_Chatbot/backend")

from fastapi.testclient import TestClient
from src.main import app
from src.core.session_manager import session_manager
from src.services.vector_store import vector_store

client = TestClient(app)

def test_phase3_integration():
    """
    End-to-End Integration Test for Phase 3: Session Management
    
    Test Coverage:
    1. POST /api/v1/session/create - Create session
    2. GET /api/v1/session/{id} - Get session details
    3. POST /api/v1/session/{id}/heartbeat - Extend TTL
    4. PUT /api/v1/session/{id}/language - Update language
    5. GET /api/v1/session/{id}/metrics - Get metrics
    6. POST /api/v1/session/{id}/restart - Restart session
    7. POST /api/v1/session/{id}/close - Close session
    8. Qdrant collection lifecycle verification
    9. Session expiration and cleanup (manual verification)
    """
    
    print("=" * 70)
    print("PHASE 3 INTEGRATION TEST: Session Management E2E")
    print("=" * 70)
    
    # Test 1: Create Session
    print("\n[1/9] Testing POST /api/v1/session/create...")
    response = client.post("/api/v1/session/create", params={"language": "en"})
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    session_data = response.json()
    session_id = session_data["session_id"]
    assert session_data["state"] == "READY_FOR_UPLOAD"
    assert session_data["language"] == "en"
    print(f"✓ Session created: {session_id}")
    print(f"  State: {session_data['state']}")
    print(f"  Collection: {session_data['qdrant_collection_name']}")
    
    # Verify Qdrant collection exists
    collection_name = session_data["qdrant_collection_name"]
    assert vector_store.collection_exists(collection_name), "Qdrant collection not created"
    print(f"✓ Qdrant collection verified: {collection_name}")
    
    # Test 2: Get Session Details
    print(f"\n[2/9] Testing GET /api/v1/session/{session_id}...")
    response = client.get(f"/api/v1/session/{session_id}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    session_data = response.json()
    assert session_data["session_id"] == session_id
    print(f"✓ Session retrieved successfully")
    
    # Test 3: Heartbeat (TTL Extension)
    print(f"\n[3/9] Testing POST /api/v1/session/{session_id}/heartbeat...")
    original_expires = session_data["expires_at"]
    time.sleep(1)  # Wait to ensure timestamp changes
    response = client.post(f"/api/v1/session/{session_id}/heartbeat")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    updated_data = response.json()
    assert updated_data["expires_at"] > original_expires, "TTL not extended"
    print(f"✓ Heartbeat successful, TTL extended")
    print(f"  Old expires_at: {original_expires}")
    print(f"  New expires_at: {updated_data['expires_at']}")
    
    # Test 4: Update Language
    print(f"\n[4/9] Testing PUT /api/v1/session/{session_id}/language...")
    response = client.put(
        f"/api/v1/session/{session_id}/language",
        json={"language": "zh-TW"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    updated_data = response.json()
    assert updated_data["language"] == "zh-TW", "Language not updated"
    print(f"✓ Language updated: en → zh-TW")
    
    # Test 5: Get Session with Metrics
    print(f"\n[5/9] Testing GET /api/v1/session/{session_id}/metrics...")
    response = client.get(f"/api/v1/session/{session_id}/metrics")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    metrics_data = response.json()
    assert "metrics" in metrics_data, "Metrics not included"
    assert metrics_data["metrics"]["vector_count"] == 0, "Unexpected vector count"
    print(f"✓ Metrics retrieved successfully")
    print(f"  Vector count: {metrics_data['metrics']['vector_count']}")
    
    # Test 6: Restart Session
    print(f"\n[6/9] Testing POST /api/v1/session/{session_id}/restart...")
    response = client.post(f"/api/v1/session/{session_id}/restart")
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    new_session_data = response.json()
    new_session_id = new_session_data["session_id"]
    assert new_session_id != session_id, "Session ID should be different after restart"
    print(f"✓ Session restarted")
    print(f"  Old session: {session_id}")
    print(f"  New session: {new_session_id}")
    
    # Verify old collection deleted
    assert not vector_store.collection_exists(collection_name), "Old collection not deleted"
    print(f"✓ Old Qdrant collection deleted")
    
    # Verify new collection created
    new_collection_name = new_session_data["qdrant_collection_name"]
    assert vector_store.collection_exists(new_collection_name), "New collection not created"
    print(f"✓ New Qdrant collection created: {new_collection_name}")
    
    # Test 7: Test 404 for Old Session
    print(f"\n[7/9] Testing GET /api/v1/session/{session_id} (should 404)...")
    response = client.get(f"/api/v1/session/{session_id}")
    assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    print(f"✓ Old session properly removed (404)")
    
    # Test 8: Close New Session
    print(f"\n[8/9] Testing POST /api/v1/session/{new_session_id}/close...")
    response = client.post(f"/api/v1/session/{new_session_id}/close")
    assert response.status_code == 204, f"Expected 204, got {response.status_code}"
    print(f"✓ Session closed successfully")
    
    # Verify collection deleted
    assert not vector_store.collection_exists(new_collection_name), "Collection not deleted on close"
    print(f"✓ Qdrant collection deleted on close")
    
    # Test 9: Session Manager Statistics
    print(f"\n[9/9] Verifying session manager state...")
    active_count = session_manager.get_session_count()
    print(f"✓ Active sessions: {active_count}")
    assert active_count == 0, f"Expected 0 active sessions, found {active_count}"
    
    print("\n" + "=" * 70)
    print("✅ PHASE 3 INTEGRATION TEST: ALL TESTS PASSED")
    print("=" * 70)
    print("\nTest Summary:")
    print("  ✓ Session create/get/update/close lifecycle")
    print("  ✓ Qdrant collection create/delete lifecycle")
    print("  ✓ Heartbeat TTL extension")
    print("  ✓ Language update")
    print("  ✓ Metrics retrieval")
    print("  ✓ Session restart (old → new)")
    print("  ✓ Proper 404 handling for closed sessions")
    print("  ✓ Session manager state cleanup")
    print("\n📋 Manual Verification Required:")
    print("  - TTL scheduler cleanup (wait 30+ minutes and check logs)")
    print("  - Frontend UI session controls (Start/Leave/Restart buttons)")
    print("  - Language selector cycling animation (1 second interval)")
    print("  - Auto-heartbeat (check browser console after 5 minutes)")

if __name__ == "__main__":
    try:
        test_phase3_integration()
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
