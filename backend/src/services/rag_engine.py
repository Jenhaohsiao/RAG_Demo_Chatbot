"""
RAG Engine Service
RAG 查詢引擎：向量搜尋、Prompt 建構、LLM 生成、Metrics 追蹤

Constitutional Compliance:
- Principle V (Strict RAG): 僅基於檢索內容回答，相似度閾值 ≥0.6
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
    suggestions: Optional[List[str]] = None  # 建議問題（當無法回答時提供）


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
        similarity_threshold: float = 0.6,
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
            similarity_threshold: 相似度閾值（調整為 0.6 以提高問答覆蓋率）
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

    def _generate_suggestions(
        self,
        session_id: UUID,
        user_query: str,
        retrieved_chunks: List[RetrievedChunk],
        language: str = "en"
    ) -> List[str]:
        """
        根據文件內容和用戶問題生成建議問題
        
        Args:
            session_id: Session ID
            user_query: 用戶原始問題
            retrieved_chunks: 檢索到的文檔片段（用於分析文件主題）
            language: UI 語言代碼
        
        Returns:
            List[str]: 2-3 個建議問題
        """
        # 語言映射
        lang_map = {
            'zh-TW': '繁體中文', 'zh-CN': '简体中文', 'en': 'English',
            'ko': '한국어', 'es': 'Español', 'ja': '日本語',
            'fr': 'Français'
        }
        response_language = lang_map.get(language, lang_map.get(language.split('-')[0], 'English'))
        
        # 構建文檔內容摘要供分析 - 增加長度以提供更多上下文
        doc_summary = ""
        if retrieved_chunks:
            # 增加每個chunk的字符數從200到500，總共使用前5個chunks
            doc_texts = [chunk.text[:500] for chunk in retrieved_chunks[:5]]
            doc_summary = "\n\n".join(doc_texts)
        
        prompt = f"""Based on the available document content, generate 2-3 clear and grammatically correct questions that users can ask about this document.

**Available Document Content** (partial):
{doc_summary if doc_summary else "No document content available yet."}

**CRITICAL Requirements**:
1. Generate questions in {response_language} ONLY
2. Questions MUST be grammatically correct and natural-sounding
3. Questions MUST use EXACT keywords and phrases that appear in the document content above
4. Questions should be DIRECTLY ANSWERABLE by quoting or paraphrasing the content above
5. Focus on specific facts, names, events, or details mentioned in the document
6. Return ONLY the questions, one per line, no numbering or bullets
7. Generate exactly 2-3 questions
8. IMPORTANT: Make questions specific enough that they can be answered with the content above

**Good Examples** (specific and answerable):
- 故事的主角叫什麼名字？
- 愛麗絲在花園裡遇到了哪些角色？
- 瘋帽匠的茶會上發生了什麼事？

**Bad Examples** (too vague or not answerable from content):
- 這個故事想表達什麼？
- 作者為什麼這樣寫？
- 這本書的主題是什麼？

