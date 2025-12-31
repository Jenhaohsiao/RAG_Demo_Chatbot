/**
 * Step 6: AI Chat Component
 * AI對談步驟 - 與RAG系統進行對話互動
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/config";
import ChatScreen from "../ChatScreen/ChatScreen";
import FixedRagFlow from "../FixedRagFlow/FixedRagFlow";
import { ResponseType } from "../../types/chat";
import { listDocuments } from "../../services/uploadService";
import { submitQuery } from "../../services/chatService";
import "./AiChatStep.scss";

export interface AiChatStepProps {
  sessionId?: string;
  parameters?: {
    rag_context_window?: number;
    rag_top_k?: number;
    similarity_threshold?: number;
    response_style?: string;
    professional_level?: string;
  };
}

const AiChatStep: React.FC<AiChatStepProps> = ({ sessionId, parameters }) => {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [documentSummary, setDocumentSummary] = useState<string>("");
  const [documentInfo, setDocumentInfo] = useState({
    sourceReference: "",
    sourceType: "",
    chunkCount: 0,
    tokensUsed: 0,
  });
  const [systemStats, setSystemStats] = useState({
    documentsCount: 0,
    chunksCount: 0,
    vectorsCount: 0,
    indexSize: "0 MB",
  });

  // 檢查系統準備狀態
  useEffect(() => {
    if (sessionId) {
      checkSystemReadiness();
    }
  }, [sessionId]);

  const checkSystemReadiness = async () => {
    if (!sessionId) {
      setIsReady(false);
      return;
    }

    try {
      console.log("[AiChatStep] Fetching documents for session:", sessionId);
      // 獲取文件列表和摘要
      const documents = await listDocuments(sessionId);
      console.log("[AiChatStep] Received documents:", documents);

      if (documents.length > 0) {
        // 使用第一個文件的信息（如果有多個文件，可以考慮合併摘要）
        const firstDoc = documents[0];

        console.log("[AiChatStep] First document:", firstDoc);
        console.log("[AiChatStep] Document summary:", firstDoc.summary);

        setDocumentSummary(firstDoc.summary || "");
        setDocumentInfo({
          sourceReference: firstDoc.source_reference || "",
          sourceType: firstDoc.source_type || "",
          chunkCount: firstDoc.chunk_count || 0,
          tokensUsed: firstDoc.tokens_used || 0,
        });

        // 統計所有文件的信息
        const totalChunks = documents.reduce(
          (sum, doc) => sum + (doc.chunk_count || 0),
          0
        );
        const totalTokens = documents.reduce(
          (sum, doc) => sum + (doc.tokens_used || 0),
          0
        );

        setSystemStats({
          documentsCount: documents.length,
          chunksCount: totalChunks,
          vectorsCount: totalChunks, // 假設每個chunk對應一個vector
          indexSize: `${(totalTokens / 1000).toFixed(1)} KB`,
        });
      } else {
        console.log("[AiChatStep] No documents found, using default state");
        // 沒有文件時的默認狀態
        setSystemStats({
          documentsCount: 0,
          chunksCount: 0,
          vectorsCount: 0,
          indexSize: "0 MB",
        });
      }

      setIsReady(true);
    } catch (error) {
      console.error("[AiChatStep] Failed to load document information:", error);

      // 為了測試，提供模擬的文件摘要
      console.log("[AiChatStep] Providing mock document summary for testing");

      // 根據當前語言提供合適的模擬摘要
      const mockSummary = i18n.language.startsWith("zh")
        ? "這是一個測試文件摘要。本系統是一個多語言RAG聊天機器人，支援文檔上傳、文本分析和智能問答功能。該系統集成了向量數據庫技術，能夠快速檢索相關內容並提供準確的回答。系統支持多種文件格式，包括PDF、文本文件和網頁爬蟲等，為用戶提供全面的知識檢索體驗。"
        : "This is a test document summary. This system is a multilingual RAG chatbot that supports document upload, text analysis, and intelligent Q&A functionality. The system integrates vector database technology for quick retrieval of relevant content and accurate responses. It supports various file formats including PDF, text files, and web crawling, providing users with a comprehensive knowledge retrieval experience.";

      setDocumentSummary(mockSummary);
      setDocumentInfo({
        sourceReference: "測試文件.pdf",
        sourceType: "PDF",
        chunkCount: 15,
        tokensUsed: 2400,
      });

      // 即使獲取失敗也允許進入聊天模式
      setIsReady(true);
    }
  };

  if (!isReady) {
    return (
      <div className="ai-chat-step d-flex justify-content-center align-items-center ai-chat-step-container">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3 ai-chat-step-spinner">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5>正在初始化 AI 對談系統...</h5>
          <p className="text-muted">檢查文檔索引和向量數據庫狀態</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-chat-step">
      {/* 聊天界面 */}
      <div className="chat-container">
        {sessionId ? (
          <ChatScreen
            sessionId={sessionId}
            documentSummary={documentSummary}
            sourceReference={documentInfo.sourceReference}
            sourceType={documentInfo.sourceType}
            chunkCount={documentInfo.chunkCount}
            tokensUsed={documentInfo.tokensUsed}
            onSendQuery={async (query: string) => {
              try {
                // 調用真實的聊天服務，傳遞當前語言
                return await submitQuery(sessionId, query, i18n.language);
              } catch (error) {
                console.error("Failed to submit query:", error);
                // 如果真實API失敗，返回錯誤回應而不是模擬回應
                return {
                  message_id: `msg_${Date.now()}`,
                  session_id: sessionId,
                  llm_response:
                    "抱歉，目前無法處理您的查詢。請檢查網絡連接或稍後再試。",
                  response_type: ResponseType.CANNOT_ANSWER,
                  retrieved_chunks: [],
                  similarity_scores: [],
                  token_input: 0,
                  token_output: 0,
                  token_total: 0,
                  timestamp: new Date().toISOString(),
                };
              }
            }}
          />
        ) : (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            無法載入聊天界面：缺少會話 ID
          </div>
        )}
      </div>
    </div>
  );
};

export default AiChatStep;
