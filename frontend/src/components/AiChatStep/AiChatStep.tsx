/**
 * Step 6: AI Chat Component
 * AI對談步驟 - 與RAG系統進行對話互動
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ChatScreen from "../ChatScreen/ChatScreen";
import { ResponseType } from "../../types/chat";

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
  const [systemStats, setSystemStats] = useState({
    documentsCount: 0,
    chunksCount: 0,
    vectorsCount: 0,
    indexSize: "0 MB",
  });
  const [showWelcome, setShowWelcome] = useState(true);

  // 檢查系統準備狀態
  useEffect(() => {
    if (sessionId) {
      checkSystemReadiness();
    }
  }, [sessionId]);

  const checkSystemReadiness = async () => {
    // 模擬API調用檢查系統狀態
    setTimeout(() => {
      setSystemStats({
        documentsCount: 2,
        chunksCount: 23,
        vectorsCount: 23,
        indexSize: "1.2 MB",
      });
      setIsReady(true);
    }, 1000);
  };

  const handleStartChat = () => {
    setShowWelcome(false);
  };

  if (!isReady) {
    return (
      <div
        className="ai-chat-step d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="text-center">
          <div
            className="spinner-border text-primary mb-3"
            style={{ width: "3rem", height: "3rem" }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5>正在初始化 AI 對談系統...</h5>
          <p className="text-muted">檢查文檔索引和向量數據庫狀態</p>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="ai-chat-step">
        {/* 歡迎卡片 */}
        <div className="card bg-gradient-secondary text-white mb-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-robot display-4 mb-3"></i>
            <h2 className="card-title">🎉 RAG 系統準備就緒！</h2>
            <p className="card-text lead">
              您的文件已完成處理，AI助手已準備好為您提供基於文檔內容的智能問答服務。
            </p>
          </div>
        </div>

        {/* 系統統計 */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <i className="bi bi-files text-primary display-6"></i>
                <h4 className="mt-2">{systemStats.documentsCount}</h4>
                <small className="text-muted">處理文件數</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <i className="bi bi-scissors text-success display-6"></i>
                <h4 className="mt-2">{systemStats.chunksCount}</h4>
                <small className="text-muted">文本分塊數</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <i className="bi bi-cpu text-info display-6"></i>
                <h4 className="mt-2">{systemStats.vectorsCount}</h4>
                <small className="text-muted">向量數量</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <i className="bi bi-hdd text-warning display-6"></i>
                <h4 className="mt-2">{systemStats.indexSize}</h4>
                <small className="text-muted">索引大小</small>
              </div>
            </div>
          </div>
        </div>

        {/* 當前配置摘要 */}
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="card-title mb-0">
              <i className="bi bi-gear me-2"></i>
              當前 RAG 配置
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <strong>相似度閾值:</strong>{" "}
                {parameters?.similarity_threshold || 0.7}
              </div>
              <div className="col-md-4">
                <strong>檢索數量:</strong> Top {parameters?.rag_top_k || 5}
              </div>
              <div className="col-md-4">
                <strong>上下文窗口:</strong>{" "}
                {parameters?.rag_context_window || 4096} tokens
              </div>
              <div className="col-md-6 mt-2">
                <strong>回應風格:</strong>{" "}
                {parameters?.response_style || "平衡"}
              </div>
              <div className="col-md-6 mt-2">
                <strong>專業程度:</strong>{" "}
                {parameters?.professional_level || "適中"}
              </div>
            </div>
          </div>
        </div>

        {/* 使用指南 */}
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="card-title mb-0">
              <i className="bi bi-lightbulb me-2"></i>
              使用指南
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>💡 問答建議</h6>
                <ul className="small">
                  <li>提出與上傳文檔相關的具體問題</li>
                  <li>使用清晰、完整的句子描述您的問題</li>
                  <li>可以要求解釋、摘要或比較</li>
                  <li>支持多輪對話，可以追問細節</li>
                </ul>
              </div>
              <div className="col-md-6">
                <h6>🔍 檢索特性</h6>
                <ul className="small">
                  <li>AI 會自動檢索最相關的文檔片段</li>
                  <li>回答會標示引用來源</li>
                  <li>可以查看相似度評分</li>
                  <li>支持跨文檔資訊整合</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 示例問題 */}
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="card-title mb-0">
              <i className="bi bi-chat-quote me-2"></i>
              示例問題
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>📝 摘要類問題</h6>
                <div className="d-grid gap-2">
                  <button className="btn btn-outline-primary btn-sm text-start">
                    "請總結文檔中的主要觀點"
                  </button>
                  <button className="btn btn-outline-primary btn-sm text-start">
                    "這些文件講述了什麼主題？"
                  </button>
                </div>
              </div>
              <div className="col-md-6">
                <h6>🔍 細節類問題</h6>
                <div className="d-grid gap-2">
                  <button className="btn btn-outline-success btn-sm text-start">
                    "文檔中提到的具體數據有哪些？"
                  </button>
                  <button className="btn btn-outline-success btn-sm text-start">
                    "關於 XX 的詳細說明是什麼？"
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 開始聊天按鈕 */}
        <div className="text-center">
          <button className="btn btn-primary btn-lg" onClick={handleStartChat}>
            <i className="bi bi-chat-dots me-2"></i>
            開始 AI 對談
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-chat-step">
      {/* 聊天標題欄 */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">
          <i className="bi bi-chat-dots me-2"></i>
          AI 智能問答
        </h5>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowWelcome(true)}
          >
            <i className="bi bi-info-circle me-1"></i>
            系統資訊
          </button>
          <div className="badge bg-success">
            <i
              className="bi bi-circle-fill me-1"
              style={{ fontSize: "0.5rem" }}
            ></i>
            已就緒
          </div>
        </div>
      </div>

      {/* 聊天界面 */}
      <div className="chat-container">
        {sessionId ? (
          <ChatScreen
            sessionId={sessionId}
            onSendQuery={async (query: string) => {
              // 實際的查詢邏輯需要在這裡實現
              return {
                message_id: `msg_${Date.now()}`,
                session_id: sessionId,
                llm_response:
                  "這是一個模擬的AI回應。在實際環境中，這裡會調用真正的聊天服務。",
                response_type: ResponseType.ANSWERED,
                retrieved_chunks: [],
                similarity_scores: [],
                token_input: 100,
                token_output: 50,
                token_total: 150,
                timestamp: new Date().toISOString(),
              };
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