**Your Suggested Questions** (must be specific and directly answerable from the content above):"""

        try:
            response = self._generate_with_retry(prompt, session_id)
            # 使用 candidates API 避免 UTF-16 編碼問題
            try:
                suggestions_text = response.candidates[0].content.parts[0].text.strip()
            except (IndexError, AttributeError):
                suggestions_text = response.text.strip()
            
            # 解析建議問題
            suggestions = [s.strip() for s in suggestions_text.split('\n') if s.strip()]
            # 清理格式（移除數字開頭、符號等）
            cleaned = []
            for s in suggestions[:3]:
                # 移除開頭的數字、點、破折號等
                s = s.lstrip('0123456789.-•）) \t')
                if s and len(s) > 5:  # 過濾太短的
                    cleaned.append(s)
            
            return cleaned[:3] if cleaned else []
        except Exception as e:
            logger.warning(f"[{session_id}] Failed to generate suggestions: {e}")
            return []

    def generate_initial_suggestions(
        self,
        session_id: UUID,
        language: str = "en"
    ) -> List[str]:
        """
        Generate initial suggested questions based on uploaded documents.
        Used for "Default Question Bubbles" feature.
        """
        try:
            # 1. Get comprehensive document context
            # Use scroll to get diverse chunks from the entire document
            # This ensures questions can be generated from any part of the document
            clean_session_id = str(session_id).replace("-", "")
            collection_name = f"session_{clean_session_id}"
            
            # Use scroll to get a diverse sample of document chunks
            # This is better than searching for "summary" which may miss specific details
            try:
                points, _ = self.vector_store.client.scroll(
                    collection_name=collection_name,
                    limit=15,  # Get more chunks for better coverage
                    with_payload=True,
                    with_vectors=False
                )
                if not points:
                    return []
                    
                retrieved_chunks = [
                    RetrievedChunk(
                        chunk_id=str(point.id),
                        text=point.payload.get('text', ''),
                        similarity_score=1.0,  # Scroll doesn't provide similarity scores
                        document_id=point.payload.get('document_id', ''),
                        source_reference=point.payload.get('source_reference', ''),
                        chunk_index=point.payload.get('chunk_index', 0)
                    ) for point in points
                ]
            except Exception as scroll_error:
                logger.warning(f"[{session_id}] Scroll failed, falling back to search: {scroll_error}")
                # Fallback: search with generic query
                query_embedding = self.embedder.embed_text("main content overview details")
                results = self.vector_store.search_similar(
                    collection_name=collection_name,
                    query_vector=query_embedding.vector,
                    limit=15,
                    score_threshold=0.0
                )
                if not results:
                    return []
                    
                retrieved_chunks = [
                    RetrievedChunk(
                        chunk_id=str(r['id']),
                        text=r['payload'].get('text', ''),
                        similarity_score=r['score'],
                        document_id=r['payload'].get('document_id', ''),
                        source_reference=r['payload'].get('source_reference', ''),
                        chunk_index=r['payload'].get('chunk_index', 0)
                    ) for r in results
                ]
            
            # 2. Generate suggestions
            lang_map = {
                'zh-TW': '繁體中文', 'zh-CN': '简体中文', 'en': 'English',
                'ko': '한국어', 'es': 'Español', 'ja': '日本語',
                'fr': 'Français'
            }
            response_language = lang_map.get(language, lang_map.get(language.split('-')[0], 'English'))
            
            # Use full chunk text (up to 2000 chars) for maximum context
            # This ensures generated questions have complete information
            doc_summary = "\n\n--- Section ---\n\n".join([chunk.text[:2000] for chunk in retrieved_chunks])
            
            prompt = f"""You are generating questions for a RAG chatbot. The questions you generate WILL BE ASKED BACK TO YOU, and you must be able to answer them using ONLY the document content provided below.

**Document Content**:
{doc_summary}

**CRITICAL Requirements**:
1. Generate questions in {response_language} ONLY
2. Questions MUST be DIRECTLY ANSWERABLE using ONLY the content shown above
3. Each question should ask about SPECIFIC FACTS that appear EXPLICITLY in the document:
   - Names of people, places, or things mentioned MULTIPLE times
   - Specific actions or events that are CLEARLY described
   - Concrete details that appear in MULTIPLE sections
   - Direct quotes or statements that are PROMINENTLY featured
4. Questions must be ROBUST to different phrasings:
   - The answer should be findable even if the question is asked differently
   - Focus on CENTRAL facts that appear in multiple chunks
   - Avoid obscure details mentioned only once
5. DO NOT ask about:
   - Themes, meanings, or interpretations
   - Information not present in the document
   - Opinions or analysis
   - General summaries or overviews
   - Obscure details mentioned only once
   - Minor side characters or events
6. Before finalizing each question, verify:
   ✓ Can I find the EXACT answer in MULTIPLE places in the document?
   ✓ Is this a CENTRAL fact that the document emphasizes?
   ✓ Would different phrasings of this question still find the answer?
   ✓ Is the answer a specific fact, not a general concept?
7. Return 5 questions (we will test and select the best 3), one per line, no numbering or bullets

**Good Examples** (central, prominent facts):
- 愛麗絲用什麼東西扇風？（如果文中多次提到扇子/葉子）
- 故事的主角叫什麼名字？（主要人物，頻繁出現）
- 愛麗絲喝了什麼變小了？（關鍵情節）

**Bad Examples** (obscure or one-time mentions):
- 控訴書連面寫的是誰偷了餡餅？（可能只提到一次，容易遺漏）
- 第三個僕人穿什麼顏色的衣服？（次要細節）

**Bad Examples** (too vague or interpretive):
- 這個故事在講什麼？
- 愛麗絲的心情如何？
- 這段文字的主題是什麼？

**IMPORTANT**: These questions will be tested automatically. Only questions with clear answers in the document above will pass validation.

