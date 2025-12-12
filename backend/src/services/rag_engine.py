"""
RAG Engine Service
RAG 查詢引擎：向量搜尋、Prompt 建構、LLM 生成

Constitutional Compliance:
- Principle V (Strict RAG): 僅基於檢索內容回答，相似度閾值 ≥0.7
- Principle III (Gemini-Only): 使用 Gemini gemini-1.5-flash (per research.md)
"""

import logging
from dataclasses import dataclass
from typing import List, Optional
from uuid import UUID

import google.generativeai as genai

from ..core.config import settings
from ..services.vector_store import VectorStore
from ..services.embedder import Embedder

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    """檢索到的文字塊"""
    chunk_id: str
    text: str
    similarity_score: float
    document_id: str
    source_reference: str
    chunk_index: int


@dataclass
class RAGResponse:
    """RAG 回應結果"""
    llm_response: str
    response_type: str  # "ANSWERED" or "CANNOT_ANSWER"
    retrieved_chunks: List[RetrievedChunk]
    similarity_scores: List[float]
    token_input: int
    token_output: int
    token_total: int


class RAGEngine:
    """
    RAG 查詢引擎
    
    完整流程：
    1. 查詢嵌入 (Embedder)
    2. 向量搜尋 (VectorStore, similarity ≥ 0.7)
    3. Prompt 建構
    4. LLM 生成 (Gemini gemini-1.5-flash, temperature=0.1)
    5. "無法回答" 判斷
    """
    
    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        embedder: Optional[Embedder] = None,
        similarity_threshold: float = 0.7,
        max_chunks: int = 5,
        temperature: float = 0.1
    ):
        """
        初始化 RAG Engine
        
        Args:
            vector_store: 向量儲存服務
            embedder: 嵌入服務
            similarity_threshold: 相似度閾值（憲法 Principle V: ≥0.7）
            max_chunks: 最大檢索塊數
            temperature: LLM 溫度（research.md 建議 0.1）
        """
        self.vector_store = vector_store or VectorStore()
        self.embedder = embedder or Embedder()
        self.similarity_threshold = similarity_threshold
        self.max_chunks = max_chunks
        self.temperature = temperature
        
        # 配置 Gemini API
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        logger.info(
            f"RAG Engine initialized: threshold={similarity_threshold}, "
            f"max_chunks={max_chunks}, temperature={temperature}"
        )
    
    def query(
        self,
        session_id: UUID,
        user_query: str
    ) -> RAGResponse:
        """
        執行 RAG 查詢
        
        Args:
            session_id: Session ID
            user_query: 使用者查詢
        
        Returns:
            RAGResponse: RAG 回應結果
        
        Raises:
            ValueError: 當查詢為空時
            Exception: 當 RAG 處理失敗時
        """
        if not user_query or not user_query.strip():
            raise ValueError("Query cannot be empty")
        
        logger.info(f"[{session_id}] RAG query: {user_query[:100]}")
        
        try:
            # Step 1: 查詢嵌入
            logger.debug(f"[{session_id}] Embedding query...")
            query_embedding = self.embedder.embed_query(user_query)
            
            # Step 2: 向量搜尋
            logger.debug(f"[{session_id}] Searching similar chunks...")
            # Remove hyphens from session_id for valid Qdrant collection name
            clean_session_id = str(session_id).replace("-", "")
            collection_name = f"session_{clean_session_id}"
            
            search_results = self.vector_store.search_similar(
                collection_name=collection_name,
                query_vector=query_embedding.vector,
                limit=self.max_chunks,
                score_threshold=self.similarity_threshold
            )
            
            # 轉換為 RetrievedChunk
            retrieved_chunks = []
            similarity_scores = []
            
            for result in search_results:
                chunk = RetrievedChunk(
                    chunk_id=result['id'],
                    text=result['payload'].get('text', ''),
                    similarity_score=result['score'],
                    document_id=result['payload'].get('document_id', ''),
                    source_reference=result['payload'].get('source_reference', ''),
                    chunk_index=result['payload'].get('chunk_index', 0)
                )
                retrieved_chunks.append(chunk)
                similarity_scores.append(result['score'])
            
            logger.info(
                f"[{session_id}] Retrieved {len(retrieved_chunks)} chunks "
                f"(scores: {[f'{s:.3f}' for s in similarity_scores]})"
            )
            
            # Step 3: 判斷是否有足夠內容回答
            if not retrieved_chunks:
                logger.warning(f"[{session_id}] No chunks found above threshold")
                return RAGResponse(
                    llm_response=self._get_cannot_answer_message(),
                    response_type="CANNOT_ANSWER",
                    retrieved_chunks=[],
                    similarity_scores=[],
                    token_input=0,
                    token_output=0,
                    token_total=0
                )
            
            # Step 4: 建構 Prompt
            prompt = self._build_prompt(user_query, retrieved_chunks)
            
            # Step 5: LLM 生成
            logger.debug(f"[{session_id}] Generating LLM response...")
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=2048,
                )
            )
            
            llm_response = response.text
            
            # 提取 token 使用量
            token_input = response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0
            token_output = response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0
            token_total = token_input + token_output
            
            logger.info(
                f"[{session_id}] LLM response generated "
                f"(tokens: {token_input} + {token_output} = {token_total})"
            )
            
            return RAGResponse(
                llm_response=llm_response,
                response_type="ANSWERED",
                retrieved_chunks=retrieved_chunks,
                similarity_scores=similarity_scores,
                token_input=token_input,
                token_output=token_output,
                token_total=token_total
            )
        
        except Exception as e:
            logger.error(f"[{session_id}] RAG query failed: {str(e)}", exc_info=True)
            raise
    
    def _build_prompt(
        self,
        user_query: str,
        retrieved_chunks: List[RetrievedChunk]
    ) -> str:
        """
        建構 RAG Prompt
        
        憲法 Principle V: 嚴格基於檢索內容回答
        
        Args:
            user_query: 使用者查詢
            retrieved_chunks: 檢索到的文字塊
        
        Returns:
            str: 完整 Prompt
        """
        # 組合檢索內容
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            context_parts.append(
                f"[Document {i}] (Similarity: {chunk.similarity_score:.3f})\n"
                f"Source: {chunk.source_reference}\n"
                f"Content: {chunk.text}\n"
            )
        
        context = "\n---\n".join(context_parts)
        
        # 建構 Prompt（遵循 Strict RAG 原則）
        prompt = f"""You are a helpful assistant that answers questions based STRICTLY on the provided documents.

**IMPORTANT RULES**:
1. ONLY use information from the documents provided below
2. If the answer is not in the documents, respond with: "I cannot answer this question based on the uploaded documents."
3. Do NOT use external knowledge or make assumptions
4. Cite the document number when providing answers
5. Be concise and accurate

**Retrieved Documents**:
{context}

**User Question**:
{user_query}

**Your Answer** (based ONLY on the documents above):"""
        
        return prompt
    
    def _get_cannot_answer_message(self) -> str:
        """
        取得「無法回答」訊息
        
        Returns:
            str: 標準「無法回答」訊息
        """
        return "I cannot answer this question based on the uploaded documents."


class RAGError(Exception):
    """RAG 處理錯誤"""
    pass


# 全域單例
_rag_engine: Optional[RAGEngine] = None


def get_rag_engine() -> RAGEngine:
    """
    取得 RAG Engine 單例
    
    Returns:
        RAGEngine: RAG 引擎實例
    """
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine()
    return _rag_engine
