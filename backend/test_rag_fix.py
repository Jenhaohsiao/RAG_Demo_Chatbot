#!/usr/bin/env python3
"""
快速測試向量搜尋修復
1. 建立 session
2. 上傳 RAG PDF 文件
3. 等待處理
4. 測試 RAG 查詢
"""

import requests
import json
import time
import tempfile
from pathlib import Path

BASE_URL = "http://localhost:8000/api/v1"
HEADERS = {"Content-Type": "application/json"}

# RAG 文件內容（簡單的測試）
RAG_CONTENT = """Retrieval Augmented Generation (RAG)

RAG is a technique that combines retrieval with generation. It uses a retriever to fetch relevant documents from a knowledge base and a generator to produce answers based on the retrieved documents.

Key Components of RAG:
1. Retriever: Finds relevant documents from the knowledge base
2. Generator: Generates answers based on retrieved documents
3. Knowledge Base: A collection of documents to retrieve from

How RAG Works:
1. User submits a query
2. Retriever searches the knowledge base for relevant documents
3. Generator reads the retrieved documents and produces an answer

Benefits of RAG:
- Reduces hallucination by grounding answers in retrieved documents
- Allows easy updates to knowledge base without retraining
- Combines benefits of retrieval-based and generation-based systems

RAG vs Traditional LLMs:
Traditional LLMs generate answers based on pre-training knowledge, which can be outdated and prone to hallucinations. RAG systems retrieve current information and generate answers based on that information, making them more reliable.
"""

def test_rag_with_fixed_ids():
    """測試修復後的 RAG 系統"""
    
    print("\n" + "="*60)
    print("RAG 搜尋修復測試")
    print("="*60 + "\n")
    
    # 1. 建立 session
    print("[1] 建立 Session...")
    r = requests.post(
        f"{BASE_URL}/session/create?language=en",
        headers=HEADERS
    )
    if r.status_code != 201:
        print(f"❌ 建立 session 失敗: {r.status_code}")
        print(r.text)
        return False
    
    session_id = r.json()["session_id"]
    print(f"✅ Session 已建立: {session_id}\n")
    
    # 2. 上傳 RAG 文件
    print("[2] 上傳 RAG 文件...")
    test_file = Path(tempfile.gettempdir()) / "test_rag.txt"
    test_file.write_text(RAG_CONTENT, encoding='utf-8')
    
    with open(test_file, 'rb') as f:
        files = {'file': ('test_rag.txt', f)}
        r = requests.post(
            f"{BASE_URL}/upload/{session_id}/file",
            files=files
        )
    
    if r.status_code != 202:
        print(f"❌ 上傳失敗: {r.status_code}")
        print(r.text)
        return False
    
    document_id = r.json()["document_id"]
    print(f"✅ 文件已上傳: {document_id}\n")
    
    # 3. 等待處理
    print("[3] 等待文件處理...")
    max_attempts = 30
    for attempt in range(max_attempts):
        r = requests.get(
            f"{BASE_URL}/upload/{session_id}/status/{document_id}"
        )
        data = r.json()
        
        if data['extraction_status'] == 'EXTRACTED' and data['processing_progress'] == 100:
            print(f"✅ 文件已處理完成: {data['chunk_count']} chunks\n")
            break
        
        print(f"  [{attempt+1}/{max_attempts}] 進度: {data['processing_progress']}%", end='\r')
        time.sleep(1)
    else:
        print("❌ 處理超時")
        return False
    
    # 4. 測試 RAG 查詢
    print("[4] 測試 RAG 查詢...")
    
    test_queries = [
        ("What is RAG?", "應該得到答案"),
        ("How does RAG work?", "應該得到答案"),
        ("Tell me about bananas", "應該無法回答"),
    ]
    
    all_passed = True
    for query, expectation in test_queries:
        r = requests.post(
            f"{BASE_URL}/chat/{session_id}/query",
            json={"user_query": query},
            headers=HEADERS
        )
        
        if r.status_code != 200:
            print(f"❌ 查詢失敗: {query}")
            print(r.text)
            all_passed = False
            continue
        
        data = r.json()
        response_type = data['response_type']
        chunks_count = len(data['retrieved_chunks'])
        
        status = "✅" if (chunks_count > 0 or response_type == "CANNOT_ANSWER") else "❌"
        print(f"\n{status} 查詢: '{query[:30]}...'")
        print(f"   期望: {expectation}")
        print(f"   回應: {response_type}")
        print(f"   檢索到: {chunks_count} chunks")
        
        if chunks_count > 0:
            print(f"   文本預覽: {data['retrieved_chunks'][0]['text'][:80]}...")
        
        if response_type == "CANNOT_ANSWER" and "bananas" in query.lower():
            print(f"   ✅ 正確拒絕超出範圍的查詢")
        elif chunks_count > 0 and "bananas" not in query.lower():
            print(f"   ✅ 成功檢索相關文檔")
        elif chunks_count == 0 and "bananas" not in query.lower():
            all_passed = False
            print(f"   ❌ 應該檢索到相關文檔，但返回 0 chunks")
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ 測試通過！向量搜尋修復成功！")
    else:
        print("❌ 測試失敗")
    print("="*60 + "\n")
    
    return all_passed

if __name__ == "__main__":
    test_rag_with_fixed_ids()
