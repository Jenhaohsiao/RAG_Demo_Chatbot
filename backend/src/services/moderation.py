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
            
            # 設定嚴格的安全設定 - 阻擋所有中度以上的有害內容
            self.safety_settings = {
                HarmCategory.HARASSMENT: "BLOCK_MEDIUM_AND_ABOVE",
                HarmCategory.HATE_SPEECH: "BLOCK_MEDIUM_AND_ABOVE",
                HarmCategory.SEXUALLY_EXPLICIT: "BLOCK_MEDIUM_AND_ABOVE",
                HarmCategory.DANGEROUS_CONTENT: "BLOCK_MEDIUM_AND_ABOVE",
            }
            
            # 使用 Gemini Flash 模型進行審核（成本最低）
            self.model = genai.GenerativeModel(
                model_name='gemini-1.5-flash',
                safety_settings=self.safety_settings
            )
            
            logger.info("Content moderation service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize moderation service: {e}")
            raise ModerationError(f"Failed to configure Gemini API: {str(e)}")
    
    def check_content_safety(self, text: str, source_reference: str = "unknown") -> ModerationResult:
        """
        檢查文字內容的安全性
        
        Args:
            text: 要檢查的文字內容
            source_reference: 內容來源參考（檔案名稱或 URL）用於日誌記錄
            
        Returns:
            ModerationResult: 審核結果，包含狀態和被阻擋的類別
            
        Raises:
            ModerationError: 如果審核過程失敗
        """
        if not text or not text.strip():
            logger.warning(f"Empty content provided for moderation from '{source_reference}'")
            return ModerationResult(
                status=ModerationStatus.APPROVED,
                blocked_categories=[],
                reason=None
            )
        
        try:
            logger.info(f"Checking content safety for '{source_reference}' ({len(text)} characters)")
            
            # 使用 Gemini API 生成回應（這會觸發安全性檢查）
            # 我們不需要實際的回應內容，只需要安全性評估
            prompt = f"請分析以下內容是否安全且適當：\n\n{text[:1000]}"  # 限制 1000 字元以節省 token
            
            response = self.model.generate_content(prompt)
            
            # 檢查是否有安全性評估結果
            if hasattr(response, 'prompt_feedback'):
                feedback = response.prompt_feedback
                
                # 檢查內容是否被阻擋
                if hasattr(feedback, 'block_reason') and feedback.block_reason:
                    blocked_categories = self._extract_blocked_categories(feedback)
                    reason = f"Content blocked due to safety concerns: {', '.join(blocked_categories)}"
                    
                    logger.warning(f"Content blocked for '{source_reference}': {reason}")
                    
                    return ModerationResult(
                        status=ModerationStatus.BLOCKED,
                        blocked_categories=blocked_categories,
                        reason=reason
                    )
            
            # 檢查回應的安全評級
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                
                if hasattr(candidate, 'safety_ratings'):
                    # 檢查是否有任何高風險評級
                    high_risk_categories = self._check_safety_ratings(candidate.safety_ratings)
                    
                    if high_risk_categories:
                        reason = f"Content flagged for: {', '.join(high_risk_categories)}"
                        logger.warning(f"Content flagged for '{source_reference}': {reason}")
                        
                        return ModerationResult(
                            status=ModerationStatus.BLOCKED,
                            blocked_categories=high_risk_categories,
                            reason=reason
                        )
            
            # 內容通過審核
            logger.info(f"Content approved for '{source_reference}'")
            return ModerationResult(
                status=ModerationStatus.APPROVED,
                blocked_categories=[],
                reason=None
            )
            
        except Exception as e:
            logger.error(f"Content moderation failed for '{source_reference}': {e}")
            raise ModerationError(f"Failed to check content safety: {str(e)}")
    
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
                    
                    # 檢查概率是否為 MEDIUM 或 HIGH
                    prob = str(rating.probability)
                    if prob in ['MEDIUM', 'HIGH', 'HARM_PROBABILITY_MEDIUM', 'HARM_PROBABILITY_HIGH']:
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
                
                # MEDIUM 或 HIGH 概率視為高風險
                if prob in ['MEDIUM', 'HIGH', 'HARM_PROBABILITY_MEDIUM', 'HARM_PROBABILITY_HIGH']:
                    high_risk.append(category_name)
        
        return high_risk


# 便利函數：快速檢查內容安全性
def check_content_safety(
    text: str,
    api_key: str,
    source_reference: str = "unknown"
) -> ModerationResult:
    """
    便利函數：快速檢查內容安全性
    
    Args:
        text: 要檢查的文字內容
        api_key: Gemini API 金鑰
        source_reference: 內容來源參考
        
    Returns:
        ModerationResult: 審核結果
        
    Raises:
        ModerationError: 如果審核失敗
    """
    service = ModerationService(api_key)
    return service.check_content_safety(text, source_reference)
