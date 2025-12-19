/**
 * Website Crawler Panel Component
 * 網站爬蟲面板（URL 輸入、Token 限制、爬蟲結果預覽）
 * 
 * Features:
 * - URL 輸入與驗證
 * - Token 限制滑塊（1K-500K）
 * - 爬蟲結果預覽（URL 列表、Token 計數）
 * - 爬蟲進度顯示
 * - 錯誤處理與友善提示
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateUrl } from '../services/uploadService';
import { CrawledPage } from '../services/uploadService';
import './WebsiteCrawlerPanel.css';

export interface WebsiteCrawlerPanelProps {
  onCrawl: (url: string, maxTokens: number, maxPages: number) => void;
  isLoading?: boolean;
  error?: string | null;
  crawlResults?: {
    pages_found: number;
    total_tokens: number;
    crawl_status: string;
    crawled_pages: CrawledPage[];
  } | null;
  disabled?: boolean;
}

const WebsiteCrawlerPanel: React.FC<WebsiteCrawlerPanelProps> = ({
  onCrawl,
  isLoading = false,
  error = null,
  crawlResults = null,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [maxTokens, setMaxTokens] = useState(100000);  // 默認 100K
  const [maxPages, setMaxPages] = useState(100);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCrawl = () => {
    setLocalError(null);

    // 驗證 URL
    if (!url.trim()) {
      setLocalError(t('crawler.error.emptyUrl', 'Please enter a website URL'));
      return;
    }

    if (!validateUrl(url)) {
      setLocalError(t('crawler.error.invalidUrl', 'Please enter a valid URL'));
      return;
    }

    // 呼叫父組件回調
    onCrawl(url, maxTokens, maxPages);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCrawl();
    }
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const displayError = localError || error;

  return (
    <div className="website-crawler-panel">
      {/* 爬蟲表單 */}
      <div className="crawler-form">
        <h3>{t('crawler.title', 'Website Crawler')}</h3>
        <p className="crawler-description">
          {t('crawler.description', 'Enter a website URL to automatically crawl and extract content')}
        </p>

        {/* URL 輸入 */}
        <div className="form-group">
          <label htmlFor="crawler-url">{t('crawler.url', 'Website URL')}</label>
          <input
            id="crawler-url"
            type="text"
            className={`url-input ${displayError ? 'error' : ''}`}
            placeholder="https://example.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setLocalError(null);
            }}
            onKeyPress={handleKeyPress}
            disabled={isLoading || disabled}
          />
          {displayError && <div className="error-message">{displayError}</div>}
        </div>

        {/* Token 限制 */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="crawler-tokens">{t('crawler.maxTokens', 'Max Tokens')}</label>
            <span className="token-display">{formatTokens(maxTokens)}</span>
          </div>
          <input
            id="crawler-tokens"
            type="range"
            min="1000"
            max="500000"
            step="1000"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            disabled={isLoading || disabled}
            className="token-slider"
          />
          <div className="token-info">
            {maxTokens <= 50000 && <span className="info-small">💡 {t('crawler.tokenHint.small', 'Suitable for small websites')}</span>}
            {maxTokens > 50000 && maxTokens <= 150000 && <span className="info-medium">⚡ {t('crawler.tokenHint.medium', 'Suitable for medium websites')}</span>}
            {maxTokens > 150000 && <span className="info-large">🚀 {t('crawler.tokenHint.large', 'Suitable for large websites')}</span>}
          </div>
        </div>

        {/* 高級選項 */}
        <button
          className="toggle-advanced"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={isLoading || disabled}
        >
          {showAdvanced ? '▼ ' : '▶ '} {t('crawler.advancedOptions', 'Advanced Options')}
        </button>

        {showAdvanced && (
          <div className="advanced-options">
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="crawler-pages">{t('crawler.maxPages', 'Max Pages')}</label>
                <span className="page-display">{maxPages}</span>
              </div>
              <input
                id="crawler-pages"
                type="range"
                min="1"
                max="1000"
                step="10"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value))}
                disabled={isLoading || disabled}
                className="page-slider"
              />
            </div>
          </div>
        )}

        {/* 提交按鈕 */}
        <button
          className="crawler-button"
          onClick={handleCrawl}
          disabled={isLoading || disabled || !url.trim()}
        >
          {isLoading ? (
            <>
              <span className="spinner" /> {t('crawler.crawling', 'Crawling...')}
            </>
          ) : (
            t('crawler.start', 'Start Crawl')
          )}
        </button>
      </div>

      {/* 爬蟲結果 */}
      {crawlResults && (
        <div className="crawler-results">
          <div className="results-header">
            <h4>{t('crawler.results', 'Crawl Results')}</h4>
            <div className="results-stats">
              <div className="stat">
                <span className="stat-label">{t('crawler.pagesFound', 'Pages Found')}</span>
                <span className="stat-value">{crawlResults.pages_found}</span>
              </div>
              <div className="stat">
                <span className="stat-label">{t('crawler.totalTokens', 'Total Tokens')}</span>
                <span className="stat-value">{formatTokens(crawlResults.total_tokens)}</span>
              </div>
              <div className="stat">
                <span className={`stat-status status-${crawlResults.crawl_status}`}>
                  {crawlResults.crawl_status === 'completed' && '✓ Completed'}
                  {crawlResults.crawl_status === 'token_limit_reached' && '⚠ Token Limit'}
                  {crawlResults.crawl_status === 'page_limit_reached' && '⚠ Page Limit'}
                  {crawlResults.crawl_status === 'crawling' && '⏳ Crawling...'}
                </span>
              </div>
            </div>
          </div>

          {/* URL 列表 */}
          <div className="urls-list">
            <h5>{t('crawler.urlList', 'Crawled URLs')}</h5>
            <div className="urls-container">
              {crawlResults.crawled_pages.map((page, index) => (
                <div key={index} className="url-item">
                  <div className="url-header">
                    <a href={page.url} target="_blank" rel="noopener noreferrer" className="url-link">
                      {page.title || 'Untitled'}
                    </a>
                    <span className="url-tokens">{formatTokens(page.tokens)} tokens</span>
                  </div>
                  <div className="url-content-preview">{page.content}</div>
                </div>
              ))}
            </div>
            <p className="urls-note">
              {t('crawler.urlNote', '{{count}} URLs crawled and ready for processing', {
                count: crawlResults.crawled_pages.length
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteCrawlerPanel;
