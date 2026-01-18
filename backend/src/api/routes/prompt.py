"""
Prompt API Routes
Provides system prompt information API endpoints
"""
from fastapi import APIRouter
from typing import Dict, Any, Optional
from src.core.logger import logger

router = APIRouter()

@router.get("/system-prompts", tags=["Prompt"])
async def get_system_prompts() -> Dict[str, Any]:
    """
    Get system prompt templates
    
    Returns:
        Dict: Dictionary containing various prompt templates
    """
    
    # Main RAG system prompt template
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

    # Summary generation prompt templates
    summary_prompt_templates = {
        "zh-TW": """請為以下文檔內容提供一段完整的摘要（約 150-200 字）。摘要應該：
1. 使用繁體中文寫作
2. 包含主要主題和關鍵點
3. 簡潔清晰，適合快速瀏覽
4. 完整描述，不要使用「...」或「等等」結尾
5. 字數控制在 150-200 字左右

文檔內容：
{{content}}""",
        
        "zh-CN": """请为以下文档内容提供一段完整的摘要（约 150-200 字）。摘要应该：
1. 使用简体中文写作
2. 包含主要主题和关键点
3. 简洁清晰，适合快速浏览
4. 完整描述，不要使用「...」或「等等」结尾
5. 字数控制在 150-200 字左右

文档内容：
{{content}}""",
        
        "en": """Please provide a complete summary of the following document (approximately 150-200 words). The summary should:
1. Be written in English
2. Include main themes and key points
3. Be clear and suitable for quick browsing
4. End with a complete sentence, DO NOT use "..." or "etc." at the end
5. Target around 150-200 words

Document content:
{{content}}""",
        
        "fr": """Veuillez fournir un résumé complet du document suivant (environ 150-200 mots). Le résumé doit:
1. Être rédigé en français
2. Inclure les thèmes principaux et les points clés
3. Être clair et adapté à une lecture rapide
4. Se terminer par une phrase complète, NE PAS utiliser "..." ou "etc." à la fin
5. Viser environ 150-200 mots

Contenu du document:
{{content}}"""
    }

    # Content moderation prompt
    moderation_prompt = """Please analyze whether the following content is safe and appropriate:

{{content}}

Please answer:
1. Is the content appropriate? (Yes/No)
2. If there are issues, what type of issues?
3. Recommended handling approach"""

    # Prompt for when no documents are available
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

    # Language mappings
    language_mappings = {
        "en": "English",
        "fr": "French (Français)",
        "zh-TW": "Traditional Chinese (繁體中文)",
        "zh-CN": "Simplified Chinese (简体中文)"
    }

    # Constitutional Principles
    constitutional_principles = [
        "Principle I (MVP First): Prioritize core functionality implementation",
        "Principle II (Testability): Ensure all features are testable",
        "Principle III (Session Isolation): Strict isolation between sessions",
        "Principle IV (Similarity Threshold): Strict similarity threshold ≥ 0.7",
        "Principle V (Strict Citations): Answer strictly based on retrieved content",
        "Principle VI (Token Awareness): Actively monitor token usage",
        "Principle VII (Error Resilience): Handle all errors gracefully",
        "Principle VIII (Multilingual): Support multilingual interface and responses",
        "Principle IX (Performance): Response time < 5 seconds",
        "Principle X (Security): Content moderation and security protection",
        "Principle XI (Monitoring): Complete logging and metrics tracking",
        "Principle XII (Documentation): Clear API and feature documentation",
        "Principle XIII (Scalability): Design with scalability in mind",
        "Principle XIV (Data Privacy): Strictly protect user data",
        "Principle XV (Version Control): Standardized code version management",
        "Principle XVI (Testing): Comprehensive automated testing",
        "Principle XVII (Deployment): Simplified deployment and maintenance"
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
    Get the actual prompt for the current session
    
    Args:
        session_id: Session ID
        language: Language code
        has_documents: Whether documents are available
        
    Returns:
        Dict: Prompt used by the current session
    """
    
    # Language mappings
    language_names = {
        "en": "English",
        "fr": "French (Français)",
        "zh-TW": "Traditional Chinese (繁體中文)",
        "zh-CN": "Simplified Chinese (简体中文)"
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
    
    # Fill in language
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