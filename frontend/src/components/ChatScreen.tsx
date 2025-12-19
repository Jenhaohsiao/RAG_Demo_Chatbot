/**
 * ChatScreen Component
 * 聊天介面主畫面
 * 
 * T082: Integrate MetricsPanel into ChatScreen updating after each query-response cycle
 * T089+: Display token tracking and page crawl statistics
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { MetricsPanel } from './MetricsPanel';
import { DocumentInfoCard } from './DocumentInfoCard';
import UploadedDocumentInfo from './UploadedDocumentInfo';  // T089+
import { ChatRole, ResponseType, type ChatMessage as ChatMessageType, type ChatResponse } from '../types/chat';
import { getSessionMetrics, type SessionMetrics } from '../services/metricsService';

interface ChatScreenProps {
  sessionId: string;
  documentSummary?: string;
  sourceReference?: string;
  sourceType?: string;
  chunkCount?: number;
  tokensUsed?: number;  // T089+
  pagesCrawled?: number;  // T089+
  onSendQuery: (query: string) => Promise<ChatResponse>;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  sessionId,
  documentSummary,
  sourceReference,
  sourceType,
  chunkCount,
  tokensUsed,  // T089+
  pagesCrawled,  // T089+
  onSendQuery,
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseTypes, setResponseTypes] = useState<Record<string, ResponseType>>({});
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [showMetrics, setShowMetrics] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自動滾動到最新訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 定期更新 metrics
  useEffect(() => {
    const updateMetrics = async () => {
      try {
        const data = await getSessionMetrics(sessionId);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to update metrics:', err);
      }
    };

    // 初始載入
    updateMetrics();

    // 每隔 3 秒更新一次
    const interval = setInterval(updateMetrics, 3000);

    return () => clearInterval(interval);
  }, [sessionId]);

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

      // 查詢後立即更新 metrics
      const updatedMetrics = await getSessionMetrics(sessionId);
      setMetrics(updatedMetrics);

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
        <div className="chat-header-content">
          <div>
            <h2>{t('chat.title')}</h2>
            <p className="chat-subtitle">{t('chat.subtitle')}</p>
          </div>
          <button
            className="metrics-toggle-btn"
            onClick={() => setShowMetrics(!showMetrics)}
            title={showMetrics ? '隱藏統計' : '顯示統計'}
          >
            {showMetrics ? '📊 隱藏' : '📊 顯示'}
          </button>
        </div>
      </div>

      {/* Metrics Dashboard - Consolidated into MetricsPanel below */}
      {/* MetricsDashboard hidden - metrics consolidated into single MetricsPanel for compact display */}
      {/* {showMetrics && metrics && (
        <MetricsDashboard
          sessionId={sessionId}
          metrics={metrics}
          onMetricsUpdate={setMetrics}
        />
      )} */}
      
      {/* T082: MetricsPanel showing updated metrics after each query-response cycle */}
      {/* Consolidated real-time metrics in single horizontal row layout */}
      {showMetrics && metrics && (
        <MetricsPanel
          metrics={{
            token_input: metrics.input_tokens || 0,
            token_output: metrics.output_tokens || 0,
            token_total: metrics.total_tokens || 0,
            token_limit: metrics.token_warning_threshold || 32000,
            token_percent: (metrics.total_tokens || 0) / (metrics.token_warning_threshold || 32000) * 100,
            context_tokens: metrics.context_size || 0,
            context_percent: (metrics.context_size || 0) / 8000 * 100, // assuming ~8k context window
            vector_count: metrics.vector_count || 0,
          }}
        />
      )}

      {/* Document Info Card - 顯示文檔摘要和 Vector DB 信息 */}
      <DocumentInfoCard
        sessionId={sessionId}
        documentSummary={documentSummary}
        sourceReference={sourceReference}
        chunkCount={chunkCount}
      />

      {/* T089+: Uploaded Document Info - 顯示上傳文檔的統計信息 */}
      <UploadedDocumentInfo
        sourceType={sourceType as any}
        sourceReference={sourceReference}
        tokensUsed={tokensUsed}
        pagesCrawled={pagesCrawled}
        chunkCount={chunkCount}
        summary={documentSummary}
      />

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
          background: white;
        }

        .chat-header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .chat-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #2d3748;
        }

        .chat-subtitle {
          margin: 0;
          font-size: 14px;
          color: #718096;
        }

        .metrics-toggle-btn {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s ease;
          white-space: nowrap;
          height: fit-content;
        }

        .metrics-toggle-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .metrics-toggle-btn:active {
          transform: translateY(0);
        }

        .document-summary-container {
          padding: 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e1e8ed;
          max-height: 300px;
          overflow-y: auto;
        }

        .document-info {
          margin: 0;
        }

        .document-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .document-filename {
          margin: 0;
          font-weight: 600;
          font-size: 15px;
          color: #2d3748;
          word-break: break-word;
        }

        .document-description {
          line-height: 1.6;
          font-size: 14px;
          color: #4a5568;
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

export default ChatScreen;
