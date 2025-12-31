/**
 * ChatScreen Component
 * 聊天介面主畫面
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
import { type CrawledPage } from "../../services/uploadService";
import "./ChatScreen.scss";

// 檢測文本是否主要為英文
const isEnglishText = (text: string): boolean => {
  if (!text || text.length < 10) return false;

  // 計算英文字符的比例
  const englishChars = text.match(/[a-zA-Z\s\.,!?;:"'-]/g) || [];
  const totalChars = text.replace(/\s/g, "").length;

  if (totalChars === 0) return false;

  const englishRatio = englishChars.length / text.length;
  return englishRatio > 0.7; // 如果70%以上是英文字符，認為是英文文本
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
  const [sessionExpiredNotified, setSessionExpiredNotified] = useState(false);
  const [metricsErrorCount, setMetricsErrorCount] = useState(0);
  const [sessionErrorCount, setSessionErrorCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 處理文檔摘要的語言顯示
  const getLocalizedDocumentSummary = (
    summary: string
  ): {
    content: string;
    isTranslationNote: boolean;
  } => {
    if (!summary) return { content: "", isTranslationNote: false };

    const currentLang = i18n.language; // 獲取當前語言

    // 如果當前是中文界面（zh-TW 或 zh-CN）但摘要是英文，提供翻譯說明
    if (currentLang.startsWith("zh") && isEnglishText(summary)) {
      return {
        content: `🌐 此文件摘要以原始語言（英文）顯示。RAG 系統能夠理解和回答中文問題，無論源文件語言為何。

原文摘要：
${summary}`,
        isTranslationNote: true,
      };
    }

    return { content: summary, isTranslationNote: false };
  };

  // 自動滾動到最新訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 定期更新 metrics
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let errorCount = 0;

    const updateMetrics = async () => {
      // 如果連續失敗超過3次，停止輪詢
      if (errorCount >= 3) {
        console.warn("Metrics API failed too many times, stopping polling");
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        return;
      }

      try {
        const data = await getSessionMetrics(sessionId);
        setMetrics(data);
        // 成功時重置錯誤計數
        errorCount = 0;
        setMetricsErrorCount(0);
        // 成功獲取metrics時，清除錯誤狀態但不重置session過期通知
        if (error && !error.includes("Session已過期")) {
          setError(null);
        }
      } catch (err: any) {
        console.error("Failed to update metrics:", err);
        errorCount++;
        setMetricsErrorCount(errorCount);
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
        console.warn("Session API failed too many times, stopping polling");
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
        console.error("Failed to fetch session info:", err);
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
      console.error("Query failed:", err);
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
            <div className="document-summary-header">
              <div className="document-summary-content">
                <h5 className="summary-title">
                  <i className="bi bi-file-text me-2"></i>
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
                <div
                  className={`summary-text ${
                    isTranslationNote ? "translation-note" : ""
                  }`}
                >
                  {content}
                </div>
                <div className="summary-meta">
                  <small className="text-muted">
                    <i className="bi bi-robot me-1"></i>
                    由AI分析生成 •{sourceType && ` ${sourceType} • `}
                    {chunkCount && `${chunkCount} 個文本段落 • `}
                    {tokensUsed && `${tokensUsed.toLocaleString()} Tokens`}
                  </small>
                </div>
              </div>
            </div>
          );
        })()}

      <div className="row chat-main-content">
        <div className="col-md-12 right-panel">
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
    </div>
  );
};

export default ChatScreen;
