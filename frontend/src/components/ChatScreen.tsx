/**
 * ChatScreen Component
 * 聊天介面主畫面
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatRole, ResponseType, type ChatMessage as ChatMessageType, type ChatResponse } from '../types/chat';

interface ChatScreenProps {
  sessionId: string;
  onSendQuery: (query: string) => Promise<ChatResponse>;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ sessionId, onSendQuery }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseTypes, setResponseTypes] = useState<Record<string, ResponseType>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自動滾動到最新訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    setError(null);
    setIsLoading(true);

    // 新增使用者訊息
    const userMessage: ChatMessageType = {
      message_id: crypto.randomUUID(),
      session_id: sessionId,
      role: ChatRole.USER,
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // 發送查詢
      const response = await onSendQuery(content);

      // 新增助理回應
      const assistantMessage: ChatMessageType = {
        message_id: response.message_id,
        session_id: sessionId,
        role: ChatRole.ASSISTANT,
        content: response.llm_response,
        timestamp: response.timestamp
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // 記錄回應類型（用於顯示 CANNOT_ANSWER 樣式）
      setResponseTypes(prev => ({
        ...prev,
        [response.message_id]: response.response_type
      }));

    } catch (err: any) {
      setError(err.response?.data?.detail || t('chat.error.sendFailed'));
      console.error('Query failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <h2>{t('chat.title')}</h2>
        <p className="chat-subtitle">{t('chat.subtitle')}</p>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>{t('chat.empty.message')}</p>
            <p className="empty-hint">{t('chat.empty.hint')}</p>
          </div>
        ) : (
          messages.map(msg => (
            <ChatMessage
              key={msg.message_id}
              message={msg}
              responseType={msg.role === ChatRole.ASSISTANT ? responseTypes[msg.message_id] : undefined}
            />
          ))
        )}
        
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>{t('chat.loading')}</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
      />

      <style jsx>{`
        .chat-screen {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
        }

        .chat-header {
          padding: 20px;
          border-bottom: 1px solid #e1e8ed;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .chat-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .chat-subtitle {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f9fafb;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #718096;
        }

        .empty-state p {
          margin: 0 0 12px 0;
          font-size: 16px;
        }

        .empty-hint {
          font-size: 14px;
          opacity: 0.8;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #edf2f7;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid #e2e8f0;
          border-top-color: #4299e1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-banner {
          padding: 12px 16px;
          background: #fff5f5;
          border-left: 4px solid #fc8181;
          color: #742a2a;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};
