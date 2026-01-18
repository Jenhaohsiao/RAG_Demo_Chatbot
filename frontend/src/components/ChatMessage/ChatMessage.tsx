/**
 * ChatMessage Component
 * Helper component to display a single chat message (user or assistant)
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
  responseType?: ResponseType; // Only required for assistant messages
  suggestions?: string[]; // Suggested follow-up questions (provided when unable to answer)
  onSuggestionClick?: (suggestion: string) => void; // Callback for clicking a suggestion
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

      {/* Settings hint when unable to answer */}
      {cannotAnswer && (
        <div className="settings-hint">
          <i className="bi bi-info-circle me-1"></i>
          <small className="text-muted">{t("chat.message.settingsHint")}</small>
        </div>
      )}

      {/* Suggestion bubbles */}
      {suggestions && suggestions.length > 0 && (
        <div className="suggestion-bubbles">
          <div className="suggestion-label">
            <i className="bi bi-lightbulb me-1"></i>
            {t("chat.message.maybeYouWantToAsk")}
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
