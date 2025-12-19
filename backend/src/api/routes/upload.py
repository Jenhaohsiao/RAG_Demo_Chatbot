"""
Upload API Routes
處理文件上傳、URL 內容抓取、處理狀態查詢

Constitutional Compliance:
- Principle VI (Moderation First): 所有內容必須通過審核
- Principle II (Testability): 獨立路由模組，可測試
- Principle VIII (API Contract Stability): 遵循 contracts/upload.openapi.yaml

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
from ...services.vector_store import VectorStore
from ...services.rag_engine import RAGEngine
from ...main import AppException

logger = logging.getLogger(__name__)

# Create upload router (prefix handled by parent router in api/__init__.py)
router = APIRouter()

# 全域服務實例（將來可改為依賴注入）
moderator = ModerationService(api_key=settings.gemini_api_key)
chunker = TextChunker()
embedder = Embedder()
vector_store = VectorStore()
rag_engine = RAGEngine()


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


def process_document(document: Document):
    """
    背景任務：處理文件上傳流程
    Extract → Moderate → Chunk → Embed → Store
    
    Constitutional Alignment:
    - Principle VI: Moderation First - 審核在分塊之前
    - Principle V: Strict RAG - 僅儲存通過審核的內容
    
    NOTE: 這必須是同步函數，因為 FastAPI BackgroundTasks 不支持 async 函數
    """
    try:
        # Step 1: Extract 文字萃取
        logger.info(f"[{document.document_id}] Starting extraction ({document.source_type})")
        document.extraction_status = ExtractionStatus.EXTRACTING
        
        # 讀取或抓取內容
        if document.source_type == SourceType.URL:
            # URL: 直接使用 URL 字符串
            content = document.source_reference
        elif document.source_type == SourceType.PDF:
            # PDF: 從檔案路徑讀取二進位內容
            with open(document.source_reference, 'rb') as f:
                content = f.read()
        else:  # TEXT
            # TEXT: 從檔案路徑讀取文字內容
            with open(document.source_reference, 'r', encoding='utf-8') as f:
                content = f.read()
        
        # 使用統一的 extract_content 函數
        extracted_text = extract_content(
            content=content,
            source_type=document.source_type.value,
            source_reference=document.source_reference
        )
        
        document.raw_content = extracted_text
        document.extraction_status = ExtractionStatus.EXTRACTED
        logger.info(f"[{document.document_id}] Extraction complete: {len(extracted_text)} chars")
        
        # Step 2: Moderate 內容審核（憲法 Principle VI）
        if settings.enable_content_moderation:
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
        else:
            # 跳過審核（測試模式）
            document.moderation_status = ModerationStatus.APPROVED
            logger.warning(f"[{document.document_id}] Moderation SKIPPED (testing mode)")

        
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
        # Remove hyphens from session_id for valid Qdrant collection name
        clean_session_id = str(document.session_id).replace("-", "")
        collection_name = f"session_{clean_session_id}"
        
        # 準備 points 資料
        # NOTE: Qdrant 要求點 ID 是整數（通過 hash），不接受字串
        # 我們為每個 chunk 生成唯一的整數 ID (基於 document_id + chunk_index)
        import uuid
        import hashlib
        points = []
        for idx, (chunk, emb_result) in enumerate(zip(chunks, embedding_results)):
            # 產生唯一的整數 ID (基於 document_id 和 chunk_index)
            id_string = f"{document.document_id}_{chunk.chunk_index}"
            point_id = int(hashlib.md5(id_string.encode()).hexdigest(), 16) % (2**31)  # 轉換為 32-bit 整數
            
            point_data = {
                "id": point_id,  # Qdrant 要求的整數 ID
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
        
        # Upsert 到 Qdrant（增強錯誤處理）
        upsert_success = vector_store.upsert_chunks(
            collection_name=collection_name,
            chunks=points
        )
        
        if not upsert_success:
            raise Exception(f"Failed to upsert {len(points)} chunks to Qdrant collection '{collection_name}'")
        
        # 驗證資料已成功寫入
        collection_info = vector_store.get_collection_info(collection_name)
        if collection_info:
            actual_count = collection_info.get('vectors_count') or collection_info.get('points_count', 0)
            # 確保 actual_count 不是 None
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
        
        # Step 6: 生成摘要（改進的 Prompt）
        logger.info(f"[{document.document_id}] Generating summary")
        document.extraction_status = ExtractionStatus.SUMMARIZING  # 標記為摘要生成中
        
        try:
            # 重新獲取 Session 以確保獲得最新的語言設定
            session = session_manager.get_session(document.session_id)
            language = session.language if session else "en"
            logger.info(f"[{document.document_id}] Session language for summary: {language}")
            
            # 使用 RAG Engine 的摘要生成方法（減少至 300 token 限制摘要長度）
            document.summary = rag_engine.generate_summary(
                session_id=document.session_id,
                document_content=document.raw_content,
                language=language,
                max_tokens=300  # 限制摘要長度至 ~300 字
            )
            
            logger.info(f"[{document.document_id}] Summary generated: {len(document.summary)} chars, summary[:100]={document.summary[:100] if document.summary else 'None'}")
            
        except Exception as e:
            logger.error(f"[{document.document_id}] Failed to generate summary: {e}", exc_info=True)
            # 如果生成失敗，提供更有意義的 fallback
            content_preview = document.raw_content[:200].strip()
            language = "en"
            if session and hasattr(session, 'language'):
                language = session.language
            
            fallback_messages = {
                "zh-TW": f"文檔已上傳並處理完成。內容預覽：{content_preview}...",
                "zh-CN": f"文档已上传并处理完成。内容预览：{content_preview}...",
                "zh": f"文檔已上傳並處理完成。內容預覽：{content_preview}...",
                "en": f"Document uploaded and processed successfully. Content preview: {content_preview}...",
                "ko": f"문서가 업로드되고 처리되었습니다. 콘텐츠 미리보기: {content_preview}...",
                "es": f"Documento cargado y procesado exitosamente. Vista previa: {content_preview}...",
                "ja": f"ドキュメントがアップロードおよび処理されました。プレビュー: {content_preview}...",
                "ar": f"تم تحميل المستند ومعالجته بنجاح. معاينة: {content_preview}...",
                "fr": f"Document téléchargé et traité avec succès. Aperçu: {content_preview}..."
            }
            document.summary = fallback_messages.get(language, fallback_messages["en"])
        
        # 標記為完全完成
        document.extraction_status = ExtractionStatus.COMPLETED
        
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
                progress = 90  # 向量已準備，等待摘要生成
    elif document.extraction_status == ExtractionStatus.SUMMARIZING:
        progress = 95  # 摘要正在生成
    elif document.extraction_status == ExtractionStatus.COMPLETED:
        progress = 100  # 完全完成
    elif document.extraction_status == ExtractionStatus.FAILED:
        progress = 0
    
    # 產生摘要（使用已緩存的 summary）
    summary = document.summary if document.summary else None
    
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
            summary=doc.summary,
            error_code=doc.error_code,
            error_message=doc.error_message,
            moderation_categories=doc.moderation_categories
        ))
    
    return results
