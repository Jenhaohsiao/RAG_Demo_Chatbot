#!/usr/bin/env python3
"""
診斷 Qdrant 搜尋問題的腳本
檢查：
1. 點是否正確儲存
2. 向量搜尋是否返回結果
3. 相似度分數是否合理
"""

import sys
import json
from uuid import UUID
from pathlib import Path

# 添加 backend 到 Python 路徑
sys.path.insert(0, str(Path(__file__).parent))

from src.core.config import settings
from src.services.vector_store import VectorStore
from src.services.embedder import Embedder
from src.services.chunker import TextChunker
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 初始化服務
vector_store = VectorStore()
embedder = Embedder()
chunker = TextChunker()

def diagnose():
    """運行診斷"""
    print("\n" + "="*60)
    print("RAG 搜尋診斷工具")
    print("="*60)
    
    # 1. 檢查 Qdrant 連線
    print("\n[1] 檢查 Qdrant 連線...")
    try:
        collections = vector_store.client.get_collections().collections
        print(f"✅ Qdrant 已連線，找到 {len(collections)} 個 collection")
        
        if collections:
            for col in collections:
                print(f"   - {col.name}")
    except Exception as e:
        print(f"❌ Qdrant 連線失敗: {e}")
        return
    
    # 2. 使用最新的 collection 進行搜尋測試
    if not collections:
        print("\n❌ 沒有可用的 collection，無法進行測試")
        return
    
    test_collection = collections[-1].name
    print(f"\n[2] 在 collection '{test_collection}' 中測試搜尋...")
    
    try:
        info = vector_store.get_collection_info(test_collection)
        print(f"   集合資訊: {info}")
    except Exception as e:
        print(f"   ❌ 無法獲取集合資訊: {e}")
        return
    
    # 3. 嘗試查詢
    print("\n[3] 測試向量搜尋...")
    
    test_query = "What is machine learning?"
    print(f"   測試查詢: '{test_query}'")
    
    try:
        # 嵌入查詢
        query_embedding = embedder.embed_query(test_query)
        print(f"   ✅ 查詢嵌入成功，維度: {len(query_embedding.vector)}")
        
        # 搜尋
        results = vector_store.search_similar(
            collection_name=test_collection,
            query_vector=query_embedding.vector,
            limit=5,
            score_threshold=0.5  # 降低閾值以查看是否有結果
        )
        
        print(f"   找到 {len(results)} 個結果 (閾值 ≥0.5)")
        
        if results:
            for i, result in enumerate(results, 1):
                print(f"\n   結果 {i}:")
                print(f"     ID: {result['id']}")
                print(f"     相似度分數: {result['score']:.4f}")
                payload = result['payload']
                text_preview = payload.get('text', '')[:100]
                print(f"     文本預覽: {text_preview}...")
        else:
            print("\n   ⚠️  沒有搜尋結果！")
            print("\n   嘗試降低閾值到 0.0...")
            results = vector_store.search_similar(
                collection_name=test_collection,
                query_vector=query_embedding.vector,
                limit=5,
                score_threshold=0.0
            )
            print(f"   找到 {len(results)} 個結果 (閾值 ≥0.0)")
            
            if results:
                print("\n   前 3 個結果的相似度分數:")
                for i, result in enumerate(results[:3], 1):
                    print(f"     {i}. 分數: {result['score']:.4f}")
    
    except Exception as e:
        print(f"   ❌ 搜尋失敗: {e}")
        import traceback
        traceback.print_exc()
    
    # 4. 檢查相似度分佈
    print("\n[4] 檢查所有向量的相似度分佈...")
    
    try:
        # 獲取所有點的相似度
        all_results = vector_store.search_similar(
            collection_name=test_collection,
            query_vector=query_embedding.vector,
            limit=100,
            score_threshold=0.0
        )
        
        if all_results:
            scores = [r['score'] for r in all_results]
            scores.sort(reverse=True)
            
            print(f"   總點數: {len(scores)}")
            print(f"   最高分: {scores[0]:.4f}")
            print(f"   最低分: {scores[-1]:.4f}")
            print(f"   平均分: {sum(scores)/len(scores):.4f}")
            
            print("\n   分數分佈:")
            print(f"     ≥0.9: {sum(1 for s in scores if s >= 0.9)}")
            print(f"     ≥0.8: {sum(1 for s in scores if s >= 0.8)}")
            print(f"     ≥0.7: {sum(1 for s in scores if s >= 0.7)}")
            print(f"     ≥0.6: {sum(1 for s in scores if s >= 0.6)}")
            print(f"     ≥0.5: {sum(1 for s in scores if s >= 0.5)}")
            print(f"     <0.5: {sum(1 for s in scores if s < 0.5)}")
    
    except Exception as e:
        print(f"   ❌ 相似度分析失敗: {e}")
    
    print("\n" + "="*60)
    print("診斷完成")
    print("="*60 + "\n")

if __name__ == "__main__":
    diagnose()
