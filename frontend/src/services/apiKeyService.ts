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
 * Security Note:
 * User API keys are NEVER stored in sessionStorage, localStorage, or any persistent storage.
 * Keys are kept in React component state (in-memory) and passed via X-User-API-Key header per-request.
 * 
 * Previous functions (getUserApiKey, clearUserApiKey, addApiKeyHeader) have been removed
 * to ensure no accidental storage occurs.
 */
