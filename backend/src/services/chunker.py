"""
Text Chunker Service
Splits long text into smaller semantic chunks for vector embedding and RAG retrieval
"""
import logging
import re
from typing import List
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Chunking constants configuration
CHUNK_SIZE_CHARS = 2000      # Approx 512 tokens (~4 chars per token)
CHUNK_OVERLAP_CHARS = 500    # Approx 128 tokens overlap
MIN_CHUNK_LENGTH = 50        # Minimum chunk length (filter out too short chunks)


@dataclass
class TextChunk:
    """
    Text chunk data structure
    
    Attributes:
        text: The text content of the chunk
        chunk_index: The index of the chunk (starting from 0)
        char_count: Character count
        start_char: Start position in the original text (approximate)
    """
    text: str
    chunk_index: int
    char_count: int
    start_char: int = 0
    
    @property
    def estimated_tokens(self) -> int:
        """Estimate token count (rough estimate: 1 token ≈ 4 characters)"""
        return self.char_count // 4


class ChunkerError(Exception):
    """Error that occurs during the text chunking process"""
    pass


class TextChunker:
    """
    Text chunking service
    Uses recursive character splitting strategy for intelligent segmentation
    """
    
    def __init__(
        self,
        chunk_size: int = CHUNK_SIZE_CHARS,
        chunk_overlap: int = CHUNK_OVERLAP_CHARS
    ):
        """
        Initialize the chunker
        
        Args:
            chunk_size: Target size of each chunk (character count)
            chunk_overlap: Overlap size between chunks (character count)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Separator priority: paragraph > newline > period > space > character
        self.separators = ["\n\n", "\n", ". ", "。 ", "! ", "！ ", "? ", "？ ", " ", ""]
        
        logger.info(
            f"Text chunker initialized: chunk_size={chunk_size}, "
            f"overlap={chunk_overlap} (~{chunk_size//4} tokens per chunk)"
        )
    
    def _split_text_with_separator(self, text: str, separator: str) -> List[str]:
        """Split text using the specified separator"""
        if not separator:
            return list(text)
        
        parts = text.split(separator)
        # Preserve separator
        result = []
        for i, part in enumerate(parts):
            if i < len(parts) - 1:
                result.append(part + separator)
            else:
                result.append(part)
        return [p for p in result if p]
    
    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        """Recursively split text"""
        if not text:
            return []
        
        if not separators:
            # No more separators, split by character directly
            return [text[i:i+self.chunk_size] for i in range(0, len(text), self.chunk_size)]
        
        separator = separators[0]
        remaining_separators = separators[1:]
        
        # Split using current separator
        splits = self._split_text_with_separator(text, separator)
        
        # Merge small fragments
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
        
        # If fragments are still too large, continue splitting with next separator
        final_splits = []
        for split in merged_splits:
            if len(split) > self.chunk_size:
                final_splits.extend(self._recursive_split(split, remaining_separators))
            else:
                final_splits.append(split)
        
        return final_splits
    
    def _create_chunks_with_overlap(self, splits: List[str]) -> List[str]:
        """Add overlap to the split text"""
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
                # Add overlap: take text of overlap length from end of current chunk
                overlap_text = current_chunk[-self.chunk_overlap:] if len(current_chunk) > self.chunk_overlap else current_chunk
                current_chunk = overlap_text + split
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def chunk_text(self, text: str, source_reference: str = "unknown") -> List[TextChunk]:
        """
        Split text into semantic chunks
        
        Args:
            text: The text to split
            source_reference: Source reference (filename or URL) for logging
            
        Returns:
            List[TextChunk]: List of text chunks
            
        Raises:
            ChunkerError: If chunking fails
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
            
            # Use recursive splitting strategy
            splits = self._recursive_split(text, self.separators)
            raw_chunks = self._create_chunks_with_overlap(splits)
            
            # Filter out too short chunks and create TextChunk objects
            chunks = []
            cumulative_chars = 0
            
            for idx, chunk_text in enumerate(raw_chunks):
                chunk_text = chunk_text.strip()
                
                # Skip chunks that are too short
                if len(chunk_text) < MIN_CHUNK_LENGTH:
                    logger.debug(f"Skipping short chunk {idx}: {len(chunk_text)} chars")
                    continue
                
                chunk = TextChunk(
                    text=chunk_text,
                    chunk_index=len(chunks),  # Re-index (excluding skipped chunks)
                    char_count=len(chunk_text),
                    start_char=cumulative_chars
                )
                
                chunks.append(chunk)
                cumulative_chars += len(chunk_text)
                
                logger.debug(
                    f"Chunk {chunk.chunk_index}: {chunk.char_count} chars "
                    f"(~{chunk.estimated_tokens} tokens)"
                )
            
            # Validate results
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
        Get chunk statistics
        
        Args:
            chunks: List of text chunks
            
        Returns:
            dict: Statistics (chunk count, total characters, average size, etc.)
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


# Convenience function: quick chunking
def chunk_text(
    text: str,
    source_reference: str = "unknown",
    chunk_size: int = CHUNK_SIZE_CHARS,
    chunk_overlap: int = CHUNK_OVERLAP_CHARS
) -> List[TextChunk]:
    """
    Convenience function: quickly chunk text
    
    Args:
        text: The text to split
        source_reference: Source reference
        chunk_size: Chunk size (characters)
        chunk_overlap: Overlap size (characters)
        
    Returns:
        List[TextChunk]: List of text chunks
        
    Raises:
        ChunkerError: If chunking fails
    """
    chunker = TextChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return chunker.chunk_text(text, source_reference)