**Suggested Questions**:"""

            response = self._generate_with_retry(prompt, session_id)
            # 使用 candidates API 避免 UTF-16 編碼問題
            try:
                suggestions_text = response.candidates[0].content.parts[0].text.strip()
            except (IndexError, AttributeError):
                suggestions_text = response.text.strip()
            
            suggestions = [s.strip() for s in suggestions_text.split('\n') if s.strip()]
            cleaned = []
            for s in suggestions[:3]:
                s = s.lstrip('0123456789.-•）) \t')
                if s and len(s) > 5:
                    cleaned.append(s)
            
            # Validate questions by ACTUALLY TESTING if they can be answered
            # This is the most reliable way to ensure question quality
            validated_questions = []
            for question in cleaned[:5]:  # Test up to 5 to get best 3
                try:
                    logger.debug(f"[{session_id}] Testing question: {question[:50]}...")
                    
                    # Test 1: Quick keyword check (fast filter)
                    common_words = {'什麼', '哪', '誰', '為什麼', '如何', '是', '的', '了', '在', '用', '有', '嗎',
                                   'what', 'who', 'where', 'when', 'why', 'how', 'is', 'are', 'the', 'a', 'an', 'do', 'does'}
                    question_terms = set(question.lower().replace('？', '').replace('?', '').split())
                    key_terms = question_terms - common_words
                    
                    doc_text_lower = doc_summary.lower()
                    has_keyword_match = any(term in doc_text_lower for term in key_terms if len(term) > 1)
                    
                    if not has_keyword_match:
                        logger.warning(f"[{session_id}] Question rejected (no keyword match): {question[:50]}...")
                        continue
                    
                    # Test 2: Actually try to answer the question with RAG (most reliable)
                    # Use SAME threshold as actual query to ensure consistency
                    # Embed the question and search for relevant content
                    test_embedding = self.embedder.embed_query(question)
                    test_results = self.vector_store.search_similar(
                        collection_name=collection_name,
                        query_vector=test_embedding.vector,
                        limit=5,
                        score_threshold=self.similarity_threshold  # Use same threshold as actual queries!
                    )
                    
                    # Require STRONG evidence that the question is answerable
                    if test_results and len(test_results) >= 3:  # Need at least 3 chunks
                        # Check if we have HIGH quality matches
                        top_score = test_results[0]['score']
                        avg_top3_score = sum(r['score'] for r in test_results[:3]) / 3
                        
                        # Stricter validation: require both high top score AND good average
                        if top_score >= 0.45 and avg_top3_score >= 0.38:
                            validated_questions.append(question)
                            logger.info(f"[{session_id}] Question validated (top={top_score:.3f}, avg={avg_top3_score:.3f}): {question[:50]}...")
                            
                            # Stop when we have 3 good questions
                            if len(validated_questions) >= 3:
                                break
                        else:
                            logger.warning(f"[{session_id}] Question rejected (top={top_score:.3f}, avg={avg_top3_score:.3f}): {question[:50]}...")
                    else:
                        logger.warning(f"[{session_id}] Question rejected (insufficient results={len(test_results)}): {question[:50]}...")
                        
                except Exception as val_error:
                    logger.warning(f"[{session_id}] Question validation error: {val_error}")
                    # Don't include if validation fails - better safe than sorry
                    continue
            
            if not validated_questions:
                logger.warning(f"[{session_id}] No questions passed validation, returning best effort suggestions")
                # Fallback: return original suggestions with warning
                return cleaned[:3] if cleaned else []
            
            logger.info(f"[{session_id}] Successfully validated {len(validated_questions)}/5 questions")
            return validated_questions[:3]
            
        except Exception as e:
            logger.warning(f"[{session_id}] Failed to generate initial suggestions: {e}")
            return []
    
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
        
        # 檢測是否為友好對話（如「你好」、「謝謝」等）
        greeting_patterns = [
            '你好', '您好', 'hello', 'hi', 'hey', '안녕', 'hola', 'bonjour', 'こんにちは',
            '謝謝', '感謝', 'thank', 'thanks', '감사', 'gracias', 'merci', 'ありがとう',
            '再見', 'bye', 'goodbye', '안녕히', 'adiós', 'au revoir', 'さようなら'
        ]
        is_greeting = any(pattern in user_query.lower() for pattern in greeting_patterns) and len(user_query) < 20
        
        # 如果是友好對話，直接返回友好回應
        if is_greeting:
            logger.info(f"[{session_id}] Greeting detected, returning friendly response")
            greeting_response = self._get_greeting_response(user_query, language)
            
            # 即使是 greeting，也生成建議問題讓用戶快速開始
            suggestions = None
            try:
                # 使用 scroll 獲取一些文檔樣本來生成建議
                points, _ = self.vector_store.client.scroll(
                    collection_name=collection_name,
                    limit=3,
                    with_payload=True,
                    with_vectors=False
                )
                if points:
                    sample_chunks = [
                        RetrievedChunk(
                            chunk_id=str(point.id),
                            text=point.payload.get('text', ''),
                            similarity_score=1.0,  # Dummy score for scroll results
                            document_id=point.payload.get('document_id', ''),
                            source_reference=point.payload.get('source_reference', ''),
                            chunk_index=point.payload.get('chunk_index', 0)
                        ) for point in points
                    ]
                    suggestions = self._generate_suggestions(session_id, user_query, sample_chunks, language)
                    logger.info(f"[{session_id}] Generated {len(suggestions) if suggestions else 0} suggestions for greeting")
            except Exception as e:
                logger.warning(f"[{session_id}] Failed to generate suggestions for greeting: {e}")
            
            # 創建一個簡單的回應，不計入 metrics
            return RAGResponse(
                llm_response=greeting_response,
                response_type="ANSWERED",
                retrieved_chunks=[],
                similarity_scores=[],
                token_input=0,
                token_output=0,
                token_total=0,
                metrics=None,
                suggestions=suggestions
            )
        
        # 檢測是否為通用文件請求（如「說明文件內容」、「總結這個文件」等）
        general_query_patterns = [
            '說明', '總結', '摘要', '概述', '介紹', '描述', '解釋', '內容',
            'summarize', 'summary', 'explain', 'describe', 'overview', 'content',
            '文件', '文檔', '文章', 'document', 'file', '再說一次', '重新說明'
        ]
        is_general_query = any(pattern in user_query.lower() for pattern in general_query_patterns)
        
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
            
            # 如果沒找到結果或結果太少，用較低閾值重試
            if not search_results or len(search_results) < 3:
                retry_threshold = 0.2 if not search_results else 0.3
                logger.info(f"[{session_id}] Found only {len(search_results)} results, retrying with threshold {retry_threshold}")
                search_results = self.vector_store.search_similar(
                    collection_name=collection_name,
                    query_vector=query_embedding.vector,
                    limit=self.max_chunks,
                    score_threshold=retry_threshold
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
            
            # 修復 Unicode 編碼問題：使用 candidates API 而非 response.text
            # response.text 可能有 UTF-16 代理對錯誤導致 emoji 替換中文字
            try:
                llm_response = response.candidates[0].content.parts[0].text
            except (IndexError, AttributeError):
                # Fallback 到 response.text 如果結構不同
                llm_response = response.text
            
            # 提取 token 使用量
            token_input = response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0
            token_output = response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0
            token_total = token_input + token_output
            
            logger.info(
                f"[{session_id}] LLM response generated "
                f"(tokens: {token_input} + {token_output} = {token_total})"
            )
            
            # 判斷回應類型：是否為「無法回答」
            # 更精確的判斷：需要同時滿足「系統無法回答」的表述，而非內容中的「無法」描述
            cannot_answer_patterns = [
                # 中文：明確的系統無法回答表述
                "文件中沒有提到", "文件中未提到", "文件中找不到", "文件中沒有相關", 
                "文件中無相關", "無法從文件", "無法在文件", "未能找到", "沒有找到相關",
                "抱歉.*無法", "抱歉.*找不到", "對不起.*無法", "對不起.*找不到",
                # 英文
                "document does not mention", "document doesn't mention", 
                "cannot find.*document", "no relevant.*found", "unable to find",
                "sorry.*cannot", "sorry.*unable",
                # 德文
                "nicht finden",
                # 韓文
                "찾을 수 없",
                # 日文
                "見つかりません"
            ]
            
            import re
            # 使用正則表達式匹配更精確的模式
            has_cannot_answer_indicator = any(
                re.search(pattern, llm_response, re.IGNORECASE) 
                for pattern in cannot_answer_patterns
            )
            
            # 如果檢索到內容但回應中有明確的「無法回答」表述，才標記為 CANNOT_ANSWER
            # 如果完全沒檢索到內容，也標記為 CANNOT_ANSWER
            is_cannot_answer = has_cannot_answer_indicator or len(retrieved_chunks) == 0
            response_type = "CANNOT_ANSWER" if is_cannot_answer else "ANSWERED"
            
            logger.info(f"[{session_id}] Response type: {response_type} (has_indicator={has_cannot_answer_indicator}, chunks={len(retrieved_chunks)})")
            
            # 如果無法回答，生成建議問題
            suggestions = None
            if is_cannot_answer:
                logger.info(f"[{session_id}] Generating suggestions for unanswered query...")
                # 嘗試用較低閾值獲取一些文檔內容來生成建議
                try:
                    sample_results = self.vector_store.search_similar(
                        collection_name=collection_name,
                        query_vector=query_embedding.vector,
                        limit=3,
                        score_threshold=0.1  # 非常低的閾值，只是為了獲取文檔樣本
                    )
                    sample_chunks = [
                        RetrievedChunk(
                            chunk_id=str(r['id']),
                            text=r['payload'].get('text', ''),
                            similarity_score=r['score'],
                            document_id=r['payload'].get('document_id', ''),
                            source_reference=r['payload'].get('source_reference', ''),
                            chunk_index=r['payload'].get('chunk_index', 0)
                        ) for r in sample_results
                    ]
                    logger.debug(f"[{session_id}] Found {len(sample_chunks)} sample chunks for suggestion generation")
                    suggestions = self._generate_suggestions(session_id, user_query, sample_chunks, language)
                    logger.info(f"[{session_id}] Generated {len(suggestions) if suggestions else 0} suggestions")
                except Exception as e:
                    logger.warning(f"[{session_id}] Failed to get sample chunks for suggestions: {e}")
                    try:
                        suggestions = self._generate_suggestions(session_id, user_query, [], language)
                        logger.info(f"[{session_id}] Generated {len(suggestions) if suggestions else 0} fallback suggestions")
                    except Exception as e2:
                        logger.error(f"[{session_id}] Failed to generate fallback suggestions: {e2}")
                        suggestions = None
            
            # 更新記憶體和 metrics
            self._update_memory(session_id, user_query, response_type, token_total)
            metrics = self._calculate_metrics(
                session_id, token_input, token_output, 
                len(retrieved_chunks), response_type=response_type
            )
            
            return RAGResponse(
                llm_response=llm_response,
                response_type=response_type,
                retrieved_chunks=retrieved_chunks,
                similarity_scores=similarity_scores,
                token_input=token_input,
                token_output=token_output,
                token_total=token_total,
                metrics=metrics,
                suggestions=suggestions
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
                "zh-TW": """請為以下文檔內容提供一段完整的摘要（約 150 字左右）。摘要應該：
