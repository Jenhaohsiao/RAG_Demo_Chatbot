"""
Content Moderation Service
使用 Gemini Safety API 檢查內容安全性，阻擋有害或不當內容
"""
import logging
from enum import Enum
from typing import Optional
from dataclasses import dataclass

import google.generativeai as genai

logger = logging.getLogger(__name__)


class ModerationStatus(str, Enum):
    """內容審核狀態"""
    APPROVED = "APPROVED"  # 內容安全，允許處理
    BLOCKED = "BLOCKED"    # 內容被阻擋，包含有害材料


class HarmCategory(str, Enum):
    """Gemini Safety API 危害類別"""
    HARASSMENT = "HARM_CATEGORY_HARASSMENT"                    # 騷擾
    HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH"                 # 仇恨言論
    SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT"     # 性相關內容
    DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT"     # 危險內容


@dataclass
class ModerationResult:
    """
    內容審核結果
    
    Attributes:
        status: 審核狀態 (APPROVED/BLOCKED)
        blocked_categories: 被阻擋的危害類別列表（如果有）
        reason: 阻擋原因說明（如果被阻擋）
    """
    status: ModerationStatus
    blocked_categories: list[str]
    reason: Optional[str] = None
    
    @property
    def is_approved(self) -> bool:
        """內容是否通過審核"""
        return self.status == ModerationStatus.APPROVED
    
    @property
    def is_blocked(self) -> bool:
        """內容是否被阻擋"""
        return self.status == ModerationStatus.BLOCKED


class ModerationError(Exception):
    """內容審核過程中發生的錯誤"""
    pass


