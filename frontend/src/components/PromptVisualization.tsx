/**
 * Prompt Visualization Component
 * 顯示系統使用的 AI Prompt 模板和當前 Session 的實際 Prompt
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SystemPrompts {
  rag_prompt_template: string;
  summary_prompt_templates: { [key: string]: string };
  moderation_prompt: string;
  no_documents_prompt: string;
  language_mappings: { [key: string]: string };
  constitutional_principles: string[];
  system_info: {
    similarity_threshold: number;
    token_threshold: number;
    memory_limit: number;
    session_ttl_minutes: number;
    supported_languages: string[];
    supported_file_types: string[];
  };
  prompt_variables: { [key: string]: string };
}

interface CurrentSessionPrompt {
  session_id: string;
  language: string;
  response_language: string;
  prompt_type: string;
  has_documents: boolean;
  actual_prompt: string;
  timestamp: string;
}

interface PromptVisualizationProps {
  sessionId?: string;
  currentLanguage?: string;
  hasDocuments?: boolean;
}

const PromptVisualization: React.FC<PromptVisualizationProps> = ({
  sessionId,
  currentLanguage = 'zh',
  hasDocuments = false
}) => {
  const { t, i18n } = useTranslation();
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<CurrentSessionPrompt | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'current' | 'principles'>('current');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 獲取系統 Prompt 模板
  const fetchSystemPrompts = async () => {
    try {
      console.log('[PromptVisualization] Fetching system prompts...');
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/prompt/system-prompts');
      console.log('[PromptVisualization] System prompts response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('[PromptVisualization] System prompts data:', data);
      setSystemPrompts(data);
    } catch (err) {
      console.error('[PromptVisualization] System prompts error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load system prompts');
    } finally {
      setLoading(false);
    }
  };

  // 獲取當前 Session Prompt
  const fetchCurrentPrompt = async () => {
    try {
      console.log('[PromptVisualization] Fetching current prompt...');
      setLoading(true);
      const params = new URLSearchParams({
        language: currentLanguage,
        has_documents: hasDocuments.toString()
      });
      if (sessionId) {
        params.append('session_id', sessionId);
      }
      
      const url = `http://localhost:8000/api/v1/prompt/current-session-prompt?${params}`;
      console.log('[PromptVisualization] Current prompt URL:', url);
      const response = await fetch(url);
      console.log('[PromptVisualization] Current prompt response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('[PromptVisualization] Current prompt data:', data);
      setCurrentPrompt(data);
    } catch (err) {
      console.error('[PromptVisualization] Current prompt error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load current prompt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[PromptVisualization] Component mounted, fetching data...');
    fetchSystemPrompts();
    fetchCurrentPrompt();
  }, [sessionId, currentLanguage, hasDocuments]);

  const formatPromptText = (text: string) => {
    return text.split('\n').map((line, index) => {
      // 高亮顯示重要部分
      if (line.includes('**') || line.includes('IMPORTANT')) {
        return (
          <div key={index} className="prompt-important-line">
            {line}
          </div>
        );
      }
      if (line.includes('{{') && line.includes('}}')) {
        return (
          <div key={index} className="prompt-variable-line">
            {line}
          </div>
        );
      }
      return (
        <div key={index} className="prompt-normal-line">
          {line}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="prompt-visualization loading">
        <div className="spinner"></div>
        <span>載入 Prompt 資訊...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prompt-visualization error">
        <div className="error-message">
          ❌ 無法載入 Prompt 資訊: {error}
          <button onClick={() => { fetchSystemPrompts(); fetchCurrentPrompt(); }}>
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="prompt-visualization">
      <div className="prompt-header">
        <h3>🤖 AI Prompt 視覺化</h3>
        <div className="prompt-tabs">
          <button 
            className={`tab ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            當前 Prompt
          </button>
          <button 
            className={`tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            系統模板
          </button>
          <button 
            className={`tab ${activeTab === 'principles' ? 'active' : ''}`}
            onClick={() => setActiveTab('principles')}
          >
            憲法原則
          </button>
        </div>
      </div>

      <div className="prompt-content">
        {loading && (
          <div className="loading-section">
            <div className="spinner"></div>
            <span>載入 Prompt 資訊...</span>
          </div>
        )}
        
        {error && (
          <div className="error-section">
            <div className="error-message">
              ❌ 無法載入 Prompt 資訊: {error}
              <button onClick={() => { fetchSystemPrompts(); fetchCurrentPrompt(); }}>
                重試
              </button>
            </div>
          </div>
        )}

        {!loading && !error && activeTab === 'current' && (
          <div className="current-prompt-section">
            {currentPrompt ? (
              <>
                <div className="prompt-meta">
                  <div className="meta-item">
                    <strong>Session:</strong> {currentPrompt.session_id}
                  </div>
                  <div className="meta-item">
                    <strong>語言:</strong> {currentPrompt.response_language}
                  </div>
                  <div className="meta-item">
                    <strong>類型:</strong> {currentPrompt.prompt_type}
                  </div>
                  <div className="meta-item">
                    <strong>有文檔:</strong> {currentPrompt.has_documents ? '是' : '否'}
                  </div>
                </div>
                <div className="prompt-text-container">
                  <h4>實際使用的 Prompt:</h4>
                  <div className="prompt-text">
                    {formatPromptText(currentPrompt.actual_prompt)}
                  </div>
                </div>
              </>
            ) : (
              <div className="placeholder">
                載入中或無當前 Prompt 資料...
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === 'system' && (
          <div className="system-prompts-section">
            {systemPrompts ? (
              <>
                <div className="system-info">
                  <h4>系統配置:</h4>
                  <ul>
                    <li>相似度閾值: {systemPrompts.system_info.similarity_threshold}</li>
                    <li>Token 閾值: {systemPrompts.system_info.token_threshold.toLocaleString()}</li>
                    <li>Session TTL: {systemPrompts.system_info.session_ttl_minutes} 分鐘</li>
                    <li>記憶體限制: {systemPrompts.system_info.memory_limit} 個查詢</li>
                    <li>支援語言: {systemPrompts.system_info.supported_languages.join(', ')}</li>
                    <li>支援檔案: {systemPrompts.system_info.supported_file_types.join(', ')}</li>
                  </ul>
                </div>

                <div className="prompt-templates">
                  <div className="template-section">
                    <h4>主要 RAG Prompt 模板:</h4>
                    <div className="prompt-text">
                      {formatPromptText(systemPrompts.rag_prompt_template)}
                    </div>
                  </div>

                  <div className="template-section">
                    <h4>摘要生成模板 (繁體中文):</h4>
                    <div className="prompt-text">
                      {formatPromptText(systemPrompts.summary_prompt_templates['zh-TW'] || '')}
                    </div>
                  </div>

                  <div className="template-section">
                    <h4>無文檔時的 Prompt:</h4>
                    <div className="prompt-text">
                      {formatPromptText(systemPrompts.no_documents_prompt)}
                    </div>
                  </div>
                </div>

                <div className="variables-section">
                  <h4>Prompt 變數說明:</h4>
                  <ul>
                    {Object.entries(systemPrompts.prompt_variables).map(([key, description]) => (
                      <li key={key}>
                        <code>{`{{${key}}}`}</code>: {description}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="placeholder">
                載入中或無系統 Prompt 資料...
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === 'principles' && (
          <div className="principles-section">
            <h4>憲法原則 (Constitutional Principles):</h4>
            {systemPrompts ? (
              <div className="principles-list">
                {systemPrompts.constitutional_principles.map((principle, index) => (
                  <div key={index} className="principle-item">
                    <span className="principle-number">{index + 1}</span>
                    <span className="principle-text">{principle}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="placeholder">
                載入中或無憲法原則資料...
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .prompt-visualization {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin: 20px 0;
        }

        .prompt-header {
          padding: 20px;
          border-bottom: 1px solid #e1e8ed;
        }

        .prompt-header h3 {
          margin: 0 0 16px 0;
          color: #2d3748;
        }

        .prompt-tabs {
          display: flex;
          gap: 8px;
        }

        .tab {
          padding: 8px 16px;
          border: 1px solid #cbd5e0;
          background: #f7fafc;
          color: #4a5568;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab:hover {
          background: #edf2f7;
        }

        .tab.active {
          background: #4299e1;
          color: white;
          border-color: #4299e1;
        }

        .prompt-content {
          padding: 20px;
        }

        .prompt-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
          padding: 16px;
          background: #f7fafc;
          border-radius: 8px;
        }

        .meta-item {
          font-size: 14px;
        }

        .meta-item strong {
          color: #2d3748;
        }

        .prompt-text-container h4,
        .template-section h4,
        .system-info h4,
        .variables-section h4,
        .principles-section h4 {
          margin: 20px 0 12px 0;
          color: #2d3748;
        }

        .prompt-text {
          background: #1a202c;
          color: #e2e8f0;
          padding: 20px;
          border-radius: 8px;
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
          font-size: 13px;
          line-height: 1.6;
          overflow-x: auto;
          max-height: 400px;
          overflow-y: auto;
        }

        .prompt-important-line {
          color: #ffd700;
          font-weight: bold;
        }

        .prompt-variable-line {
          color: #98d8c8;
          font-style: italic;
        }

        .prompt-normal-line {
          color: #e2e8f0;
        }

        .system-info ul,
        .variables-section ul {
          margin: 0;
          padding-left: 20px;
          color: #4a5568;
        }

        .system-info li,
        .variables-section li {
          margin: 8px 0;
        }

        .variables-section code {
          background: #edf2f7;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #e53e3e;
          font-weight: bold;
        }

        .principles-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .principle-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: #f7fafc;
          border-radius: 8px;
          border-left: 4px solid #4299e1;
        }

        .principle-number {
          background: #4299e1;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .principle-text {
          color: #2d3748;
          line-height: 1.5;
        }

        .template-section {
          margin: 24px 0;
          border-bottom: 1px solid #e1e8ed;
          padding-bottom: 24px;
        }

        .template-section:last-child {
          border-bottom: none;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: #4a5568;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid #e2e8f0;
          border-top-color: #4299e1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error {
          padding: 20px;
        }

        .error-message {
          color: #e53e3e;
          background: #fff5f5;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #e53e3e;
        }

        .error-message button {
          margin-left: 12px;
          padding: 4px 12px;
          background: #e53e3e;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default PromptVisualization;