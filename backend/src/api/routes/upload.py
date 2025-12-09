"""
Upload API Routes
處理文件上傳、URL 內容抓取、處理狀態查詢

Constitutional Compliance:
- Principle VI (Moderation First): 所有內容必須通過審核
- Principle II (Testability): 獨立路由模組，可測試
- Principle VIII (API Contract Stability): 遵循 contracts/upload.openapi.yaml
"""

import logging
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, HttpUrl, field_validator

from ...models.document import (
    Document, 
    SourceType, 
    ExtractionStatus, 
    ModerationStatus
)
from ...models.session import SessionState
from ...models.errors import ErrorCode, get_error_response, get_http_status_code
from ...core.session_manager import SessionManager
from ...core.config import settings
from ...services.extractor import extract_content, PDFExtractionError, URLFetchError, TextExtractionError
from ...services.moderation import ModerationService, ModerationStatus as ModStatus
from ...services.chunker import TextChunker
from ...services.embedder import Embedder
from ...services.vector_store import VectorStore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])

# 全域服務實例（將來可改為依賴注入）
session_manager = SessionManager()
moderator = ModerationService(api_key=settings.gemini_api_key)
chunker = TextChunker()
embedder = Embedder()
vector_store = VectorStore()


class UrlUploadRequest(BaseModel):
    """URL 上傳請求"""
    url: HttpUrl
    
    @field_validator('url')
    @classmethod
    def validate_url_scheme(cls, v):
        if v.scheme not in ['http', 'https']:
            raise ValueError("URL must use http or https scheme")
        return v


class UploadResponse(BaseModel):
    """上傳回應（202 Accepted）"""
    document_id: UUID
    session_id: UUID
    source_type: SourceType
    source_reference: str
    upload_timestamp: str
    extraction_status: ExtractionStatus
    moderation_status: ModerationStatus


class UploadStatusResponse(BaseModel):
    """上傳狀態查詢回應"""
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


# 文件儲存（實際實作中應使用資料庫）
_documents: dict[UUID, Document] = {}


