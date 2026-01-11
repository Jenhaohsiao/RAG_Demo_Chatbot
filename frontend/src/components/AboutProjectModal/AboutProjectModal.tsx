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
        className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
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
            <div className="mb-4">
              <h1 className="fw-bold mb-2">AI不再有幻覺，回答也可以很專注。</h1>
              <p className="mb-3">
                這示範專案不是要製作另一個 ChatGPT，而是表達一件很重要的AI
                工程概念：AI 是可以「只根據你的資料」來回答問題的,
                有資料時才回答，沒資料時就說不知道。
              </p>
            </div>

            <div className="mb-4">
              <h6 className="text-primary mb-3">四個角色，如何一起工作？</h6>
              <div className="vstack gap-3">
                <div className="p-3 border rounded">
                  <h3 className="mb-2">(1) RAG：決定「該不該回答」</h3>
                  <p className="mb-2">RAG 就像一道門禁系統。</p>
                  <ul className="mb-2">
                    <li>在回答之前，先確認資料夠不夠</li>
                    <li>找不到相關內容時，AI 會直接說「我不知道」</li>
                    <li>不再憑空猜答案，也不硬湊回應</li>
                  </ul>
                  <p className="mb-0 fw-semibold">
                    👉 負責讓 AI 誠實，而不是健談
                  </p>
                </div>

                <div className="p-3 border rounded">
                  <h3 className="mb-2">(2) Vector DB：AI 的專屬記憶庫</h3>
                  <p className="mb-2">你上傳的文件不會直接丟給 AI。</p>
                  <p className="mb-2">
                    它們會先被轉成向量，存進 Vector DB，變成：
                  </p>
                  <ul className="mb-2">
                    <li>可搜尋</li>
                    <li>可比對</li>
                    <li>可驗證的知識來源</li>
                  </ul>
                  <p className="mb-0 fw-semibold">
                    👉 AI 的每一句回答，都必須「找得到根據」
                  </p>
                </div>

                <div className="p-3 border rounded">
                  <h3 className="mb-2">(3) System Prompt：AI 的行為規則</h3>
                  <p className="mb-2">AI 在這個系統裡有清楚的底線：</p>
                  <ul className="mb-2">
                    <li>只能根據你的資料回答</li>
                    <li>不能自行補充外部知識</li>
                    <li>找不到，就拒答，而不是亂編</li>
                  </ul>
                  <p className="mb-0 fw-semibold">
                    👉 Prompt 不只是怎麼說話，而是怎麼做事
                  </p>
                </div>

                <div className="p-3 border rounded">
                  <h3 className="mb-2">(4) LLM：最後才出場的說話者</h3>
                  <p className="mb-2">語言模型不是主角，而是最後一棒。</p>
                  <p className="mb-2">它的工作只有一件事：</p>
                  <p className="mb-2">
                    把已經檢索到的資料，用人類看得懂的方式說出來。
                  </p>
                  <p className="mb-0 fw-semibold">👉 沒有魔法，只有流程</p>
                </div>
              </div>
            </div>

            <div>
              <h6 className="text-primary mb-3">🎯 這個專案適合誰？</h6>
              <ul className="mb-0">
                <li>想真正理解 RAG 是怎麼運作 的人</li>
                <li>想打造「不亂講話」AI 的開發者</li>
                <li>想在作品集中展示 AI 系統設計思維 的工程師</li>
                <li>對「AI 為什麼有時候不回答」感到好奇的人</li>
              </ul>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              <i className="bi bi-check-lg me-1"></i>
              了解了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutProjectModal;
