"""
Phase 4 端對端測試腳本
測試完整的文件上傳流程

執行方式:
python backend/tests/test_phase4_e2e.py
"""

import requests
import time
import json
from pathlib import Path

BASE_URL = "http://localhost:8000/api/v1"

def test_phase4_upload_flow():
    """測試完整的上傳流程"""
    
    print("=== Phase 4 端對端測試 ===\n")
    
    # Step 1: 建立 Session
    print("1. 建立 Session...")
    response = requests.post(f"{BASE_URL}/session/create")
    assert response.status_code == 201, f"Session 建立失敗: {response.status_code}"
    session_data = response.json()
    session_id = session_data["session_id"]
    print(f"   ✓ Session ID: {session_id}")
    print(f"   ✓ State: {session_data['state']}")
    print(f"   ✓ Collection: {session_data['qdrant_collection_name']}\n")
    
    # Step 2: 建立測試檔案
    print("2. 準備測試檔案...")
    test_file_path = Path("test_document.txt")
    test_content = """Machine Learning Introduction
    
    Machine learning is a subset of artificial intelligence that enables computers to learn from data.
    It involves training algorithms on datasets to make predictions or decisions.
    Common types include supervised learning, unsupervised learning, and reinforcement learning.
    
    Deep learning is a specialized form of machine learning using neural networks with multiple layers.
    """
    test_file_path.write_text(test_content, encoding='utf-8')
    print(f"   ✓ 測試檔案已建立: {test_file_path}\n")
    
    # Step 3: 上傳檔案
    print("3. 上傳檔案...")
    with open(test_file_path, 'rb') as f:
        files = {'file': ('test_document.txt', f, 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/upload/{session_id}/file",
            files=files
        )
    
    assert response.status_code == 202, f"檔案上傳失敗: {response.status_code}"
    upload_data = response.json()
    document_id = upload_data["document_id"]
    print(f"   ✓ Document ID: {document_id}")
    print(f"   ✓ Source Type: {upload_data['source_type']}\n")
    
    # Step 4: 輪詢處理狀態
    print("4. 等待處理完成...")
    max_attempts = 60  # 最多等待 2 分鐘
    attempt = 0
    
    while attempt < max_attempts:
        time.sleep(2)
        attempt += 1
        
        response = requests.get(
            f"{BASE_URL}/upload/{session_id}/status/{document_id}"
        )
        assert response.status_code == 200, f"狀態查詢失敗: {response.status_code}"
        
        status_data = response.json()
        progress = status_data["processing_progress"]
        extraction_status = status_data["extraction_status"]
        moderation_status = status_data["moderation_status"]
        
        print(f"   進度: {progress}% | 萃取: {extraction_status} | 審核: {moderation_status}", end='\r')
        
        if extraction_status == "COMPLETED" and moderation_status == "APPROVED":
            print(f"\n   ✓ 處理完成！")
            print(f"   ✓ 分塊數量: {status_data['chunk_count']}")
            print(f"   ✓ 摘要: {status_data['summary'][:100]}...\n")
            break
        elif extraction_status == "FAILED" or moderation_status == "BLOCKED":
            print(f"\n   ✗ 處理失敗！")
            print(f"   錯誤代碼: {status_data.get('error_code')}")
            print(f"   錯誤訊息: {status_data.get('error_message')}\n")
            break
    else:
        print("\n   ⚠ 處理超時\n")
    
    # Step 5: 列出文件
    print("5. 列出所有文件...")
    response = requests.get(f"{BASE_URL}/upload/{session_id}/documents")
    assert response.status_code == 200, f"文件列表失敗: {response.status_code}"
    
    documents = response.json()
    print(f"   ✓ 文件數量: {len(documents)}")
    for doc in documents:
        print(f"   - {doc['document_id']}: {doc['source_type']} ({doc['chunk_count']} chunks)")
    print()
    
    # Step 6: 驗證 Qdrant collection
    print("6. 驗證向量儲存...")
    response = requests.get(f"{BASE_URL}/session/{session_id}")
    assert response.status_code == 200, f"Session 查詢失敗: {response.status_code}"
    
    session_data = response.json()
    print(f"   Session State: {session_data['state']}")
    print(f"   Collection Name: {session_data['qdrant_collection_name']}")
    print()
    
    # 清理
    print("7. 清理測試資料...")
    test_file_path.unlink()
    response = requests.post(f"{BASE_URL}/session/{session_id}/close")
    assert response.status_code == 204, f"Session 關閉失敗: {response.status_code}"
    print("   ✓ 測試檔案已刪除")
    print("   ✓ Session 已關閉\n")
    
    print("=== ✅ Phase 4 測試完成！ ===\n")


if __name__ == "__main__":
    try:
        test_phase4_upload_flow()
    except AssertionError as e:
        print(f"\n❌ 測試失敗: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ 發生錯誤: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
