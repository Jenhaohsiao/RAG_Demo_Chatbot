/**
 * useSession Hook
 * Manages session lifecycle with automatic heartbeat and activity monitoring
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import sessionService from '../services/sessionService';
import { useUserActivity } from './useUserActivity';
import type { SessionState, SessionResponse } from '../types/session';

// Heartbeat interval: 5 minutes (session TTL is 20 minutes)
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
// Activity-based heartbeat: 1 minute throttle
const ACTIVITY_THROTTLE = 60 * 1000;

interface UseSessionReturn {
  sessionId: string | null;
  sessionState: SessionState | null;
  expiresAt: Date | null;
  language: string;
  isLoading: boolean;
  error: string | null;
  isSessionExpired: boolean;
  createSession: (similarityThreshold?: number, customPrompt?: string) => Promise<void>;
  closeSession: () => Promise<void>;
  restartSession: () => Promise<void>;
  updateLanguage: (newLanguage: 'en' | 'zh-TW' | 'zh-CN' | 'ko' | 'es' | 'ja' | 'ar' | 'fr', passedSessionId?: string | null) => Promise<void>;
  setOnSessionExpired: (callback: (() => void) | undefined) => void;
}

/**
 * Custom hook for session management
 */
export const useSession = (): UseSessionReturn => {
  const { i18n } = useTranslation();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [language, setLanguage] = useState<string>(i18n.language);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const errorSetRef = useRef<boolean>(false);
  const expirationCheckRef = useRef<NodeJS.Timeout | null>(null);
  const onSessionExpiredRef = useRef<(() => void) | undefined>(undefined);
  
  /**
   * Set callback for session expiration
   */
  const setOnSessionExpired = useCallback((callback: (() => void) | undefined) => {
    onSessionExpiredRef.current = callback;
  }, []);
  
  /**
   * Stop expiration check timer
   */
  const stopExpirationCheck = useCallback(() => {
    if (expirationCheckRef.current) {
      clearTimeout(expirationCheckRef.current);
      expirationCheckRef.current = null;
    }
  }, []);

  /**
   * Stop heartbeat timer
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    stopExpirationCheck();
  }, [stopExpirationCheck]);
  
  /**
   * Handle session expiration
   */
  const handleSessionExpiration = useCallback(() => {
    console.log('Session expired, triggering cleanup');
    setIsSessionExpired(true);
    stopHeartbeat();
    
    // 重置所有session狀態
    setSessionId(null);
    setSessionState(null);
    setExpiresAt(null);
    
    // 觸發回調
    if (onSessionExpiredRef.current) {
      onSessionExpiredRef.current();
    }
  }, [stopHeartbeat]);

  /**
   * Start expiration check timer
   */
  const startExpirationCheck = useCallback((expirationTime: Date) => {
    stopExpirationCheck();
    
    const timeUntilExpiration = expirationTime.getTime() - Date.now();
    
    if (timeUntilExpiration > 0) {
      expirationCheckRef.current = setTimeout(() => {
        handleSessionExpiration();
      }, timeUntilExpiration);
      
      console.log(`Session will expire at ${expirationTime.toISOString()}`);
    } else {
      handleSessionExpiration();
    }
  }, [stopExpirationCheck, handleSessionExpiration]);
  
  /**
   * Trigger heartbeat immediately (for user activity)
   */
  const triggerHeartbeat = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await sessionService.heartbeat(sessionId);
      const newExpiresAt = new Date(response.expires_at);
      setExpiresAt(newExpiresAt);
      startExpirationCheck(newExpiresAt);
      
      if (error) {
        setError(null);
        errorSetRef.current = false;
      }
      console.log(`Activity-triggered heartbeat sent for session ${sessionId}`);
    } catch (err) {
      console.error('Activity heartbeat failed:', err);
      if (err instanceof Error && (err.message.includes('404') || err.message.includes('410'))) {
        handleSessionExpiration();
      }
    }
  }, [sessionId, error, handleSessionExpiration, startExpirationCheck]);
  
  // 監聽用戶活動並觸發heartbeat
  useUserActivity({
    onActivity: triggerHeartbeat,
    throttleTime: ACTIVITY_THROTTLE
  });

  /**
   * Start heartbeat timer
   */
  const startHeartbeat = useCallback((currentSessionId: string) => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(async () => {
      try {
        const response = await sessionService.heartbeat(currentSessionId);
        const newExpiresAt = new Date(response.expires_at);
        setExpiresAt(newExpiresAt);
        startExpirationCheck(newExpiresAt);
        
        if (error) {
          setError(null);
          errorSetRef.current = false;
        }
        console.log(`Heartbeat sent for session ${currentSessionId}`);
      } catch (err) {
        console.error('Heartbeat failed:', err);
        if (!errorSetRef.current) {
          if (err instanceof Error && (err.message.includes('404') || err.message.includes('410'))) {
            handleSessionExpiration();
          } else {
            const errorMsg = '無法維持會話連線，請檢查網路連線';
            setError(errorMsg);
            errorSetRef.current = true;
          }
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, [error, handleSessionExpiration, startExpirationCheck]);

  /**
   * Create new session
   */
  const createSession = useCallback(async (similarityThreshold: number = 0.5, customPrompt?: string) => {
    setIsLoading(true);
    setError(null);
    setIsSessionExpired(false);
    errorSetRef.current = false;

    try {
      const response = await sessionService.createSession(language, similarityThreshold, customPrompt);
      
      setSessionId(response.session_id);
      setSessionState(response.state);
      const newExpiresAt = new Date(response.expires_at);
      setExpiresAt(newExpiresAt);
      setLanguage(response.language);
      
      startHeartbeat(response.session_id);
      startExpirationCheck(newExpiresAt);
      
      console.log('Session created:', response.session_id);
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
      console.error('Create session error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [language, startHeartbeat, startExpirationCheck]);

  /**
   * Close current session
   */
  const closeSession = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      await sessionService.closeSession(sessionId);
      stopHeartbeat();
      
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
   * Restart session
   */
  const restartSession = useCallback(async () => {
    if (!sessionId) {
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
   */
  const updateLanguage = useCallback(async (newLanguage: 'en' | 'zh-TW' | 'zh-CN' | 'ko' | 'es' | 'ja' | 'ar' | 'fr', passedSessionId?: string | null) => {
    const targetSessionId = passedSessionId !== undefined ? passedSessionId : sessionId;

    if (!targetSessionId) {
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
      throw err;
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
    isSessionExpired,
    createSession,
    closeSession,
    restartSession,
    updateLanguage,
    setOnSessionExpired
  };
};

export default useSession;
