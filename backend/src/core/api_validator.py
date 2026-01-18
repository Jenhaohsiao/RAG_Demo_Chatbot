"""
Gemini API key validation utilities
- Provides lightweight validation for Gemini API keys
- Caches default key validation status for reuse
"""
from __future__ import annotations

import logging
from typing import Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)

_default_api_key_valid: bool = False


def validate_gemini_api_key(api_key: Optional[str]) -> bool:
    """Validate a Gemini API key by attempting a lightweight model listing.

    Args:
        api_key: Candidate Gemini API key

    Returns:
        True if the key passes a minimal validation check, False otherwise.
    """
    if not api_key:
        logger.warning("Gemini API key validation skipped: key missing")
        return False

    try:
        genai.configure(api_key=api_key)
        # Lightweight call: list one model to verify credentials
        models = genai.list_models()
        next(iter(models))
        logger.info("Gemini API key validation passed")
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini API key validation failed: %s", exc)
        return False


def set_default_api_key_status(is_valid: bool) -> None:
    """Cache default API key validation result."""
    global _default_api_key_valid
    _default_api_key_valid = is_valid


def get_default_api_key_status() -> bool:
    """Return cached default API key validation status."""
    return _default_api_key_valid
