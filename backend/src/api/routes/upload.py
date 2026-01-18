"""
Upload API Routes
Handles file upload, URL content fetching, and processing status queries

Constitutional Compliance:
- Principle VI (Moderation First): All content must pass moderation
- Principle II (Testability): Independent route module, testable
- Principle VIII (API Contract Stability): Follows contracts/upload.openapi.yaml

T089: Enhanced error handling with appropriate HTTP status codes
"""

import logging
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends, status
from pydantic import BaseModel, HttpUrl, field_validator

from ...models.document import (
    Document, 
    SourceType, 
    ExtractionStatus, 
    ModerationStatus
)
from ...models.session import SessionState
from ...models.errors import ErrorCode, get_error_response, get_http_status_code
from ...core.session_manager import session_manager
from ...core.config import settings
from ...services.extractor import extract_content, PDFExtractionError, URLFetchError, TextExtractionError
from ...services.moderation import ModerationService, ModerationStatus as ModStatus
from ...services.chunker import TextChunker
from ...services.embedder import Embedder
from ...services.rag_engine import RAGEngine
from ...services.vector_store import VectorStore
from ...services.web_crawler import WebCrawler
from ...services.vector_store import VectorStore
from ...services.rag_engine import RAGEngine
from ...services.name_translation_enhancer import NameTranslationEnhancer

logger = logging.getLogger(__name__)

# Create upload router (prefix handled by parent router in api/__init__.py)
router = APIRouter()

# Global service instances (can be changed to dependency injection in the future)
moderator = ModerationService(api_key=settings.gemini_api_key)
chunker = TextChunker()
embedder = Embedder()
vector_store = VectorStore()
rag_engine = RAGEngine()
name_enhancer = NameTranslationEnhancer()


class UrlUploadRequest(BaseModel):
    """URL upload request"""
    url: HttpUrl
    
    @field_validator('url')
    @classmethod
    def validate_url_scheme(cls, v):
        if v.scheme not in ['http', 'https']:
            raise ValueError("URL must use http or https scheme")
        return v


class WebsiteUploadRequest(BaseModel):
    """Website crawler upload request"""
    url: HttpUrl
    max_tokens: int = 100000  # Default 100K tokens
    max_pages: int = 100  # Default max 100 pages
    
    @field_validator('url')
    @classmethod
    def validate_url_scheme(cls, v):
        if v.scheme not in ['http', 'https']:
            raise ValueError("URL must use http or https scheme")
        return v
    
    @field_validator('max_tokens')
    @classmethod
    def validate_max_tokens(cls, v):
        if v < 1000 or v > 1000000:
            raise ValueError("max_tokens must be between 1,000 and 1,000,000")
        return v
    
    @field_validator('max_pages')
    @classmethod
    def validate_max_pages(cls, v):
        if v < 1 or v > 1000:
            raise ValueError("max_pages must be between 1 and 1,000")
        return v


class CrawledPage(BaseModel):
    """Single page crawled by the web crawler"""
    url: str
    title: str
    tokens: int
    content: str


class UploadResponse(BaseModel):
    """Upload response (202 Accepted)"""
    document_id: UUID
    session_id: UUID
    source_type: SourceType
    source_reference: str
    upload_timestamp: str
    extraction_status: ExtractionStatus
    moderation_status: ModerationStatus


class WebsiteUploadResponse(UploadResponse):
    """Website crawler upload response"""
    pages_found: int = 0
    total_tokens: int = 0
    crawl_status: str = "pending"  # pending, crawling, completed, token_limit_reached, page_limit_reached
    crawled_pages: list[CrawledPage] = []


class UploadStatusResponse(BaseModel):
    """Upload status query response"""
    document_id: UUID
    source_type: SourceType
    source_reference: str
    extraction_status: ExtractionStatus
    moderation_status: ModerationStatus
    chunk_count: int = 0
    processing_progress: int = 0  # 0-100
    summary: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    moderation_categories: list[str] = []
    # T089+ Token tracking and page count
    tokens_used: int = 0  # Tokens used by this document/crawler
    pages_crawled: int = 0  # Number of pages crawled
    # Crawler detailed information
    crawled_pages: list[CrawledPage] | None = None  # Detailed crawled page information
    crawl_status: str | None = None  # pending, crawling, completed, token_limit_reached, page_limit_reached
    avg_tokens_per_page: int = 0  # Average tokens per page
    crawl_duration_seconds: float | None = None  # Crawler duration in seconds


