/**
 * useSession Hook
 * Manages session lifecycle with automatic heartbeat
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import sessionService from '../services/sessionService';
import type { SessionState, SessionResponse } from '../types/session';

// Heartbeat interval: 5 minutes (session TTL is 30 minutes)
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

interface UseSessionReturn {
  sessionId: string | null;
  sessionState: SessionState | null;
  expiresAt: Date | null;
  language: string;
  isLoading: boolean;
  error: string | null;
  createSession: (similarityThreshold?: number, customPrompt?: string) => Promise<void>;
  closeSession: () => Promise<void>;
  restartSession: () => Promise<void>;
  updateLanguage: (newLanguage: 'en' | 'zh-TW' | 'zh-CN' | 'ko' | 'es' | 'ja' | 'ar' | 'fr', passedSessionId?: string | null) => Promise<void>;
}

/**
 * Custom hook for session management
 * 
 * Features:
 * - Create/close/restart session
 * - Automatic heartbeat every 5 minutes
 * - Language update synchronization
 * - Session state tracking
 */
export const useSession = (): UseSessionReturn => {
  const { i18n } = useTranslation();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [language, setLanguage] = useState<string>(i18n.language);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Stop heartbeat timer
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  /**
   * Start heartbeat timer
   */
  const startHeartbeat = useCallback((currentSessionId: string) => {
    // Clear existing timer
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    // Start new timer
    heartbeatTimerRef.current = setInterval(async () => {
      try {
        const response = await sessionService.heartbeat(currentSessionId);
        setExpiresAt(new Date(response.expires_at));
        console.log(`Heartbeat sent for session ${currentSessionId}`);
      } catch (err) {
        console.error('Heartbeat failed:', err);
        // 检查具体错误类型
        if (err instanceof Error && (err.message.includes('404') || err.message.includes('410'))) {
          setError('會話已過期，請重新開始');
          // Session已過期，停止heartbeat timer
          stopHeartbeat();
        } else {
          setError('無法維持會話連線，請檢查網路連線');
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, [stopHeartbeat]);

  /**
   * Create new session
   */
  const createSession = useCallback(async (similarityThreshold: number = 0.5, customPrompt?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sessionService.createSession(language, similarityThreshold, customPrompt);
      
      setSessionId(response.session_id);
      setSessionState(response.state);
      setExpiresAt(new Date(response.expires_at));
      setLanguage(response.language);
      
      // Start heartbeat
      startHeartbeat(response.session_id);
      
      console.log('Session created:', response.session_id);
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
      console.error('Create session error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [language, startHeartbeat]);

  /**
   * Close current session
   */
  const closeSession = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      await sessionService.closeSession(sessionId);
      
      // Stop heartbeat
      stopHeartbeat();
      
      // Reset state
      setSessionId(null);
      setSessionState(null);
      setExpiresAt(null);
      
      console.log('Session closed:', sessionId);
    } catch (err: any) {
      setError(err.message || 'Failed to close session');
      console.error('Close session error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, stopHeartbeat]);

  /**
   * Restart session (close current, create new)
   */
  const restartSession = useCallback(async () => {
    if (!sessionId) {
      // No existing session, just create new one
      await createSession();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await sessionService.restartSession(sessionId);
      
      setSessionId(response.session_id);
      setSessionState(response.state);
      setExpiresAt(new Date(response.expires_at));
      setLanguage(response.language);
      
      // Restart heartbeat with new session ID
      startHeartbeat(response.session_id);
      
      console.log('Session restarted:', response.session_id);
    } catch (err: any) {
      setError(err.message || 'Failed to restart session');
      console.error('Restart session error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, createSession, startHeartbeat]);

  /**
   * Update session language
   * T075: Language change handler with backend sync
   * @param newLanguage Language code to update to
   * @param passedSessionId Optional sessionId to use (allows parent to pass current session)
   */
  const updateLanguage = useCallback(async (newLanguage: 'en' | 'zh-TW' | 'zh-CN' | 'ko' | 'es' | 'ja' | 'ar' | 'fr', passedSessionId?: string | null) => {
    // Use passed sessionId if available, otherwise use state sessionId
    const targetSessionId = passedSessionId !== undefined ? passedSessionId : sessionId;

    if (!targetSessionId) {
      // No session yet, just update local state
      console.log('[updateLanguage] No session ID, updating local state only');
      setLanguage(newLanguage);
      i18n.changeLanguage(newLanguage);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[updateLanguage] Updating language to:', newLanguage, 'for session:', targetSessionId);
      
      const response = await sessionService.updateLanguage(targetSessionId, newLanguage);
      
      setLanguage(response.language);
      i18n.changeLanguage(response.language);
      
      console.log('[updateLanguage] Language successfully updated:', newLanguage);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update language';
      setError(errorMsg);
      console.error('[updateLanguage] Error:', errorMsg);
      throw err; // Re-throw for caller to handle
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, i18n]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    sessionId,
    sessionState,
    expiresAt,
    language,
    isLoading,
    error,
    createSession,
    closeSession,
    restartSession,
    updateLanguage
  };
};

export default useSession;
