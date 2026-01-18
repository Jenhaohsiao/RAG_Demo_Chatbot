/**
 * useUserActivity Hook
 * Monitors user activity (mouse, keyboard, scroll, etc.)
 */
import { useEffect, useRef, useCallback } from 'react';

interface UseUserActivityOptions {
  onActivity?: () => void;
  throttleTime?: number; // Throttling time (avoid excessive callbacks)
}

interface UseUserActivityReturn {
  isActive: boolean;
}

/**
 * Custom hook for tracking user activity
 *
 * Features:
 * - Monitor mouse movement, clicks, keyboard events
 * - Throttle activity detection to avoid excessive API calls
 * - Trigger heartbeat on any user activity
 */
export const useUserActivity = (options: UseUserActivityOptions = {}): UseUserActivityReturn => {
  const { onActivity, throttleTime = 60000 } = options; // Default 1 minute throttle

  const lastActivityRef = useRef<number>(Date.now());
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle user activity with throttling
   */
  const handleActivity = useCallback(() => {
    const now = Date.now();

    // Check if within throttle period
    if (now - lastActivityRef.current < throttleTime) {
      return;
    }

    lastActivityRef.current = now;

    // Clear previous throttle timer
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }

    // Trigger activity callback
    if (onActivity) {
      onActivity();
    }

  }, [onActivity, throttleTime]);

  /**
   * Set up activity listeners
   */
  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Bind event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup listeners
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });

      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [handleActivity]);

  return {
    isActive: true // Always true for now
  };
};
