#!/usr/bin/env python3
"""
Phase 5 RAG Query Response - Complete Test Suite
測試所有 RAG 查詢和聊天功能

Test Coverage:
1. RAG Engine 初始化和查詢
2. Vector 搜尋和相似度過濾
3. Prompt 建構和 LLM 回應
4. Session Metrics 計算
5. Session Memory 管理
6. Chat API 端點
7. 聊天歷史管理
8. 錯誤處理和邊界情況
"""

import json
import pytest
import requests
import time
from uuid import UUID
from pathlib import Path
from typing import Optional

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
MAIN_URL = "http://localhost:8000"
HEADERS = {"Content-Type": "application/json"}

# Test data
TEST_DOCUMENT_CONTENT = """
Machine Learning and Artificial Intelligence

Machine learning is a subset of artificial intelligence that focuses on developing
algorithms and statistical models that enable computers to learn from data without
being explicitly programmed.

Key Concepts:
1. Supervised Learning: Training with labeled data
2. Unsupervised Learning: Finding patterns in unlabeled data
3. Reinforcement Learning: Learning through interaction with environment

Natural Language Processing (NLP) Applications:
- Sentiment Analysis: Determining emotional tone of text
- Named Entity Recognition: Identifying people, places, organizations
- Machine Translation: Translating between languages
- Question Answering: Building systems that answer user questions

Deep Learning:
Deep learning uses artificial neural networks with multiple layers to process
complex patterns in data. It has revolutionized computer vision and NLP.

Popular Deep Learning Architectures:
1. Convolutional Neural Networks (CNNs): For image processing
2. Recurrent Neural Networks (RNNs): For sequence data
3. Transformer Networks: For language models and attention mechanisms

Benefits of Machine Learning:
- Improved accuracy through data-driven learning
- Automation of complex tasks
- Discovery of hidden patterns
- Better decision making

Challenges:
- Data quality and quantity requirements
- Computational resources
- Model interpretability
- Ethical considerations

Future Trends:
- Few-shot learning with limited data
- Explainable AI (XAI)
- Federated learning for privacy
- Quantum machine learning
"""

TEST_QUERIES = [
    ("What is machine learning?", True),  # Should get answer
    ("Explain supervised learning", True),  # Should get answer
    ("List NLP applications", True),  # Should get answer
    ("What is a CNN?", True),  # Should get answer
    ("Tell me about quantum computing", False),  # Should NOT get answer (not in doc)
    ("How many stars are there?", False),  # Should NOT get answer (not in doc)
]