async def process_document(document: Document):
    """
    背景任務：處理文件上傳流程
    Extract → Moderate → Chunk → Embed → Store
    
    Constitutional Alignment:
    - Principle VI: Moderation First - 審核在分塊之前
    - Principle V: Strict RAG - 僅儲存通過審核的內容
    """
    try:
        # Step 1: Extract 文字萃取
        logger.info(f"[{document.document_id}] Starting extraction ({document.source_type})")
        document.extraction_status = ExtractionStatus.EXTRACTING
        
        # 使用統一的 extract_content 函數
        extracted_text = extract_content(
            source=document.source_reference,
            source_type=document.source_type.value
        )
        
        document.raw_content = extracted_text
        document.extraction_status = ExtractionStatus.EXTRACTED
        logger.info(f"[{document.document_id}] Extraction complete: {len(extracted_text)} chars")
        
        # Step 2: Moderate 內容審核（憲法 Principle VI）
        logger.info(f"[{document.document_id}] Starting moderation")
        document.moderation_status = ModerationStatus.CHECKING
        
        mod_result = moderator.check_content_safety(
            text=document.raw_content,
            source_reference=document.source_reference
        )
        if mod_result.status == ModStatus.BLOCKED:
            document.moderation_status = ModerationStatus.BLOCKED
            document.moderation_categories = mod_result.blocked_categories
            document.error_code = ErrorCode.MODERATION_BLOCKED
            document.error_message = mod_result.reason
            logger.warning(
                f"[{document.document_id}] Moderation BLOCKED: {mod_result.reason}"
            )
            # 更新 session 狀態為 ERROR
            session_manager.update_state(document.session_id, SessionState.ERROR)
            return
        
        document.moderation_status = ModerationStatus.APPROVED
        logger.info(f"[{document.document_id}] Moderation APPROVED")
        
        # Step 3: Chunk 文字分塊
        logger.info(f"[{document.document_id}] Starting chunking")
        chunks = chunker.chunk_text(
            text=document.raw_content,
            source_reference=document.source_reference
        )
        document.chunk_count = len(chunks)
        logger.info(f"[{document.document_id}] Chunking complete: {len(chunks)} chunks")
        
        # Step 4: Embed 向量嵌入
        logger.info(f"[{document.document_id}] Starting embedding")
        chunk_texts = [chunk.text for chunk in chunks]
        embedding_results = embedder.embed_batch(
            texts=chunk_texts,
            task_type="retrieval_document",
            source_reference=document.source_reference
        )
        logger.info(f"[{document.document_id}] Embedding complete: {len(embedding_results)} vectors")
        
        # Step 5: Store 儲存到 Qdrant
        logger.info(f"[{document.document_id}] Starting vector storage")
        collection_name = f"session_{document.session_id}"
        
        # 準備 points 資料
        points = []
        for idx, (chunk, emb_result) in enumerate(zip(chunks, embedding_results)):
            point_data = {
                "id": str(document.document_id) + f"_chunk_{idx}",
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
        
        # Upsert 到 Qdrant
        vector_store.upsert_chunks(
            collection_name=collection_name,
            chunks=points
        )
        
        logger.info(
            f"[{document.document_id}] Storage complete: {len(points)} points uploaded"
        )
        
        # 更新 session 狀態
        session = session_manager.get_session(document.session_id)
        if session:
            session.document_count += 1
            session.vector_count += len(points)
            # 如果之前是 PROCESSING，改為 READY_FOR_CHAT
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
    上傳檔案（PDF 或 TXT）
    
    Flow:
    1. 驗證 session 存在
    2. 驗證檔案類型與大小
    3. 儲存檔案到臨時位置
    4. 啟動背景處理任務
    5. 回傳 202 Accepted
    """
    # 驗證 session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # 驗證檔案類型
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
    
    # 驗證檔案大小（10MB）
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
    
    # 檢查空檔案
    if len(file_content) == 0:
        error = get_error_response(ErrorCode.EMPTY_FILE)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.EMPTY_FILE),
            detail=error.dict()
        )
    
    # 決定 source_type
    source_type = SourceType.PDF if file_ext == 'pdf' else SourceType.TEXT
    
    # 儲存檔案到臨時位置
    import os
    import tempfile
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, file.filename)
    
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    logger.info(f"File saved: {file_path} ({len(file_content)} bytes)")
    
    # 建立 Document 實體
    document = Document(
        session_id=session_id,
        source_type=source_type,
        source_reference=file_path
    )
    
    _documents[document.document_id] = document
    
    # 更新 session 狀態
    session_manager.update_state(session_id, SessionState.PROCESSING)
    
    # 啟動背景處理任務
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
    從 URL 抓取內容並處理
    
    Flow:
    1. 驗證 session 存在
    2. 驗證 URL 格式
    3. 啟動背景處理任務
    4. 回傳 202 Accepted
    """
    # 驗證 session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # 建立 Document 實體
    document = Document(
        session_id=session_id,
        source_type=SourceType.URL,
        source_reference=str(request.url)
    )
    
    _documents[document.document_id] = document
    
    # 更新 session 狀態
    session_manager.update_state(session_id, SessionState.PROCESSING)
    
    # 啟動背景處理任務
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


@router.get("/{session_id}/status/{document_id}", response_model=UploadStatusResponse)
async def get_upload_status(
    session_id: UUID,
    document_id: UUID
):
    """
    查詢上傳處理狀態
    
    用於前端輪詢，追蹤處理進度
    """
    # 驗證 session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # 查詢 document
    document = _documents.get(document_id)
    if not document:
        error = get_error_response(ErrorCode.DOCUMENT_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.DOCUMENT_NOT_FOUND),
            detail=error.dict()
        )
    
    # 驗證 document 屬於此 session
    if document.session_id != session_id:
        error = get_error_response(ErrorCode.DOCUMENT_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.DOCUMENT_NOT_FOUND),
            detail=error.dict()
        )
    
    # 計算處理進度
    progress = 0
    if document.extraction_status == ExtractionStatus.EXTRACTING:
        progress = 25
    elif document.extraction_status == ExtractionStatus.EXTRACTED:
        progress = 50
        if document.moderation_status == ModerationStatus.APPROVED:
            progress = 75
            if document.chunk_count > 0:
                progress = 100
    elif document.extraction_status == ExtractionStatus.FAILED:
        progress = 0
    
    # 產生摘要
    summary = None
    if document.raw_content and len(document.raw_content) > 100:
        summary = document.raw_content[:200] + "..."
    
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
        moderation_categories=document.moderation_categories
    )


@router.get("/{session_id}/documents")
async def list_documents(session_id: UUID):
    """
    列出 session 中的所有文件
    
    Returns:
        list[UploadStatusResponse]: 文件清單
    """
    # 驗證 session
    session = session_manager.get_session(session_id)
    if not session:
        error = get_error_response(ErrorCode.SESSION_NOT_FOUND)
        raise HTTPException(
            status_code=get_http_status_code(ErrorCode.SESSION_NOT_FOUND),
            detail=error.dict()
        )
    
    # 篩選屬於此 session 的文件
    session_documents = [
        doc for doc in _documents.values()
        if doc.session_id == session_id
    ]
    
    # 轉換為回應格式
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
            error_code=doc.error_code,
            error_message=doc.error_message,
            moderation_categories=doc.moderation_categories
        ))
    
    return results
