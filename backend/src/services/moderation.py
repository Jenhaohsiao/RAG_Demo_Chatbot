"""
Content Moderation Service
Uses Gemini Safety API to check content safety, blocking harmful or inappropriate content
"""
import logging
from enum import Enum
from typing import Optional
from dataclasses import dataclass

import google.generativeai as genai

logger = logging.getLogger(__name__)


class ModerationStatus(str, Enum):
    """Content moderation status"""
    APPROVED = "APPROVED"  # Content safe, allows processing
    BLOCKED = "BLOCKED"    # Content blocked, contains harmful material


class HarmCategory(str, Enum):
    """Gemini Safety API Harm Categories"""
    HARASSMENT = "HARM_CATEGORY_HARASSMENT"                    # Harassment
    HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH"                 # Hate speech
    SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT"     # Sexually explicit content
    DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT"     # Dangerous content


@dataclass
class ModerationResult:
    """
    Content moderation result
    
    Attributes:
        status: Moderation status (APPROVED/BLOCKED)
        blocked_categories: List of blocked harm categories (if any)
        reason: Blocking reason explanation (if blocked)
    """
    status: ModerationStatus
    blocked_categories: list[str]
    reason: Optional[str] = None
    
    @property
    def is_approved(self) -> bool:
        """Whether content passed moderation"""
        return self.status == ModerationStatus.APPROVED
    
    @property
    def is_blocked(self) -> bool:
        """Whether content was blocked"""
        return self.status == ModerationStatus.BLOCKED


class ModerationError(Exception):
    """Error that occurred during content moderation process"""
    pass


