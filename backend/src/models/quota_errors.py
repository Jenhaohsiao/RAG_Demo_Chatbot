"""
Custom Exception Classes for Quota Management

Handles API quota exceeded and related errors
"""


class QuotaExceededError(Exception):
    """
    Gemini API quota exceeded error
    
    Thrown when the system's API Key reaches its daily limit.
    Frontend should catch this error and prompt the user to provide their own API Key.
    """
    def __init__(self, message: str = "Gemini API quota exceeded. Please provide your own API key.", retry_after: int | None = None):
        self.message = message
        self.retry_after = retry_after  # Seconds until retry is possible (optional)
        super().__init__(self.message)


class InvalidApiKeyError(Exception):
    """
    Invalid API Key error
    
    Thrown when the user-provided API Key fails validation.
    """
    def __init__(self, message: str = "Invalid API key provided"):
        self.message = message
        super().__init__(self.message)


class ApiKeyMissingError(Exception):
    """
    API Key missing error
    
    Thrown when neither the system nor the user has provided an API Key.
    """
    def __init__(self, message: str = "No API key available. Please configure or provide an API key."):
        self.message = message
        super().__init__(self.message)
