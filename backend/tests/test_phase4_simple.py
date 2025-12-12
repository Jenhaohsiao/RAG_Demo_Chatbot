"""
Phase 4 E2E Test (Simple - No Unicode)
"""

import requests
import time
from pathlib import Path

BASE_URL = "http://localhost:8000/api/v1"

def test_phase4_upload():
    """Test Phase 4 upload flow"""
    
    print("\n=== Phase 4 E2E Test ===\n")
    
    # Step 1: Create Session
    print("1. Creating session...")
    response = requests.post(f"{BASE_URL}/session/create")
    assert response.status_code == 201
    session_data = response.json()
    session_id = session_data["session_id"]
    print(f"   [OK] Session ID: {session_id}")
    print(f"   [OK] State: {session_data['state']}\n")
    
    # Step 2: Create test file
    print("2. Creating test file...")
    test_file = Path("test_doc.txt")
    test_file.write_text("Machine learning is a subset of AI.", encoding='utf-8')
    print(f"   [OK] File created\n")
    
    # Step 3: Upload file
    print("3. Uploading file...")
    with open(test_file, 'rb') as f:
        files = {'file': ('test_doc.txt', f, 'text/plain')}
        response = requests.post(f"{BASE_URL}/upload/{session_id}/file", files=files)
    
    print(f"   Status code: {response.status_code}")
    assert response.status_code == 202, f"Upload failed: {response.status_code} - {response.text}"
    upload_data = response.json()
    document_id = upload_data["document_id"]
    print(f"   [OK] Document ID: {document_id}\n")
    
    # Step 4: Poll processing status
    print("4. Waiting for processing...")
    max_attempts = 30
    for attempt in range(max_attempts):
        time.sleep(2)
        response = requests.get(f"{BASE_URL}/upload/{session_id}/status/{document_id}")
        assert response.status_code == 200
        
        status = response.json()
        progress = status["processing_progress"]
        extraction = status["extraction_status"]
        moderation = status["moderation_status"]
        
        print(f"   Progress: {progress}% | Extraction: {extraction} | Moderation: {moderation}", end='\r')
        
        if extraction == "COMPLETED" and moderation == "APPROVED":
            print(f"\n   [OK] Processing completed!")
            print(f"   [OK] Chunks: {status['chunk_count']}\n")
            break
        elif extraction == "FAILED" or moderation == "BLOCKED":
            print(f"\n   [FAIL] Processing failed: {status.get('error_message')}\n")
            break
    else:
        print("\n   [WARN] Processing timeout\n")
    
    # Step 5: Verify session state
    print("5. Verifying session state...")
    response = requests.get(f"{BASE_URL}/session/{session_id}")
    assert response.status_code == 200
    session_data = response.json()
    print(f"   [OK] State: {session_data['state']}\n")
    
    # Cleanup
    print("6. Cleanup...")
    test_file.unlink()
    requests.post(f"{BASE_URL}/session/{session_id}/close")
    print("   [OK] Test completed!\n")


if __name__ == "__main__":
    test_phase4_upload()
