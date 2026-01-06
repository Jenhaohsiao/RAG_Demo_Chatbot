/**
 * ChatMessage Component
 * 顯示單一聊天訊息（使用者或助理）
 */

import React from "react";
import { useTranslation } from "react-i18next";
import "./ChatMessage.scss";
import {
  ChatRole,
  ResponseType,
  type ChatMessage as ChatMessageType,
} from "../../types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
  responseType?: ResponseType; // 僅助理訊息需要
  suggestions?: string[]; // 建議問題（當無法回答時提供）
  onSuggestionClick?: (suggestion: string) => void; // 點擊建議問題的回調
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  responseType,
  suggestions,
  onSuggestionClick,
}) => {
  const { t } = useTranslation();
  const isUser = message.role === ChatRole.USER;
  const cannotAnswer = responseType === ResponseType.CANNOT_ANSWER;

  return (
    <div className={`message-container ${isUser ? "user" : "assistant"}`}>
      {!isUser && (
        <div className="message-header">
          <span className="message-role">
            <i
              className="bi bi-robot"
              aria-label={t("chat.messages.assistant")}
            ></i>
          </span>
        </div>
      )}

      <div className={`message-content ${cannotAnswer ? "cannot-answer" : ""}`}>
        {message.content}
      </div>

      {/* 建議氣泡標籤 */}
      {suggestions && suggestions.length > 0 && (
        <div className="suggestion-bubbles">
          <div className="suggestion-label">
            <i className="bi bi-lightbulb me-1"></i>
            {t("chat.message.maybeYouWantToAsk", "也許您想問：")}
          </div>
          <div className="suggestion-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-bubble"
                onClick={() => onSuggestionClick?.(suggestion)}
                title={suggestion}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
