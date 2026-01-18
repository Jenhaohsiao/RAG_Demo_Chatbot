"""
Embedder Service - Gemini Embedding API Integration

Converts text to vector embeddings for vector database storage and similarity search.

Constitutional Compliance:
- Principle I (MVP-First): Direct call to Gemini API, no over-abstraction
- Principle II (Testability): Independent service class, API can be mocked for testing
- Principle VII (Fixed Tech Stack): Uses only Gemini API
"""

import logging
from typing import List, Optional
from dataclasses import dataclass
import google.generativeai as genai

from ..core.config import settings

# Set up logging
logger = logging.getLogger(__name__)


@dataclass
class EmbeddingResult:
    """嵌入結果資料類別"""
    vector: List[float]
    dimension: int
    source_text: str
    model: str = "text-embedding-004"


class EmbeddingError(Exception):
    """嵌入處理錯誤"""
    pass


class Embedder:
    """
    文字嵌入服務
    
    使用 Google Gemini text-embedding-004 模型將文字轉換為 768 維向量。
    支援批次處理以提升效能。
    
    Attributes:
        model_name: Gemini 嵌入模型名稱
        dimension: 向量維度 (768)
        task_type: 嵌入任務類型（檢索文件或檢索查詢）
    
    Constitutional Alignment:
        - Principle VII: 僅使用 Gemini API，無其他嵌入服務
        - research.md Decision: text-embedding-004 模型，768 維度
    """
    
    def __init__(self):
        """初始化 Embedder 服務"""
        # 模型設定
        self.model_name = "models/text-embedding-004"
        self.dimension = 768
        
        logger.info(f"Embedder initialized with model: {self.model_name}")

    def _configure_api_key(self, api_key: Optional[str]) -> str:
        """設定當前請求要使用的 API key"""
        effective_key = api_key or settings.gemini_api_key
        if not effective_key:
            raise EmbeddingError("Gemini API key is missing")
        genai.configure(api_key=effective_key)
        return effective_key
    
    def embed_text(
        self, 
        text: str, 
        task_type: str = "retrieval_document",
        source_reference: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> EmbeddingResult:
        """
        將單一文字轉換為嵌入向量
        
        Args:
            text: 要嵌入的文字內容
            task_type: 任務類型
                - "retrieval_document": 用於儲存的文件嵌入（預設）
                - "retrieval_query": 用於搜尋的查詢嵌入
            source_reference: 來源參考（用於日誌記錄）
        
        Returns:
            EmbeddingResult: 包含向量、維度、來源文字的結果物件
        
        Raises:
            EmbeddingError: 嵌入處理失敗時拋出
        
        Example:
            >>> embedder = Embedder()
            >>> result = embedder.embed_text("Machine learning is fun", task_type="retrieval_document")
            >>> len(result.vector)
            768
        """
        if not text or not text.strip():
            raise EmbeddingError("Cannot embed empty text")
        
        try:
            effective_key = self._configure_api_key(api_key)
            # 記錄嵌入請求
            text_preview = text[:100] + "..." if len(text) > 100 else text
            source_info = f" from {source_reference}" if source_reference else ""
            logger.info(
                f"Embedding text{source_info}: '{text_preview}' "
                f"(length: {len(text)} chars, task_type: {task_type})"
            )
            
            # 調用 Gemini Embedding API
            result = genai.embed_content(
                model=self.model_name,
                content=text,
                task_type=task_type
            )
            
            # 提取嵌入向量
            embedding_vector = result['embedding']
            
            # 驗證向量維度
            if len(embedding_vector) != self.dimension:
                raise EmbeddingError(
                    f"Unexpected embedding dimension: {len(embedding_vector)}, "
                    f"expected {self.dimension}"
                )
            
            logger.info(
                f"Successfully embedded text{source_info}: "
                f"vector dimension {len(embedding_vector)}"
            )
            
            return EmbeddingResult(
                vector=embedding_vector,
                dimension=len(embedding_vector),
                source_text=text[:500],  # 儲存前 500 字元作為參考
                model=self.model_name
            )
        
        except Exception as e:
            error_msg = f"Failed to embed text{source_info}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise EmbeddingError(error_msg) from e
        finally:
            # 如果使用者提供 key，使用完後恢復預設 key（若存在）
            if api_key and settings.gemini_api_key and api_key != settings.gemini_api_key:
                try:
                    genai.configure(api_key=settings.gemini_api_key)
                except Exception:
                    logger.debug("Failed to reset Gemini API key after override")
    
    def embed_query(self, query: str, api_key: Optional[str] = None) -> EmbeddingResult:
        """
        為查詢文字生成嵌入向量（便捷方法）
        
        自動使用 "retrieval_query" 任務類型，優化查詢向量生成。
        
        Args:
            query: 使用者查詢文字
        
        Returns:
            EmbeddingResult: 查詢嵌入結果
        
        Raises:
            EmbeddingError: 嵌入處理失敗時拋出
        
        Example:
            >>> embedder = Embedder()
            >>> result = embedder.embed_query("What is machine learning?")
            >>> len(result.vector)
            768
        """
        return self.embed_text(
            text=query,
            task_type="retrieval_query",
            source_reference="user_query",
            api_key=api_key
        )
    
    def embed_batch(
        self, 
        texts: List[str], 
        task_type: str = "retrieval_document",
        source_reference: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> List[EmbeddingResult]:
        """
        批次嵌入多個文字（提升效能）
        
        Args:
            texts: 文字清單
            task_type: 任務類型（預設為 retrieval_document）
            source_reference: 來源參考（用於日誌）
        
        Returns:
            List[EmbeddingResult]: 嵌入結果清單
        
        Raises:
            EmbeddingError: 任何文字嵌入失敗時拋出
        
        Note:
            目前實作為循序處理，未來可優化為並行 API 調用。
            Gemini API 目前不支援原生批次嵌入。
        
        Example:
            >>> embedder = Embedder()
            >>> texts = ["First chunk", "Second chunk", "Third chunk"]
            >>> results = embedder.embed_batch(texts)
            >>> len(results)
            3
        """
        if not texts:
            raise EmbeddingError("Cannot embed empty text list")
        
        logger.info(
            f"Starting batch embedding: {len(texts)} texts "
            f"(task_type: {task_type})"
        )
        
        results = []
        failed_count = 0
        
        for idx, text in enumerate(texts, 1):
            try:
                # 為每個文字加上索引資訊
                ref = f"{source_reference}[{idx}/{len(texts)}]" if source_reference else f"chunk_{idx}"
                result = self.embed_text(
                    text=text,
                    task_type=task_type,
                    source_reference=ref,
                    api_key=api_key
                )
                results.append(result)
            except EmbeddingError as e:
                failed_count += 1
                logger.warning(f"Failed to embed text {idx}/{len(texts)}: {str(e)}")
                # 根據錯誤策略決定是否繼續或拋出異常
                # 目前策略：記錄錯誤但不中斷批次處理
                # 若需嚴格模式，可取消註解下行
                # raise
        
        if failed_count > 0:
            logger.warning(
                f"Batch embedding completed with {failed_count} failures. "
                f"Successfully embedded: {len(results)}/{len(texts)}"
            )
        else:
            logger.info(
                f"Batch embedding completed successfully: "
                f"{len(results)}/{len(texts)} texts embedded"
            )
        
        return results
    
    def get_embedding_dimension(self) -> int:
        """
        取得嵌入向量維度
        
        Returns:
            int: 向量維度 (768)
        """
        return self.dimension
    
    def get_model_info(self) -> dict:
        """
        取得模型資訊
        
        Returns:
            dict: 模型名稱與維度資訊
        """
        return {
            "model": self.model_name,
            "dimension": self.dimension,
            "supported_task_types": ["retrieval_document", "retrieval_query"]
        }


# 單例模式：全域 embedder 實例
_embedder_instance: Optional[Embedder] = None


def get_embedder() -> Embedder:
    """
    取得全域 Embedder 實例（單例模式）
    
    Returns:
        Embedder: 全域嵌入服務實例
    
    Example:
        >>> from services.embedder import get_embedder
        >>> embedder = get_embedder()
        >>> result = embedder.embed_text("Hello world")
    """
    global _embedder_instance
    if _embedder_instance is None:
        _embedder_instance = Embedder()
    return _embedder_instance
