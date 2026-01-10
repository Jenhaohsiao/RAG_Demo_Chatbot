#!/usr/bin/env python3
"""
Diagnostic script for RAG retrieval issue
Tests vector search and provides debug information
"""
import sys
sys.path.append('/app')

from src.services.vector_store import VectorStore
from src.services.embedder import Embedder

# Initialize services
vs = VectorStore()
embedder = Embedder()

# Target collection
collection_name = "session_a92e3706612d4324a39052d9fb363cf4"

# Get collection info
info = vs.get_collection_info(collection_name)
print(f"Collection: {collection_name}")
print(f"Points count: {info['points_count'] if info else 'N/A'}")
print(f"Vectors count: {info['vectors_count'] if info else 'N/A'}")
print()

# Test queries
test_queries = [
    "愛麗絲到了法語和音樂之外，還學了什麼？",
    "Alice",
    "什麼"
]

for query in test_queries:
    print(f"Query: {query}")
    
    # Generate embedding
    embedding_result = embedder.embed_query(query)
    print(f"  Embedding generated: {len(embedding_result.vector)} dimensions")
    
    # Try different thresholds
    for threshold in [0.0, 0.3, 0.5, 0.7]:
        results = vs.search_similar(
            collection_name=collection_name,
            query_vector=embedding_result.vector,
            limit=5,
            score_threshold=threshold
        )
        scores = [r['score'] for r in results]
        print(f"  Threshold {threshold}: {len(results)} results, scores: {scores[:3]}")
    print()

print("Diagnosis complete!")
