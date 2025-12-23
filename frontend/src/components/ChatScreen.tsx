/**
 * ChatScreen Component
 * 聊天介面主畫面
 *
 * T082: Integrate MetricsPanel into ChatScreen updating after each query-response cycle
 * T089+: Display token tracking and page crawl statistics
 */

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { MetricsPanel } from "./MetricsPanel";
import { DocumentInfoCard } from "./DocumentInfoCard";
import ResourceConsumptionPanel from "./ResourceConsumptionPanel";
import CrawledUrlsPanel from "./CrawledUrlsPanel";
import {
  ChatRole,
  ResponseType,
  type ChatMessage as ChatMessageType,
  type ChatResponse,
} from "../types/chat";
import {
  getSessionMetrics,
  type SessionMetrics,
} from "../services/metricsService";
import { getSession } from "../services/sessionService";
import { type CrawledPage } from "../services/uploadService";

interface ChatScreenProps {
  sessionId: string;
  documentSummary?: string;
  sourceReference?: string;
  sourceType?: string;
  chunkCount?: number;
  tokensUsed?: number;
  pagesCrawled?: number;
  crawledPages?: CrawledPage[];
  baseUrl?: string;
  crawlDurationSeconds?: number;
  avgTokensPerPage?: number;
  totalTokenLimit?: number;
  onSendQuery: (query: string) => Promise<ChatResponse>;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  sessionId,
  documentSummary,
  sourceReference,
  sourceType,
  chunkCount,
  tokensUsed,
  pagesCrawled,
  crawledPages,
  baseUrl,
  crawlDurationSeconds,
  avgTokensPerPage,
  totalTokenLimit,
  onSendQuery,
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseTypes, setResponseTypes] = useState<
    Record<string, ResponseType>
  >({});
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    document_count: number;
    vector_count: number;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自動滾動到最新訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        console.error("Failed to update metrics:", err);
      }
    };

    // 初始載入
    updateMetrics();

    // 每隔 3 秒更新一次
    const interval = setInterval(updateMetrics, 3000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // 獲取 session 信息（document_count, vector_count）
  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const data = await getSession(sessionId);
        setSessionInfo({
          document_count: data.document_count,
          vector_count: data.vector_count,
        });
      } catch (err) {
        console.error("Failed to fetch session info:", err);
      }
    };

    fetchSessionInfo();

    // 每 5 秒更新一次
    const interval = setInterval(fetchSessionInfo, 5000);
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
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // 發送查詢
      const response = await onSendQuery(content);

      // 新增助理回應
      const assistantMessage: ChatMessageType = {
        message_id: response.message_id,
        session_id: sessionId,
        role: ChatRole.ASSISTANT,
        content: response.llm_response,
        timestamp: response.timestamp,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 記錄回應類型（用於顯示 CANNOT_ANSWER 樣式）
      setResponseTypes((prev) => ({
        ...prev,
        [response.message_id]: response.response_type,
      }));

      // 查詢後立即更新 metrics
      const updatedMetrics = await getSessionMetrics(sessionId);
      setMetrics(updatedMetrics);
    } catch (err: any) {
      setError(err.response?.data?.detail || t("chat.error.sendFailed"));
      console.error("Query failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-screen">
      {/* Metrics Dashboard - Consolidated into MetricsPanel below */}
      {/* MetricsDashboard hidden - metrics consolidated into single MetricsPanel for compact display */}
      {/* {showMetrics && metrics && (
        <MetricsDashboard
          sessionId={sessionId}
          metrics={metrics}
          onMetricsUpdate={setMetrics}
        />
      )} */}

      {/* 文檔摘要區域 - 全頁寬度 */}
      <div className="document-summary-full-width">
        <DocumentInfoCard
          sessionId={sessionId}
          documentSummary={documentSummary}
          sourceReference={sourceReference}
          chunkCount={chunkCount}
        />
      </div>

      {/* 新的兩欄布局 */}
      <div className="row chat-main-content">
        {/* 左欄：文檔資訊和實時指標 */}
        <div className="col-md-4 left-panel">
          {/* 文檔資訊區域 */}
          <div className="info-section">
            <h4 className="section-title">文檔資訊</h4>

            {/* Vector DB 信息 */}
            {sessionInfo && (
              <div className="row mb-3">
                <div className=" col-md-6 align-items-center">
                  <i
                    className="bi bi-database-fill text-success me-2"
                    style={{ fontSize: "1.5rem" }}
                  ></i>
                  <div>
                    <div className="text-muted small">
                      {t("documentInfo.vectorsStored", "Vector DB 向量數")}
                    </div>
                    <div className="fw-bold fs-6">
                      {sessionInfo.vector_count}{" "}
                      {t("documentInfo.vectors", "個向量")}
                    </div>
                  </div>
                </div>
                <div className="col-md-6 align-items-center">
                  <i
                    className="bi bi-file-earmark-check text-info me-2"
                    style={{ fontSize: "1.5rem" }}
                  ></i>
                  <div>
                    <div className="text-muted small">
                      {t("documentInfo.documentsUploaded", "已上傳文檔數")}
                    </div>
                    <div className="fw-bold fs-6">
                      {sessionInfo.document_count}{" "}
                      {t("documentInfo.documents", "個文檔")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 文檔詳細信息 */}
            {(sourceReference || chunkCount) && (
              <div className="row mb-3">
                {sourceReference && (
                  <div className=" col-md-6 align-items-center">
                    <div className="text-muted small">
                      {t("documentInfo.fileName", "文件名稱")}
                    </div>
                    <div className="text-truncate" title={sourceReference}>
                      {sourceReference}
                    </div>
                  </div>
                )}
                {chunkCount !== undefined && (
                  <div className=" col-md-6 align-items-center">
                    <div className="text-muted small">
                      {t("documentInfo.chunks", "文本塊數")}
                    </div>
                    <div>{chunkCount} chunks</div>
                  </div>
                )}
              </div>
            )}

            {/* Resource Consumption Panel - 顯示資源消耗 (Token, 時間等) */}
            {(documentSummary || chunkCount || sourceReference) && (
              <ResourceConsumptionPanel
                sourceType={sourceType}
                tokensUsed={tokensUsed || 0}
                chunkCount={chunkCount || 0}
                processingTimeMs={0}
                crawlDurationSeconds={crawlDurationSeconds || 0}
                avgTokensPerPage={avgTokensPerPage || 0}
                totalTokenLimit={totalTokenLimit || 32000}
              />
            )}

            {/* Crawled URLs Panel - 顯示爬蟲結果的 URL 列表 */}
            {((crawledPages && crawledPages.length > 0) ||
              (sourceType === "URL" && pagesCrawled && pagesCrawled > 0)) && (
              <CrawledUrlsPanel
                pages={crawledPages || []}
                baseUrl={baseUrl || sourceReference || ""}
                totalPages={pagesCrawled || crawledPages?.length || 0}
                totalTokens={tokensUsed || 0}
              />
            )}
          </div>

          {/* 實時指標區域 */}
          <div className="metrics-section">
            <h5 className="section-title">⏱️ 實時指標</h5>
            {metrics && (
              <MetricsPanel
                metrics={{
                  token_input: metrics.total_input_tokens || 0,
                  token_output: metrics.total_output_tokens || 0,
                  token_total: metrics.total_tokens || 0,
                  token_limit: metrics.token_warning_threshold || 32000,
                  token_percent:
                    ((metrics.total_tokens || 0) /
                      (metrics.token_warning_threshold || 32000)) *
                    100,
                  context_tokens: metrics.avg_chunks_retrieved * 500 || 0,
                  context_percent:
                    ((metrics.avg_chunks_retrieved * 500 || 0) / 8000) * 100,
                  vector_count: metrics.avg_chunks_retrieved || 0,
                }}
              />
            )}
          </div>
        </div>

        {/* 右欄：互動專區 */}
        <div className="col-md-8 right-panel">
          <div className="interaction-area">
            <h5 className="section-title">💬 互動專區</h5>

            {/* 聊天對話區 */}
            <div className="chat-area">
              <h6 className="subsection-title">聊天對話區</h6>
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <p>{t("chat.empty.message")}</p>
                    <p className="empty-hint">{t("chat.empty.hint")}</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <ChatMessage
                      key={msg.message_id}
                      message={msg}
                      responseType={
                        msg.role === ChatRole.ASSISTANT
                          ? responseTypes[msg.message_id]
                          : undefined
                      }
                    />
                  ))
                )}

                {isLoading && (
                  <div className="loading-indicator">
                    <div className="spinner"></div>
                    <span>{t("chat.loading")}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 提問區 */}
            <div className="input-area">
              <h6 className="subsection-title">提問區</h6>
              {error && <div className="error-banner">❌ {error}</div>}
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

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

        .chat-main-content {
          flex: 1;
          overflow: hidden;
        }

        .document-summary-full-width {
          background: #f8f9fa;
          border-bottom: 1px solid #e1e8ed;
          margin-bottom: 1rem;
        }

        .document-summary-full-width .section-title {
          color: #2d3748;
          font-weight: 600;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e1e8ed;
        }

        .left-panel {
          background: #f8f9fa;
          border-right: 1px solid #e1e8ed;
          height: 100vh;
          overflow-y: auto;
          padding: 1rem;
        }

        .right-panel {
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 1rem;
        }

        .document-summary-section {
          margin-bottom: 1.5rem;
        }

        .section-title {
          color: #2d3748;
          font-weight: 600;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e1e8ed;
        }

        .subsection-title {
          color: #4a5568;
          font-weight: 500;
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }

        .info-section {
          margin-bottom: 2rem;
        }

        .metrics-section {
          margin-bottom: 1rem;
        }

        .interaction-area {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .chat-area {
          flex: 1;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .input-area {
          background: #f0f7ff;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #bee3f8;
        }

        .messages-container {
          height: calc(100vh - 250px);
          overflow-y: auto;
          padding: 1rem;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          background: white;
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
          to {
            transform: rotate(360deg);
          }
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
