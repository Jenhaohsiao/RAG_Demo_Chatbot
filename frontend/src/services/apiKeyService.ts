/**
 * API Key Service
 * API Key Validation and Status Check
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
 * Check current API Key status
 * Query backend to determine if API Key is configured in environment
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
 * Validate user provided API Key
 * 
 * @param apiKey - User input Gemini API Key
 * @returns Validation result
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
 * Get user API Key from session storage
 */
export function getUserApiKey(): string | null {
  return sessionStorage.getItem("user_gemini_api_key");
}

/**
 * Clear user API Key
 */
export function clearUserApiKey(): void {
  sessionStorage.removeItem("user_gemini_api_key");
}

/**
 * Add API Key header to axios request
 */
export function addApiKeyHeader(config: any): any {
  const userApiKey = getUserApiKey();
  if (userApiKey) {
    config.headers = config.headers || {};
    config.headers["X-Gemini-API-Key"] = userApiKey;
  }
  return config;
}
