/**
 * ChatInput Component
 * Chat message input field
 *
 * T092: Added loading states and spinners during API calls
 */

import React, { useState, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import "./ChatInput.scss";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean; // T092: Add loading state prop
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  isLoading = false, // T092: Default to not loading
  placeholder,
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled && !isLoading) {
      onSendMessage(trimmed);
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-pill">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t("chat.input.placeholder")}
          disabled={disabled || isLoading} // T092: Disable during loading
          className="chat-input-textarea"
          rows={1}
          maxLength={2000}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim() || isLoading} // T092: Disable during loading
          className={`send-button ${isLoading ? "loading" : ""}`}
          title={t("chat.input.submit")}
        >
          {isLoading ? (
            <span className="spinner"></span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              className="bi bi-send-fill"
              viewBox="0 0 16 16"
            >
              <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
            </svg>
          )}
        </button>
      </div>
      <div className="chat-input-footer">
        <span className="char-count">{input.length}/2000</span>
      </div>
    </div>
  );
};

export default ChatInput;
