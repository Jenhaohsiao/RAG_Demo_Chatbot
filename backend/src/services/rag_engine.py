"""
RAG Engine Service
RAG 查詢引擎：向量搜尋、Prompt 建構、LLM 生成、Metrics 追蹤

Constitutional Compliance:
- Principle V (Strict RAG): 僅基於檢索內容回答，相似度閾值 ≥0.7
- Principle III (Gemini-Only): 使用 Gemini 模型 (gemini-1.5-pro - cost-efficient)
"""

import logging
import time
from dataclasses import dataclass, field
from typing import List, Optional
from uuid import UUID
from collections import deque

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

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
        
        # Rate limiting 配置 (T099)
        self.max_retries = 3  # 最多重試 3 次
        self.retry_delay = 1  # 初始延遲 1 秒
        self.max_retry_delay = 32  # 最大延遲 32 秒 (exponential backoff)
        
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
            f"memory_limit={memory_limit}, token_threshold={token_threshold}, "
            f"rate_limiting={self.max_retries} retries with exponential backoff"
        )
    
    def _generate_with_retry(self, prompt: str, session_id: UUID) -> str:
        """
        使用指數退避重試邏輯調用 Gemini API (T099 Rate Limiting)
        
        Args:
            prompt: 要發送給 LLM 的 prompt
            session_id: 會話 ID (用於日誌)
            
        Returns:
            LLM 生成的回應文本
            
        Raises:
            Exception: 當所有重試都失敗時拋出最後一個異常
        """
        retry_count = 0
        current_delay = self.retry_delay
        
        while retry_count < self.max_retries:
            try:
                logger.debug(f"[{session_id}] Generating LLM response (attempt {retry_count + 1}/{self.max_retries})")
                
                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=self.temperature,
                        max_output_tokens=2048,
                    )
                )
                
                logger.info(f"[{session_id}] LLM response generated successfully")
                return response
                
            except google_exceptions.ResourceExhausted as e:
                # Rate limit 錯誤
                logger.warning(
                    f"[{session_id}] Rate limit hit (attempt {retry_count + 1}/{self.max_retries}). "
                    f"Retrying in {current_delay}s..."
                )
                retry_count += 1
                
                if retry_count >= self.max_retries:
                    logger.error(
                        f"[{session_id}] Max retries exceeded for rate limit. "
                        "API usage limit reached. Please try again in a few minutes."
                    )
                    raise Exception(
                        "API 使用量已達上限。請稍候幾分鐘後重試。"
                    ) from e
                
                time.sleep(current_delay)
                # Exponential backoff: 1s -> 2s -> 4s -> 8s ...
                current_delay = min(current_delay * 2, self.max_retry_delay)
                
            except google_exceptions.InternalServerError as e:
                # 伺服器錯誤，值得重試
                logger.warning(
                    f"[{session_id}] API server error (attempt {retry_count + 1}/{self.max_retries}). "
                    f"Retrying in {current_delay}s..."
                )
                retry_count += 1
                
                if retry_count >= self.max_retries:
                    logger.error(f"[{session_id}] Max retries exceeded for server error.")
                    raise Exception(
                        "API 伺服器暫時不可用。請稍候重試。"
                    ) from e
                
                time.sleep(current_delay)
                current_delay = min(current_delay * 2, self.max_retry_delay)
                
            except google_exceptions.ServiceUnavailable as e:
                # 服務不可用，重試
                logger.warning(
                    f"[{session_id}] API service unavailable (attempt {retry_count + 1}/{self.max_retries}). "
                    f"Retrying in {current_delay}s..."
                )
                retry_count += 1
                
                if retry_count >= self.max_retries:
                    logger.error(f"[{session_id}] Max retries exceeded for service unavailable.")
                    raise Exception(
                        "AI 服務暫時不可用。請稍候重試。"
                    ) from e
                
                time.sleep(current_delay)
                current_delay = min(current_delay * 2, self.max_retry_delay)
                
            except google_exceptions.DeadlineExceeded as e:
                # 請求超時，重試
                logger.warning(
                    f"[{session_id}] API request timeout (attempt {retry_count + 1}/{self.max_retries}). "
                    f"Retrying in {current_delay}s..."
                )
                retry_count += 1
                
                if retry_count >= self.max_retries:
                    logger.error(f"[{session_id}] Max retries exceeded for timeout.")
                    raise Exception(
                        "請求超時。請重試。"
                    ) from e
                
                time.sleep(current_delay)
                current_delay = min(current_delay * 2, self.max_retry_delay)
    
    def query(
        self,
        session_id: UUID,
        user_query: str,
        similarity_threshold: Optional[float] = None,
        language: str = "en",
        custom_prompt: Optional[str] = None
    ) -> RAGResponse:
        """
        執行 RAG 查詢
        
        Args:
            session_id: Session ID
            user_query: 使用者查詢
            similarity_threshold: Session specific similarity threshold (overrides default)
            language: UI language code
            custom_prompt: Custom prompt template (overrides default)
        
        Returns:
            RAGResponse: RAG 回應結果
        
        Raises:
            ValueError: 當查詢為空時
            Exception: 當 RAG 處理失敗時
        """
        if not user_query or not user_query.strip():
            raise ValueError("Query cannot be empty")
        
        # Use session-specific threshold or default
        threshold = similarity_threshold if similarity_threshold is not None else self.similarity_threshold
        
        logger.info(f"[{session_id}] RAG query: {user_query[:100]} (threshold={threshold})")
        
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
                score_threshold=threshold
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
            
            # Step 3: 建構 Prompt（即使沒有檢索到文檔，也讓 LLM 嘗試回答）
            prompt = self._build_prompt(user_query, retrieved_chunks, language, custom_prompt)
            
            # Step 4: LLM 生成 (with T099 rate limiting & retry logic)
            logger.debug(f"[{session_id}] Generating LLM response...")
            response = self._generate_with_retry(prompt, session_id)
            
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
    
    def generate_summary(
        self,
        session_id: UUID,
        document_content: str,
        language: str = "en",
        max_tokens: int = 300
    ) -> str:
        """
        生成文檔摘要
        
        Args:
            session_id: Session ID
            document_content: 文檔內容
            language: UI 語言代碼 (en, zh-TW, zh-CN, ko, es, ja, ar, fr)
            max_tokens: 摘要最大 token 數
        
        Returns:
            str: 生成的摘要
        
        Raises:
            ValueError: 當文檔內容為空時
            Exception: 當摘要生成失敗時
        """
        if not document_content or not document_content.strip():
            raise ValueError("Document content cannot be empty")
        
        # 不進行語言映射，直接使用傳入的語言代碼
        logger.info(f"[{session_id}] Generating summary (language={language}, max_tokens={max_tokens})")
        
        try:
            # 多語言摘要提示詞（包括繁體中文和簡體中文）
            summary_prompts = {
                "zh-TW": """請為以下文檔內容提供一段簡潔的摘要（最多 300 個字）。摘要應該：
1. 使用繁體中文寫作
2. 包含主要主題和關鍵點
3. 簡潔清晰，適合快速瀏覽
4. 不超過 300 字

文檔內容：
""",
                "zh-CN": """请为以下文档内容提供一段简洁的摘要（最多 300 个字）。摘要应该：
1. 使用简体中文写作
2. 包含主要主题和关键点
3. 简洁清晰，适合快速浏览
4. 不超过 300 字

文档内容：
""",
                "zh": """請為以下文檔內容提供一段簡潔的摘要（最多 300 個字）。摘要應該：
1. 直接用中文寫作，無需翻譯聲明
2. 包含主要主題和關鍵點
3. 簡潔清晰，適合快速瀏覽
4. 不超過 300 字

文檔內容：
""",
                "en": """Please provide a concise summary of the following document (max 300 words). The summary should:
1. Be written directly in English
2. Include main topics and key points
3. Be clear and suitable for quick scanning
4. Not exceed 300 words

Document content:
""",
                "ko": """다음 문서에 대한 간단한 요약을 제공하십시오(최대 300단어). 요약은 다음과 같아야 합니다:
1. 한국어로 직접 작성
2. 주요 주제 및 핵심 포인트 포함
3. 명확하고 빠른 스캔에 적합
4. 300단어를 초과하지 않음

문서 내용:
""",
                "es": """Proporcione un resumen conciso del siguiente documento (máximo 300 palabras). El resumen debe:
1. Ser escrito directamente en español
2. Incluir temas principales y puntos clave
3. Ser claro y apto para escaneo rápido
4. No exceder 300 palabras

Contenido del documento:
""",
                "ja": """次のドキュメントの簡潔な要約を提供してください（最大300語）。要約は次のようにしてください:
1. 日本語で直接作成
2. 主要なトピックと重要なポイントを含める
3. 明確で、素早いスキャンに適している
4. 300語を超えない

ドキュメント内容:
""",
                "ar": """يرجى تقديم ملخص موجز للمستند التالي (بحد أقصى 300 كلمة). يجب أن يكون الملخص:
1. مكتوبًا مباشرة باللغة العربية
2. يتضمن المواضيع الرئيسية والنقاط الرئيسية
3. واضحًا ومناسبًا للمسح السريع
4. لا يتجاوز 300 كلمة

محتوى المستند:
""",
                "fr": """Veuillez fournir un résumé concis du document suivant (maximum 300 mots). Le résumé doit:
1. Être écrit directement en français
2. Inclure les sujets principaux et les points clés
3. Être clair et approprié pour un balayage rapide
4. Ne pas dépasser 300 mots

Contenu du document:
"""
            }
            
            # 取得語言對應的提示詞，如果不存在則使用英文
            system_prompt = summary_prompts.get(language, summary_prompts["en"])
            
            # 若文檔過長，只取前面部分
            max_content_length = 4000  # 限制輸入內容長度以控制成本
            content_to_summarize = document_content[:max_content_length]
            if len(document_content) > max_content_length:
                content_to_summarize += "\n[... 文檔已截斷 ...]"
            
            full_prompt = system_prompt + content_to_summarize
            
            # 調用 Gemini API 生成摘要 (with T099 rate limiting & retry logic)
            logger.debug(f"[{session_id}] Calling Gemini API for summary...")
            response = self._generate_with_retry(full_prompt, session_id)
            
            # Note: _generate_with_retry already handles temperature as 0.1,
            # but for summary we might want to pass it as parameter in future
            
            summary = response.text.strip()
            
            # 提取 token 使用量（用於日誌記錄）
            token_usage = 0
            if hasattr(response, 'usage_metadata'):
                token_usage = (
                    response.usage_metadata.prompt_token_count + 
                    response.usage_metadata.candidates_token_count
                )
            
            logger.info(
                f"[{session_id}] Summary generated successfully "
                f"({len(summary)} chars, {token_usage} tokens)"
            )
            
            return summary
            
        except Exception as e:
            logger.error(f"[{session_id}] Summary generation failed: {str(e)}", exc_info=True)
            raise
    
    def _build_prompt(
        self,
        user_query: str,
        retrieved_chunks: List[RetrievedChunk],
        language: str = "en",
        custom_prompt: Optional[str] = None
    ) -> str:
        """
        建構 RAG Prompt
        
        憲法 Principle V: 嚴格基於檢索內容回答（但允許回答合理的一般性問題）
        
        Args:
            user_query: 使用者查詢
            retrieved_chunks: 檢索到的文字塊
            language: UI 語言代碼
            custom_prompt: 自定義 prompt 模板（優先使用）
        
        Returns:
            str: 完整 Prompt
        """
        # If custom prompt is provided, use it directly with variable substitution
        if custom_prompt:
            # 語言映射（支援 zh-TW, zh-CN 等完整語言代碼）
            language_names = {
                "zh-TW": "Traditional Chinese (繁體中文)",
                "zh-CN": "Simplified Chinese (简体中文)",
                "zh": "Traditional Chinese (繁體中文)",
                "en": "English",
                "ko": "Korean (한국어)",
                "es": "Spanish (Español)",
                "ja": "Japanese (日本語)",
                "ar": "Arabic (العربية)",
                "fr": "French (Français)"
            }
            response_language = language_names.get(language, language_names.get(language.split('-')[0], "English"))
            
            # 組合檢索內容
            context_parts = []
            for i, chunk in enumerate(retrieved_chunks, 1):
                context_parts.append(
                    f"[Document {i}] (Similarity: {chunk.similarity_score:.3f})\n"
                    f"Source: {chunk.source_reference}\n"
                    f"Content: {chunk.text}\n"
                )
            context = "\n---\n".join(context_parts) if context_parts else "No documents retrieved."
            
            # Replace variables in custom prompt
            prompt = custom_prompt.replace('{{language}}', response_language)
            prompt = prompt.replace('{{context}}', context)
            prompt = prompt.replace('{{query}}', user_query)
            
            return prompt
        
        # Default prompt logic (existing code)
        # 語言映射：UI 語言代碼 -> 語言名稱（支援 zh-TW, zh-CN 等完整語言代碼）
        language_names = {
            "zh-TW": "Traditional Chinese (繁體中文)",
            "zh-CN": "Simplified Chinese (简体中文)",
            "zh": "Traditional Chinese (繁體中文)",
            "en": "English",
            "ko": "Korean (한국어)",
            "es": "Spanish (Español)",
            "ja": "Japanese (日本語)",
            "ar": "Arabic (العربية)",
            "fr": "French (Français)"
        }
        
        # 嘗試完整語言代碼，再嘗試語言前綴
        response_language = language_names.get(language, language_names.get(language.split('-')[0] if '-' in language else language, "English"))
        
        # 組合檢索內容
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            context_parts.append(
                f"[Document {i}] (Similarity: {chunk.similarity_score:.3f})\n"
                f"Source: {chunk.source_reference}\n"
                f"Content: {chunk.text}\n"
            )
        
        context = "\n---\n".join(context_parts) if context_parts else "No documents retrieved."
        
        # 建構 Prompt（嚴格基於文檔內容回答 - Strict RAG）
        # 定義術語（用於幫助LLM理解"文檔"的定義）
        # 獲取語言對應的 key（支援 zh-TW -> zh 映射）
        lang_key = language if language in ["en", "zh", "ko", "es", "ja", "ar", "fr"] else (language.split('-')[0] if '-' in language else "en")
        
        document_definition = {
            "zh": """**術語定義**:
- **文檔 (Documents)**: 用戶上傳到系統中的內容，包括網頁、PDF、文本文件等。這些內容已被提取、清理、分塊和索引。
- **分塊 (Chunks)**: 文檔被分成的小段落，以便進行語義搜索。""",
            "en": """**Term Definitions**:
- **Documents**: Content uploaded by the user (webpages, PDFs, text files, etc.) that has been extracted, cleaned, chunked and indexed.
- **Chunks**: Small passages that documents are split into for semantic search.""",
            "ko": """**용어 정의**:
- **문서**: 사용자가 시스템에 업로드한 콘텐츠(웹페이지, PDF, 텍스트 파일 등)로, 추출, 정리, 청크 분할 및 인덱싱되었습니다.
- **청크**: 의미론적 검색을 위해 문서를 분할한 작은 구절입니다.""",
            "es": """**Definiciones de términos**:
- **Documentos**: Contenido cargado por el usuario (páginas web, PDF, archivos de texto, etc.) que ha sido extraído, limpiado, dividido y indexado.
- **Fragmentos**: Pasajes pequeños en los que se dividen los documentos para la búsqueda semántica.""",
            "ja": """**用語定義**:
- **文書**: ユーザーがシステムにアップロードしたコンテンツ（Webページ、PDF、テキストファイルなど）で、抽出、クリーニング、チャンク分割、インデックス化されています。
- **チャンク**: セマンティック検索のために文書を分割した小さな段落です。""",
            "ar": """**تعريف المصطلحات**:
- **المستندات**: المحتوى الذي حمله المستخدم إلى النظام (صفحات الويب وملفات PDF وملفات نصية وما إلى ذلك) الذي تم استخراجه وتنظيفه وتقسيمه وفهرسته.
- **القطع**: فقرات صغيرة يتم تقسيم المستندات إليها للبحث الدلالي.""",
            "fr": """**Définitions des termes**:
- **Documents**: Contenu téléchargé par l'utilisateur (pages web, PDF, fichiers texte, etc.) qui a été extrait, nettoyé, divisé en chunks et indexé.
- **Chunks**: Petits passages dans lesquels les documents sont divisés pour la recherche sémantique."""
        }
        
        # 獲取 document_definition 時也使用 lang_key
        doc_def = document_definition.get(lang_key, document_definition['en'])
        
        if not retrieved_chunks:
            # 沒有檢索到相關文檔片段時的 Prompt - STRICT RAG：明確告知無法回答
            prompt = f"""You are a RAG (Retrieval-Augmented Generation) assistant that ONLY answers based on uploaded documents.

{doc_def}

**CRITICAL RULES - YOU MUST FOLLOW**:
1. **Response Language**: ALWAYS respond ONLY in {response_language}. This is mandatory. DO NOT include any other language in your response. DO NOT include English translations or explanations in parentheses.
2. **STRICT RAG POLICY**: No relevant document passages were found for this question.
3. **DO NOT answer questions** that require knowledge not in the documents.
4. **DO NOT make up information** or use general knowledge to answer.
5. **Politely explain** that you cannot find relevant information in the uploaded documents.
6. **SINGLE LANGUAGE ONLY**: Your entire response must be in {response_language} only. No bilingual content.

**User Question**:
{user_query}

**Your Answer** (MUST be ONLY in {response_language}, explain that you cannot find relevant content):"""
        else:
            # 有文檔時的標準 RAG Prompt - STRICT RAG
            prompt = f"""You are a RAG (Retrieval-Augmented Generation) assistant that ONLY answers based on uploaded documents.

{doc_def}

**CRITICAL RULES - YOU MUST FOLLOW**:
1. **Response Language**: ALWAYS respond ONLY in {response_language}. This is mandatory. DO NOT include any other language in your response. DO NOT include English translations or explanations in parentheses.
2. **STRICT RAG POLICY**: ONLY answer based on the retrieved documents below.
3. **DO NOT make up information** or use knowledge outside the documents.
4. If the question cannot be answered from the documents, politely say you cannot find the information in the uploaded documents.
5. **CITE document numbers** when using information.
6. Be accurate and concise.
7. **SINGLE LANGUAGE ONLY**: Your entire response must be in {response_language} only. No bilingual content, no mixed languages.

**Retrieved Documents**:
{context}

**User Question**:
{user_query}

**Your Answer** (MUST be ONLY in {response_language}, based ONLY on the documents above):"""
        
        return prompt
    
    def _get_cannot_answer_message(self, language: str = "en") -> str:
        """
        取得「無法回答」訊息
        
        Args:
            language: UI 語言代碼 (支援 zh-TW, zh-CN 等完整代碼)
        
        Returns:
            str: 標準「無法回答」訊息（根據語言）
        """
        messages = {
            "zh-TW": "抱歉，我無法在已上傳的文檔中找到與您問題相關的內容。",
            "zh-CN": "抱歉，我无法在已上传的文档中找到与您问题相关的内容。",
            "zh": "抱歉，我無法在已上傳的文檔中找到與您問題相關的內容。",
            "en": "I'm sorry, I couldn't find relevant information in the uploaded documents to answer this question.",
            "ko": "죄송합니다. 업로드된 문서에서 관련 정보를 찾을 수 없습니다.",
            "es": "Lo siento, no pude encontrar información relevante en los documentos cargados.",
            "ja": "申し訳ありませんが、アップロードされた文書に関連する情報が見つかりませんでした。",
            "ar": "عذرًا، لم أتمكن من العثور على معلومات ذات صلة في المستندات المحملة.",
            "fr": "Désolé, je n'ai pas pu trouver d'informations pertinentes dans les documents téléchargés."
        }
        # 嘗試完整語言代碼，再嘗試語言前綴
        lang_key = language if language in messages else (language.split('-')[0] if '-' in language else language)
        return messages.get(lang_key, messages["en"])
    
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
