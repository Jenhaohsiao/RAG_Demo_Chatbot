"""
Custom Exception Classes for Quota Management

處理 API 配額超限和相關錯誤
"""


class QuotaExceededError(Exception):
    """
    Gemini API 配額超限錯誤
    
    當系統的 API Key 達到每日限制時拋出此異常。
    前端應捕獲此錯誤並提示用戶輸入自己的 API Key。
    """
    def __init__(self, message: str = "Gemini API quota exceeded. Please provide your own API key.", retry_after: int | None = None):
        self.message = message
        self.retry_after = retry_after  # 秒數，何時可以重試（可選）
        super().__init__(self.message)


class InvalidApiKeyError(Exception):
    """
    無效的 API Key 錯誤
    
    當用戶提供的 API Key 無法通過驗證時拋出。
    """
    def __init__(self, message: str = "Invalid API key provided"):
        self.message = message
        super().__init__(self.message)


class ApiKeyMissingError(Exception):
    """
    API Key 缺失錯誤
    
    當系統和用戶都沒有提供 API Key 時拋出。
    """
    def __init__(self, message: str = "No API key available. Please configure or provide an API key."):
        self.message = message
        super().__init__(self.message)