1. 使用繁體中文寫作
2. 包含主要主題和關鍵點
3. 簡潔清晰，適合快速瀏覽
4. 完整描述，不要使用「...」或「等等」結尾
5. 字數控制在 150 字左右即可，不強制限制

文檔內容：
""",
                "zh-CN": """请为以下文档内容提供一段完整的摘要（约 150 字左右）。摘要应该：
1. 使用简体中文写作
2. 包含主要主题和关键点
3. 简洁清晰，适合快速浏览
4. 完整描述，不要使用「...」或「等等」结尾
5. 字数控制在 150 字左右即可，不强制限制

文档内容：
""",
                "zh": """請為以下文檔內容提供一段完整的摘要（約 150 字左右）。摘要應該：
1. 直接用中文寫作，無需翻譯聲明
2. 包含主要主題和關鍵點
3. 簡潔清晰，適合快速瀏覽
4. 完整描述，不要使用「...」或「等等」結尾
5. 字數控制在 150 字左右即可，不強制限制

文檔內容：
""",
                "en": """Please provide a complete summary of the following document (approximately 150 words). The summary should:
1. Be written directly in English
2. Include main topics and key points
3. Be clear and suitable for quick scanning
4. End with a complete sentence, DO NOT use "..." or "etc." at the end
5. Target around 150 words, but no strict limit