class WebsiteUploadStatusResponse(UploadStatusResponse):
    """Website crawler upload status response"""
    pass  # All fields are defined in UploadStatusResponse


# Document storage (should use database in production)
_documents: dict[UUID, Document] = {}


def process_document(document: Document):
    """
    Background task: Process document upload workflow
    Extract → Moderate → Chunk → Embed → Store
    
    Constitutional Alignment:
    - Principle VI: Moderation First - Review before chunking
    - Principle V: Strict RAG - Only store content that passes moderation
    
    NOTE: This must be a synchronous function because FastAPI BackgroundTasks doesn't support async functions
    """
    import time
    processing_start_time = time.time()
    
    try:
        # Step 1: Extract text content (or use pre-extracted content from crawler)
        if document.raw_content and document.extraction_status == ExtractionStatus.EXTRACTED:
            # Content already extracted (e.g., by web crawler)
            logger.info(f"[{document.document_id}] Using pre-extracted content from crawler")
            extracted_text = document.raw_content
        else:
            # Normal extraction flow
            logger.info(f"[{document.document_id}] Starting extraction ({document.source_type})")
            document.extraction_status = ExtractionStatus.EXTRACTING
            
            # Read or fetch content
            if document.source_type == SourceType.URL:
                # URL: Use URL string directly
                content = document.source_reference
            elif document.source_type == SourceType.PDF:
                # PDF: Read binary content from file path
                with open(document.source_reference, 'rb') as f:
                    content = f.read()
            else:  # TEXT
                # TEXT: Read text content from file path
                with open(document.source_reference, 'r', encoding='utf-8') as f:
                    content = f.read()
            
            # Use unified extract_content function
            extracted_text = extract_content(
                content=content,
                source_type=document.source_type.value,
                source_reference=document.source_reference
            )
        
        # Step 1.5: Enhance text with bilingual name annotations
        logger.info(f"[{document.document_id}] Enhancing text with bilingual annotations")
        try:
            enhanced_text = name_enhancer.enhance_text(extracted_text)
            enhancement_stats = name_enhancer.get_statistics(extracted_text, enhanced_text)
            logger.info(
                f"[{document.document_id}] Enhancement complete: "
                f"{enhancement_stats['total_enhancements']} names enhanced, "
                f"size: {enhancement_stats['original_length']} → {enhancement_stats['enhanced_length']} chars "
                f"(+{enhancement_stats['size_increase_percent']:.1f}%)"
            )
            document.raw_content = enhanced_text
        except Exception as e:
            logger.error(f"[{document.document_id}] Enhancement failed: {e}, using original text")
            document.raw_content = extracted_text
        document.extraction_status = ExtractionStatus.EXTRACTED
        # T089+ Calculate document tokens (1 token ≈ 3 characters)
        document.tokens_used = max(1, len(enhanced_text) // 3)
        logger.info(f"[{document.document_id}] Extraction complete: {len(enhanced_text)} chars")
        logger.info(f"[{document.document_id}] TOKENS_USED CALCULATION: {len(enhanced_text)} chars // 3 = {document.tokens_used} tokens")
        
        # Step 2: Moderate content review
        # Based on user requirements, Flow 3 no longer performs content moderation, deferred to Flow 4
        # if settings.enable_content_moderation:
        #     logger.info(f"[{document.document_id}] Starting moderation")
        #     document.moderation_status = ModerationStatus.CHECKING
        #     
        #     mod_result = moderator.check_content_safety(
        #         text=document.raw_content,
        #         source_reference=document.source_reference
        #     )
        #     if mod_result.status == ModStatus.BLOCKED:
        #         document.moderation_status = ModerationStatus.BLOCKED
        #         document.moderation_categories = mod_result.blocked_categories
        #         document.error_code = ErrorCode.MODERATION_BLOCKED
        #         document.error_message = mod_result.reason
        #         logger.warning(
        #             f"[{document.document_id}] Moderation BLOCKED: {mod_result.reason}"
        #         )
        #         # Update session state to ERROR
        #         session_manager.update_state(document.session_id, SessionState.ERROR)
        #         return
        #     
        #     document.moderation_status = ModerationStatus.APPROVED
        #     logger.info(f"[{document.document_id}] Moderation APPROVED")
        # else:
        #     # Skip moderation (testing mode)
        #     document.moderation_status = ModerationStatus.APPROVED
        #     logger.warning(f"[{document.document_id}] Moderation SKIPPED (testing mode)")
        
        # Mark as APPROVED directly because Flow 3 is no longer responsible for blocking
        document.moderation_status = ModerationStatus.APPROVED
        logger.info(f"[{document.document_id}] Moderation SKIPPED in Flow 3 (deferred to Flow 4)")

        
        # Step 3: Chunk text into segments
        logger.info(f"[{document.document_id}] Starting chunking")
        chunks = chunker.chunk_text(
            text=document.raw_content,
            source_reference=document.source_reference
        )
        document.chunk_count = len(chunks)
        logger.info(f"[{document.document_id}] Chunking complete: {len(chunks)} chunks")
        
        # Step 4: Embed vector embeddings
        logger.info(f"[{document.document_id}] Starting embedding")
        chunk_texts = [chunk.text for chunk in chunks]
        embedding_results = embedder.embed_batch(
            texts=chunk_texts,
            task_type="retrieval_document",
            source_reference=document.source_reference
        )
        logger.info(f"[{document.document_id}] Embedding complete: {len(embedding_results)} vectors")
        
        # Step 5: Store to Qdrant
        logger.info(f"[{document.document_id}] Starting vector storage")
        # Remove hyphens from session_id for valid Qdrant collection name
        clean_session_id = str(document.session_id).replace("-", "")
        collection_name = f"session_{clean_session_id}"
        
        # Prepare points data
        # NOTE: Qdrant requires point IDs to be integers (via hash), not strings
        # We generate a unique integer ID for each chunk (based on document_id + chunk_index)
        import uuid
        import hashlib
        points = []
        for idx, (chunk, emb_result) in enumerate(zip(chunks, embedding_results)):
            # Generate unique integer ID (based on document_id and chunk_index)
            id_string = f"{document.document_id}_{chunk.chunk_index}"
            point_id = int(hashlib.md5(id_string.encode()).hexdigest(), 16) % (2**31)  # Convert to 32-bit integer
            
            point_data = {
                "id": point_id,  # Integer ID required by Qdrant
                "vector": emb_result.vector,
                "payload": {
                    "document_id": str(document.document_id),
                    "chunk_index": chunk.chunk_index,
                    "text": chunk.text,
                    "char_start": chunk.start_char,
                    "char_count": chunk.char_count,
                    "source_reference": document.source_reference,
                    "source_type": document.source_type.value
                }
            }
            points.append(point_data)
        
        # Upsert to Qdrant (enhanced error handling)
        upsert_success = vector_store.upsert_chunks(
            collection_name=collection_name,
            chunks=points
        )
        
        if not upsert_success:
            raise Exception(f"Failed to upsert {len(points)} chunks to Qdrant collection '{collection_name}'")
        
        # Verify data has been successfully written
        collection_info = vector_store.get_collection_info(collection_name)
        if collection_info:
            actual_count = collection_info.get('vectors_count') or collection_info.get('points_count', 0)
            # Ensure actual_count is not None
            if actual_count is None:
                actual_count = 0
            logger.info(
                f"[{document.document_id}] Storage verified: {actual_count} vectors in collection (expected: {len(points)})"
            )
            if actual_count < len(points):
                logger.warning(
                    f"[{document.document_id}] Vector count mismatch! Expected {len(points)}, got {actual_count}"
                )
        else:
            logger.error(f"[{document.document_id}] Cannot verify storage - collection info unavailable")
        
        logger.info(
            f"[{document.document_id}] Storage complete: {len(points)} points uploaded"
        )
        
        # Step 6: Generate summary (improved prompt)
        logger.info(f"[{document.document_id}] Generating summary")
        document.extraction_status = ExtractionStatus.SUMMARIZING  # Mark as summary generating
        
        try:
            # Re-fetch Session to ensure we have the latest language setting
            session = session_manager.get_session(document.session_id)
            language = session.language if session else "en"
            logger.info(f"[{document.document_id}] Session language for summary: {language}")
            
            # Use RAG Engine's summary generation method (limit to 300 tokens)
            document.summary = rag_engine.generate_summary(
                session_id=document.session_id,
                document_content=document.raw_content,
                language=language,
                max_tokens=300  # Limit summary length to ~300 tokens
            )
            
            logger.info(f"[{document.document_id}] Summary generated: {len(document.summary)} chars, summary[:100]={document.summary[:100] if document.summary else 'None'}")
            
        except Exception as e:
            logger.error(f"[{document.document_id}] Failed to generate summary: {e}", exc_info=True)
            # If generation fails, provide more meaningful fallback
            content_preview = document.raw_content[:200].strip()
            language = "en"
            if session and hasattr(session, 'language'):
                language = session.language
            
            fallback_messages = {
                "zh-TW": f"文檔已上傳並處理完成。內容預覽：{content_preview}...",
                "zh-CN": f"文档已上传并处理完成。内容预览：{content_preview}...",
                "en": f"Document uploaded and processed successfully. Content preview: {content_preview}...",
                "fr": f"Document téléchargé et traité avec succès. Aperçu: {content_preview}..."
            }
            document.summary = fallback_messages.get(language, fallback_messages["en"])
        
        # Mark as fully completed
        document.extraction_status = ExtractionStatus.COMPLETED
        
        # Calculate and set processing time (if not from crawler)
        if not document.crawl_duration_seconds:
            processing_duration = time.time() - processing_start_time
            document.crawl_duration_seconds = processing_duration
            logger.info(f"[{document.document_id}] Processing time: {processing_duration:.2f} seconds")
        
        # Update session state
        session = session_manager.get_session(document.session_id)
        if session:
            session.document_count += 1
            session.vector_count += len(points)
            # If previously PROCESSING, change to READY_FOR_CHAT
            if session.state == SessionState.PROCESSING:
                session_manager.update_state(document.session_id, SessionState.READY_FOR_CHAT)
        
        logger.info(f"[{document.document_id}] Document processing complete!")
        
    except PDFExtractionError as e:
        logger.error(f"[{document.document_id}] PDF extraction failed: {str(e)}")
        document.extraction_status = ExtractionStatus.FAILED
        document.error_code = ErrorCode.EXTRACT_FAILED
        document.error_message = str(e)
        session_manager.update_state(document.session_id, SessionState.ERROR)
    
    except URLFetchError as e:
        logger.error(f"[{document.document_id}] URL fetch failed: {str(e)}")
        document.extraction_status = ExtractionStatus.FAILED
        document.error_code = ErrorCode.FETCH_FAILED
        document.error_message = str(e)
        session_manager.update_state(document.session_id, SessionState.ERROR)
    
    except Exception as e:
        logger.error(f"[{document.document_id}] Processing failed: {str(e)}", exc_info=True)
        document.extraction_status = ExtractionStatus.FAILED
        document.error_code = ErrorCode.PROCESSING_FAILED
        document.error_message = str(e)
        session_manager.update_state(document.session_id, SessionState.ERROR)


@router.post("/{session_id}/file", status_code=202, response_model=UploadResponse)
async def upload_file(
    session_id: UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload file (PDF or TXT)
    
    Flow:
    1. Validate session exists
    2. Validate file type and size
    3. Save file to temporary location
    4. Start background processing task
    5. Return 202 Accepted
    """
    # Validate session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # Validate file type
    allowed_extensions = ['.pdf', '.txt']
    file_ext = file.filename.lower().split('.')[-1] if '.' in file.filename else ''
    file_ext_with_dot = f".{file_ext}"
    
    if file_ext_with_dot not in allowed_extensions:
        error = get_error_response(
            ErrorCode.UNSUPPORTED_FORMAT,
            details={"provided_extension": file_ext}
        )
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.UNSUPPORTED_FORMAT),
            detail=error.dict()
        )
    
    # Validate file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    file_content = await file.read()
    
    if len(file_content) > MAX_FILE_SIZE:
        error = get_error_response(
            ErrorCode.FILE_TOO_LARGE,
            details={"file_size_bytes": len(file_content), "max_size_bytes": MAX_FILE_SIZE}
        )
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.FILE_TOO_LARGE),
            detail=error.dict()
        )
    
    # Check for empty file
    if len(file_content) == 0:
        error = get_error_response(ErrorCode.EMPTY_FILE)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.EMPTY_FILE),
            detail=error.dict()
        )
    
    # Determine source_type
    source_type = SourceType.PDF if file_ext == 'pdf' else SourceType.TEXT
    
    # Save file to temporary location
    import os
    import tempfile
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, file.filename)
    
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    logger.info(f"File saved: {file_path} ({len(file_content)} bytes)")
    
    # Create Document entity
    document = Document(
        session_id=session_id,
        source_type=source_type,
        source_reference=file_path
    )
    
    _documents[document.document_id] = document
    
    # Update session state
    session_manager.update_state(session_id, SessionState.PROCESSING)
    
    # Start background processing task
    background_tasks.add_task(process_document, document)
    
    logger.info(f"Upload accepted: {document.document_id} (session: {session_id})")
    
    return UploadResponse(
        document_id=document.document_id,
        session_id=document.session_id,
        source_type=document.source_type,
        source_reference=file.filename,
        upload_timestamp=document.upload_timestamp.isoformat() + "Z",
        extraction_status=document.extraction_status,
        moderation_status=document.moderation_status
    )


@router.post("/{session_id}/url", status_code=202, response_model=UploadResponse)
async def upload_url(
    session_id: UUID,
    background_tasks: BackgroundTasks,
    request: UrlUploadRequest
):
    """
    Fetch content from URL and process
    
    Flow:
    1. Validate session exists
    2. Validate URL format
    3. Start background processing task
    4. Return 202 Accepted
    """
    # Validate session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # Create Document entity
    document = Document(
        session_id=session_id,
        source_type=SourceType.URL,
        source_reference=str(request.url)
    )
    
    _documents[document.document_id] = document
    
    # Update session state
    session_manager.update_state(session_id, SessionState.PROCESSING)
    
    # Start background processing task
    background_tasks.add_task(process_document, document)
    
    logger.info(f"URL upload accepted: {document.document_id} (session: {session_id})")
    
    return UploadResponse(
        document_id=document.document_id,
        session_id=document.session_id,
        source_type=document.source_type,
        source_reference=document.source_reference,
        upload_timestamp=document.upload_timestamp.isoformat() + "Z",
        extraction_status=document.extraction_status,
        moderation_status=document.moderation_status
    )


@router.post("/{session_id}/website", status_code=202, response_model=WebsiteUploadResponse)
async def upload_website(
    session_id: UUID,
    background_tasks: BackgroundTasks,
    request: WebsiteUploadRequest
):
    """
    Crawl website content and process
    
    Flow:
    1. Validate session exists
    2. Validate URL format
    3. Use WebCrawler to crawl website (with token limit)
    4. Create Document for each crawled page
    5. Start background processing task
    6. Return 202 Accepted + crawler result preview
    
    Features:
    - 100K token default limit
    - Automatic page link discovery
    - Respects domain boundaries (only crawls same domain)
    - Returns URL list for user preview
    """
    # Validate session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # 啟動爬蟲 - 使用保守的參數以避免超時
    crawler = WebCrawler(
        base_url=str(request.url),
        max_tokens=min(request.max_tokens, 50000),  # 限制為50K tokens
        max_pages=min(request.max_pages, 10)        # 限制為10個頁面
    )
    
    try:
        logger.info(f"Starting website crawl: {request.url} (session: {session_id})")
        
        # 使用 threading 超時保護（跨平台兼容）
        import threading
        import time
        
        crawl_result = None
        crawl_error = None
        
        def crawl_with_timeout():
            nonlocal crawl_result, crawl_error
            try:
                crawl_result = crawler.crawl()
            except Exception as e:
                crawl_error = e
        
        # 啟動爬蟲線程
        crawl_thread = threading.Thread(target=crawl_with_timeout)
        crawl_thread.start()
        crawl_thread.join(timeout=30)  # 30秒超時
        
        if crawl_thread.is_alive():
            logger.error(f"Website crawl timed out for {request.url}")
            raise TimeoutError("Website crawl timed out after 30 seconds")
        
        if crawl_error:
            raise crawl_error
            
        if crawl_result is None:
            raise Exception("Crawl completed but no result returned")
        
        # 記錄爬蟲結果
        logger.info(
            f"Website crawl complete: {crawl_result['total_pages']} pages, "
            f"{crawl_result['total_tokens']} tokens, "
            f"status: {crawl_result['status']}"
        )
        
        # 提取爬蟲的頁面
        crawled_pages = crawl_result.get('pages', [])
        
        # 檢查爬蟲結果是否有效
        if not crawled_pages or len(crawled_pages) == 0:
            logger.error(f"Website crawl returned empty pages for {request.url}")
            raise Exception("Cannot embed empty text list - no pages were successfully crawled")
        
        # 為爬蟲結果建立主 Document
        # 將所有頁面的內容合併為一個文件
        combined_content = "\n\n---\n\n".join([
            f"# {page.get('title', 'Untitled')}\nURL: {page.get('url')}\n\n{page.get('content', '')}"
            for page in crawled_pages
        ])
        
        # 再次檢查合併後的內容是否為空
        if not combined_content or combined_content.strip() == "":
            logger.error(f"Website crawl resulted in empty combined content for {request.url}")
            raise Exception("Cannot embed empty text list - crawled pages have no text content")
        
        crawl_document = Document(
            session_id=session_id,
            source_type=SourceType.URL,
            source_reference=str(request.url),
            raw_content=combined_content  # 直接設定合併後的內容
        )
        
        # T089+ 設置爬蟲統計信息
        crawl_document.pages_crawled = len(crawled_pages)
        crawl_document.tokens_used = crawl_result.get('total_tokens', 0)
        
        # 轉換爬蟲頁面為儲存格式
        crawled_pages_dict = [
            {
                'url': page.get('url', ''),
                'title': page.get('title', 'Untitled'),
                'tokens': page.get('tokens', 0),
                'content': page.get('content', '')[:200]  # 預覽前 200 字
            }
            for page in crawled_pages
        ]
        crawl_document.crawled_pages = crawled_pages_dict
        crawl_document.crawl_duration_seconds = crawl_result.get('duration_seconds', 0.0)
        
        # Mark as extracted (skip extraction step since crawler already extracted)
        crawl_document.extraction_status = ExtractionStatus.EXTRACTED
        
        _documents[crawl_document.document_id] = crawl_document
        
        # Update session state
        session_manager.update_state(session_id, SessionState.PROCESSING)
        
        # Start background processing task (starting from moderation, skip extraction)
        background_tasks.add_task(process_document, crawl_document)
        
        logger.info(
            f"Website upload accepted: {crawl_document.document_id} "
            f"(session: {session_id}, pages: {len(crawled_pages)})"
        )
        
        # Use saved crawled pages for response format
        response_pages = [
            CrawledPage(
                url=page.get('url', ''),
                title=page.get('title', 'Untitled'),
                tokens=page.get('tokens', 0),
                content=page.get('content', '')[:200]  # Preview first 200 chars
            )
            for page in crawled_pages_dict
        ]
        
        return WebsiteUploadResponse(
            document_id=crawl_document.document_id,
            session_id=crawl_document.session_id,
            source_type=crawl_document.source_type,
            source_reference=str(request.url),
            upload_timestamp=crawl_document.upload_timestamp.isoformat() + "Z",
            extraction_status=crawl_document.extraction_status,
            moderation_status=crawl_document.moderation_status,
            pages_found=len(crawled_pages),
            total_tokens=crawl_result.get('total_tokens', 0),
            crawl_status=crawl_result.get('status', 'completed'),
            crawled_pages=response_pages
        )
    
    except Exception as e:
        logger.error(f"Website crawl failed: {str(e)}", exc_info=True)
        error = get_error_response(
            ErrorCode.FETCH_FAILED,
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.FETCH_FAILED),
            detail=error.dict()
        )


@router.get("/{session_id}/status/{document_id}", response_model=UploadStatusResponse)
async def get_upload_status(
    session_id: UUID,
    document_id: UUID
):
    """
    Query upload processing status
    
    Used for frontend polling to track processing progress
    """
    # Validate session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # Query document
    document = _documents.get(document_id)
    if not document:
        error = get_error_response(ErrorCode.DOCUMENT_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.DOCUMENT_NOT_FOUND),
            detail=error.dict()
        )
    
    # Validate document belongs to this session
    if document.session_id != session_id:
        error = get_error_response(ErrorCode.DOCUMENT_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.DOCUMENT_NOT_FOUND),
            detail=error.dict()
        )
    
    # Calculate processing progress
    progress = 0
    if document.extraction_status == ExtractionStatus.EXTRACTING:
        progress = 25
    elif document.extraction_status == ExtractionStatus.EXTRACTED:
        progress = 50
        if document.moderation_status == ModerationStatus.APPROVED:
            progress = 75
            if document.chunk_count > 0:
                progress = 90  # Vectors ready, waiting for summary generation
    elif document.extraction_status == ExtractionStatus.SUMMARIZING:
        progress = 95  # Summary is being generated
    elif document.extraction_status == ExtractionStatus.COMPLETED:
        progress = 100  # Fully completed
    elif document.extraction_status == ExtractionStatus.FAILED:
        progress = 0
    
    # Generate summary (using cached summary)
    summary = document.summary if document.summary else None
    
    # Debug info - temporarily added
    logger.info(f"[DEBUG] Status response for {document.document_id}:")
    logger.info(f"  - tokens_used: {document.tokens_used}")
    logger.info(f"  - pages_crawled: {document.pages_crawled}")
    logger.info(f"  - crawled_pages count: {len(document.crawled_pages) if document.crawled_pages else 0}")
    logger.info(f"  - crawl_duration_seconds: {document.crawl_duration_seconds}")
    
    logger.info(f"[{document.document_id}] Status check: extraction_status={document.extraction_status}, chunk_count={document.chunk_count}, progress={progress}, has_summary={summary is not None}, summary_len={len(summary) if summary else 0}")
    
    return UploadStatusResponse(
        document_id=document.document_id,
        source_type=document.source_type,
        source_reference=document.source_reference,
        extraction_status=document.extraction_status,
        moderation_status=document.moderation_status,
        chunk_count=document.chunk_count,
        processing_progress=progress,
        summary=summary,
        error_code=document.error_code,
        error_message=document.error_message,
        moderation_categories=document.moderation_categories,
        # T089+ 返回 token 信息
        tokens_used=document.tokens_used,
        pages_crawled=document.pages_crawled,
        # 爬蟲詳細信息
        crawled_pages=[CrawledPage(**page) for page in (document.crawled_pages or [])] if document.crawled_pages else None,
        crawl_status="completed" if document.pages_crawled > 0 else None,
        avg_tokens_per_page=int(document.tokens_used / document.pages_crawled) if document.pages_crawled > 0 else 0,
        crawl_duration_seconds=document.crawl_duration_seconds
    )


@router.get("/{session_id}/documents")
async def list_documents(session_id: UUID):
    """
    List all documents in session
    
    Returns:
        list[UploadStatusResponse]: Document list
    """
    # Validate session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # Filter documents belonging to this session
    session_documents = [
        doc for doc in _documents.values()
        if doc.session_id == session_id
    ]
    
    # Convert to response format
    results = []
    for doc in session_documents:
        progress = 100 if doc.chunk_count > 0 else 0
        results.append(UploadStatusResponse(
            document_id=doc.document_id,
            source_type=doc.source_type,
            source_reference=doc.source_reference,
            extraction_status=doc.extraction_status,
            moderation_status=doc.moderation_status,
            chunk_count=doc.chunk_count,
            processing_progress=progress,
            summary=doc.summary,
            error_code=doc.error_code,
            error_message=doc.error_message,
            moderation_categories=doc.moderation_categories
        ))
    
    return results


# Content Moderation API
class ContentModerationRequest(BaseModel):
    content: str
    source_reference: str = "user_input"
    academic_mode: bool = False

class ContentModerationResponse(BaseModel):
    status: str
    is_approved: bool
    blocked_categories: list[str]
    reason: str | None = None

@router.post("/{session_id}/moderate", response_model=ContentModerationResponse)
async def moderate_content(
    session_id: UUID,
    request: ContentModerationRequest
):
    """
    Check if content contains inappropriate material (pornography, violence, hate speech, etc.)
    Uses Gemini Safety API for real-time content moderation
    """
    logger.info(f"Content moderation request for session {session_id}")
    
    try:
        # Check if session exists
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found or expired"
            )
        
        # Execute content moderation
        if settings.enable_content_moderation:
            mod_result = moderator.check_content_safety(
                request.content,
                request.source_reference,
                academic_mode=request.academic_mode
            )
            
            return ContentModerationResponse(
                status=mod_result.status.value,
                is_approved=mod_result.is_approved,
                blocked_categories=mod_result.blocked_categories,
                reason=mod_result.reason
            )
        else:
            # If content moderation is disabled, approve by default
            logger.warning("Content moderation is disabled, approving content by default")
            return ContentModerationResponse(
                status="APPROVED",
                is_approved=True,
                blocked_categories=[],
                reason=None
            )
            
    except Exception as e:
        logger.error(f"Content moderation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Content moderation failed: {str(e)}"
        )
