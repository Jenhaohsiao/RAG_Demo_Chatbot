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
                      <h5 className="card-title">RAG 技術實際應用場景</h5>

                      <div className="card-highlight">
                        <span className="highlight-text">
                          非常適合嚴謹的場合,
                          如企業內部知識庫問答、法律文件檢索、醫療資訊查詢等。對外像客服助理、研究助手也很合適。不會平白亂說話。
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
                    <h4 className="card-title">RAG 並非萬能，還有進步空間</h4>

                    <p className="mb-2">
                      {
                        "如果你也測試了本專案的效果，你可能會發現 AI 好像變笨了？ 因為 RAG 限制了 LLM 的自由發揮空間，無法充分利用其強大的推理和創造能力。完全依賴檢索到的文件來生成回答。所以提供的知識庫完整性很重要，若知識庫不完整或缺乏關鍵資訊，仍可能導致錯誤或不完整的回答。"
                      }
                    </p>
                  </div>
                </div>

                <div className="feature-card info-card">
                  <div className="card-icon info-icon">
                    <i className="bi bi-stars"></i>
                  </div>
                  <div className="card-content">
                    <h4 className="card-title">
                      迭代更新不間斷，Agentic RAG 等技術正在發展
                    </h4>
                    <p className="mb-2">
                      {
                        "Agentic RAG 是一種結合代理人（Agent）的技術。 除了內部提供的資料庫，還能動態地從外部資源（如網頁、API 等）檢索資訊，更可結合其它程式碼以及現有系統。它會合理地重新編排內容並進行驗證。當然不只Agentic RAG， 相信更多智能的AI 創新會不斷湧現。"
                      }
                    </p>
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
