/**
 * ChatScreen Component
 * Main chat interface screen
 *
 * T082: Integrate MetricsPanel into ChatScreen updating after each query-response cycle
 * T089+: Display token tracking and page crawl statistics
 */

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/config";
import { ChatMessage } from "../ChatMessage/ChatMessage";
import { ChatInput } from "../ChatInput/ChatInput";
import { MetricsPanel } from "../MetricsPanel/MetricsPanel";
import { DocumentInfoCard } from "../DocumentInfoCard/DocumentInfoCard";
import ResourceConsumptionPanel from "../ResourceConsumptionPanel/ResourceConsumptionPanel";
import CrawledUrlsPanel from "../CrawledUrlsPanel/CrawledUrlsPanel";
import {
  ChatRole,
  ResponseType,
  type ChatMessage as ChatMessageType,
  type ChatResponse,
} from "../../types/chat";
import {
  getSessionMetrics,
  type SessionMetrics,
} from "../../services/metricsService";
import { getSession } from "../../services/sessionService";
import { getSuggestions as getChatSuggestions } from "../../services/chatService";
import { type CrawledPage } from "../../services/uploadService";
import "./ChatScreen.scss";

// Check if text is primarily English
const isEnglishText = (text: string): boolean => {
  if (!text || text.length < 10) return false;

  // Calculate ratio of English characters
  const englishChars = text.match(/[a-zA-Z\s\.,!?;:"'-]/g) || [];
  const totalChars = text.replace(/\s/g, "").length;

  if (totalChars === 0) return false;

  const englishRatio = englishChars.length / text.length;
  return englishRatio > 0.7; // If over 70% characters are English, consider it English text
};

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
  savedChatMessages?: ChatMessageType[];
  onSaveChatMessages?: (messages: ChatMessageType[]) => void;
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
  savedChatMessages,
  onSaveChatMessages,
  onSendQuery,
}) => {
  const { t } = useTranslation();
  // Use saved messages on initialization
  const [messages, setMessages] = useState<ChatMessageType[]>(
    savedChatMessages || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseTypes, setResponseTypes] = useState<
    Record<string, ResponseType>
  >({});
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({}); // Suggestions for each message
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    document_count: number;
    vector_count: number;
  } | null>(null);
  const [sessionExpiredNotified, setSessionExpiredNotified] = useState(false);
  const [metricsErrorCount, setMetricsErrorCount] = useState(0);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [sessionErrorCount, setSessionErrorCount] = useState(0);
  const [initialSuggestions, setInitialSuggestions] = useState<string[]>([]);
  const [areSuggestionsLoading, setAreSuggestionsLoading] = useState(false);

  const MODEL_NAME = "Gemini 2.0 Flash";
  const PRIMARY_COLOR = "#2b6cb0";
  const documentCount = sessionInfo?.document_count ?? 0;
  const vectorCount = sessionInfo?.vector_count ?? 0;

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (messages.length === 0 && sessionId) {
        setAreSuggestionsLoading(true);
        try {
          const suggs = await getChatSuggestions(sessionId, i18n.language);
          setInitialSuggestions(suggs);
        } catch (err) {
        } finally {
          setAreSuggestionsLoading(false);
        }
      }
    };
    fetchSuggestions();
  }, [sessionId, messages.length, i18n.language]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle language display for document summary
  const getLocalizedDocumentSummary = (
    summary: string
  ): {
    content: string;
    isTranslationNote: boolean;
  } => {
    if (!summary) return { content: "", isTranslationNote: false };

    const currentLang = i18n.language; // Get current language

    // If interface is Chinese (zh-TW or zh-CN) but summary is English, provide translation note
    if (currentLang.startsWith("zh") && isEnglishText(summary)) {
      return {
        content: `🌐 This summary is shown in original language (English). The RAG system understands and answers in Chinese regardless of source language.

Original Summary:
${summary}`,
        isTranslationNote: true,
      };
    }

    // Show full summary, no truncation
    return { content: summary, isTranslationNote: false };
  };

  // Auto scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save to parent component on message change
  useEffect(() => {
    if (messages.length > 0 && onSaveChatMessages) {
      onSaveChatMessages(messages);
    }
  }, [messages, onSaveChatMessages]);

  // Periodically update metrics
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let errorCount = 0;

    const updateMetrics = async () => {
      // Stop polling if more than 3 consecutive errors
      if (errorCount >= 3) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        return;
      }

      try {
        const data = await getSessionMetrics(sessionId);
        setMetrics(data);
        // Reset error count on success
        errorCount = 0;
        setMetricsErrorCount(0);
        // Clear error state but not session expired notification on success
        if (error && !error.includes("Session expired")) {
          setError(null);
        }
      } catch (err: any) {
        errorCount++;
        setMetricsErrorCount(errorCount);
        // Check if Session expired error and not yet notified
        if (
          !sessionExpiredNotified &&
          (err.status === 401 || err.status === 403)
        ) {
          setError("Session已過期，請重新登入或刷新頁面");
          setSessionExpiredNotified(true);
        }
      }
    };

    // 初始載入
    updateMetrics();

    // 設置低頻率輪詢：30秒一次
    interval = setInterval(updateMetrics, 30000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [sessionId]);

  // 獲取 session 信息（document_count, vector_count）
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let errorCount = 0;

    const fetchSessionInfo = async () => {
      // 如果連續失敗超過3次，停止輪詢
      if (errorCount >= 3) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        return;
      }

      try {
        const data = await getSession(sessionId);
        setSessionInfo({
          document_count: data.document_count,
          vector_count: data.vector_count,
        });
        // 成功時重置錯誤計數
        errorCount = 0;
        setSessionErrorCount(0);
        // 成功獲取session信息時，清除錯誤狀態但不重置session過期通知
        if (error && !error.includes("Session已過期")) {
          setError(null);
        }
      } catch (err: any) {
        errorCount++;
        setSessionErrorCount(errorCount);
        // 檢查是否為Session過期錯誤，且尚未通知過
        if (
          !sessionExpiredNotified &&
          (err.status === 401 || err.status === 403)
        ) {
          setError("Session已過期，請重新登入或刷新頁面");
          setSessionExpiredNotified(true);
        }
      }
    };

    fetchSessionInfo();

    // 設置低頻率輪詢：60秒一次
    interval = setInterval(fetchSessionInfo, 60000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [sessionId]);

  // 重置Session過期通知狀態和錯誤計數器（當sessionId改變時）
  useEffect(() => {
    setSessionExpiredNotified(false);
    setError(null);
    setMetricsErrorCount(0);
    setSessionErrorCount(0);
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

      // 記錄建議問題（如果有）
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions((prev) => ({
          ...prev,
          [response.message_id]: response.suggestions!,
        }));
      }

      // 查詢後立即更新 metrics
      const updatedMetrics = await getSessionMetrics(sessionId);
      setMetrics(updatedMetrics);
    } catch (err: any) {
      // 檢查是否為Session過期錯誤
      if (
        !sessionExpiredNotified &&
        (err.status === 401 || err.status === 403)
      ) {
        setError("Session已過期，請重新登入或刷新頁面");
        setSessionExpiredNotified(true);
      } else if (!sessionExpiredNotified) {
        setError(err.response?.data?.detail || t("chat.error.sendFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-screen">
      {/* 文件摘要區域 */}
      {documentSummary &&
        (() => {
          const { content, isTranslationNote } =
            getLocalizedDocumentSummary(documentSummary);
          return (
            <div
              className="document-summary-header sticky-summary"
              style={{ borderBottom: `2px solid ${PRIMARY_COLOR}` }}
            >
              <div className="document-summary-content">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5
                    className="summary-title mb-0"
                    style={{ color: PRIMARY_COLOR, fontWeight: "bold" }}
                  >
                    <i className="bi bi-file-earmark-text me-2"></i>
                    文件摘要
                    {isTranslationNote && (
                      <span
                        className="badge bg-info ms-2"
                        title="此摘要包含語言說明"
                      >
                        <i className="bi bi-translate"></i>
                      </span>
                    )}
                  </h5>

                  <div className="d-flex align-items-center">
                    <span
                      className="badge me-3"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                      MODEL: {MODEL_NAME}
                    </span>
                    <small className="text-muted me-3">
                      {tokensUsed
                        ? `${tokensUsed.toLocaleString()} Tokens`
                        : ""}
                    </small>
                    <button
                      className="btn btn-sm btn-link text-decoration-none"
                      onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                      style={{ color: PRIMARY_COLOR }}
                      title={isSummaryExpanded ? "收起" : "展開"}
                    >
                      <i
                        className={`bi bi-chevron-${
                          isSummaryExpanded ? "up" : "down"
                        }`}
                      ></i>
                    </button>
                  </div>
                </div>
                {isSummaryExpanded && (
                  <>
                    <div
                      className={`summary-text ${
                        isTranslationNote ? "translation-note" : ""
                      }`}
                      style={{ fontSize: "0.9rem", color: "#4a5568" }}
                    >
                      {content}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

      <div className="row chat-main-content">
        <div className="col-md-12 right-panel">
          <div className="interaction-area">
            {/* 聊天對話區 */}
            <div className="chat-area">
              <div className="messages-container">
                {messages.length === 0 && (
                  <div className="empty-state">
                    <p>{t("chat.empty.message")}</p>
                    <p className="empty-hint">{t("chat.empty.hint")}</p>

                    <div className="initial-suggestions">
                      {areSuggestionsLoading ? (
                        <div className="suggestions-loading">
                          {t(
                            "chat.suggestions.loading",
                            "Generating suggested questions..."
                          )}
                        </div>
                      ) : (
                        <div className="suggestion-chips">
                          {initialSuggestions.map((s, i) => (
                            <button
                              key={i}
                              className="suggestion-chip"
                              onClick={() => handleSendMessage(s)}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.message_id}
                    message={msg}
                    responseType={
                      msg.role === ChatRole.ASSISTANT
                        ? responseTypes[msg.message_id]
                        : undefined
                    }
                    suggestions={
                      msg.role === ChatRole.ASSISTANT
                        ? suggestions[msg.message_id]
                        : undefined
                    }
                    onSuggestionClick={(suggestion) => {
                      // 點擊建議問題時，自動發送該問題
                      handleSendMessage(suggestion);
                    }}
                  />
                ))}

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
              {error && <div className="error-banner">❌ {error}</div>}
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                placeholder={t(
                  "chat.input.placeholder_new",
                  "歡迎討論跟上傳資料相關的話題"
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
