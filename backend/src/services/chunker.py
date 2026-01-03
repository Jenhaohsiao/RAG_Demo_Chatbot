"""
Text Chunker Service
將長文本分割成較小的語意塊，用於向量嵌入和 RAG 檢索
"""
import logging
import re
from typing import List
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# 分塊常數配置
CHUNK_SIZE_CHARS = 2000      # 約 512 tokens (~4 chars per token)
CHUNK_OVERLAP_CHARS = 500    # 約 128 tokens 重疊
MIN_CHUNK_LENGTH = 50        # 最小塊長度（過濾掉過短的塊）


@dataclass
class TextChunk:
    """
    文本塊資料結構
    
    Attributes:
        text: 塊的文本內容
        chunk_index: 塊的索引（從 0 開始）
        char_count: 字元數
        start_char: 在原始文本中的起始位置（近似）
    """
    text: str
    chunk_index: int
    char_count: int
    start_char: int = 0
    
    @property
    def estimated_tokens(self) -> int:
        """估算 token 數量（粗略估計：1 token ≈ 4 字元）"""
        return self.char_count // 4


class ChunkerError(Exception):
    """文本分塊過程中發生的錯誤"""
    pass


class TextChunker:
    """
    文本分塊服務
    使用遞歸字元分割策略進行智能分割
    """
    
    def __init__(
        self,
        chunk_size: int = CHUNK_SIZE_CHARS,
        chunk_overlap: int = CHUNK_OVERLAP_CHARS
    ):
        """
        初始化分塊器
        
        Args:
            chunk_size: 每個塊的目標大小（字元數）
            chunk_overlap: 塊之間的重疊大小（字元數）
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # 分隔符優先順序：段落 > 換行 > 句號 > 空格 > 字元
        self.separators = ["\n\n", "\n", ". ", "。 ", "! ", "！ ", "? ", "？ ", " ", ""]
        
        logger.info(
            f"Text chunker initialized: chunk_size={chunk_size}, "
            f"overlap={chunk_overlap} (~{chunk_size//4} tokens per chunk)"
        )
    
    def _split_text_with_separator(self, text: str, separator: str) -> List[str]:
        """使用指定分隔符分割文本"""
        if not separator:
            return list(text)
        
        parts = text.split(separator)
        # 保留分隔符
        result = []
        for i, part in enumerate(parts):
            if i < len(parts) - 1:
                result.append(part + separator)
            else:
                result.append(part)
        return [p for p in result if p]
    
    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        """遞歸分割文本"""
        if not text:
            return []
        
        if not separators:
            # 沒有分隔符了，直接按字元分割
            return [text[i:i+self.chunk_size] for i in range(0, len(text), self.chunk_size)]
        
        separator = separators[0]
        remaining_separators = separators[1:]
        
        # 使用當前分隔符分割
        splits = self._split_text_with_separator(text, separator)
        
        # 合併小片段
        merged_splits = []
        current = ""
        
        for split in splits:
            if len(current) + len(split) <= self.chunk_size:
                current += split
            else:
                if current:
                    merged_splits.append(current)
                current = split
        
        if current:
            merged_splits.append(current)
        
        # 如果有片段還是太大，用下一個分隔符繼續分割
        final_splits = []
        for split in merged_splits:
            if len(split) > self.chunk_size:
                final_splits.extend(self._recursive_split(split, remaining_separators))
            else:
                final_splits.append(split)
        
        return final_splits
    
    def _create_chunks_with_overlap(self, splits: List[str]) -> List[str]:
        """為分割後的文本添加重疊"""
        if not splits:
            return []
        
        chunks = []
        current_chunk = ""
        
        for i, split in enumerate(splits):
            if not current_chunk:
                current_chunk = split
            elif len(current_chunk) + len(split) <= self.chunk_size:
                current_chunk += split
            else:
                chunks.append(current_chunk)
                # 添加重疊：從當前塊末尾取 overlap 長度的文本
                overlap_text = current_chunk[-self.chunk_overlap:] if len(current_chunk) > self.chunk_overlap else current_chunk
                current_chunk = overlap_text + split
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def chunk_text(self, text: str, source_reference: str = "unknown") -> List[TextChunk]:
        """
        將文本分割成語意塊
        
        Args:
            text: 要分割的文本
            source_reference: 來源參考（檔案名稱或 URL）用於日誌記錄
            
        Returns:
            List[TextChunk]: 文本塊列表
            
        Raises:
            ChunkerError: 如果分塊失敗
        """
        if not text or not text.strip():
            logger.warning(f"Empty text provided for chunking from '{source_reference}'")
            return []
        
        try:
            text = text.strip()
            logger.info(
                f"Chunking text from '{source_reference}' "
                f"({len(text)} chars, ~{len(text)//4} tokens)"
            )
            
            # 使用遞歸分割策略
            splits = self._recursive_split(text, self.separators)
            raw_chunks = self._create_chunks_with_overlap(splits)
            
            # 過濾掉過短的塊並創建 TextChunk 物件
            chunks = []
            cumulative_chars = 0
            
            for idx, chunk_text in enumerate(raw_chunks):
                chunk_text = chunk_text.strip()
                
                # 跳過過短的塊
                if len(chunk_text) < MIN_CHUNK_LENGTH:
                    logger.debug(f"Skipping short chunk {idx}: {len(chunk_text)} chars")
                    continue
                
                chunk = TextChunk(
                    text=chunk_text,
                    chunk_index=len(chunks),  # 重新索引（排除跳過的塊）
                    char_count=len(chunk_text),
                    start_char=cumulative_chars
                )
                
                chunks.append(chunk)
                cumulative_chars += len(chunk_text)
                
                logger.debug(
                    f"Chunk {chunk.chunk_index}: {chunk.char_count} chars "
                    f"(~{chunk.estimated_tokens} tokens)"
                )
            
            # 驗證結果
            if not chunks:
                logger.warning(
                    f"No valid chunks generated from '{source_reference}' "
                    f"(original text: {len(text)} chars)"
                )
                return []
            
            total_chars = sum(c.char_count for c in chunks)
            avg_chunk_size = total_chars // len(chunks)
            
            logger.info(
                f"Chunking complete for '{source_reference}': "
                f"{len(chunks)} chunks, avg {avg_chunk_size} chars/chunk "
                f"(~{avg_chunk_size//4} tokens/chunk)"
            )
            
            return chunks
            
        except Exception as e:
            logger.error(f"Text chunking failed for '{source_reference}': {e}")
            raise ChunkerError(f"Failed to chunk text: {str(e)}")
    
    def get_chunk_statistics(self, chunks: List[TextChunk]) -> dict:
        """
        獲取分塊統計資訊
        
        Args:
            chunks: 文本塊列表
            
        Returns:
            dict: 統計資訊（塊數、總字元數、平均大小等）
        """
        if not chunks:
            return {
                "chunk_count": 0,
                "total_chars": 0,
                "avg_chunk_size": 0,
                "min_chunk_size": 0,
                "max_chunk_size": 0,
                "estimated_total_tokens": 0
            }
        
        char_counts = [c.char_count for c in chunks]
        
        return {
            "chunk_count": len(chunks),
            "total_chars": sum(char_counts),
            "avg_chunk_size": sum(char_counts) // len(chunks),
            "min_chunk_size": min(char_counts),
            "max_chunk_size": max(char_counts),
            "estimated_total_tokens": sum(c.estimated_tokens for c in chunks)
        }


# 便利函數：快速分塊
def chunk_text(
    text: str,
    source_reference: str = "unknown",
    chunk_size: int = CHUNK_SIZE_CHARS,
    chunk_overlap: int = CHUNK_OVERLAP_CHARS
) -> List[TextChunk]:
    """
    便利函數：快速分塊文本
    
    Args:
        text: 要分割的文本
        source_reference: 來源參考
        chunk_size: 塊大小（字元）
        chunk_overlap: 重疊大小（字元）
        
    Returns:
        List[TextChunk]: 文本塊列表
        
    Raises:
        ChunkerError: 如果分塊失敗
    """
    chunker = TextChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return chunker.chunk_text(text, source_reference)
