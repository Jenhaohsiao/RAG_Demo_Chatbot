/**
 * useUserActivity Hook
 * ??½?¨æˆ¶æ´»å?ï¼ˆæ?é¼ ç§»?•ã€é??Šã€éµ?¤ç?ï¼?
 */
import { useEffect, useRef, useCallback } from 'react';

interface UseUserActivityOptions {
  onActivity?: () => void;
  throttleTime?: number; // ç¯€æµæ??“ï??¿å??æ–¼?»ç?è§¸ç™¼
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
  const { onActivity, throttleTime = 60000 } = options; // ?è¨­1?†é?ç¯€æµ?
  
  const lastActivityRef = useRef<number>(Date.now());
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle user activity with throttling
   */
  const handleActivity = useCallback(() => {
    const now = Date.now();
    
    // æª¢æŸ¥?¯å¦?¨ç?æµæ??“å…§
    if (now - lastActivityRef.current < throttleTime) {
      return;
    }
    
    lastActivityRef.current = now;
    
    // æ¸…é™¤ä¹‹å??„ç?æµè??‚å™¨
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }
    
    // è§¸ç™¼æ´»å??èª¿
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

    // æ·»å?äº‹ä»¶??½??
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // æ¸…ç??½æ•¸
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
    isActive: true // ç°¡å?å¯¦ç¾ï¼Œç¸½?¯è??true
  };
};