Document content:
""",
                "ko": """다음 문서에 대한 완전한 요약을 제공하십시오(약 150단어). 요약은 다음과 같아야 합니다:
1. 한국어로 직접 작성
2. 주요 주제 및 핵심 포인트 포함
3. 명확하고 빠른 스캔에 적합
4. 완전한 문장으로 끝내고, "..." 또는 "등등"으로 끝내지 마세요
5. 약 150단어 정도로 작성하되, 엄격한 제한은 없음

문서 내용:
""",
                "es": """Proporcione un resumen completo del siguiente documento (aproximadamente 150 palabras). El resumen debe:
1. Ser escrito directamente en español
2. Incluir temas principales y puntos clave
3. Ser claro y apto para escaneo rápido
4. Terminar con una oración completa, NO use "..." o "etc." al final
5. Apuntar a unas 150 palabras, pero sin límite estricto

Contenido del documento:
""",
                "ja": """次のドキュメントの完全な要約を提供してください（約150語）。要約は次のようにしてください:
1. 日本語で直接作成
2. 主要なトピックと重要なポイントを含める
3. 明確で、素早いスキャンに適している
4. 完全な文で終わり、「...」や「など」で終わらせないでください
5. 約150語を目標にしますが、厳密な制限はありません

ドキュメント内容:
""",
                "fr": """Veuillez fournir un résumé complet du document suivant (environ 150 mots). Le résumé doit:
