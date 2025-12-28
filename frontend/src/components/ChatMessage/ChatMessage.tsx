/**
 * ChatMessage Component
 * 顯示單一聊天訊息（使用者或助理）
 */

import React from "react";
import { useTranslation } from "react-i18next";
import "./ChatMessage.css";
import {
  ChatRole,
  ResponseType,
  type ChatMessage as ChatMessageType,
} from "../../types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
  responseType?: ResponseType; // 僅助理訊息需要
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  responseType,
}) => {
  const { t } = useTranslation();
  const isUser = message.role === ChatRole.USER;
  const cannotAnswer = responseType === ResponseType.CANNOT_ANSWER;

  return (
    <div className={`message-container ${isUser ? "user" : "assistant"}`}>
      <div className="message-header">
        <span className="message-role">
          {isUser ? t("chat.message.you") : t("chat.message.assistant")}
        </span>
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className={`message-content ${cannotAnswer ? "cannot-answer" : ""}`}>
        {message.content}
      </div>

      {cannotAnswer && (
        <div className="cannot-answer-note">
          ⚠️ {t("chat.message.cannotAnswerNote")}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
