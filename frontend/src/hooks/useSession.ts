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
  createSession: () => Promise<void>;
  closeSession: () => Promise<void>;
  restartSession: () => Promise<void>;
  updateLanguage: (newLanguage: string) => Promise<void>;
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
        setError('Failed to maintain session');
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

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
   * Create new session
   */
  const createSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sessionService.createSession(language);
      
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
   */
  const updateLanguage = useCallback(async (newLanguage: string) => {
    if (!sessionId) {
      // No session yet, just update local state
      setLanguage(newLanguage);
      i18n.changeLanguage(newLanguage);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await sessionService.updateLanguage(sessionId, newLanguage);
      
      setLanguage(response.language);
      i18n.changeLanguage(response.language);
      
      console.log('Language updated:', newLanguage);
    } catch (err: any) {
      setError(err.message || 'Failed to update language');
      console.error('Update language error:', err);
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
