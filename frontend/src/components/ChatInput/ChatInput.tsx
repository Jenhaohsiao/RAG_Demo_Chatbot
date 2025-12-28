/**
 * ChatInput Component
 * 聊天訊息輸入框
 *
 * T092: Added loading states and spinners during API calls
 */

import React, { useState, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import "./ChatInput.css";

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
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t("chat.input.placeholder")}
        disabled={disabled || isLoading} // T092: Disable during loading
        className="chat-input-textarea"
        rows={3}
        maxLength={2000}
      />
      <div className="chat-input-footer">
        <span className="char-count">{input.length}/2000</span>
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim() || isLoading} // T092: Disable during loading
          className={`send-button ${isLoading ? "loading" : ""}`}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              {t("chat.input.sending")}
            </>
          ) : (
            t("chat.input.send")
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
