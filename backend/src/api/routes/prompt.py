"""
Prompt API Routes
提供系統 Prompt 信息的 API 端點
"""
from fastapi import APIRouter
from typing import Dict, Any, Optional
from src.core.logger import logger

router = APIRouter()

@router.get("/system-prompts", tags=["Prompt"])
async def get_system_prompts() -> Dict[str, Any]:
    """
    獲取系統使用的 Prompt 模板
    
    Returns:
        Dict: 包含各種 Prompt 模板的字典
    """
    
    # RAG 系統主要 Prompt 模板
    rag_prompt_template = """You are a helpful multilingual assistant.

**Term Definitions**:
- **Documents**: Content uploaded by the user (webpages, PDFs, text files, etc.) that has been extracted, cleaned, chunked and indexed.
- **Chunks**: Small passages that documents are split into for semantic search.

**IMPORTANT RULES**:
1. **Response Language**: Always respond in {{language}}. Even if the user types in English, respond in {{language}}
2. **Primary**: Answer based on the provided documents/文檔 when relevant information is available
3. **Secondary**: For general questions (greetings, language requests), you may answer politely
4. If the user asks about document/文檔 content and it's not in the documents, say in {{language}}: "I cannot find this information in the uploaded documents" (中文: "我無法在已上傳的文檔中找到此信息")
5. Cite document numbers when using document information
6. Be helpful, concise, and accurate in {{language}}

**Retrieved Documents/已上傳文檔**:
{{context}}

**User Question/用戶問題**:
{{query}}

**Your Answer** (in {{language}}):"""

    # 摘要生成 Prompt 模板
    summary_prompt_templates = {
        "zh-TW": """請為以下文檔內容提供一段簡潔的摘要（最多 300 個字）。摘要應該：
1. 使用繁體中文寫作
2. 包含主要主題和關鍵點
3. 簡潔清晰，適合快速瀏覽
4. 不超過 300 字

文檔內容：
{{content}}""",
        
        "zh-CN": """请为以下文档内容提供一段简洁的摘要（最多 300 个字）。摘要应该：
1. 使用简体中文写作
2. 包含主要主题和关键点
3. 简洁清晰，适合快速浏览
4. 不超过 300 字

文档内容：
{{content}}""",
        
        "en": """Please provide a concise summary of the following document content (maximum 300 words). The summary should:
1. Be written in English
2. Include main themes and key points
3. Be clear and suitable for quick browsing
4. Not exceed 300 words

Document content:
{{content}}""",
        
        "ja": """以下の文書内容の簡潔な要約（最大300語）を提供してください。要約は：
1. 日本語で書く
2. 主要なテーマとキーポイントを含む
3. 明確で素早い閲覧に適している
4. 300語を超えない

文書内容：
{{content}}""",
        
        "ko": """다음 문서 내용의 간결한 요약(최대 300단어)을 제공해 주세요. 요약은：
1. 한국어로 작성
2. 주요 주제와 핵심 사항 포함
3. 명확하고 빠른 검토에 적합
4. 300단어를 초과하지 않음

문서 내용：
{{content}}"""
    }

    # 內容審核 Prompt
    moderation_prompt = """請分析以下內容是否安全且適當：

{{content}}

請回答：
1. 內容是否適當？ (是/否)
2. 如有問題，問題類型是什麼？
3. 建議的處理方式"""

    # 無文檔時的 Prompt
    no_documents_prompt = """You are a helpful multilingual assistant.

**IMPORTANT RULES**:
1. **Response Language**: Always respond in {{language}}. Even if the user types in English, respond in {{language}}
2. **Context**: Some documents may have been uploaded to the system, but no relevant passages were found for this specific question
3. For general questions (greetings, simple requests, common knowledge), answer naturally and helpfully
4. If the user asks to summarize or explain "the document/文檔/file content", politely explain that you cannot find relevant passages matching their query, and suggest they ask more specific questions about the topics they're interested in
5. Be friendly, concise, and helpful in {{language}}

**User Question**:
{{query}}

**Your Answer** (in {{language}}):"""

    # 語言映射
    language_mappings = {
        "zh": "Traditional Chinese (繁體中文)",
        "en": "English",
        "ko": "Korean (한국어)",
        "es": "Spanish (Español)",
        "ja": "Japanese (日本語)",
        "ar": "Arabic (العربية)",
        "fr": "French (Français)"
    }

    # Constitutional Principles (憲法原則)
    constitutional_principles = [
        "Principle I (MVP First): 優先實現核心功能",
        "Principle II (Testability): 確保所有功能可測試",
        "Principle III (Session Isolation): Session 之間嚴格隔離",
        "Principle IV (Similarity Threshold): 嚴格相似度閾值 ≥ 0.7",
        "Principle V (Strict Citations): 嚴格基於檢索內容回答",
        "Principle VI (Token Awareness): 主動監控 Token 使用",
        "Principle VII (Error Resilience): 優雅處理所有錯誤",
        "Principle VIII (Multilingual): 支持多語言界面和回應",
        "Principle IX (Performance): 響應時間 < 5 秒",
        "Principle X (Security): 內容審核和安全防護",
        "Principle XI (Monitoring): 完整的日誌和指標追蹤",
        "Principle XII (Documentation): 清晰的 API 和功能文檔",
        "Principle XIII (Scalability): 設計考慮擴展性",
        "Principle XIV (Data Privacy): 嚴格保護用戶數據",
        "Principle XV (Version Control): 規範的代碼版本管理",
        "Principle XVI (Testing): 全面的自動化測試",
        "Principle XVII (Deployment): 簡化的部署和維護"
    ]

    logger.info("System prompts requested")
    
    return {
        "rag_prompt_template": rag_prompt_template,
        "summary_prompt_templates": summary_prompt_templates,
        "moderation_prompt": moderation_prompt,
        "no_documents_prompt": no_documents_prompt,
        "language_mappings": language_mappings,
        "constitutional_principles": constitutional_principles,
        "system_info": {
            "similarity_threshold": 0.7,
            "token_threshold": 32000,
            "memory_limit": 10,
            "session_ttl_minutes": 30,
            "supported_languages": list(language_mappings.keys()),
            "supported_file_types": ["PDF", "TXT", "URL", "Website"]
        },
        "prompt_variables": {
            "language": "Response language (from language_mappings)",
            "context": "Retrieved document chunks with similarity scores",
            "query": "User's question",
            "content": "Document content for summarization"
        }
    }