1. Être écrit directement en français
2. Inclure les sujets principaux et les points clés
3. Être clair et approprié pour un balayage rapide
4. Se terminer par une phrase complète, NE PAS utiliser "..." ou "etc." à la fin
5. Viser environ 150 mots, mais sans limite stricte

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
            
            # 使用 candidates API 避免 UTF-16 編碼問題
            try:
                summary = response.candidates[0].content.parts[0].text.strip()
            except (IndexError, AttributeError):
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
                          支援變數：{{language}}, {{context}}, {{query}}, {{persona}}
        
        Returns:
            str: 完整 Prompt
        """
        # If custom prompt is provided, use it directly with variable substitution
        if custom_prompt:
            logger.info(f"Using custom_prompt (length={len(custom_prompt)}, preview={custom_prompt[:200]}...)")
            # 語言映射（支援 zh-TW, zh-CN 等完整語言代碼）
            language_names = {
                "zh-TW": "Traditional Chinese (繁體中文)",
                "zh-CN": "Simplified Chinese (简体中文)",
                "zh": "Traditional Chinese (繁體中文)",
                "en": "English",
                "ko": "Korean (한국어)",
                "es": "Spanish (Español)",
                "ja": "Japanese (日本語)",
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
            # {{persona}} 變數會在前端生成 custom_prompt 時直接替換，這裡不處理
            
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
        lang_key = language if language in ["en", "zh", "ko", "es", "ja", "fr"] else (language.split('-')[0] if '-' in language else "en")
        
        document_definition = {
            "zh": """**術語定義**:
- **文檔 (Documents)**: 用戶上傳到系統中的內容，包括網頁、PDF、文本文件等。這些內容已被提取、清理、分塊和索引。
- **分塊 (Chunks)**: 文檔被分成的小段落，以便進行語義搜索。

**重要指示**:
- 請勿在回答中包含引用標記（如 [Document 1], [文件1] 等）。
- 直接回答問題即可。""",
            "en": """**Term Definitions**:
- **Documents**: Content uploaded by the user (webpages, PDFs, text files, etc.) that has been extracted, cleaned, chunked and indexed.
- **Chunks**: Small passages that documents are split into for semantic search.

**Important Instructions**:
- Do NOT include citation markers (e.g., [Document 1]) in your response.
- Just answer the question directly.""",
            "ko": """**용어 정의**:
- **문서**: 사용자가 시스템에 업로드한 콘텐츠(웹페이지, PDF, 텍스트 파일 등)로, 추출, 정리, 청크 분할 및 인덱싱되었습니다.
- **청크**: 의미론적 검색을 위해 문서를 분할한 작은 구절입니다.

**중요 지침**:
- 답변에 인용 표시(예: [Document 1])를 포함하지 마십시오.
- 질문에 직접 답변하십시오.""",
            "es": """**Definiciones de términos**:
- **Documentos**: Contenido cargado por el usuario (páginas web, PDF, archivos de texto, etc.) que ha sido extraído, limpiado, dividido y indexado.
- **Fragmentos**: Pasajes pequeños en los que se dividen los documentos para la búsqueda semántica.

**Instrucciones importantes**:
- NO incluya marcadores de cita (por ejemplo, [Document 1]) en su respuesta.
- Responda directamente a la pregunta.""",
            "ja": """**用語定義**:
- **文書**: ユーザーがシステムにアップロードしたコンテンツ（Webページ、PDF、テキストファイルなど）で、抽出、クリーニング、チャンク分割、インデックス化されています。
- **チャンク**: セマンティック検索のために文書を分割した小さな段落です。

**重要な指示**:
- 回答に引用マーカー（例：[Document 1]）を含めないでください。
- 質問に直接回答してください。""",
            "fr": """**Définitions des termes**:
