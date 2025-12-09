/**
 * ChatMessage Component
 * 顯示單一聊天訊息（使用者或助理）
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChatRole, ResponseType, type ChatMessage as ChatMessageType } from '../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  responseType?: ResponseType; // 僅助理訊息需要
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, responseType }) => {
  const { t } = useTranslation();
  const isUser = message.role === ChatRole.USER;
  const cannotAnswer = responseType === ResponseType.CANNOT_ANSWER;

  return (
    <div className={`message-container ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-header">
        <span className="message-role">
          {isUser ? t('chat.message.you') : t('chat.message.assistant')}
        </span>
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      <div className={`message-content ${cannotAnswer ? 'cannot-answer' : ''}`}>
        {message.content}
      </div>

      {cannotAnswer && (
        <div className="cannot-answer-note">
          ⚠️ {t('chat.message.cannotAnswerNote')}
        </div>
      )}

      <style jsx>{`
        .message-container {
          margin-bottom: 16px;
          padding: 12px;
          border-radius: 8px;
        }

        .message-container.user {
          background: #ebf8ff;
          margin-left: 20%;
        }

        .message-container.assistant {
          background: #f7fafc;
          margin-right: 20%;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .message-role {
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .message-container.user .message-role {
          color: #2b6cb0;
        }

        .message-container.assistant .message-role {
          color: #2d3748;
        }

        .message-time {
          font-size: 11px;
          color: #718096;
        }

        .message-content {
          font-size: 14px;
          line-height: 1.6;
          color: #2d3748;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .message-content.cannot-answer {
          color: #9b2c2c;
          font-style: italic;
        }

        .cannot-answer-note {
          margin-top: 8px;
          padding: 8px;
          background: #fff5f5;
          border-left: 3px solid #fc8181;
          font-size: 12px;
          color: #742a2a;
        }
      `}</style>
    </div>
  );
};
