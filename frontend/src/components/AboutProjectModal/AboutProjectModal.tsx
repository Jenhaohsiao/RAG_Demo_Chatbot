import React from "react";
import "./AboutProjectModal.scss";

interface AboutProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutProjectModal: React.FC<AboutProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
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
              <div className="info-badge">
                <i className="bi bi-info-circle"></i>
              </div>
              <div>
                <h5 className="modal-title mb-1">關於本專案</h5>
                <p className="header-subtitle mb-0">AI 不再有幻覺，回答也可以很專注</p>
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
            <div className="intro-section">
              <p className="intro-text">
                本專案展示 AI 工程重要的一環，如何「只根據您的資料」來回答問題
              </p>
            </div>

            <div className="section-divider">
              <span className="divider-text">四個核心之間的協作</span>
            </div>

            <div className="cards-container">
              <div className="feature-card rag-card">
                <div className="card-icon">
                  <i className="bi bi-search"></i>
                </div>
                <div className="card-content">
                  <h5 className="card-title">RAG 檢索增強生成</h5>
                  <p className="card-description">
                    在回答前先搜尋資料庫，確保相關內容才回答；找不到就誠實表達「不知道」
                  </p>
                  <div className="card-highlight">
                    <span className="highlight-text">讓 AI 誠實，而非健談</span>
                  </div>
                </div>
              </div>

              <div className="feature-card vector-card">
                <div className="card-icon">
                  <i className="bi bi-database"></i>
                </div>
                <div className="card-content">
                  <h5 className="card-title">Vector DB 向量資料庫</h5>
                  <p className="card-description">
                    將文件轉為向量儲存，讓 AI 能快速搜尋、比對和驗證知識來源
                  </p>
                  <div className="card-highlight">
                    <span className="highlight-text">每句回答都有根據</span>
                  </div>
                </div>
              </div>

              <div className="feature-card prompt-card">
                <div className="card-icon">
                  <i className="bi bi-gear"></i>
                </div>
                <div className="card-content">
                  <h5 className="card-title">System Prompt 行為規則</h5>
                  <p className="card-description">
                    設定 AI 能做與不做的事：不憑空推斷外部知識，找不到就拒答
                  </p>
                  <div className="card-highlight">
                    <span className="highlight-text">定義如何做事，非只是說話</span>
                  </div>
                </div>
              </div>

              <div className="feature-card llm-card">
                <div className="card-icon">
                  <i className="bi bi-cpu"></i>
                </div>
                <div className="card-content">
                  <h5 className="card-title">LLM 語言模型</h5>
                  <p className="card-description">
                    將檢索到的資料，用自然易懂的方式呈現給使用者
                  </p>
                  <div className="card-highlight">
                    <span className="highlight-text">沒有魔法，只有流程</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="audience-section">
              <div className="audience-content">
                <h6 className="audience-title">適合誰？</h6>
                <p className="audience-text">
                  想理解 RAG 運作原理，打造可引用資料來源的 AI 工程師
                </p>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <div className="version-info">
              <i className="bi bi-tag me-1"></i>
              版本: 1.0 · 更新日: 2026-01-11
            </div>
            <button type="button" className="btn btn-primary cta-button" onClick={onClose}>
              <i className="bi bi-check-circle me-2"></i>
              開始使用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutProjectModal;
