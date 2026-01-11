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
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-info-circle me-2"></i>
              關於本專案
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="mb-4 text-center">
              <h1 className="fw-bold mb-2">AI 不再有幻覺，回答也可以很專注</h1>
              <p className="text-muted mb-3">
                本專案展示 AI 如何「只根據您的資料」來回答問題
                有資料時才回答，沒資料時就說不知道
              </p>
            </div>

            <div className="mb-4">
              <h6 className="text-primary mb-3 text-center">
                四個核心角色，如何協作？
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="p-3 border rounded h-100">
                    <h5 className="mb-2">RAG 檢索增強生成</h5>
                    <p className="mb-2">
                      在回答前先搜尋資料庫，確保相關內容才回答；找不到就誠實表達「不知道」
                    </p>
                    <p className="mb-0 fw-semibold">👉 讓 AI 誠實，而非健談</p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="p-3 border rounded h-100">
                    <h5 className="mb-2">Vector DB 向量資料庫</h5>
                    <p className="mb-2">
                      將文件轉為向量儲存，讓 AI 能快速搜尋、比對和驗證知識來源
                    </p>
                    <p className="mb-0 fw-semibold">👉 每句回答都有根據</p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="p-3 border rounded h-100">
                    <h5 className="mb-2">System Prompt 行為規則</h5>
                    <p className="mb-2">
                      設定 AI 能做與不做的事：不憑空推斷外部知識，找不到就拒答
                    </p>
                    <p className="mb-0 fw-semibold">
                      👉 定義如何做事，非只是說話
                    </p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="p-3 border rounded h-100">
                    <h5 className="mb-2">LLM 語言模型</h5>
                    <p className="mb-2">
                      將檢索到的資料，用自然易懂的方式呈現給使用者
                    </p>
                    <p className="mb-0 fw-semibold">👉 沒有魔法，只有流程</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h6 className="text-primary mb-3">🎯 適合誰？</h6>
              <p className="text-muted mb-0">
                想理解 RAG 運作原理，打造可引用資料來源的 AI 工程師
              </p>
            </div>
          </div>
          <div className="modal-footer justify-content-center">
            <div className="text-muted small position-absolute start-0 ms-3">
              版本: 1.0 · 更新日: 2026-01-11
            </div>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              <i className="bi bi-check-lg me-1"></i>
              開始使用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutProjectModal;
