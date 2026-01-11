/**
 * useSession Hook
 * Manages session lifecycle with automatic heartbeat and activity monitoring
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import sessionService from '../services/sessionService';
import { API_BASE_URL } from '../services/api';
import { useUserActivity } from './useUserActivity';
import type { SessionState, SessionResponse } from '../types/session';

// Heartbeat interval: 3 minutes (session TTL is 10 minutes)
const HEARTBEAT_INTERVAL = 3 * 60 * 1000;
// Activity-based heartbeat: 30 seconds throttle (session TTL is 10 minutes)
const ACTIVITY_THROTTLE = 30 * 1000;

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
  updateLanguage: (newLanguage: 'en' | 'zh-TW' | 'zh-CN' | 'ko' | 'es' | 'ja' | 'fr', passedSessionId?: string | null) => Promise<void>;
  setOnSessionExpired: (callback: (() => void) | undefined) => void;
  resetSessionExpired: () => void;
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
   * Uses relative time calculation to avoid clock skew issues
   */
  const startExpirationCheck = useCallback((expirationTime: Date, lastActivityTime?: Date) => {
    stopExpirationCheck();
    
    // Calculate duration based on server time if available, otherwise fallback to local time diff
    let timeUntilExpiration: number;
    
    if (lastActivityTime) {
      // Calculate total TTL duration from server timestamps
      const totalTTL = expirationTime.getTime() - lastActivityTime.getTime();
      // We assume we just received this response, so we set timeout for the full TTL duration
      // This is safer than comparing absolute clocks
      timeUntilExpiration = totalTTL;
    } else {
      // Fallback to absolute time comparison (prone to clock skew)
      timeUntilExpiration = expirationTime.getTime() - Date.now();
    }
    
    // Safety buffer: subtract 500ms to ensure backend expires first? 
    // No, we want frontend to expire slightly AFTER backend to allow for latency, 
    // OR slightly BEFORE to prevent 404s?
    // Actually, if we want to show "Session Expired" modal, we should sync closely.
    // If we expire locally first, we show modal.
    // If backend expires first, next request fails with 404 -> show modal.
    
    // console.log(`[Session] Setting expiration timer for ${timeUntilExpiration}ms`);
    
    if (timeUntilExpiration > 0) {
      expirationCheckRef.current = setTimeout(() => {
        handleSessionExpiration();
      }, timeUntilExpiration);
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
      const lastActivity = new Date(response.last_activity);
      
      setExpiresAt(newExpiresAt);
      startExpirationCheck(newExpiresAt, lastActivity);
      
      if (error) {
        setError(null);
        errorSetRef.current = false;
      }
      // console.log(`Activity-triggered heartbeat sent for session ${sessionId}`);
    } catch (err: any) {
      // Robust 404 detection - check both axios response and error message
      const status = err?.response?.status;
      const errorMessage = err?.message || '';
      
      // Check for session not found errors (404, 410, or message contains keywords)
      const isSessionNotFound = 
        status === 404 || 
        status === 410 || 
        errorMessage.includes('404') || 
        errorMessage.includes('410') ||
        errorMessage.toLowerCase().includes('not found') ||
        errorMessage.toLowerCase().includes('expired') ||
        errorMessage.includes('ERR_SESSION_NOT_FOUND');
      
      if (isSessionNotFound) {
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
   * 
   * ⚠️ 已禁用自動定時器 - 只通過用戶活動觸發 heartbeat
   * 原因：如果用戶沒有操作，會話應該在20分鐘後自然過期
   * 如需恢復自動 heartbeat，取消下方代碼的註釋
   */
  const startHeartbeat = useCallback((currentSessionId: string) => {
    // 清除舊的定時器（如果存在）
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    // ⛔ 禁用自動定時器 - 用戶無操作時應讓會話自然過期
    // 如需恢復，取消下方代碼的註釋：
    /*
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
        // console.log(`Auto heartbeat sent for session ${currentSessionId}`);
      } catch (err) {
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
    */
    
    // console.log(`Heartbeat timer disabled - only user activity will trigger heartbeat for session ${currentSessionId}`);
  }, [error, handleSessionExpiration, startExpirationCheck]);

  /**
   * Create new session
   */
  const createSession = useCallback(async (similarityThreshold: number = 0.5, customPrompt?: string) => {
    setIsLoading(true);
    setError(null);
    // Don't reset isSessionExpired here - let the caller (modal confirm) do it
    errorSetRef.current = false;

    try {
      const response = await sessionService.createSession(language, similarityThreshold, customPrompt);
      
      setSessionId(response.session_id);
      setSessionState(response.state);
      const newExpiresAt = new Date(response.expires_at);
      // Use created_at as proxy for last_activity on creation
      const lastActivity = new Date(response.created_at); 
      
      setExpiresAt(newExpiresAt);
      setLanguage(response.language);
      
      startHeartbeat(response.session_id);
      startExpirationCheck(newExpiresAt, lastActivity);
      
      // console.log('Session created:', response.session_id);
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
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
    } catch (err: any) {
      setError(err.message || 'Failed to close session');
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
    } catch (err: any) {
      setError(err.message || 'Failed to restart session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, createSession, startHeartbeat]);

  /**
   * Update session language
   */
  const updateLanguage = useCallback(async (newLanguage: 'en' | 'zh-TW' | 'zh-CN' | 'ko' | 'es' | 'ja' | 'fr', passedSessionId?: string | null) => {
    const targetSessionId = passedSessionId !== undefined ? passedSessionId : sessionId;

    if (!targetSessionId) {
      setLanguage(newLanguage);
      i18n.changeLanguage(newLanguage);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await sessionService.updateLanguage(targetSessionId, newLanguage);
      
      setLanguage(response.language);
      i18n.changeLanguage(response.language);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update language';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, i18n]);

  /**
   * Cleanup on unmount and handle unload
   */
  useEffect(() => {
    const handleUnload = () => {
      if (sessionId) {
        // Use sendBeacon for reliable execution on unload
        // This ensures session is closed on browser close/reload
        const url = `${API_BASE_URL}/session/${sessionId}/close`;
        const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    };

    window.addEventListener('unload', handleUnload);

    return () => {
      stopHeartbeat();
      window.removeEventListener('unload', handleUnload);
    };
  }, [stopHeartbeat, sessionId]);

  /**
   * Reset session expired state (called when user confirms the expired modal)
   */
  const resetSessionExpired = useCallback(() => {
    setIsSessionExpired(false);
  }, []);

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
    setOnSessionExpired,
    resetSessionExpired
  };
};

export default useSession;
