import React, { useState, useEffect } from "react";
import "./AboutProjectModal.scss";

interface AboutProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "about" | "summary"; // 新增：初始視圖參數
}

type ViewMode = "about" | "summary";

const AboutProjectModal: React.FC<AboutProjectModalProps> = ({
  isOpen,
  onClose,
  initialView = "about", // 預設為 "about"
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  // 當 initialView 改變時，更新 viewMode
  useEffect(() => {
    if (isOpen) {
      setViewMode(initialView);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block about-project-modal"
      tabIndex={-1}
      role="dialog"
    >
      <div
        className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
        role="document"
      >
        <div className="modal-content">
          <div className="modal-header">
            <div className="header-content">
              <div>
                <h5 className="modal-title mb-0">
                  {viewMode === "about" ? "關於本專案" : "RAG 技術總結"}
                </h5>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            {viewMode === "about" ? (
              // 關於本專案內容
              <>
                <div className="intro-section">
                  <h1 className="header-subtitle mb-3">
                    使用RAG讓 AI 減少幻覺，回答專注
                  </h1>
                  <h4 className="intro-text divider-text"></h4>
                </div>

                <div className="d-flex align-items-center">
                  <hr className="flex-grow-1 section-divider" />
                  <h5 className="mx-3 mb-4 divider-text">
                    您好，這是一個 AI 工程展示專案。它將說明什麼是 RAG
                    檢索增強生成 (Retrieval Augmentation
                    Generation)。歡迎來體驗這個優化大型語言模型（LLM）輸出的技術。
                  </h5>
                  <hr className="flex-grow-1 section-divider" />
                </div>

                <div className="cards-container">
                  <div className="feature-card rag-card">
                    <div className="card-icon">
                      <i className="bi bi-search"></i>
                    </div>
                    <div className="card-content">
                      <h5 className="card-title">
                        RAG主要目的是強制規範AI的做事邏輯
                      </h5>

                      <div className="card-highlight">
                        <span className="highlight-text">
                          讓AI
                          在回答前先搜尋資料庫，確保相關內容才回答，而非健談
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="feature-card vector-card">
                    <div className="card-icon">
                      <i className="bi bi-database"></i>
                    </div>
                    <div className="card-content">
                      <h5 className="card-title">
                        把資料切片，向量化，存入向量資料庫（Vector DB ）
                      </h5>
                      <div className="card-highlight">
                        <span className="highlight-text">
                          讓 AI 能快速搜尋、比對和驗證知識來源。每句回答都有根據
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="feature-card prompt-card">
                    <div className="card-icon">
                      <i className="bi bi-gear"></i>
                    </div>
                    <div className="card-content">
                      <h5 className="card-title">System Prompt 行為規則</h5>
                      <div className="card-highlight">
                        <span className="highlight-text">
                          不同於一般的Prompt，它更了AI定義如何做事，以及用什麼角色語氣來回應
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="feature-card llm-card">
                    <div className="card-icon">
                      <i className="bi bi-cpu"></i>
                    </div>
                    <div className="card-content">
                      <h5 className="card-title">
                        LLM 語言模型是RAG的執行核心
                      </h5>

                      <div className="card-highlight">
                        <span className="highlight-text">
                          它將不再天馬行空，只限於向量資料庫的內容來檢索到的資料，呈現給使用者
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // RAG 技術總結內容
              <div className="cards-container">
                <div className="feature-card warning-card">
                  <div className="card-icon warning-icon">
                    <i className="bi bi-exclamation-triangle"></i>
                  </div>
                  <div className="card-content">
                    <h5 className="card-title">還有進步空間</h5>
                    <p className="card-subtitle">此專案與商業實用之間距離</p>
                    <div className="card-description">
                      <p className="mb-2">
                        <strong>缺少企業級功能：</strong>
                        未實現用戶權限管理、多租戶隔離、審計日誌等企業必需功能。
                      </p>
                      <p className="mb-2">
                        <strong>可擴展性不足：</strong>
                        單機部署架構，未考慮分散式向量庫、負載均衡、容錯機制。
                      </p>
                      <p className="mb-2">
                        <strong>成本控制缺失：</strong>無 Token
                        用量監控、配額管理、成本分析等營運必備工具。
                      </p>
                      <p className="mb-0">
                        <strong>測試覆蓋有限：</strong>
                        缺少完整的單元測試、集成測試、性能測試與 A/B 測試框架。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="feature-card success-card">
                  <div className="card-icon success-icon">
                    <i className="bi bi-check-circle"></i>
                  </div>
                  <div className="card-content">
                    <h5 className="card-title">RAG 帶來的好處</h5>
                    <p className="card-subtitle">為何選擇 RAG 架構</p>
                    <div className="card-description">
                      <p className="mb-2">
                        <strong>減少幻覺，提升準確性：</strong>
                        RAG 透過檢索真實文件確保回答有明確來源，大幅降低 LLM
                        憑空想像的幻覺問題。
                      </p>
                      <p className="mb-2">
                        <strong>即時知識更新：</strong>
                        只需更新向量資料庫文件即可反映最新資訊，無需重新訓練模型。
                      </p>
                      <p className="mb-0">
                        <strong>可追溯性與安全性：</strong>
                        明確標示答案來源，便於驗證。企業資料存於自建資料庫，符合隱私法規。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="feature-card danger-card">
                  <div className="card-icon danger-icon">
                    <i className="bi bi-x-circle"></i>
                  </div>
                  <div className="card-content">
                    <h5 className="card-title">RAG 並非萬能</h5>
                    <p className="card-subtitle">需要注意的局限性</p>
                    <div className="card-description">
                      <p className="mb-2">
                        <strong>檢索品質決定一切：</strong>
                        向量搜尋若錯過關鍵資訊或檢索不當，會導致錯誤答案。閾值設定、模型選擇、切塊策略都影響結果。
                      </p>
                      <p className="mb-2">
                        <strong>延遲與成本：</strong>
                        需先檢索再生成，增加延遲。大規模部署時資料庫與 LLM
                        並發壓力高。
                      </p>
                      <p className="mb-0">
                        <strong>複雜推理限制：</strong>
                        擅長查找回答，但不擅長多步驟推理或跨文件整合的複雜分析。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="feature-card info-card">
                  <div className="card-icon info-icon">
                    <i className="bi bi-stars"></i>
                  </div>
                  <div className="card-content">
                    <h5 className="card-title">可以更智能! Agentic RAG</h5>
                    <p className="card-subtitle">從被動檢索到主動推理</p>
                    <div className="card-description">
                      <p className="mb-2">
                        <strong>多輪自主檢索：</strong>
                        評估結果充分性，自動調整策略直到找到滿意答案。
                      </p>
                      <p className="mb-2">
                        <strong>工具呼叫整合：</strong>
                        可執行代碼、查詢
                        API、訪問資料庫，實現複雜計算與即時查詢。
                      </p>
                      <p className="mb-2">
                        <strong>任務分解：</strong>
                        將複雜問題拆解成子任務獨立執行，最終整合結果。
                      </p>
                      <div className="card-highlight">
                        <span className="highlight-text">
                          應用案例：客服代理、研究助手、程式碼助手
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <div className="footer-left">
              {viewMode === "about" ? (
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => setViewMode("summary")}
                >
                  <i className="bi bi-journal-text me-2"></i>
                  RAG 技術總結
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => setViewMode("about")}
                >
                  <i className="bi bi-info-circle me-2"></i>
                  關於本專案
                </button>
              )}
            </div>
            <div className="footer-right">
              <div className="version-info">
                <i className="bi bi-tag me-1"></i>
                版本: 1.0 · 更新日: 2026-01-11
              </div>
              <button
                type="button"
                className="btn btn-primary cta-button"
                onClick={onClose}
              >
                了解
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutProjectModal;
