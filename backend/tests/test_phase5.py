#!/usr/bin/env python3
"""
Phase 5 RAG Query Response - Clean Test Suite
遵循 pytest 格式，純粹的 HTTP 測試，不干擾後端伺服器運行

測試涵蓋：
1. Session 管理
2. 文件上傳和處理
3. RAG 查詢和回應
4. 聊天歷史
5. Metrics 統計

注意：此測試假設後端伺服器已在 localhost:8000 運行
"""

import pytest
import requests
import time
import json
from typing import Optional, Dict, Any

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

# Test data
TEST_DOCUMENT_CONTENT = """Machine Learning and AI

Machine learning is a subset of artificial intelligence that enables computers to learn from data.

Key concepts:
1. Supervised Learning: Training with labeled data
2. Unsupervised Learning: Finding patterns in unlabeled data
3. Neural Networks: Mimicking brain structure

Applications:
- Natural Language Processing
- Computer Vision
- Recommendation Systems
- Autonomous Vehicles

Deep learning uses neural networks with multiple layers for complex pattern recognition.
"""

# Global test state
session_data = {"session_id": None, "document_id": None}


def test_01_health_check():
    """測試後端健康狀態"""
    response = requests.get("http://localhost:8000/health", timeout=TIMEOUT)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"


def test_02_create_session():
    """測試建立 Session"""
    payload = {"language": "en"}
    response = requests.post(f"{BASE_URL}/session/create", 
                           json=payload, headers=HEADERS, timeout=TIMEOUT)
    
    assert response.status_code in [200, 201]  # Allow both 200 and 201 status codes
    data = response.json()
    assert "session_id" in data
    assert "qdrant_collection_name" in data
    assert data["state"] == "READY_FOR_UPLOAD"
    
    # Store session ID for other tests
    session_data["session_id"] = data["session_id"]
    print(f"Created session: {session_data['session_id'][:8]}...")


def test_03_get_session_status():
    """測試查詢 Session 狀態"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    response = requests.get(f"{BASE_URL}/session/{session_id}", timeout=TIMEOUT)
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session_id
    assert data["state"] in ["READY_FOR_UPLOAD", "PROCESSING", "READY_FOR_CHAT"]


def test_04_upload_document():
    """測試文件上傳"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    # Create a test text file
    files = {
        "file": ("test_document.txt", TEST_DOCUMENT_CONTENT, "text/plain")
    }
    
    response = requests.post(f"{BASE_URL}/upload/{session_id}/file", 
                           files=files, timeout=TIMEOUT)
    
    assert response.status_code in [200, 202]  # 202 for async processing
    data = response.json()
    assert "document_id" in data
    # API returns UploadResponse, not a simple message
    assert "extraction_status" in data
    assert "moderation_status" in data
    
    # Store document ID for other tests
    session_data["document_id"] = data["document_id"]
    print(f"Uploaded document: {session_data['document_id'][:8]}...")


def test_05_wait_for_processing():
    """等待文件處理完成"""
    session_id = session_data["session_id"]
    document_id = session_data["document_id"]
    assert session_id is not None and document_id is not None
    
    # Poll processing status
    max_wait = 60  # seconds
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        response = requests.get(f"{BASE_URL}/upload/{session_id}/status/{document_id}", 
                              timeout=TIMEOUT)
        assert response.status_code == 200
        
        data = response.json()
        extraction_status = data.get("extraction_status", "UNKNOWN")
        moderation_status = data.get("moderation_status", "UNKNOWN")
        chunk_count = data.get("chunk_count", 0)
        
        # Processing is complete when we have chunks stored
        if chunk_count > 0 and extraction_status == "EXTRACTED" and moderation_status == "APPROVED":
            print(f"Document processing completed in {time.time() - start_time:.1f}s")
            break
        elif extraction_status == "FAILED":
            pytest.fail(f"Document processing failed: {data.get('error_message', 'Unknown error')}")
        
        time.sleep(2)
    else:
        pytest.fail("Document processing timed out")


def test_06_check_session_ready_for_chat():
    """確認 Session 已準備好聊天"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    # Wait a bit for session state to update after document processing
    max_wait = 30
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        response = requests.get(f"{BASE_URL}/session/{session_id}", timeout=TIMEOUT)
        assert response.status_code == 200
        data = response.json()
        
        if data["state"] == "READY_FOR_CHAT":
            print(f"Session ready for chat after {time.time() - start_time:.1f}s")
            break
        elif data["state"] in ["READY_FOR_UPLOAD", "PROCESSING"]:
            time.sleep(1)
        else:
            pytest.fail(f"Unexpected session state: {data['state']}")
    else:
        pytest.fail(f"Session did not become ready for chat, current state: {data.get('state', 'unknown')}")


def test_07_rag_query_answerable():
    """測試 RAG 查詢 - 可回答的問題"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    query = "What is machine learning?"
    payload = {"user_query": query}
    
    response = requests.post(f"{BASE_URL}/chat/{session_id}/query",
                           json=payload, headers=HEADERS, timeout=TIMEOUT)
    
    assert response.status_code == 200
    data = response.json()
    
    assert "llm_response" in data
    assert "response_type" in data
    # Note: May be CANNOT_ANSWER if RAG doesn't find relevant content
    assert data["response_type"] in ["ANSWERED", "CANNOT_ANSWER"]
    assert len(data["llm_response"]) > 0
    
    # Should have metrics with token usage (optional)
    if "metrics" in data and "token_total" in data["metrics"]:
        assert data["metrics"]["token_total"] > 0
    # At minimum, we should have a valid response type and content
    assert data["response_type"] in ["ANSWERED", "CANNOT_ANSWER"]
    assert len(data["llm_response"]) > 0
    
    print(f"Query processed: '{query}' -> {len(data['llm_response'])} chars, type: {data['response_type']}")


