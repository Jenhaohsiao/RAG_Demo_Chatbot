/**
 * useToast Hook
 * 管理toast通知顯示
 */
import { useState, useCallback } from 'react';

export interface ToastInfo {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  autoClose?: boolean;
  duration?: number;
}

interface UseToastReturn {
  toasts: ToastInfo[];
  showToast: (toast: Omit<ToastInfo, 'id'>) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

/**
 * Custom hook for toast message management
 * 
 * Features:
 * - Add/remove toast messages
 * - Auto-dismiss after duration
 * - Multiple toast support
 */
export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  /**
   * Show a new toast message
   */
  const showToast = useCallback((toast: Omit<ToastInfo, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: ToastInfo = {
      id,
      autoClose: true,
      duration: 3000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss if enabled
    if (newToast.autoClose) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration);
    }
  }, []);

  /**
   * Dismiss a specific toast
   */
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /**
   * Clear all toasts
   */
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    dismissToast,
    clearAllToasts
  };
};