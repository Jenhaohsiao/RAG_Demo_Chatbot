/**
 * ChatInput Component
 * 聊天訊息輸入框
 */

import React, { useState, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSendMessage(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
        disabled={disabled}
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
          disabled={disabled || !input.trim()}
          className="send-button"
        >
          {t('chat.input.send')}
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
          transition: border-color 0.2s;
        }

        .chat-input-textarea:focus {
          outline: none;
          border-color: #4299e1;
        }

        .chat-input-textarea:disabled {
          background: #f7fafc;
          cursor: not-allowed;
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
        }

        .send-button:hover:not(:disabled) {
          background: #3182ce;
        }

        .send-button:disabled {
          background: #cbd5e0;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
