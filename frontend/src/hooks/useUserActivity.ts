/**
 * useUserActivity Hook
 * 監聽用戶活動（滑鼠移動、點擊、鍵盤等）
 */
import { useEffect, useRef, useCallback } from 'react';

interface UseUserActivityOptions {
  onActivity?: () => void;
  throttleTime?: number; // 節流時間，避免過於頻繁觸發
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
  const { onActivity, throttleTime = 60000 } = options; // 預設1分鐘節流
  
  const lastActivityRef = useRef<number>(Date.now());
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle user activity with throttling
   */
  const handleActivity = useCallback(() => {
    const now = Date.now();
    
    // 檢查是否在節流期間內
    if (now - lastActivityRef.current < throttleTime) {
      return;
    }
    
    lastActivityRef.current = now;
    
    // 清除之前的節流計時器
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }
    
    // 觸發活動回調
    if (onActivity) {
      onActivity();
    }
    
    // console.log('User activity detected, heartbeat triggered');
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

    // 添加事件監聽器
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // 清理函數
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
    isActive: true // 簡化實現，總是返回true
  };
};