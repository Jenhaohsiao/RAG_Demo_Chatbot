/**
 * Axios API client configuration
 * Centralized HTTP client with interceptors for error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Base URL from environment variable or default to /api/v1
// Note: Vite dev server proxies /api/* to http://localhost:8000
// Backend serves API at /api/v1 prefix
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // No cookies for stateless API
});

// Request interceptor for adding custom headers or logging
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add timestamp for debugging
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for unified error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in dev mode
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error: AxiosError) => {
    // Unified error handling
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as { detail?: string };

      console.error(`[API Error ${status}]`, {
        url: error.config?.url,
        method: error.config?.method,
        detail: data?.detail || error.message,
      });

      // Handle specific status codes
      switch (status) {
        case 400:
          throw new Error(data?.detail || 'Invalid request');
        case 404:
          throw new Error(data?.detail || 'Resource not found');
        case 422:
          throw new Error(data?.detail || 'Validation error');
        case 500:
          throw new Error('Server error. Please try again later.');
        case 503:
          throw new Error('Service unavailable. Please try again later.');
        default:
          throw new Error(data?.detail || `Request failed with status ${status}`);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('[API Network Error]', error.request);
      throw new Error('Network error. Please check your connection.');
    } else {
      // Error in request setup
      console.error('[API Setup Error]', error.message);
      throw new Error('Request failed. Please try again.');
    }
  }
);

// Type-safe request wrappers
export const api = {
  /**
   * GET request
   */
  get: <T>(url: string, params?: Record<string, unknown>) => {
    return apiClient.get<T>(url, { params }).then((res) => res.data);
  },

  /**
   * POST request
   */
  post: <T>(url: string, data?: unknown) => {
    return apiClient.post<T>(url, data).then((res) => res.data);
  },

  /**
   * PUT request
   */
  put: <T>(url: string, data?: unknown) => {
    return apiClient.put<T>(url, data).then((res) => res.data);
  },

  /**
   * PATCH request
   */
  patch: <T>(url: string, data?: unknown) => {
    return apiClient.patch<T>(url, data).then((res) => res.data);
  },

  /**
   * DELETE request
   */
  delete: <T>(url: string) => {
    return apiClient.delete<T>(url).then((res) => res.data);
  },

  /**
   * Upload file (multipart/form-data)
   */
  upload: <T>(url: string, formData: FormData, onProgress?: (progress: number) => void) => {
    return apiClient
      .post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      })
      .then((res) => res.data);
  },
};

export default apiClient;