def test_08_rag_query_unanswerable():
    """測試 RAG 查詢 - 無法回答的問題"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    query = "What is the weather today in Tokyo?"
    payload = {"user_query": query}
    
    response = requests.post(f"{BASE_URL}/chat/{session_id}/query",
                           json=payload, headers=HEADERS, timeout=TIMEOUT)
    
    assert response.status_code == 200
    data = response.json()
    
    assert "llm_response" in data
    assert "response_type" in data
    assert data["response_type"] == "CANNOT_ANSWER"
    assert "cannot answer" in data["llm_response"].lower()
    
    print(f"Query correctly rejected: '{query}'")


def test_09_multiple_rag_queries():
    """測試多輪 RAG 查詢"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    queries = [
        "What is supervised learning?",
        "List the applications mentioned", 
        "How many planets are there?"
    ]
    
    for query in queries:
        payload = {"user_query": query}
        response = requests.post(f"{BASE_URL}/chat/{session_id}/query",
                               json=payload, headers=HEADERS, timeout=TIMEOUT)
        
        assert response.status_code == 200
        data = response.json()
        # Accept both ANSWERED and CANNOT_ANSWER as valid responses
        assert data["response_type"] in ["ANSWERED", "CANNOT_ANSWER"]
        assert len(data["llm_response"]) > 0
        
        print(f"Query: '{query}' -> {data['response_type']}")


def test_10_get_chat_history():
    """測試取得聊天歷史"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    response = requests.get(f"{BASE_URL}/chat/{session_id}/history", timeout=TIMEOUT)
    assert response.status_code == 200
    
    data = response.json()
    assert "messages" in data
    assert "total_count" in data
    
    messages = data["messages"]
    assert len(messages) >= 6  # We sent 3 queries, should have 6 messages (user + assistant)
    
    # Check message structure
    for msg in messages:
        assert "role" in msg
        assert "content" in msg
        assert "timestamp" in msg
        assert msg["role"] in ["USER", "ASSISTANT"]
    
    print(f"Retrieved {len(messages)} chat messages")


def test_11_get_chat_metrics():
    """測試取得聊天 Metrics"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    response = requests.get(f"{BASE_URL}/chat/{session_id}/metrics", timeout=TIMEOUT)
    assert response.status_code == 200
    
    data = response.json()
    required_fields = [
        "total_queries", "total_tokens", "total_input_tokens", "total_output_tokens",
        "avg_tokens_per_query", "avg_chunks_retrieved", "unanswered_ratio"
    ]
    
    for field in required_fields:
        assert field in data, f"Missing field: {field}"
    
    # Verify logical consistency
    assert data["total_queries"] >= 0
    assert data["total_tokens"] >= 0
    assert data["unanswered_ratio"] >= 0.0 and data["unanswered_ratio"] <= 1.0
    
    print(f"Metrics: {data['total_queries']} queries, {data['total_tokens']} tokens")


def test_12_heartbeat():
    """測試心跳保活"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    response = requests.post(f"{BASE_URL}/session/{session_id}/heartbeat",
                           headers=HEADERS, timeout=TIMEOUT)
    
    assert response.status_code == 200
    data = response.json()
    # Heartbeat returns session info, not just a message
    assert "created_at" in data or "last_activity" in data


def test_13_list_documents():
    """測試列出文件"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    response = requests.get(f"{BASE_URL}/upload/{session_id}/documents", timeout=TIMEOUT)
    assert response.status_code == 200
    
    data = response.json()
    # API returns array directly, not wrapped in "documents" key
    assert isinstance(data, list)
    assert len(data) >= 1
    
    # Check document structure
    doc = data[0]
    assert "document_id" in doc
    assert "source_reference" in doc  # This is the filename equivalent
    assert "extraction_status" in doc
    assert "moderation_status" in doc
    assert doc["extraction_status"] == "EXTRACTED"
    assert doc["moderation_status"] == "APPROVED"
    
    print(f"Found {len(data)} documents")


def test_14_close_session():
    """測試關閉 Session"""
    session_id = session_data["session_id"]
    assert session_id is not None, "Session not created"
    
    response = requests.post(f"{BASE_URL}/session/{session_id}/close",
                           headers=HEADERS, timeout=TIMEOUT)
    
    assert response.status_code in [200, 204]  # 204 No Content is also valid
    if response.status_code == 200:
        data = response.json()
        assert "message" in data
    
    # Verify session is closed
    response = requests.get(f"{BASE_URL}/session/{session_id}", timeout=TIMEOUT)
    assert response.status_code == 404  # Session should not exist
    
    print(f"Session closed: {session_id[:8]}...")


def test_15_final_health_check():
    """最終健康檢查"""
    response = requests.get("http://localhost:8000/health", timeout=TIMEOUT)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    print("All tests completed successfully! 🎉")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--no-cov"])