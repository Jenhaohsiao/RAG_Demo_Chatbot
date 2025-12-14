"""
RAG Engine Service
RAG 查詢引擎：向量搜尋、Prompt 建構、LLM 生成、Metrics 追蹤

Constitutional Compliance:
- Principle V (Strict RAG): 僅基於檢索內容回答，相似度閾值 ≥0.7
- Principle III (Gemini-Only): 使用 Gemini 模型 (gemini-1.5-pro - cost-efficient)
"""

import logging
from dataclasses import dataclass, field
from typing import List, Optional
from uuid import UUID
from collections import deque

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
class SessionMetrics:
    """Session 指標"""
    total_queries: int = 0
    total_tokens: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    avg_tokens_per_query: float = 0.0
    total_documents: int = 0
    avg_chunks_retrieved: float = 0.0
    unanswered_ratio: float = 0.0


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
    metrics: Optional[SessionMetrics] = None


class RAGEngine:
    """
    RAG 查詢引擎
    
    完整流程：
    1. 查詢嵌入 (Embedder)
    2. 向量搜尋 (VectorStore, similarity ≥ 0.7)
    3. Prompt 建構
    4. LLM 生成 (Gemini gemini-1.5-flash, temperature=0.1)
    5. "無法回答" 判斷
    6. Metrics 計算與 Memory 管理
    """
    
    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        embedder: Optional[Embedder] = None,
        similarity_threshold: float = 0.7,
        max_chunks: int = 5,
        temperature: float = 0.1,
        memory_limit: int = 100,  # 最多保留 100 個查詢
        token_threshold: int = 10000  # 10000 token 時發出警告
    ):
        """
        初始化 RAG Engine
        
        Args:
            vector_store: 向量儲存服務
            embedder: 嵌入服務
            similarity_threshold: 相似度閾值（憲法 Principle V: ≥0.7）
            max_chunks: 最大檢索塊數
            temperature: LLM 溫度（research.md 建議 0.1）
            memory_limit: 滑動視窗記憶體限制（查詢數）
            token_threshold: Token 警告閾值
        """
        self.vector_store = vector_store or VectorStore()
        self.embedder = embedder or Embedder()
        self.similarity_threshold = similarity_threshold
        self.max_chunks = max_chunks
        self.temperature = temperature
        self.memory_limit = memory_limit
        self.token_threshold = token_threshold
        
        # Session 指標追蹤
        self._session_metrics: dict[UUID, SessionMetrics] = {}
        
        # Session 記憶體管理（滑動視窗）
        self._session_memory: dict[UUID, deque] = {}
        
        # 配置 Gemini API
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel(settings.gemini_model)
        
        logger.info(
            f"RAG Engine initialized: model={settings.gemini_model}, threshold={similarity_threshold}, "
            f"max_chunks={max_chunks}, temperature={temperature}, "
            f"memory_limit={memory_limit}, token_threshold={token_threshold}"
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
                    chunk_id=str(result['id']),  # 轉換為字符串（Qdrant 返回整數 ID）
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
                
                # 更新 metrics（無法回答）
                metrics = self._calculate_metrics(
                    session_id, 0, 0, 0, 
                    response_type="CANNOT_ANSWER"
                )
                self._update_memory(session_id, user_query, "CANNOT_ANSWER", 0)
                
                return RAGResponse(
                    llm_response=self._get_cannot_answer_message(),
                    response_type="CANNOT_ANSWER",
                    retrieved_chunks=[],
                    similarity_scores=[],
                    token_input=0,
                    token_output=0,
                    token_total=0,
                    metrics=metrics
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
            
            # 更新記憶體和 metrics
            self._update_memory(session_id, user_query, "ANSWERED", token_total)
            metrics = self._calculate_metrics(
                session_id, token_input, token_output, 
                len(retrieved_chunks), response_type="ANSWERED"
            )
            
            return RAGResponse(
                llm_response=llm_response,
                response_type="ANSWERED",
                retrieved_chunks=retrieved_chunks,
                similarity_scores=similarity_scores,
                token_input=token_input,
                token_output=token_output,
                token_total=token_total,
                metrics=metrics
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
    
    def _calculate_metrics(
        self,
        session_id: UUID,
        token_input: int,
        token_output: int,
        chunks_retrieved: int,
        response_type: str = "ANSWERED"
    ) -> SessionMetrics:
        """
        計算並更新 Session 指標
        
        Args:
            session_id: Session ID
            token_input: 輸入 token 數
            token_output: 輸出 token 數
            chunks_retrieved: 檢索到的塊數
            response_type: 回應類型（ANSWERED 或 CANNOT_ANSWER）
        
        Returns:
            SessionMetrics: 更新後的 Session 指標
        """
        token_total = token_input + token_output
        
        # 初始化或獲取 metrics
        if session_id not in self._session_metrics:
            self._session_metrics[session_id] = SessionMetrics()
        
        metrics = self._session_metrics[session_id]
        
        # 更新指標
        metrics.total_queries += 1
        metrics.total_tokens += token_total
        metrics.total_input_tokens += token_input
        metrics.total_output_tokens += token_output
        metrics.avg_tokens_per_query = metrics.total_tokens / metrics.total_queries
        metrics.avg_chunks_retrieved = (
            (metrics.avg_chunks_retrieved * (metrics.total_queries - 1) + chunks_retrieved) 
            / metrics.total_queries
        )
        
        # 記錄「無法回答」比率
        if response_type == "CANNOT_ANSWER":
            unanswered_count = sum(
                1 for q in self._session_memory.get(session_id, [])
                if q.get('type') == 'CANNOT_ANSWER'
            ) + 1
            metrics.unanswered_ratio = unanswered_count / metrics.total_queries
        
        logger.info(
            f"[{session_id}] Metrics updated: "
            f"queries={metrics.total_queries}, "
            f"tokens={metrics.total_tokens}, "
            f"avg_per_query={metrics.avg_tokens_per_query:.1f}, "
            f"unanswered={metrics.unanswered_ratio:.1%}"
        )
        
        # 檢查 token 使用是否超過閾值
        if metrics.total_tokens >= self.token_threshold:
            logger.warning(
                f"[{session_id}] Token usage WARNING: "
                f"{metrics.total_tokens} >= {self.token_threshold}"
            )
        
        return metrics
    
    def _update_memory(
        self,
        session_id: UUID,
        user_query: str,
        response_type: str,
        token_total: int
    ) -> None:
        """
        更新 Session 記憶體（滑動視窗）
        
        Args:
            session_id: Session ID
            user_query: 使用者查詢
            response_type: 回應類型
            token_total: 總 token 數
        """
        # 初始化或獲取記憶體
        if session_id not in self._session_memory:
            self._session_memory[session_id] = deque(maxlen=self.memory_limit)
        
        memory = self._session_memory[session_id]
        
        # 新增查詢記錄
        memory.append({
            'query': user_query[:100],  # 只保留前 100 字元
            'type': response_type,
            'tokens': token_total
        })
        
        logger.debug(
            f"[{session_id}] Memory updated: "
            f"{len(memory)}/{self.memory_limit} queries in window"
        )
    
    def get_session_metrics(self, session_id: UUID) -> Optional[dict]:
        """
        取得 Session 指標
        
        Args:
            session_id: Session ID
        
        Returns:
            dict: Session 指標字典，若無則回傳 None
        """
        metrics = self._session_metrics.get(session_id)
        if metrics is None:
            return None
        
        # 轉換為字典便於 API 回應
        return {
            'total_queries': metrics.total_queries,
            'total_tokens': metrics.total_tokens,
            'total_input_tokens': metrics.total_input_tokens,
            'total_output_tokens': metrics.total_output_tokens,
            'avg_tokens_per_query': metrics.avg_tokens_per_query,
            'total_documents': metrics.total_documents,
            'avg_chunks_retrieved': metrics.avg_chunks_retrieved,
            'unanswered_ratio': metrics.unanswered_ratio,
        }
    
    def clear_session(self, session_id: UUID) -> None:
        """
        清除 Session 的指標和記憶體
        
        Args:
            session_id: Session ID
        """
        if session_id in self._session_metrics:
            del self._session_metrics[session_id]
        
        if session_id in self._session_memory:
            del self._session_memory[session_id]
        
        logger.info(f"[{session_id}] Session metrics and memory cleared")


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
