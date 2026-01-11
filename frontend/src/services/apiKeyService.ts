/**
 * API Key Service
 * ?•ç? API Key é©—è??Œç??‹æª¢??
 */
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export interface ApiKeyStatus {
  status: "valid" | "missing" | "invalid";
  source: "env" | "user" | "none";
  has_valid_api_key: boolean;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * æª¢æŸ¥?¶å? API Key ?€??
 * ?¥è©¢å¾Œç«¯ä»¥ç¢ºå®šæ˜¯?¦æ??‰æ??„ç’°å¢ƒè???API Key
 */
export async function checkApiKeyStatus(): Promise<ApiKeyStatus> {
  try {
    const response = await axios.get(`${API_BASE_URL}/session/api-key/status`);
    return response.data;
  } catch (error) {
    return {
      status: "missing",
      source: "none",
      has_valid_api_key: false,
    };
  }
}

/**
 * é©—è?ä½¿ç”¨?…æ?ä¾›ç? API Key
 * 
 * @param apiKey - ä½¿ç”¨?…è¼¸?¥ç? Gemini API Key
 * @returns é©—è?çµæ?
 */
export async function validateUserApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  try {
    const response = await axios.post(`${API_BASE_URL}/session/api-key/validate`, {
      api_key: apiKey,
    });
    
    return {
      valid: response.data.valid,
      message: response.data.message,
    };
  } catch (error: any) {
    if (error.response) {
      return {
        valid: false,
        message: error.response.data.detail || "Invalid API key",
      };
    }
    throw new Error("Failed to validate API key");
  }
}

/**
 * å¾?session storage ?²å?ä½¿ç”¨?…ç? API Key
 */
export function getUserApiKey(): string | null {
  return sessionStorage.getItem("user_gemini_api_key");
}

/**
 * æ¸…é™¤ä½¿ç”¨?…ç? API Key
 */
export function clearUserApiKey(): void {
  sessionStorage.removeItem("user_gemini_api_key");
}

/**
 * ??axios è«‹æ?æ·»å? API Key header
 */
export function addApiKeyHeader(config: any): any {
  const userApiKey = getUserApiKey();
  if (userApiKey) {
    config.headers = config.headers || {};
    config.headers["X-Gemini-API-Key"] = userApiKey;
  }
  return config;
}