class ModerationService:
    """
    Content moderation service
    Uses Gemini Safety API to check text content safety
    """
    
    def __init__(self, api_key: Optional[str]):
        """
        Initialize moderation service
        
        Args:
            api_key: Gemini API key
            
        Raises:
            ModerationError: If API key is invalid or initialization fails
        """
        self.api_key = api_key
        # Configure safety settings - set to BLOCK_NONE, use our own logic for judgment
        self.safety_settings = {
            HarmCategory.HARASSMENT: "BLOCK_NONE",
            HarmCategory.HATE_SPEECH: "BLOCK_NONE", 
            HarmCategory.SEXUALLY_EXPLICIT: "BLOCK_NONE",
            HarmCategory.DANGEROUS_CONTENT: "BLOCK_NONE",
        }
        if not api_key:
            logger.warning("ModerationService initialized without API key; moderation will require user-provided key")
            self.model = None
            return
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(
                model_name='gemini-2.0-flash',
                safety_settings=self.safety_settings
            )
            logger.info("Content moderation service initialized successfully")
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to initialize moderation service: {e}")
            self.model = None
    
    def check_content_safety(self, text: str, source_reference: str = "unknown", academic_mode: bool = False) -> ModerationResult:
        """
        Check text content safety
        Only blocks truly harmful content: harassment, hate speech, sexually explicit content, dangerous content
        
        Args:
            text: Text content to check
            source_reference: Content source reference (filename or URL) for logging
            academic_mode: Academic mode (basically no effect now as we're already lenient)
            
        Returns:
            ModerationResult: Moderation result including status and blocked categories
            
        Raises:
            ModerationError: If moderation process fails
        """
        if not text or not text.strip():
            logger.info(f"Empty content provided for moderation from '{source_reference}', approving")
            return ModerationResult(
                status=ModerationStatus.APPROVED,
                blocked_categories=[],
                reason=None
            )
        
        try:
            logger.info(f"Checking content safety for '{source_reference}' ({len(text)} characters) - blocking harmful and explicit content")
            
            # 🔥 STEP 1: Check if URL itself is a known adult website
            url_check_result = self._check_url_domain(source_reference)
            if url_check_result.is_blocked:
                logger.warning(f"URL blocked for '{source_reference}': {url_check_result.reason}")
                return url_check_result
            
            # 🔥 STEP 2: Check if content contains explicit pornographic/adult keywords
            explicit_check = self._check_explicit_keywords(text, source_reference)
            if explicit_check.is_blocked:
                logger.warning(f"Explicit content blocked for '{source_reference}': {explicit_check.reason}")
                return explicit_check
            
            # 🔥 STEP 3: Check for extremely harmful content (violence, hate, dangerous content)
            harmful_result = self._check_only_harmful_content(text)
            if harmful_result.is_blocked:
                logger.warning(f"Harmful content blocked for '{source_reference}': {harmful_result.reason}")
                return harmful_result
            
            # Content passed all checks
            logger.info(f"Content approved for '{source_reference}' - no harmful or explicit content detected")
            return ModerationResult(
                status=ModerationStatus.APPROVED,
                blocked_categories=[],
                reason=None
            )
            
        except Exception as e:
            logger.error(f"Content moderation failed for '{source_reference}': {e}")
            # Default to approve on error, avoid false positives
            logger.warning(f"Moderation error, defaulting to APPROVED for '{source_reference}'")
            return ModerationResult(
                status=ModerationStatus.APPROVED,
                blocked_categories=[],
                reason=None
            )
    
    def _check_url_domain(self, source_reference: str) -> ModerationResult:
        """
        Check if URL domain is a known adult/pornographic website
        
        Args:
            source_reference: Content source (may contain URL)
            
        Returns:
            ModerationResult: Moderation result
        """
        from urllib.parse import urlparse
        
        source_lower = source_reference.lower()
        
        # Known adult website domain keywords
        adult_domains = [
            "xvideos", "pornhub", "xnxx", "redtube", "youporn", 
            "porn", "xxx", "sex", "adult", "erotic", "hentai",
            "xhamster", "spankbang", "tube8", "xtube", "beeg",
            "av", "色情", "成人", "18禁", "限制級"
        ]
        
        # Check if URL contains adult website keywords
        for domain_keyword in adult_domains:
            if domain_keyword in source_lower:
                reason = f"Adult website URL detected: contains '{domain_keyword}'"
                logger.warning(f"Adult domain detected: {reason}")
                return ModerationResult(
                    status=ModerationStatus.BLOCKED,
                    blocked_categories=["SEXUALLY_EXPLICIT_URL"],
                    reason=reason
                )
        
        # Passed check
        return ModerationResult(
            status=ModerationStatus.APPROVED,
            blocked_categories=[],
            reason=None
        )
    
    def _check_explicit_keywords(self, text: str, source_reference: str) -> ModerationResult:
        """
        Check if content contains explicit pornographic/adult keywords
        This check is more comprehensive than _check_only_harmful_content
        
        Args:
            text: Text content to check
            source_reference: Content source reference
            
        Returns:
            ModerationResult: Moderation result
        """
        content_lower = text.lower()
        
        # Explicit pornographic/adult content keywords (English) - use more flexible matching
        explicit_keywords_en = [
            "porn", "xxx", "nude photo", "adult video", 
            "sex video", "erotic", "pornograph",
            "live cam", "cam girl", "webcam sex",
            "strip club", "escort service", "prostitution"
        ]
        
        # Explicit pornographic/adult content keywords (Chinese)
        explicit_keywords_zh = [
            "色情", "成人影片", "A片", "AV女優", "裸照",
            "成人直播", "色情直播", "援交", "性服務",
            "情色網站", "成人網站", "黃片", "毛片"
        ]
        
        all_keywords = explicit_keywords_en + explicit_keywords_zh
        found_keywords = []
        
        for keyword in all_keywords:
            if keyword in content_lower:
                found_keywords.append(keyword)
        
        # If multiple keywords found, more certain it's adult content
        if len(found_keywords) >= 2:
            reason = f"Explicit adult content keywords detected: {', '.join(found_keywords[:3])}"
            logger.warning(f"Explicit content detected: {reason}")
            return ModerationResult(
                status=ModerationStatus.BLOCKED,
                blocked_categories=["SEXUALLY_EXPLICIT"],
                reason=reason
            )
        
        # If only one keyword found, check if it's in important positions like title, meta tags
        if len(found_keywords) == 1:
            # Check if in first 500 characters (usually title, description, etc.)
            if found_keywords[0] in content_lower[:500]:
                reason = f"Adult content keyword detected in important page position: {found_keywords[0]}"
                logger.warning(f"Explicit keyword in important position: {reason}")
                return ModerationResult(
                    status=ModerationStatus.BLOCKED,
                    blocked_categories=["SEXUALLY_EXPLICIT"],
                    reason=reason
                )
        
        # Passed check
        return ModerationResult(
            status=ModerationStatus.APPROVED,
            blocked_categories=[],
            reason=None
        )
    
    def _check_only_harmful_content(self, text: str) -> ModerationResult:
        """
        Only check truly harmful content, using very strict standards
        
        Args:
            text: Text content to check
            
        Returns:
            ModerationResult: Moderation result
        """
        content_lower = text.lower()
        
        # Very explicit harmful keywords - only these will be blocked
        extremely_harmful_keywords = {
            "harassment": [
                "人肉搜索", "人肉搜尋", "騷擾威脅", "人身威脅", "恐嚇威脅",
                "我要殺了你", "我要傷害你", "死去", "去死"
            ],
            "hate_speech": [
                "種族清洗", "滅絕種族", "仇恨犯罪指導", "極端仇恨言論"
            ],
            "sexually_explicit": [
                "兒童色情", "未成年色情", "性虐待兒童", "強暴描述"
            ],
            "dangerous": [
                "製造炸彈教程", "恐怖攻擊計畫", "投毒方法", "自殺詳細指導",
                "如何殺人", "製毒教程", "爆炸物製作"
            ]
        }
        
        blocked_categories = []
        found_keywords = []
        
        for category, keywords in extremely_harmful_keywords.items():
            for keyword in keywords:
                if keyword in content_lower:
                    blocked_categories.append(category)
                    found_keywords.append(keyword)
        
        if blocked_categories:
            reason = f"Explicit harmful content keywords detected: {', '.join(found_keywords)}"
            return ModerationResult(
                status=ModerationStatus.BLOCKED,
                blocked_categories=blocked_categories,
                reason=reason
            )
        
        # Passed check
        return ModerationResult(
            status=ModerationStatus.APPROVED,
            blocked_categories=[],
            reason=None
        )
    
    def _extract_blocked_categories(self, feedback) -> list[str]:
        """
        Extract blocked categories from prompt_feedback
        
        Args:
            feedback: Gemini API prompt_feedback object
            
        Returns:
            list[str]: List of blocked harm categories
        """
        blocked = []
        
        if hasattr(feedback, 'safety_ratings'):
            for rating in feedback.safety_ratings:
                if hasattr(rating, 'category') and hasattr(rating, 'probability'):
                    # Convert Gemini's category to our format
                    category_name = str(rating.category).replace('HarmCategory.', '')
                    
                    # Check if probability is HIGH (no longer blocking MEDIUM)
                    prob = str(rating.probability)
                    if prob in ['HIGH', 'HARM_PROBABILITY_HIGH']:
                        blocked.append(category_name)
        
        return blocked if blocked else ["UNSPECIFIED"]
    
    def _check_safety_ratings(self, safety_ratings) -> list[str]:
        """
        Check if safety ratings have high-risk items
        
        Args:
            safety_ratings: Gemini API safety_ratings list
            
        Returns:
            list[str]: List of high-risk categories
        """
        high_risk = []
        
        for rating in safety_ratings:
            if hasattr(rating, 'category') and hasattr(rating, 'probability'):
                category_name = str(rating.category).replace('HarmCategory.', '')
                prob = str(rating.probability)
                
                # Only HIGH probability is considered high-risk (no longer includes MEDIUM)
                if prob in ['HIGH', 'HARM_PROBABILITY_HIGH']:
                    high_risk.append(category_name)
        
        return high_risk


# Convenience function: quickly check content safety
def check_content_safety(
    text: str,
    api_key: str,
    source_reference: str = "unknown",
    academic_mode: bool = False
) -> ModerationResult:
    """
    Convenience function: quickly check content safety
    
    Args:
        text: Text content to check
        api_key: Gemini API key
        source_reference: Content source reference
        academic_mode: Whether to use academic mode (more lenient moderation standards)
        
    Returns:
        ModerationResult: Moderation result
        
    Raises:
        ModerationError: If moderation fails
    """
    service = ModerationService(api_key)
    return service.check_content_safety(text, source_reference, academic_mode)
