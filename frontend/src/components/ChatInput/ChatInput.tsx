/**
 * ChatInput Component
 * 聊天訊息輸入框
 * 
 * T092: Added loading states and spinners during API calls
 */

import React, { useState, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;  // T092: Add loading state prop
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  isLoading = false,  // T092: Default to not loading
  placeholder
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled && !isLoading) {
      onSendMessage(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-container">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('chat.input.placeholder')}
        disabled={disabled || isLoading}  // T092: Disable during loading
        className="chat-input-textarea"
        rows={3}
        maxLength={2000}
      />
      <div className="chat-input-footer">
        <span className="char-count">
          {input.length}/2000
        </span>
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim() || isLoading}  // T092: Disable during loading
          className={`send-button ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              {t('chat.input.sending')}
            </>
          ) : (
            t('chat.input.send')
          )}
        </button>
      </div>

      <style jsx>{`
        .chat-input-container {
          border-top: 1px solid #e1e8ed;
          padding: 16px;
          background: white;
        }

        .chat-input-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #cbd5e0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: none;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .chat-input-textarea:focus {
          outline: none;
          border-color: #4299e1;
        }

        .chat-input-textarea:disabled {
          background: #f7fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .chat-input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }

        .char-count {
          font-size: 12px;
          color: #718096;
        }

        .send-button {
          padding: 8px 24px;
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .send-button:hover:not(:disabled) {
          background: #3182ce;
        }

        .send-button:disabled {
          background: #cbd5e0;
          cursor: not-allowed;
        }

        /* T092: Loading state styling */
        .send-button.loading {
          background: #4299e1;
          opacity: 0.8;
        }

        /* T092: Spinner animation */
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid #ffffff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
