/**
 * About Project Modal Component
 * 顯示專案目標和特色的對話框
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

interface AboutProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 關於本專案對話框組件
 * 顯示專案的主要目標、技術特色與AI工程原則
 */
const AboutProjectModal: React.FC<AboutProjectModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
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
            {/* 專案目標 */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-target me-2"></i>
                專案目標
              </h6>
              <div className="card border-primary border-opacity-25">
                <div className="card-body">
                  <p className="card-text mb-3">
                    打造一個<strong>多語言RAG對話機器人系統</strong>，展示完整的AI工程實踐與現代化架構設計。
                  </p>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      實現嚴格的RAG架構，杜絕模型幻覺
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      展示企業級AI安全與內容審核機制
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      提供可測試的模組化系統架構
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      支援多語言用戶體驗與國際化
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 核心特色 */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-star me-2"></i>
                核心特色
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="feature-item border rounded p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="feature-icon text-primary me-3">
                        <i className="bi bi-robot fs-4"></i>
                      </div>
                      <h6 className="mb-0">嚴格RAG架構</h6>
                    </div>
                    <p className="text-muted small mb-0">
                      基於文檔檢索的問答系統，確保回答基於真實內容，避免AI幻覺問題
                    </p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="feature-item border rounded p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="feature-icon text-success me-3">
                        <i className="bi bi-shield-check fs-4"></i>
                      </div>
                      <h6 className="mb-0">內容安全審核</h6>
                    </div>
                    <p className="text-muted small mb-0">
                      整合Gemini Safety API，實時檢測有害內容，保障用戶安全
                    </p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="feature-item border rounded p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="feature-icon text-info me-3">
                        <i className="bi bi-vector-pen fs-4"></i>
                      </div>
                      <h6 className="mb-0">向量語意搜尋</h6>
                    </div>
                    <p className="text-muted small mb-0">
                      使用Qdrant向量數據庫，提供精準的語意檢索與相似度匹配
                    </p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="feature-item border rounded p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="feature-icon text-warning me-3">
                        <i className="bi bi-globe fs-4"></i>
                      </div>
                      <h6 className="mb-0">多語言支援</h6>
                    </div>
                    <p className="text-muted small mb-0">
                      支援8種語言界面，提供全球化用戶體驗
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 技術架構 */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-diagram-3 me-2"></i>
                技術架構
              </h6>
              <div className="row g-2">
                <div className="col-auto">
                  <span className="badge bg-primary">FastAPI</span>
                </div>
                <div className="col-auto">
                  <span className="badge bg-info">React + TypeScript</span>
                </div>
                <div className="col-auto">
                  <span className="badge bg-success">Qdrant Vector DB</span>
                </div>
                <div className="col-auto">
                  <span className="badge bg-warning">Gemini AI</span>
                </div>
                <div className="col-auto">
                  <span className="badge bg-secondary">Docker</span>
                </div>
                <div className="col-auto">
                  <span className="badge bg-dark">Bootstrap 5</span>
                </div>
              </div>
            </div>

            {/* AI工程原則 */}
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-gear me-2"></i>
                AI工程原則
              </h6>
              <div className="border rounded p-3 bg-light">
                <div className="row g-2">
                  <div className="col-md-6">
                    <div className="principle-item">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Strict RAG (No Hallucination)</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="principle-item">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Session Isolation & TTL</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="principle-item">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Moderation-First Pipeline</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="principle-item">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Constitutional AI Compliance</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="principle-item">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Testable Modular Architecture</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="principle-item">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Performance Metrics Tracking</small>
                    </div>
                  </div>
                </div>
              </div>
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