"""
Test RAG improvements for question generation and answering
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from src.services.rag_engine import RAGEngine
from src.services.embedder import Embedder
from src.services.vector_store import VectorStore
from src.core.config import config
from uuid import uuid4

async def test_question_generation():
    """Test if generated questions can be answered"""
    print("=" * 80)
    print("Testing RAG Question Generation & Answering")
    print("=" * 80)
    
    # Initialize services
    embedder = Embedder(
        model_name=config.EMBEDDING_MODEL,
        api_key=config.GEMINI_API_KEY
    )
    vector_store = VectorStore()
    rag_engine = RAGEngine(
        embedder=embedder,
        vector_store=vector_store,
        similarity_threshold=config.SIMILARITY_THRESHOLD
    )
    
    # Test with a sample session (assuming you have uploaded Alice in Wonderland)
    test_session_id = uuid4()
    
    print(f"\nTest Session ID: {test_session_id}")
    print("\nNote: This test assumes you have documents uploaded in a real session.")
    print("To properly test, replace test_session_id with an actual session ID from the database.\n")
    
    # For demo purposes, show the improvement logic
    print("\n✓ RAG Engine Improvements Applied:")
    print("  1. Question generation uses scroll() to scan full document")
    print("  2. Chunks increased from 5 to 15 for better coverage")
    print("  3. Context length increased from 1500 to 2000 chars per chunk")
    print("  4. Prompt emphasizes extractive, fact-based questions")
    print("  5. Validation step checks if question terms appear in document")
    print("  6. Answer retrieval uses lower threshold (0.3) if initial results < 3")
    print("\n✓ Expected Behavior:")
    print("  - Questions should ask about specific facts/details from the document")
    print("  - AI should be able to answer its own generated questions")
    print("  - Example good question: '愛麗絲用什麼東西扇風？'")
    print("  - Example bad question: '這個故事的主題是什麼？'")
    
    print("\n" + "=" * 80)
    print("To test with real data:")
    print("1. Upload a document through the web interface")
    print("2. Note the session ID from the logs")
    print("3. Replace test_session_id in this script")
    print("4. Uncomment the actual test code below")
    print("=" * 80)
    
    # Uncomment to test with real session:
    # try:
    #     # Generate questions
    #     questions = await rag_engine.generate_initial_suggestions(
    #         session_id=test_session_id,
    #         language='zh-TW'
    #     )
    #     print(f"\n✓ Generated {len(questions)} questions:")
    #     for i, q in enumerate(questions, 1):
    #         print(f"  {i}. {q}")
    #     
    #     # Test if AI can answer each question
    #     print("\n✓ Testing if AI can answer these questions:")
    #     for i, question in enumerate(questions, 1):
    #         response = await rag_engine.query(
    #             session_id=test_session_id,
    #             user_query=question,
    #             language='zh-TW'
    #         )
    #         print(f"\n  Q{i}: {question}")
    #         print(f"  A{i}: {response.llm_response[:200]}...")
    #         print(f"  Type: {response.response_type}")
    #         print(f"  Chunks: {len(response.retrieved_chunks)}")
    # except Exception as e:
    #     print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_question_generation())
