/**
 * Session Service
 * API wrapper for session lifecycle operations
 */
import api from './api';
import type { 
  Session, 
  SessionResponse, 
  SessionWithMetrics, 
  LanguageUpdateRequest 
} from '../types/session';

/**
 * Create a new session
 * @param language Initial UI language (default: en)
 * @param similarityThreshold RAG similarity threshold (0.0-1.0, default: 0.5)
 * @param customPrompt Custom prompt template (optional)
 * @returns Session details
 */
export const createSession = async (
  language: string = 'en', 
  similarityThreshold: number = 0.5,
  customPrompt?: string
): Promise<SessionResponse> => {
  const params: any = { language, similarity_threshold: similarityThreshold };
  if (customPrompt) {
    params.custom_prompt = customPrompt;
  }
  
  const response = await api.post<SessionResponse>('/session/create', null, { params });
  return response.data;
};

/**
 * Get session details by ID
 * @param sessionId UUID of the session
 * @returns Session details
 */
export const getSession = async (sessionId: string): Promise<SessionResponse> => {
  const response = await api.get<SessionResponse>(`/session/${sessionId}`);
  return response.data;
};

/**
 * Get session details including resource metrics
 * @param sessionId UUID of the session
 * @returns Session with metrics
 */
export const getSessionWithMetrics = async (sessionId: string): Promise<SessionWithMetrics> => {
  const response = await api.get<SessionWithMetrics>(`/session/${sessionId}/metrics`);
  return response.data;
};

/**
 * Update session activity and extend TTL
 * @param sessionId UUID of the session
 * @returns Updated session details
 */
export const heartbeat = async (sessionId: string): Promise<SessionResponse> => {
  const response = await api.post<SessionResponse>(`/session/${sessionId}/heartbeat`);
  return response.data;
};

/**
 * Close session and delete associated data
 * @param sessionId UUID of the session
 */
export const closeSession = async (sessionId: string): Promise<void> => {
  await api.post(`/session/${sessionId}/close`);
};

/**
 * Close current session and create a new one
 * @param sessionId UUID of the current session
 * @returns New session details
 */
export const restartSession = async (sessionId: string): Promise<SessionResponse> => {
  const response = await api.post<SessionResponse>(`/session/${sessionId}/restart`, {}, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return response.data;
};

/**
 * Update session language preference
 * @param sessionId UUID of the session
 * @param language New language code
 * @returns Updated session details
 */
export const updateLanguage = async (
  sessionId: string, 
  language: 'en' | 'zh-TW' | 'zh-CN' | 'ko' | 'es' | 'ja' | 'ar' | 'fr'
): Promise<SessionResponse> => {
  const payload: LanguageUpdateRequest = { language };
  const response = await api.put<SessionResponse>(
    `/session/${sessionId}/language`,
    payload
  );
  return response.data;
};

const sessionService = {
  createSession,
  getSession,
  getSessionWithMetrics,
  heartbeat,
  closeSession,
  restartSession,
  updateLanguage
};

export default sessionService;