@router.get("/current-session-prompt", tags=["Prompt"])
async def get_current_session_prompt(
    session_id: Optional[str] = None,
    language: str = "zh",
    has_documents: bool = True
) -> Dict[str, Any]:
    """
    獲取當前 Session 的實際 Prompt
    
    Args:
        session_id: Session ID
        language: 語言代碼
        has_documents: 是否有文檔
        
    Returns:
        Dict: 當前 Session 使用的 Prompt
    """
    
    # 語言映射
    language_names = {
        "zh": "Traditional Chinese (繁體中文)",
        "en": "English", 
        "ko": "Korean (한국어)",
        "es": "Spanish (Español)",
        "ja": "Japanese (日本語)",
        "ar": "Arabic (العربية)",
        "fr": "French (Français)"
    }
    
    response_language = language_names.get(language, "English")
    
    if has_documents:
        prompt_type = "rag_with_documents"
        template = """You are a helpful multilingual assistant.

**Term Definitions**:
- **Documents**: Content uploaded by the user (webpages, PDFs, text files, etc.)
- **Chunks**: Small passages for semantic search.

**IMPORTANT RULES**:
1. **Response Language**: Always respond in {language}
2. **Primary**: Answer based on provided documents when relevant
3. **Secondary**: For general questions, answer politely
4. Cite document numbers when using information
5. Be helpful, concise, and accurate

**Retrieved Documents**:
[Will be populated with actual document chunks]

**User Question**:
[User's actual question will appear here]

**Your Answer** (in {language}):"""
    else:
        prompt_type = "rag_no_documents" 
        template = """You are a helpful multilingual assistant.

**IMPORTANT RULES**:
1. **Response Language**: Always respond in {language}
2. **Context**: No relevant documents found for this question
3. For general questions, answer naturally and helpfully
4. If asked about documents, explain no relevant passages found
5. Be friendly, concise, and helpful

**User Question**:
[User's actual question will appear here]

**Your Answer** (in {language}):"""
    
    # 填入語言
    actual_prompt = template.format(language=response_language)
    
    logger.info(f"Current session prompt requested: {prompt_type}, language={language}")
    
    return {
        "session_id": session_id or "demo-session",
        "language": language,
        "response_language": response_language,
        "prompt_type": prompt_type,
        "has_documents": has_documents,
        "actual_prompt": actual_prompt,
        "timestamp": "real-time generated"
    }