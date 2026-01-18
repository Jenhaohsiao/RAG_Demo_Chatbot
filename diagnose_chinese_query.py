#!/usr/bin/env python3
"""
RAG中文查詢診斷工具
用於測試和診斷中文查詢問題
"""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import asyncio
from uuid import uuid4
from src.services.embedder import Embedder
from src.services.vector_store import VectorStore
from src.core.config import settings


async def diagnose_query(query: str, session_id: str):
    """診斷查詢問題"""
    print(f"\n{'='*60}")
    print(f"診斷查詢: {query}")
    print(f"Session: {session_id}")
    print(f"{'='*60}\n")
    
    # Initialize services
    embedder = Embedder()
    vector_store = VectorStore()
    
    # 1. Generate embedding
    print("1️⃣ 生成查詢 embedding...")
    embedding_result = embedder.embed_query(query)
    print(f"   ✓ Embedding dimension: {len(embedding_result.vector)}")
    print(f"   ✓ Model: {embedding_result.model}")
    
    # 2. Search with different thresholds
    collection_name = f"session_{session_id.replace('-', '')}"
    
    thresholds = [0.6, 0.5, 0.4, 0.3, 0.2, 0.1]
    
    print(f"\n2️⃣ 測試不同相似度閾值...")
    print(f"   Collection: {collection_name}\n")
    
    for threshold in thresholds:
        try:
            results = vector_store.search_similar(
                collection_name=collection_name,
                query_vector=embedding_result.vector,
                limit=5,
                score_threshold=threshold
            )
            
            print(f"   閾值 {threshold:.1f}: 找到 {len(results)} 個結果")
            
            if results:
                for i, result in enumerate(results[:3], 1):
                    score = result['score']
                    text = result['payload'].get('text', '')[:100]
                    print(f"      {i}. Score: {score:.3f} - {text}...")
                print()
        except Exception as e:
            print(f"   ❌ 搜尋失敗 (閾值 {threshold}): {e}")
    
    # 3. Check collection stats
    print("\n3️⃣ Collection 統計資訊...")
    try:
        info = vector_store.get_collection_info(collection_name)
        print(f"   ✓ Vector count: {info.vectors_count}")
        print(f"   ✓ Points count: {info.points_count}")
        print(f"   ✓ Status: {info.status}")
    except Exception as e:
        print(f"   ❌ 無法取得 collection 資訊: {e}")


async def main():
    """主函數"""
    print("\n" + "="*60)
    print("RAG 中文查詢診斷工具")
    print("="*60)
    
    # 從用戶輸入獲取信息
    session_id = input("\n請輸入 Session ID: ").strip()
    
    if not session_id:
        print("❌ Session ID 不能為空")
        return
    
    # 測試查詢列表
    test_queries = [
        "愛麗絲是誰",
        "Alice是誰", 
        "Alice是什麼樣的人",
        "這個故事的主角",
        "白兔先生"
    ]
    
    print(f"\n將測試以下查詢:")
    for i, q in enumerate(test_queries, 1):
        print(f"  {i}. {q}")
    
    choice = input("\n選擇查詢 (1-5) 或輸入自訂查詢: ").strip()
    
    if choice.isdigit() and 1 <= int(choice) <= 5:
        query = test_queries[int(choice) - 1]
    else:
        query = choice
    
    await diagnose_query(query, session_id)
    
    print(f"\n{'='*60}")
    print("診斷完成！")
    print(f"{'='*60}\n")
    
    # 建議
    print("📋 建議:")
    print("1. 如果大部分查詢的 score < 0.3，考慮:")
    print("   - 檢查上傳的文檔質量")
    print("   - 確認文檔語言與查詢語言一致")
    print("   - 檢查是否有亂碼或編碼問題")
    print()
    print("2. 如果 score 在 0.2-0.3 之間，可以:")
    print("   - 使用更具體的查詢詞")
    print("   - 嘗試不同的問法")
    print("   - 結合關鍵詞和語義查詢")
    print()
    print("3. 如果沒有任何結果，檢查:")
    print("   - Session ID 是否正確")
    print("   - Collection 是否存在")
    print("   - 文檔是否已處理完成")
    print()


if __name__ == "__main__":
    asyncio.run(main())