- **Documents**: Contenu téléchargé par l'utilisateur (pages web, PDF, fichiers texte, etc.) qui a été extrait, nettoyé, divisé en chunks et indexé.
- **Chunks**: Petits passages dans lesquels les documents sont divisés pour la recherche sémantique."""
        }
        
        # 獲取 document_definition 時也使用 lang_key
        doc_def = document_definition.get(lang_key, document_definition['en'])
        
        if not retrieved_chunks:
            # 沒有檢索到相關文檔片段時的 Prompt - 友善地說明無法找到資訊
            prompt = f"""You are a friendly and helpful RAG (Retrieval-Augmented Generation) assistant.

{doc_def}

**CRITICAL RULES - YOU MUST FOLLOW**:
1. **Response Language**: ALWAYS respond ONLY in {response_language}. This is mandatory.
2. **Be Friendly and Apologetic**: Since no relevant document passages were found for this question, respond in a warm, friendly, and understanding tone.
3. **Explain Politely**: Gently explain that you couldn't find information about this topic in the uploaded documents.
4. **Offer Help**: Suggest that the user can ask questions about topics that ARE covered in the documents.
5. **Conversational Tone**: Use a natural, conversational style - NOT formal or robotic. Be empathetic and helpful.
6. **NO Red Flags**: Do NOT use phrases like "無法回答", "cannot answer", "找不到", "not found" - instead use softer phrases like "這個問題在文件中沒有相關資訊", "the documents don't cover this topic".
7. **SINGLE LANGUAGE ONLY**: Your entire response must be in {response_language} only.

**User Question**:
{user_query}

**Your Answer** (MUST be ONLY in {response_language}, use a friendly and conversational tone to explain that this topic isn't covered in the documents, and offer to help with other questions):"""
        else:
            # 有文檔時的標準 RAG Prompt - STRICT RAG with partial match handling
            prompt = f"""You are a RAG (Retrieval-Augmented Generation) assistant that ONLY answers based on uploaded documents.

{doc_def}

**CRITICAL RULES - YOU MUST FOLLOW**:
1. **Response Language**: ALWAYS respond ONLY in {response_language}. This is mandatory. DO NOT include any other language in your response. DO NOT include English translations or explanations in parentheses.
2. **STRICT RAG POLICY**: ONLY answer based on the retrieved documents below.
3. **DO NOT make up information** or use knowledge outside the documents.
4. **CONTENT TRANSFORMATION REQUESTS ARE ALLOWED**: If the user asks you to present the document content in a different way (e.g., "用5歲小孩也能懂的方式說", "simplify this", "explain like I'm 5", "用詩的形式", "make it funny"), you SHOULD do so based on the document content below. These are NOT questions asking for information outside the documents - they are requests to reformat/restyle the existing document content.
5. **GENERAL REQUESTS**: If the user asks to "explain", "summarize", or "describe" the document content (with or without a specific style/tone like "健身教練口氣"), provide a summary based on the retrieved document chunks below.
6. **STYLE REQUESTS**: If the user requests a specific tone, persona, audience level, or format (e.g., "用老師口氣", "用健身教練口氣", "用朋友口吻", "for a 5-year-old", "in poem format"), adapt your response style accordingly while still basing content ONLY on the documents.
7. **PARTIAL MATCH HANDLING**: If the user's question is PARTIALLY related to the documents:
   - First acknowledge what information IS available in the documents
   - Then clearly state what specific aspect of the question is NOT covered
8. **CITE document numbers** when using information.
9. Be accurate and helpful.
10. **SINGLE LANGUAGE ONLY**: Your entire response must be in {response_language} only. No bilingual content, no mixed languages.

**Retrieved Documents**:
{context}

**User Question**:
{user_query}

**Your Answer** (MUST be ONLY in {response_language}, based ONLY on the documents above. If user requests a specific style or format transformation, apply it to the document content. If asking for explanation/summary, provide one based on the document chunks):"""
        
        return prompt
    
    def _get_greeting_response(self, user_query: str, language: str = "en") -> str:
        """
        取得友好對話回應
        
        Args:
            user_query: 用戶查詢
            language: UI 語言代碼
        
        Returns:
            str: 友好回應訊息
        """
        # 檢測是感謝還是問候
        is_thanks = any(word in user_query.lower() for word in ['謝謝', '感謝', 'thank', 'thanks', '감사', 'gracias', 'merci', 'ありがとう'])
        
        if is_thanks:
            messages = {
                "zh-TW": "不客氣！我很樂意協助您。如果您有任何關於已上傳文件內容的問題，隨時都可以提問喔！",
                "zh-CN": "不客气！我很乐意协助您。如果您有任何关于已上传文件内容的问题，随时都可以提问哦！",
                "zh": "不客氣！我很樂意協助您。如果您有任何關於已上傳文件內容的問題，隨時都可以提問喔！",
                "en": "You're welcome! I'm happy to help. Feel free to ask me anything about the uploaded documents!",
                "ko": "천만에요! 기꺼이 도와드리겠습니다. 업로드된 문서에 대해 궁금한 점이 있으시면 언제든지 물어보세요!",
                "es": "¡De nada! Estoy feliz de ayudar. ¡Pregúntame cualquier cosa sobre los documentos cargados!",
                "ja": "どういたしまして！お手伝いできて嬉しいです。アップロードされたドキュメントについて何でも聞いてください！",
                "fr": "Je vous en prie ! Je suis heureux d'aider. N'hésitez pas à me poser des questions sur les documents téléchargés !"
            }
        else:
            # 問候語
            messages = {
                "zh-TW": "您好！我是您的文件助理。我可以幫您回答關於已上傳文件內容的問題。請隨時提問吧！",
                "zh-CN": "您好！我是您的文件助理。我可以帮您回答关于已上传文件内容的问题。请随时提问吧！",
                "zh": "您好！我是您的文件助理。我可以幫您回答關於已上傳文件內容的問題。請隨時提問吧！",
                "en": "Hello! I'm your document assistant. I can help answer questions about the content of your uploaded documents. Feel free to ask me anything!",
                "ko": "안녕하세요! 저는 문서 도우미입니다. 업로드된 문서 내용에 대한 질문에 답변해 드릴 수 있습니다. 무엇이든 물어보세요!",
                "es": "¡Hola! Soy tu asistente de documentos. Puedo ayudarte a responder preguntas sobre el contenido de tus documentos cargados. ¡Pregúntame lo que quieras!",
                "ja": "こんにちは！私はドキュメントアシスタントです。アップロードされたドキュメントの内容についての質問にお答えできます。何でも聞いてください！",
                "fr": "Bonjour ! Je suis votre assistant de documents. Je peux vous aider à répondre aux questions sur le contenu de vos documents téléchargés. N'hésitez pas à me demander quoi que ce soit !"
            }
        
        # 使用語言映射邏輯
        lang_key = language
        if language.startswith('zh'):
            if 'CN' in language or 'Hans' in language:
                lang_key = 'zh-CN'
            else:
                lang_key = 'zh-TW'
        elif language not in messages:
            lang_key = 'en'
        
        return messages.get(lang_key, messages['en'])
    
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

    def generate_initial_suggestions(self, session_id: UUID, language: str = "en") -> List[str]:
        """
        Generate 3 initial suggested questions based on document summary.
        
        Args:
            session_id: Session ID
            language: Language code
            
        Returns:
            List[str]: List of 3 suggested questions
        """
        try:
            # 1. Get document summary (or first chunk if summary not available)
            # Since we don't store summary in RAGEngine, we might need to fetch from Qdrant or rely on what's passed.
            # However, for simplicity and since we don't have easy access to document summary here without passing it,
            # let's try to retrieve a few random chunks to generate questions.
            
            # Clean session ID for collection name
            clean_session_id = str(session_id).replace("-", "")
            collection_name = f"session_{clean_session_id}"
            
            # Retrieve a few random points (using vector search with a dummy vector or scroll)
            # Here we use scroll to get some points
            points, _ = self.vector_store.client.scroll(
                collection_name=collection_name,
                limit=3,
                with_payload=True,
                with_vectors=False
            )
            
            if not points:
                logger.warning(f"[{session_id}] No documents found for suggestions")
                return []
                
            context_text = "\n".join([point.payload.get('text', '') for point in points])
            
            # 2. Construct prompt
            prompt = f"""
            Based on the following document context, generate 3 short, relevant questions that a user might ask.
            The questions should be in {language} language.
            Return ONLY the 3 questions, one per line. No numbering or bullets.
            
            Context:
            {context_text[:2000]}
            """
            
            # 3. Call LLM
            model = genai.GenerativeModel(settings.gemini_model)
            response = model.generate_content(prompt)
            
            # 4. Parse response
            questions = [line.strip() for line in response.text.strip().split('\n') if line.strip()]
            return questions[:3]
            
        except Exception as e:
            logger.error(f"[{session_id}] Failed to generate initial suggestions: {e}")
            return []


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
