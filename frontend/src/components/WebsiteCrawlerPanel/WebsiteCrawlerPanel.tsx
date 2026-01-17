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

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { validateUrl, normalizeUrl } from "../../services/uploadService";
import { CrawledPage } from "../../services/uploadService";
import "./WebsiteCrawlerPanel.scss";

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
  maxTokens?: number;
  maxPages?: number;
  disabled?: boolean;
}

const WebsiteCrawlerPanel: React.FC<WebsiteCrawlerPanelProps> = ({
  onCrawl,
  isLoading = false,
  error = null,
  crawlResults = null,
  maxTokens = 100000,
  maxPages = 10,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCrawl = () => {
    setLocalError(null);

    // 驗證 URL
    if (!url.trim()) {
      setLocalError(t("crawler.error.emptyUrl", "Please enter a website URL"));
      return;
    }

    // 規範化 URL - 自動添加協議前綴
    const normalizedUrl = normalizeUrl(url);

    if (!validateUrl(normalizedUrl)) {
      setLocalError(t("crawler.error.invalidUrl", "Please enter a valid URL"));
      return;
    }

    // 呼叫父組件回調，使用規範化後的 URL
    onCrawl(normalizedUrl, maxTokens, maxPages);
  };

  // 使用範例網站
  const handleUseSampleWebsite = () => {
    const sampleUrl = "https://www.gutenberg.org/";
    setUrl(sampleUrl);
    setLocalError(null);
    // 自動開始爬取
    onCrawl(sampleUrl, maxTokens, maxPages);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCrawl();
    }
  };

  const displayError = localError || error;

  // 格式化 Token 數量顯示
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  // 檢查爬蟲是否已完成
  const isCrawlCompleted =
    crawlResults &&
    (crawlResults.crawl_status === "completed" ||
      crawlResults.crawl_status === "token_limit_reached" ||
      crawlResults.crawl_status === "page_limit_reached");

  return (
    <div className="">
      {/* 爬蟲表單 - 始終顯示，即使完成後也保留 */}
      <div className="crawler-form">
        <p className="crawler-description mb-3">
          {t(
            "crawler.description",
            "輸入網站 URL 自動爬取內容。設定頁面數為 1 可爬取單一頁面，設定更多頁面可深度爬取整個網站。"
          )}
        </p>

        {/* URL 輸入 */}
        <div className="form-group mb-3">
          <input
            id="crawler-url"
            type="text"
            className={`form-control ${displayError ? "is-invalid" : ""}`}
            placeholder="https://www.gutenberg.org/"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setLocalError(null);
            }}
            onKeyPress={handleKeyPress}
            disabled={isLoading || disabled}
          />
          {displayError && (
            <div className="invalid-feedback">{displayError}</div>
          )}
        </div>

        {/* 提交按鈕 */}
        <button
          className="btn btn-primary w-100 py-2 rounded-pill mb-2"
          onClick={handleCrawl}
          disabled={isLoading || disabled || !url.trim()}
        >
          {isLoading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              {t("crawler.crawling", "處理中...")}
            </>
          ) : (
            <>
              <i className="bi bi-play-circle me-2"></i>
              {t("crawler.start", "開始爬取")}
            </>
          )}
        </button>

        {/* 範例網站按鈕 */}
        <div className="text-center">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={handleUseSampleWebsite}
            disabled={isLoading || disabled}
          >
            <i className="bi bi-globe me-2"></i>
            {t("crawler.useSample", "Use sample website (Project Gutenberg)")}
          </button>
        </div>
      </div>

      {/* 爬蟲結果 */}
      {crawlResults && (
        <div className="crawler-results">
          <div className="results-header">
            <h4>{t("crawler.results", "Crawl Results")}</h4>
            <div className="results-stats">
              <div className="stat">
                <span className="stat-label">
                  {t("crawler.pagesFound", "Pages Found")}
                </span>
                <span className="stat-value">{crawlResults.pages_found}</span>
              </div>
              <div className="stat">
                <span className="stat-label">
                  {t("crawler.totalTokens", "Total Tokens")}
                </span>
                <span className="stat-value">
                  {formatTokens(crawlResults.total_tokens)}
                </span>
              </div>
              <div className="stat">
                <span
                  className={`stat-status status-${crawlResults.crawl_status}`}
                >
                  {crawlResults.crawl_status === "completed" &&
                    t("crawler.status.completed", "✓ Completed")}
                  {crawlResults.crawl_status === "token_limit_reached" &&
                    t("crawler.status.tokenLimit", "⚠ Token Limit")}
                  {crawlResults.crawl_status === "page_limit_reached" &&
                    t("crawler.status.pageLimit", "⚠ Page Limit")}
                  {crawlResults.crawl_status === "crawling" &&
                    t("crawler.status.crawling", "⏳ Crawling...")}
                </span>
              </div>
            </div>
          </div>

          {/* URL 列表 */}
          <div className="urls-list">
            <h5>{t("crawler.urlList", "Crawled URLs")}</h5>
            <div className="urls-container">
              {crawlResults.crawled_pages.map((page, index) => (
                <div key={index} className="url-item">
                  <div className="url-header">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="url-link"
                    >
                      {page.title || t("crawler.untitled", "Untitled")}
                    </a>
                    <span className="url-tokens">
                      {t("crawler.tokenCount", "{{count}} tokens", {
                        count: page.tokens ?? 0,
                      })}
                    </span>
                  </div>
                  <div className="url-content-preview">{page.content}</div>
                </div>
              ))}
            </div>
            <p className="urls-note">
              {t(
                "crawler.urlNote",
                "{{count}} URLs crawled and ready for processing",
                {
                  count: crawlResults.crawled_pages.length,
                }
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteCrawlerPanel;
