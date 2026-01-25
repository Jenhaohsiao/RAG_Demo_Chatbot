/**
 * Website Crawler Panel Component
 * Website crawler panel (URL input, Token limit, Crawl result preview)
 *
 * Features:
 * - URL input and validation
 * - Token limit slider (1K-500K)
 * - Crawl result preview (URL list, Token count)
 * - Crawl progress display
 * - Error handling and friendly prompts
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

    // Validate URL
    if (!url.trim()) {
      setLocalError(t("crawler.error.emptyUrl", "Please enter a website URL"));
      return;
    }

    // Normalize URL - automatically add protocol prefix
    const normalizedUrl = normalizeUrl(url);

    if (!validateUrl(normalizedUrl)) {
      setLocalError(t("crawler.error.invalidUrl", "Please enter a valid URL"));
      return;
    }

    // Call parent component callback, use normalized URL
    onCrawl(normalizedUrl, maxTokens, maxPages);
  };

  // Use sample website
  const handleUseSampleWebsite = () => {
    const sampleUrl = "https://www.gutenberg.org/";
    setUrl(sampleUrl);
    setLocalError(null);
    // Automatically start crawling
    onCrawl(sampleUrl, maxTokens, maxPages);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCrawl();
    }
  };

  const displayError = localError || error;

  // Format Token count display
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <div className="">
      {/* Crawler Form - Always show, even after completion */}
      <div className="crawler-form">
        <p className="crawler-description mb-3">
          {t(
            "crawler.description",
            "Enter website URL to crawl content automatically. Set page limit to 1 for single page, or more for deep crawling.",
          )}
        </p>

        {/* URL Input */}
        <div className="form-group mb-3">
          <input
            id="crawler-url"
            type="text"
            className="form-control"
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

        {/* Submit Button */}
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
              {t("crawler.crawling", "Processing...")}
            </>
          ) : (
            <>
              <i className="bi bi-play-circle me-2"></i>
              {t("crawler.start", "Start Crawling")}
            </>
          )}
        </button>

        {/* Sample Website Button */}
        <div className="text-center mt-3">
          <button
            className="btn btn-success btn-lg shadow-sm px-4 py-3"
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              border: "none",
              borderRadius: "12px",
              fontWeight: "500",
              fontSize: "16px",
              transition: "all 0.3s ease",
            }}
            onClick={handleUseSampleWebsite}
            disabled={isLoading || disabled}
            onMouseEnter={(e) => {
              if (!isLoading && !disabled) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 16px rgba(245, 87, 108, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <i className="bi bi-globe2 me-2" style={{ fontSize: "20px" }}></i>
            {t("crawler.useSample", "Use Sample Website (Project Gutenberg)")}
          </button>
        </div>
      </div>

      {/* Crawler Results */}
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
                    t("crawler.status.completed", " Completed")}
                  {crawlResults.crawl_status === "token_limit_reached" &&
                    t("crawler.status.tokenLimit", " Token Limit")}
                  {crawlResults.crawl_status === "page_limit_reached" &&
                    t("crawler.status.pageLimit", " Page Limit")}
                  {crawlResults.crawl_status === "crawling" &&
                    t("crawler.status.crawling", " Crawling...")}
                </span>
              </div>
            </div>
          </div>

          {/* URL List */}
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
                },
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteCrawlerPanel;