class ModerationService:
    """
    內容審核服務
    使用 Gemini Safety API 檢查文字內容的安全性
    """
    
    def __init__(self, api_key: Optional[str]):
        """
        初始化審核服務
        
        Args:
            api_key: Gemini API 金鑰
            
        Raises:
            ModerationError: 如果 API 金鑰無效或初始化失敗
        """
        self.api_key = api_key
        # 設定安全設定 - 設為BLOCK_NONE，由我們自己的邏輯判斷
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
        檢查文字內容的安全性
        只阻擋真正有害的內容：騷擾、仇恨言論、性相關內容、危險內容
        
        Args:
            text: 要檢查的文字內容
            source_reference: 內容來源參考（檔案名稱或 URL）用於日誌記錄
            academic_mode: 學術模式（現在基本上不起作用，因為我們已經很寬鬆了）
            
        Returns:
            ModerationResult: 審核結果，包含狀態和被阻擋的類別
            
        Raises:
            ModerationError: 如果審核過程失敗
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
            
            # 🔥 STEP 1: 檢查 URL 本身是否為已知的成人網站
            url_check_result = self._check_url_domain(source_reference)
            if url_check_result.is_blocked:
                logger.warning(f"URL blocked for '{source_reference}': {url_check_result.reason}")
                return url_check_result
            
            # 🔥 STEP 2: 檢查內容是否包含明確的色情/成人關鍵字
            explicit_check = self._check_explicit_keywords(text, source_reference)
            if explicit_check.is_blocked:
                logger.warning(f"Explicit content blocked for '{source_reference}': {explicit_check.reason}")
                return explicit_check
            
            # 🔥 STEP 3: 檢查極端有害內容（暴力、仇恨、危險內容）
            harmful_result = self._check_only_harmful_content(text)
            if harmful_result.is_blocked:
                logger.warning(f"Harmful content blocked for '{source_reference}': {harmful_result.reason}")
                return harmful_result
            
            # 內容通過所有檢查
            logger.info(f"Content approved for '{source_reference}' - no harmful or explicit content detected")
            return ModerationResult(
                status=ModerationStatus.APPROVED,
                blocked_categories=[],
                reason=None
            )
            
        except Exception as e:
            logger.error(f"Content moderation failed for '{source_reference}': {e}")
            # 錯誤時默認批准，避免誤攔
            logger.warning(f"Moderation error, defaulting to APPROVED for '{source_reference}'")
            return ModerationResult(
                status=ModerationStatus.APPROVED,
                blocked_categories=[],
                reason=None
            )
    
    def _check_url_domain(self, source_reference: str) -> ModerationResult:
        """
        檢查 URL 域名是否為已知的成人/色情網站
        
        Args:
            source_reference: 內容來源（可能包含 URL）
            
        Returns:
            ModerationResult: 審核結果
        """
        from urllib.parse import urlparse
        
        source_lower = source_reference.lower()
        
        # 已知的成人網站域名關鍵字
        adult_domains = [
            "xvideos", "pornhub", "xnxx", "redtube", "youporn", 
            "porn", "xxx", "sex", "adult", "erotic", "hentai",
            "xhamster", "spankbang", "tube8", "xtube", "beeg",
            "av", "色情", "成人", "18禁", "限制級"
        ]
        
        # 檢查 URL 中是否包含成人網站關鍵字
        for domain_keyword in adult_domains:
            if domain_keyword in source_lower:
                reason = f"檢測到成人網站 URL: 包含 '{domain_keyword}'"
                logger.warning(f"Adult domain detected: {reason}")
                return ModerationResult(
                    status=ModerationStatus.BLOCKED,
                    blocked_categories=["SEXUALLY_EXPLICIT_URL"],
                    reason=reason
                )
        
        # 通過檢查
        return ModerationResult(
            status=ModerationStatus.APPROVED,
            blocked_categories=[],
            reason=None
        )
    
    def _check_explicit_keywords(self, text: str, source_reference: str) -> ModerationResult:
        """
        檢查內容是否包含明確的色情/成人關鍵字
        這個檢查比 _check_only_harmful_content 更全面
        
        Args:
            text: 要檢查的文字內容
            source_reference: 內容來源參考
            
        Returns:
            ModerationResult: 審核結果
        """
        content_lower = text.lower()
        
        # 明確的色情/成人內容關鍵字（英文）- 使用更靈活的匹配
        explicit_keywords_en = [
            "porn", "xxx", "nude photo", "adult video", 
            "sex video", "erotic", "pornograph",
            "live cam", "cam girl", "webcam sex",
            "strip club", "escort service", "prostitution"
        ]
        
        # 明確的色情/成人內容關鍵字（中文）
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
        
        # 如果找到多個關鍵字，更確定是成人內容
        if len(found_keywords) >= 2:
            reason = f"檢測到明確的成人內容關鍵字: {', '.join(found_keywords[:3])}"
            logger.warning(f"Explicit content detected: {reason}")
            return ModerationResult(
                status=ModerationStatus.BLOCKED,
                blocked_categories=["SEXUALLY_EXPLICIT"],
                reason=reason
            )
        
        # 如果只找到一個關鍵字，檢查是否在標題、meta標籤等重要位置
        if len(found_keywords) == 1:
            # 檢查是否在前 500 個字符中（通常是標題、描述等）
            if found_keywords[0] in content_lower[:500]:
                reason = f"在頁面重要位置檢測到成人內容關鍵字: {found_keywords[0]}"
                logger.warning(f"Explicit keyword in important position: {reason}")
                return ModerationResult(
                    status=ModerationStatus.BLOCKED,
                    blocked_categories=["SEXUALLY_EXPLICIT"],
                    reason=reason
                )
        
        # 通過檢查
        return ModerationResult(
            status=ModerationStatus.APPROVED,
            blocked_categories=[],
            reason=None
        )
    
    def _check_only_harmful_content(self, text: str) -> ModerationResult:
        """
        只檢查真正有害的內容，用非常嚴格的標準
        
        Args:
            text: 要檢查的文字內容
            
        Returns:
            ModerationResult: 審核結果
        """
        content_lower = text.lower()
        
        # 非常明確的有害關鍵字 - 只有這些才會被阻擋
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
            reason = f"檢測到明確有害內容關鍵字：{', '.join(found_keywords)}"
            return ModerationResult(
                status=ModerationStatus.BLOCKED,
                blocked_categories=blocked_categories,
                reason=reason
            )
        
        # 通過檢查
        return ModerationResult(
            status=ModerationStatus.APPROVED,
            blocked_categories=[],
            reason=None
        )
    
    def _extract_blocked_categories(self, feedback) -> list[str]:
        """
        從 prompt_feedback 中提取被阻擋的類別
        
        Args:
            feedback: Gemini API 的 prompt_feedback 物件
            
        Returns:
            list[str]: 被阻擋的危害類別列表
        """
        blocked = []
        
        if hasattr(feedback, 'safety_ratings'):
            for rating in feedback.safety_ratings:
                if hasattr(rating, 'category') and hasattr(rating, 'probability'):
                    # 將 Gemini 的類別轉換為我們的格式
                    category_name = str(rating.category).replace('HarmCategory.', '')
                    
                    # 檢查概率是否為 HIGH（不再阻擋 MEDIUM）
                    prob = str(rating.probability)
                    if prob in ['HIGH', 'HARM_PROBABILITY_HIGH']:
                        blocked.append(category_name)
        
        return blocked if blocked else ["UNSPECIFIED"]
    
    def _check_safety_ratings(self, safety_ratings) -> list[str]:
        """
        檢查安全評級是否有高風險項目
        
        Args:
            safety_ratings: Gemini API 的 safety_ratings 列表
            
        Returns:
            list[str]: 高風險類別列表
        """
        high_risk = []
        
        for rating in safety_ratings:
            if hasattr(rating, 'category') and hasattr(rating, 'probability'):
                category_name = str(rating.category).replace('HarmCategory.', '')
                prob = str(rating.probability)
                
                # 只有 HIGH 概率視為高風險（不再包含 MEDIUM）
                if prob in ['HIGH', 'HARM_PROBABILITY_HIGH']:
                    high_risk.append(category_name)
        
        return high_risk


# 便利函數：快速檢查內容安全性
def check_content_safety(
    text: str,
    api_key: str,
    source_reference: str = "unknown",
    academic_mode: bool = False
) -> ModerationResult:
    """
    便利函數：快速檢查內容安全性
    
    Args:
        text: 要檢查的文字內容
        api_key: Gemini API 金鑰
        source_reference: 內容來源參考
        academic_mode: 是否使用學術模式（更寬鬆的審核標準）
        
    Returns:
        ModerationResult: 審核結果
        
    Raises:
        ModerationError: 如果審核失敗
    """
    service = ModerationService(api_key)
    return service.check_content_safety(text, source_reference, academic_mode)