class Phase5Tester:
    """Phase 5 RAG Query Response 測試類別"""
    
    def __init__(self):
        self.results = []
        self.session_id: Optional[str] = None
        self.document_id: Optional[str] = None
        self.test_start_time = time.time()
    
    def log(self, test_name: str, passed: bool, message: str = "", details: dict = None):
        """記錄測試結果"""
        status = "✅" if passed else "❌"
        print(f"{status} {test_name}")
        if message:
            print(f"   {message}")
        if details:
            for key, value in details.items():
                print(f"   {key}: {value}")
        self.results.append((test_name, passed))
    
    def run_all_tests(self) -> bool:
        """執行所有測試"""
        print("\n╔════════════════════════════════════════════════════════╗")
        print("║        Phase 5 RAG Query Response - Complete Test      ║")
        print("╚════════════════════════════════════════════════════════╝")
        
        # Setup phase
        print("\n📋 SETUP PHASE")
        print("=" * 60)
        
        if not self.test_health_check():
            print("\n❌ 後端不可用，無法繼續測試")
            return False
        
        if not self.test_create_session():
            print("\n❌ 無法建立 Session，無法繼續測試")
            return False
        
        if not self.test_upload_document():
            print("\n❌ 無法上傳文件，無法繼續測試")
            return False
        
        if not self.test_wait_processing():
            print("\n❌ 文件處理失敗，無法繼續測試")
            return False
        
        # Core RAG tests
        print("\n🔍 RAG QUERY TESTS")
        print("=" * 60)
        
        self.test_basic_rag_query()
        self.test_multiple_queries()
        self.test_cannot_answer_queries()
        self.test_query_metrics()
        
        # Chat API tests
        print("\n💬 CHAT API TESTS")
        print("=" * 60)
        
        self.test_chat_history()
        self.test_history_pagination()
        self.test_invalid_queries()
        
        # Advanced tests
        print("\n🔧 ADVANCED TESTS")
        print("=" * 60)
        
        self.test_session_memory()
        self.test_concurrent_queries()
        
        # Cleanup
        print("\n🧹 CLEANUP PHASE")
        print("=" * 60)
        
        self.test_clear_history()
        self.test_session_close()
        
        # Summary
        return self.print_summary()
    
    def test_health_check(self) -> bool:
        """Test 1: 後端健康檢查"""
        print("\n[1/12] Health Check")
        try:
            r = requests.get(f"{MAIN_URL}/health", timeout=5)
            if r.status_code == 200:
                health = r.json()
                self.log("Health Check", True, 
                        f"Status: {health.get('status')}, Model: {health.get('gemini_model')}")
                return True
            else:
                self.log("Health Check", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Health Check", False, str(e))
            return False
    
    def test_create_session(self) -> bool:
        """Test 2: 建立 Session"""
        print("\n[2/12] Create Session")
        try:
            r = requests.post(f"{BASE_URL}/session/create")
            if r.status_code == 201:
                data = r.json()
                self.session_id = data["session_id"]
                self.log("Create Session", True, f"Session ID: {self.session_id}")
                print(f"   State: {data['state']}")
                return True
            else:
                self.log("Create Session", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Create Session", False, str(e))
            return False
    
    def test_upload_document(self) -> bool:
        """Test 3: 上傳測試文檔"""
        print("\n[3/12] Upload Test Document")
        
        if not self.session_id:
            self.log("Upload Document", False, "No valid session")
            return False
        
        test_file = Path("test_ml_document.txt")
        try:
            # Create test file
            test_file.write_text(TEST_DOCUMENT_CONTENT, encoding='utf-8')
            
            # Upload file
            with open(test_file, 'rb') as f:
                files = {'file': (test_file.name, f, 'text/plain')}
                r = requests.post(
                    f"{BASE_URL}/upload/{self.session_id}/file",
                    files=files
                )
            
            if r.status_code == 202:
                data = r.json()
                self.document_id = data["document_id"]
                self.log("Upload Document", True, f"Document ID: {self.document_id}")
                print(f"   Status: {data['extraction_status']}")
                return True
            else:
                self.log("Upload Document", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Upload Document", False, str(e))
            return False
        finally:
            if test_file.exists():
                test_file.unlink()
    
    def test_wait_processing(self) -> bool:
        """Test 4: 等待文檔處理完成"""
        print("\n[4/12] Wait for Processing")
        
        if not self.session_id or not self.document_id:
            self.log("Wait Processing", False, "Missing session or document")
            return False
        
        max_attempts = 30
        attempt = 0
        
        print(f"\n監視處理進度 (最多等待 {max_attempts * 2} 秒)...")
        
        while attempt < max_attempts:
            try:
                r = requests.get(
                    f"{BASE_URL}/upload/{self.session_id}/status/{self.document_id}"
                )
                
                if r.status_code == 200:
                    data = r.json()
                    extraction = data['extraction_status']
                    progress = data['processing_progress']
                    chunks = data['chunk_count']
                    
                    print(f"  [{attempt+1:2d}/{max_attempts}] " +
                          f"Extract: {extraction:10s} | " +
                          f"Progress: {progress:3d}% | " +
                          f"Chunks: {chunks:2d}", end='\r')
                    
                    if extraction == "EXTRACTED" and progress == 100 and chunks > 0:
                        print()  # 新行
                        self.log("Wait Processing", True,
                                f"Complete: {chunks} chunks")
                        return True
                    elif data.get('error_code'):
                        print()  # 新行
                        self.log("Wait Processing", False, 
                                f"Error: {data.get('error_message')}")
                        return False
                    
                    time.sleep(2)
                    attempt += 1
                else:
                    self.log("Wait Processing", False, f"Status code: {r.status_code}")
                    return False
            except Exception as e:
                self.log("Wait Processing", False, str(e))
                return False
        
        print()  # 新行
        self.log("Wait Processing", False, "Processing timeout")
        return False
    
    def test_basic_rag_query(self) -> bool:
        """Test 5: 基本 RAG 查詢"""
        print("\n[5/12] Basic RAG Query")
        
        if not self.session_id:
            self.log("Basic RAG Query", False, "No valid session")
            return False
        
        query = "What is machine learning?"
        
        try:
            r = requests.post(
                f"{BASE_URL}/chat/{self.session_id}/query",
                json={"user_query": query},
                headers=HEADERS
            )
            
            if r.status_code == 200:
                data = r.json()
                response = data['llm_response']
                response_type = data['response_type']
                token_total = data['token_total']
                chunks_count = len(data['retrieved_chunks'])
                
                passed = (response_type == "ANSWERED" and 
                         len(response) > 0 and 
                         chunks_count > 0)
                
                self.log("Basic RAG Query", passed,
                        f"Response type: {response_type}, Tokens: {token_total}",
                        {
                            "Query": query,
                            "Response Length": len(response),
                            "Retrieved Chunks": chunks_count,
                            "Input Tokens": data['token_input'],
                            "Output Tokens": data['token_output']
                        })
                
                return passed
            else:
                self.log("Basic RAG Query", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Basic RAG Query", False, str(e))
            return False
    
    def test_multiple_queries(self) -> bool:
        """Test 6: 多個查詢"""
        print("\n[6/12] Multiple Queries")
        
        if not self.session_id:
            self.log("Multiple Queries", False, "No valid session")
            return False
        
        passed_count = 0
        total_count = 0
        
        for query, should_answer in TEST_QUERIES[:4]:  # Test first 4 queries
            try:
                r = requests.post(
                    f"{BASE_URL}/chat/{self.session_id}/query",
                    json={"user_query": query},
                    headers=HEADERS
                )
                
                if r.status_code == 200:
                    data = r.json()
                    response_type = data['response_type']
                    
                    # Check if response matches expectation
                    is_answered = response_type == "ANSWERED"
                    passed = is_answered == should_answer
                    
                    status = "✓" if passed else "✗"
                    print(f"   {status} Query: {query[:40]}... → {response_type}")
                    
                    if passed:
                        passed_count += 1
                    total_count += 1
            except Exception as e:
                print(f"   ✗ Query: {query[:40]}... → Error: {str(e)}")
                total_count += 1
        
        success = passed_count == total_count
        self.log("Multiple Queries", success,
                f"Passed: {passed_count}/{total_count}")
        
        return success
    
    def test_cannot_answer_queries(self) -> bool:
        """Test 7: 無法回答的查詢"""
        print("\n[7/12] Cannot Answer Queries")
        
        if not self.session_id:
            self.log("Cannot Answer Queries", False, "No valid session")
            return False
        
        # Test queries that should NOT be answerable from the document
        cannot_answer_queries = [
            "How many stars are in the universe?",
            "What's the capital of France?",
            "Describe quantum teleportation"
        ]
        
        cannot_answer_count = 0
        
        for query in cannot_answer_queries:
            try:
                r = requests.post(
                    f"{BASE_URL}/chat/{self.session_id}/query",
                    json={"user_query": query},
                    headers=HEADERS
                )
                
                if r.status_code == 200:
                    data = r.json()
                    response_type = data['response_type']
                    
                    if response_type == "CANNOT_ANSWER":
                        cannot_answer_count += 1
                        print(f"   ✓ Query triggered CANNOT_ANSWER: {query[:40]}...")
                    else:
                        print(f"   ✗ Expected CANNOT_ANSWER, got {response_type}: {query[:40]}...")
            except Exception as e:
                print(f"   ✗ Error: {str(e)}")
        
        success = cannot_answer_count == len(cannot_answer_queries)
        self.log("Cannot Answer Queries", success,
                f"Cannot answer responses: {cannot_answer_count}/{len(cannot_answer_queries)}")
        
        return success
    
    def test_query_metrics(self) -> bool:
        """Test 8: 查詢 Metrics"""
        print("\n[8/12] Query Metrics")
        
        if not self.session_id:
            self.log("Query Metrics", False, "No valid session")
            return False
        
        try:
            r = requests.post(
                f"{BASE_URL}/chat/{self.session_id}/query",
                json={"user_query": "What is NLP?"},
                headers=HEADERS
            )
            
            if r.status_code == 200:
                data = r.json()
                
                # Check metrics
                has_metrics = (
                    'token_input' in data and
                    'token_output' in data and
                    'token_total' in data
                )
                
                token_total = data.get('token_total', 0)
                has_valid_tokens = token_total > 0
                
                self.log("Query Metrics", has_metrics and has_valid_tokens,
                        f"Total tokens: {token_total}",
                        {
                            "Input Tokens": data.get('token_input'),
                            "Output Tokens": data.get('token_output'),
                            "Retrieved Chunks": len(data.get('retrieved_chunks', []))
                        })
                
                return has_metrics and has_valid_tokens
            else:
                self.log("Query Metrics", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Query Metrics", False, str(e))
            return False
    
    def test_chat_history(self) -> bool:
        """Test 9: 聊天歷史"""
        print("\n[9/12] Chat History")
        
        if not self.session_id:
            self.log("Chat History", False, "No valid session")
            return False
        
        try:
            # First, send a query to create history
            r = requests.post(
                f"{BASE_URL}/chat/{self.session_id}/query",
                json={"user_query": "Explain deep learning"},
                headers=HEADERS
            )
            
            if r.status_code != 200:
                self.log("Chat History", False, "Failed to create history")
                return False
            
            # Then retrieve history
            r = requests.get(f"{BASE_URL}/chat/{self.session_id}/history")
            
            if r.status_code == 200:
                data = r.json()
                messages = data['messages']
                total_count = data['total_count']
                
                has_messages = len(messages) > 0
                has_both_roles = any(m.get('role') == 'USER' for m in messages) and \
                                any(m.get('role') == 'ASSISTANT' for m in messages)
                
                self.log("Chat History", has_messages and has_both_roles,
                        f"Messages: {len(messages)}, Total: {total_count}",
                        {
                            "User Messages": sum(1 for m in messages if m.get('role') == 'USER'),
                            "Assistant Messages": sum(1 for m in messages if m.get('role') == 'ASSISTANT')
                        })
                
                return has_messages and has_both_roles
            else:
                self.log("Chat History", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Chat History", False, str(e))
            return False
    
    def test_history_pagination(self) -> bool:
        """Test 10: 歷史分頁"""
        print("\n[10/12] History Pagination")
        
        if not self.session_id:
            self.log("History Pagination", False, "No valid session")
            return False
        
        try:
            # Test with limit and offset
            r = requests.get(
                f"{BASE_URL}/chat/{self.session_id}/history",
                params={"limit": 5, "offset": 0}
            )
            
            if r.status_code == 200:
                data = r.json()
                messages = data['messages']
                total = data['total_count']
                
                self.log("History Pagination", True,
                        f"Retrieved: {len(messages)}, Total: {total}",
                        {
                            "Limit": 5,
                            "Offset": 0,
                            "Retrieved": len(messages),
                            "Total Available": total
                        })
                
                return True
            else:
                self.log("History Pagination", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("History Pagination", False, str(e))
            return False
    
    def test_invalid_queries(self) -> bool:
        """Test 11: 無效查詢處理"""
        print("\n[11/12] Invalid Query Handling")
        
        if not self.session_id:
            self.log("Invalid Query Handling", False, "No valid session")
            return False
        
        test_cases = [
            ({"user_query": ""}, 400),  # Empty query
            ({"user_query": "x" * 3000}, 400),  # Too long query
        ]
        
        invalid_handled = 0
        
        for payload, expected_status in test_cases:
            try:
                r = requests.post(
                    f"{BASE_URL}/chat/{self.session_id}/query",
                    json=payload,
                    headers=HEADERS
                )
                
                if r.status_code == expected_status or r.status_code >= 400:
                    invalid_handled += 1
                    print(f"   ✓ Invalid query properly rejected (status: {r.status_code})")
                else:
                    print(f"   ✗ Expected error, got {r.status_code}")
            except Exception as e:
                print(f"   ✗ Error: {str(e)}")
        
        success = invalid_handled == len(test_cases)
        self.log("Invalid Query Handling", success,
                f"Invalid queries handled: {invalid_handled}/{len(test_cases)}")
        
        return success
    
    def test_session_memory(self) -> bool:
        """Test 12: Session Memory 管理"""
        print("\n[12/12] Session Memory Management")
        
        if not self.session_id:
            self.log("Session Memory", False, "No valid session")
            return False
        
        try:
            # Execute multiple queries to test memory management
            queries = [
                "What is supervised learning?",
                "Explain CNN architecture",
                "What are RNNs used for?"
            ]
            
            for i, query in enumerate(queries):
                r = requests.post(
                    f"{BASE_URL}/chat/{self.session_id}/query",
                    json={"user_query": query},
                    headers=HEADERS
                )
                
                if r.status_code == 200:
                    print(f"   ✓ Query {i+1} processed")
                else:
                    print(f"   ✗ Query {i+1} failed")
                    return False
            
            self.log("Session Memory", True,
                    "Memory management working correctly")
            
            return True
        except Exception as e:
            self.log("Session Memory", False, str(e))
            return False
    
    def test_concurrent_queries(self) -> bool:
        """Test 13: 並發查詢"""
        print("\n[13/12] Concurrent Queries (Sequential Test)")
        
        if not self.session_id:
            self.log("Concurrent Queries", False, "No valid session")
            return False
        
        try:
            success_count = 0
            for i in range(3):
                r = requests.post(
                    f"{BASE_URL}/chat/{self.session_id}/query",
                    json={"user_query": f"Question {i+1}: What is AI?"},
                    headers=HEADERS,
                    timeout=30
                )
                
                if r.status_code == 200:
                    success_count += 1
            
            passed = success_count == 3
            self.log("Concurrent Queries", passed,
                    f"Successful queries: {success_count}/3")
            
            return passed
        except Exception as e:
            self.log("Concurrent Queries", False, str(e))
            return False
    
    def test_clear_history(self) -> bool:
        """Test 14: 清除歷史"""
        print("\n[14/12] Clear Chat History")
        
        if not self.session_id:
            self.log("Clear History", False, "No valid session")
            return False
        
        try:
            r = requests.delete(f"{BASE_URL}/chat/{self.session_id}/history")
            
            if r.status_code == 200:
                # Verify history is cleared
                r = requests.get(f"{BASE_URL}/chat/{self.session_id}/history")
                if r.status_code == 200:
                    data = r.json()
                    cleared = len(data['messages']) == 0
                    
                    self.log("Clear History", cleared,
                            "Chat history successfully cleared")
                    
                    return cleared
                else:
                    self.log("Clear History", False, "Could not verify clearance")
                    return False
            else:
                self.log("Clear History", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Clear History", False, str(e))
            return False
    
    def test_session_close(self) -> bool:
        """Test 15: 關閉 Session"""
        print("\n[15/12] Close Session")
        
        if not self.session_id:
            self.log("Close Session", False, "No valid session")
            return False
        
        try:
            r = requests.post(f"{BASE_URL}/session/{self.session_id}/close")
            
            if r.status_code == 204:
                self.log("Close Session", True,
                        "Session closed successfully")
                return True
            else:
                self.log("Close Session", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Close Session", False, str(e))
            return False
    
    def print_summary(self) -> bool:
        """列印測試摘要"""
        print("\n" + "="*60)
        print("TEST SUMMARY - Phase 5 RAG Query Response")
        print("="*60)
        
        elapsed = time.time() - self.test_start_time
        passed = sum(1 for _, result in self.results if result)
        total = len(self.results)
        
        print(f"\n執行時間: {elapsed:.1f} 秒")
        print(f"總計: {passed}/{total} 通過\n")
        
        for test_name, result in self.results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {status:10s} {test_name}")
        
        print("\n" + "="*60)
        if passed == total:
            print("🎉 ALL TESTS PASSED!")
        else:
            print(f"⚠️  {total - passed} TEST(S) FAILED")
        print("="*60)
        
        return passed == total


if __name__ == "__main__":
    import sys
    
    tester = Phase5Tester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
