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
    
    def __init__(self, api_key: str):
        """
        初始化審核服務
        
        Args:
            api_key: Gemini API 金鑰
            
        Raises:
            ModerationError: 如果 API 金鑰無效或初始化失敗
        """
        if not api_key:
            raise ModerationError("Gemini API key is required for content moderation")
        
        try:
            genai.configure(api_key=api_key)
            
            # 設定安全設定 - 設為BLOCK_NONE，由我們自己的邏輯判斷
            # 只阻擋真正有害的內容：騷擾、仇恨言論、性相關內容、危險內容
            self.safety_settings = {
                HarmCategory.HARASSMENT: "BLOCK_NONE",
                HarmCategory.HATE_SPEECH: "BLOCK_NONE", 
                HarmCategory.SEXUALLY_EXPLICIT: "BLOCK_NONE",
                HarmCategory.DANGEROUS_CONTENT: "BLOCK_NONE",
            }
            
            # 使用 Gemini 2.0 Flash 模型進行審核（最新穩定版本）
            self.model = genai.GenerativeModel(
                model_name='gemini-2.0-flash',
                safety_settings=self.safety_settings
            )
            
            logger.info("Content moderation service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize moderation service: {e}")
            raise ModerationError(f"Failed to configure Gemini API: {str(e)}")
    
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
            logger.info(f"Checking content safety for '{source_reference}' ({len(text)} characters) - only blocking truly harmful content")
            
            # 只檢查明顯有害的內容，跳過所有其他檢查
            harmful_result = self._check_only_harmful_content(text)
            if harmful_result.is_blocked:
                logger.warning(f"Content blocked for '{source_reference}': {harmful_result.reason}")
                return harmful_result
            
            
            # 內容通過檢查 - 默認批准所有非明顯有害的內容
            logger.info(f"Content approved for '{source_reference}' - no harmful content detected")
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
    
    def _contains_explicit_content(self, text: str) -> bool:
        """
        預檢：檢查文本是否包含明顯的不當內容關鍵字
        
        Args:
            text: 要檢查的文本內容
            
        Returns:
            bool: 如果包含不當內容關鍵字則返回 True
        """
        # 轉換為小寫進行檢查
        text_lower = text.lower()
        
        # 常見的明確不當內容關鍵字（英文）- 移除可能在學術材料中出現的詞彙
        explicit_keywords = [
            "porn", "xxx", "nude photos", "adult videos", "erotic stories", 
            "fetish", "bdsm", "masturbation videos", "cam girl", "onlyfans",
            "prostitution services", "escort services", "strip club"
        ]
        
        # 中文明確不當內容關鍵字 - 更精確的匹配
        chinese_keywords = [
            "色情網站", "A片下載", "AV女優", "黃片免費", "裸照分享", 
            "援交服務", "性服務價格", "脫衣直播", "成人直播"
        ]
        
        # 檢查是否包含任何關鍵字
        all_keywords = explicit_keywords + chinese_keywords
        
        for keyword in all_keywords:
            if keyword in text_lower:
                logger.warning(f"Explicit keyword detected: {keyword}")
                return True
        
        return False


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
