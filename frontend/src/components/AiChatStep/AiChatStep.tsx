/**
 * Step 6: AI Chat Component
 * AI Chat Step - Interact with RAG system
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/config";
import ChatScreen from "../ChatScreen/ChatScreen";
import { ResponseType, ChatMessage as ChatMessageType } from "../../types/chat";
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
  savedChatMessages?: ChatMessageType[];
  onSaveChatMessages?: (messages: ChatMessageType[]) => void;
}

const AiChatStep: React.FC<AiChatStepProps> = ({
  sessionId,
  parameters,
  savedChatMessages,
  onSaveChatMessages,
}) => {
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

  // Check system readiness status
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
      // Get document list and summary
      const documents = await listDocuments(sessionId);
      if (documents.length > 0) {
        // Use info from the first document (if multiple, consider merging summaries)
        const firstDoc = documents[0];
        setDocumentSummary(firstDoc.summary || "");
        setDocumentInfo({
          sourceReference: firstDoc.source_reference || "",
          sourceType: firstDoc.source_type || "",
          chunkCount: firstDoc.chunk_count || 0,
          tokensUsed: firstDoc.tokens_used || 0,
        });

        // Aggregate info from all documents
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
          vectorsCount: totalChunks, // Assuming each chunk corresponds to one vector
          indexSize: `${(totalTokens / 1000).toFixed(1)} KB`,
        });
      } else {
        // Default state when no documents
        setSystemStats({
          documentsCount: 0,
          chunksCount: 0,
          vectorsCount: 0,
          indexSize: "0 MB",
        });
      }

      setIsReady(true);
    } catch (error) {
      // Provide mock document summary for testing
      // Provide appropriate mock summary
      const mockSummary =
        "This is a test document summary. This system is a multilingual RAG chatbot that supports document upload, text analysis, and intelligent Q&A functionality. The system integrates vector database technology for quick retrieval of relevant content and accurate responses. It supports various file formats including PDF, text files, and web crawling, providing users with a comprehensive knowledge retrieval experience.";

      setDocumentSummary(mockSummary);
      setDocumentInfo({
        sourceReference: "test_document.pdf",
        sourceType: "PDF",
        chunkCount: 15,
        tokensUsed: 2400,
      });

      // Allow entering chat mode even if fetch fails
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
          <h5>Initializing AI Chat System...</h5>
          <p className="text-muted">
            Checking document index and vector database status
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-chat-step">
      {/* Chat Interface */}
      <div className="chat-container">
        {sessionId ? (
          <ChatScreen
            sessionId={sessionId}
            documentSummary={documentSummary}
            sourceReference={documentInfo.sourceReference}
            sourceType={documentInfo.sourceType}
            chunkCount={documentInfo.chunkCount}
            tokensUsed={documentInfo.tokensUsed}
            savedChatMessages={savedChatMessages}
            onSaveChatMessages={onSaveChatMessages}
            onSendQuery={async (query: string) => {
              try {
                // Call real chat service, passing current language
                return await submitQuery(sessionId, query, i18n.language);
              } catch (error) {
                // If real API fails, return error response instead of mock response
                return {
                  message_id: `msg_${Date.now()}`,
                  session_id: sessionId,
                  llm_response:
                    "Sorry, unable to process your query at the moment. Please check your connection or try again later.",
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
            Unable to load chat interface: Missing Session ID
          </div>
        )}
      </div>
    </div>
  );
};

export default AiChatStep;
