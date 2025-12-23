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
  onParameterChange?: (parameter: string, value: any) => void;
}

interface PromptParameters {
  response_language: string;
  input_language: string;
  similarity_threshold: number;
  token_threshold: number;
  session_ttl_minutes: number;
  prompt_type: 'rag' | 'general' | 'summary';
  response_style: 'concise' | 'standard' | 'detailed';
  professional_level: 'casual' | 'professional' | 'academic';
  creativity_level: 'conservative' | 'balanced' | 'creative';
  enabled_principles: string[];
  supported_file_types: string[];
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
    <div className="prompt-visualization-compact">
      <div className="prompt-tabs mb-3">
        <button 
          className={`btn btn-sm me-1 ${activeTab === 'current' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('current')}
        >
          當前 Prompt
        </button>
        <button 
          className={`btn btn-sm me-1 ${activeTab === 'system' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('system')}
        >
          系統模板
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'principles' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('principles')}
        >
          憲法原則
        </button>
      </div>

      <div className="prompt-content-compact">
        {loading && (
          <div className="text-center">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <small className="text-muted ms-2">載入中...</small>
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger alert-sm">
            <small>❌ 無法載入: {error}</small>
            <button 
              className="btn btn-sm btn-outline-danger ms-2" 
              onClick={() => { fetchSystemPrompts(); fetchCurrentPrompt(); }}
            >
              重試
            </button>
          </div>
        )}

        {!loading && !error && activeTab === 'current' && (
          <div className="current-prompt-section-compact">
            {currentPrompt ? (
              <div style={{fontSize: '12px'}}>
                <div className="text-muted mb-2">
                  <div><strong>語言:</strong> {currentPrompt.response_language}</div>
                  <div><strong>有文檔:</strong> {currentPrompt.has_documents ? '是' : '否'}</div>
                </div>
                <div className="prompt-preview bg-light p-2" style={{maxHeight: '200px', overflow: 'auto', borderRadius: '4px'}}>
                  <div className="font-monospace text-break" style={{fontSize: '13px'}}>
                    {currentPrompt.actual_prompt.substring(0, 500)}
                    {currentPrompt.actual_prompt.length > 500 && '...'}
                  </div>
                </div>
              </div>
            ) : (
              <small className="text-muted">載入中...</small>
            )}
          </div>
        )}

        {!loading && !error && activeTab === 'system' && (
          <div className="system-prompts-section-compact">
            {systemPrompts ? (
              <div style={{fontSize: '12px'}}>
                <div className="text-muted mb-2">
                  <div><strong>相似度閾值:</strong> {systemPrompts.system_info.similarity_threshold}</div>
                  <div><strong>Token 閾值:</strong> {systemPrompts.system_info.token_threshold.toLocaleString()}</div>
                  <div><strong>支援語言:</strong> {systemPrompts.system_info.supported_languages.length} 種</div>
                </div>
                <div className="prompt-preview bg-light p-2" style={{maxHeight: '200px', overflow: 'auto', borderRadius: '4px'}}>
                  <div className="font-monospace text-break" style={{fontSize: '13px'}}>
                    <strong>RAG 模板:</strong><br/>
                    {systemPrompts.rag_prompt_template.substring(0, 300)}...
                  </div>
                </div>
              </div>
            ) : (
              <small className="text-muted">載入中...</small>
            )}
          </div>
        )}

        {!loading && !error && activeTab === 'principles' && (
          <div className="principles-section-compact">
            {systemPrompts ? (
              <div style={{fontSize: '14px'}}>
                <div className="text-muted mb-2">
                  <strong>憲法原則 ({systemPrompts.constitutional_principles.length} 條):</strong>
                </div>
                <div className="principles-list bg-light p-2" style={{maxHeight: '200px', overflow: 'auto', borderRadius: '4px'}}>
                  {systemPrompts.constitutional_principles.slice(0, 5).map((principle, index) => (
                    <div key={index} className="d-block mb-1 text-break" style={{fontSize: '13px'}}>
                      {index + 1}. {principle.substring(0, 80)}...
                    </div>
                  ))}
                  {systemPrompts.constitutional_principles.length > 5 && (
                    <div className="text-muted" style={{fontSize: '12px'}}>… 更多 {systemPrompts.constitutional_principles.length - 5} 條原則</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-muted" style={{fontSize: '13px'}}>載入中...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptVisualization;