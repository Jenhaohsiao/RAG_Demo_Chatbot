#!/usr/bin/env python3
"""
Phase 4 完整測試 - 所有上傳功能
測試流程：
1. Session 建立
2. 檔案上傳 (TXT)
3. 狀態輪詢
4. 檔案列表
5. Session 查詢
6. 多檔案上傳
7. URL 上傳
8. 清理資源
"""

import requests
import time
import sys
from pathlib import Path

BASE_URL = "http://localhost:8000/api/v1"
MAIN_URL = "http://localhost:8000"

class Phase4Tester:
    def __init__(self):
        self.results = []
        self.session_id = None
        self.documents = []
        
    def log(self, test_name, passed, message=""):
        """記錄測試結果"""
        status = "✅" if passed else "❌"
        print(f"{status} {test_name}")
        if message:
            print(f"   {message}")
        self.results.append((test_name, passed))
        
    def test_health_check(self):
        """Test 1: 健康檢查"""
        print("\n" + "="*60)
        print("TEST 1: 後端健康檢查")
        print("="*60)
        
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
    
    def test_create_session(self):
        """Test 2: 建立 Session"""
        print("\n" + "="*60)
        print("TEST 2: 建立 Session")
        print("="*60)
        
        try:
            r = requests.post(f"{BASE_URL}/session/create")
            if r.status_code == 201:
                data = r.json()
                self.session_id = data["session_id"]
                self.log("Create Session", True, f"Session ID: {self.session_id}")
                print(f"   State: {data['state']}")
                print(f"   Qdrant Collection: {data.get('qdrant_collection_name')}")
                return True
            else:
                self.log("Create Session", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Create Session", False, str(e))
            return False
    
    def test_upload_txt_file(self):
        """Test 3: 上傳 TXT 檔案"""
        print("\n" + "="*60)
        print("TEST 3: 上傳 TXT 檔案")
        print("="*60)
        
        if not self.session_id:
            self.log("Upload TXT File", False, "No valid session")
            return False
            
        # 建立測試檔案
        test_file = Path("test_phase4_doc1.txt")
        content = """
Machine Learning and Artificial Intelligence

Machine learning is a subset of artificial intelligence that focuses on developing
algorithms and statistical models that enable computers to learn from data without
being explicitly programmed.

Key Applications:
1. Natural Language Processing (NLP)
2. Computer Vision
3. Recommendation Systems
4. Predictive Analytics
5. Autonomous Vehicles

Deep Learning:
Deep learning is an advanced machine learning technique that uses neural networks
with multiple layers to process complex patterns in data.

Benefits:
- Improved accuracy through feature learning
- Handling unstructured data effectively
- Automatic feature extraction
- Better performance on large datasets
"""
        
        try:
            test_file.write_text(content, encoding='utf-8')
            
            with open(test_file, 'rb') as f:
                files = {'file': (test_file.name, f, 'text/plain')}
                r = requests.post(f"{BASE_URL}/upload/{self.session_id}/file", files=files)
            
            if r.status_code == 202:
                data = r.json()
                doc_id = data["document_id"]
                self.documents.append(doc_id)
                self.log("Upload TXT File", True, f"Document ID: {doc_id}")
                print(f"   Source Type: {data['source_type']}")
                print(f"   Status: {data['extraction_status']}")
                return True
            else:
                self.log("Upload TXT File", False, 
                        f"Status code: {r.status_code}, Response: {r.text}")
                return False
        except Exception as e:
            self.log("Upload TXT File", False, str(e))
            return False
        finally:
            if test_file.exists():
                test_file.unlink()
    
    def test_poll_status(self, document_id):
        """Test 4: 輪詢處理狀態"""
        print("\n" + "="*60)
        print("TEST 4: 輪詢處理狀態")
        print("="*60)
        
        if not self.session_id or not document_id:
            self.log("Poll Status", False, "No valid session or document")
            return False
        
        max_attempts = 20
        attempt = 0
        
        print(f"\n監視處理進度 (最多等待 {max_attempts*2} 秒)...")
        
        while attempt < max_attempts:
            try:
                r = requests.get(f"{BASE_URL}/upload/{self.session_id}/status/{document_id}")
                if r.status_code == 200:
                    data = r.json()
                    extraction = data['extraction_status']
                    moderation = data['moderation_status']
                    progress = data['processing_progress']
                    chunks = data['chunk_count']
                    
                    print(f"  [{attempt+1:2d}/{max_attempts}] " +
                          f"Extract: {extraction:10s} | " +
                          f"Moderate: {moderation:10s} | " +
                          f"Chunks: {chunks:2d} | " +
                          f"Progress: {progress:3d}%", end='\r')
                    
                    if extraction == "EXTRACTED" and progress == 100 and chunks > 0:
                        print()  # 新行
                        self.log("Poll Status", True, 
                                f"Complete: {chunks} chunks, Summary: {data.get('summary', 'N/A')[:50]}...")
                        return True
                    elif data.get('error_code'):
                        print()  # 新行
                        self.log("Poll Status", False, f"Error: {data.get('error_message')}")
                        return False
                    
                    time.sleep(2)
                    attempt += 1
                else:
                    self.log("Poll Status", False, f"Status code: {r.status_code}")
                    return False
            except Exception as e:
                self.log("Poll Status", False, str(e))
                return False
        
        print()  # 新行
        self.log("Poll Status", False, "Processing timeout")
        return False
    
    def test_list_documents(self):
        """Test 5: 列出所有檔案"""
        print("\n" + "="*60)
        print("TEST 5: 列出所有檔案")
        print("="*60)
        
        if not self.session_id:
            self.log("List Documents", False, "No valid session")
            return False
        
        try:
            r = requests.get(f"{BASE_URL}/upload/{self.session_id}/documents")
            if r.status_code == 200:
                docs = r.json()
                count = len(docs) if isinstance(docs, list) else 1
                self.log("List Documents", True, f"Found {count} document(s)")
                for doc in (docs if isinstance(docs, list) else [docs]):
                    print(f"   • {doc.get('document_id', 'N/A')}: " +
                          f"{doc.get('chunk_count', 0)} chunks")
                return True
            else:
                self.log("List Documents", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("List Documents", False, str(e))
            return False
    
    def test_get_session_info(self):
        """Test 6: 取得 Session 資訊"""
        print("\n" + "="*60)
        print("TEST 6: 取得 Session 資訊")
        print("="*60)
        
        if not self.session_id:
            self.log("Get Session Info", False, "No valid session")
            return False
        
        try:
            r = requests.get(f"{BASE_URL}/session/{self.session_id}")
            if r.status_code == 200:
                data = r.json()
                self.log("Get Session Info", True, 
                        f"State: {data['state']}, Language: {data['language']}")
                print(f"   Documents: {data.get('document_count', 0)}")
                print(f"   Vectors: {data.get('vector_count', 0)}")
                return True
            else:
                self.log("Get Session Info", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Get Session Info", False, str(e))
            return False
    
    def test_upload_url(self):
        """Test 7: 上傳 URL"""
        print("\n" + "="*60)
        print("TEST 7: 上傳 URL")
        print("="*60)
        
        if not self.session_id:
            self.log("Upload URL", False, "No valid session")
            return False
        
        try:
            # 使用簡單的公開 URL
            url = "https://example.com"
            payload = {"url": url}
            
            r = requests.post(f"{BASE_URL}/upload/{self.session_id}/url", json=payload)
            
            if r.status_code == 202:
                data = r.json()
                doc_id = data.get("document_id")
                if doc_id:
                    self.documents.append(doc_id)
                self.log("Upload URL", True, f"Document ID: {doc_id}")
                print(f"   URL: {url}")
                print(f"   Status: {data.get('extraction_status')}")
                
                # 快速輪詢以驗證處理開始
                time.sleep(3)
                r = requests.get(f"{BASE_URL}/upload/{self.session_id}/status/{doc_id}")
                if r.status_code == 200:
                    status = r.json()
                    print(f"   Processing Progress: {status.get('processing_progress')}%")
                
                return True
            else:
                self.log("Upload URL", False, 
                        f"Status code: {r.status_code}, Response: {r.text}")
                return False
        except Exception as e:
            self.log("Upload URL", False, str(e))
            return False
    
    def test_update_language(self):
        """Test 8: 更新語言"""
        print("\n" + "="*60)
        print("TEST 8: 更新語言設定")
        print("="*60)
        
        if not self.session_id:
            self.log("Update Language", False, "No valid session")
            return False
        
        try:
            payload = {"language": "zh"}
            r = requests.put(f"{BASE_URL}/session/{self.session_id}/language", json=payload)
            
            if r.status_code == 200:
                self.log("Update Language", True, "Language changed to Chinese")
                return True
            else:
                self.log("Update Language", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Update Language", False, str(e))
            return False
    
    def test_session_heartbeat(self):
        """Test 9: Session 心跳"""
        print("\n" + "="*60)
        print("TEST 9: Session 心跳")
        print("="*60)
        
        if not self.session_id:
            self.log("Session Heartbeat", False, "No valid session")
            return False
        
        try:
            r = requests.post(f"{BASE_URL}/session/{self.session_id}/heartbeat")
            
            if r.status_code == 200:
                self.log("Session Heartbeat", True, "Heartbeat successful")
                return True
            else:
                self.log("Session Heartbeat", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Session Heartbeat", False, str(e))
            return False
    
    def test_cleanup(self):
        """Test 10: 清理資源"""
        print("\n" + "="*60)
        print("TEST 10: 清理 Session")
        print("="*60)
        
        if not self.session_id:
            self.log("Cleanup Session", False, "No valid session")
            return False
        
        try:
            r = requests.post(f"{BASE_URL}/session/{self.session_id}/close")
            
            if r.status_code == 204:
                self.log("Cleanup Session", True, "Session closed and cleaned up")
                return True
            else:
                self.log("Cleanup Session", False, f"Status code: {r.status_code}")
                return False
        except Exception as e:
            self.log("Cleanup Session", False, str(e))
            return False
    
    def print_summary(self):
        """列印測試摘要"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for _, result in self.results if result)
        total = len(self.results)
        
        print(f"\n總計: {passed}/{total} 通過\n")
        
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
    
    def run(self):
        """執行所有測試"""
        print("\n╔════════════════════════════════════════════════════════╗")
        print("║        Phase 4 完整測試 - 所有上傳功能               ║")
        print("╚════════════════════════════════════════════════════════╝")
        
        # 執行測試
        if not self.test_health_check():
            print("\n❌ 後端不可用，無法繼續測試")
            return False
        
        if not self.test_create_session():
            print("\n❌ 無法建立 Session，無法繼續測試")
            return False
        
        # 核心上傳測試
        txt_success = self.test_upload_txt_file()
        
        if txt_success and self.documents:
            self.test_poll_status(self.documents[0])
        
        self.test_list_documents()
        self.test_get_session_info()
        self.test_update_language()
        self.test_session_heartbeat()
        
        # URL 上傳測試
        self.test_upload_url()
        
        # 清理
        self.test_cleanup()
        
        # 摘要
        return self.print_summary()

if __name__ == "__main__":
    tester = Phase4Tester()
    success = tester.run()
    sys.exit(0 if success else 1)
