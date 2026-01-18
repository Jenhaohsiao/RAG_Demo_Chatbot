"""
Website Web Crawler Service
Crawls websites with token limit protection

Features:
- Auto-discovers pages from a base URL
- Token-based limits to control API costs
- Page limit to prevent infinite crawling
- Respects domain boundaries
"""

import logging
from typing import Set, List, Dict, Optional
from urllib.parse import urljoin, urlparse
from datetime import datetime

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Constants
CRAWLER_TIMEOUT = 30  # seconds per page
MAX_CRAWL_TIMEOUT = 600  # 10 minutes total
CRAWLER_USER_AGENT = "RAG-Chatbot-Crawler/1.0"
DEFAULT_MAX_TOKENS = 100000


class WebCrawlerError(Exception):
    """Base exception for crawler errors"""
    pass


class WebCrawler:
    """Website crawler with token limit protection"""

    def __init__(
        self,
        base_url: str,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        max_pages: int = 100,
    ):
        """
        Initialize web crawler

        Args:
            base_url: Starting URL to crawl from
            max_tokens: Maximum tokens allowed for crawling (default: 100K)
            max_pages: Maximum number of pages to crawl
        """
        self.base_url = base_url
        self.base_domain = urlparse(base_url).netloc
        self.max_tokens = max_tokens
        self.max_pages = max_pages

        self.visited_urls: Set[str] = set()
        self.discovered_pages: List[Dict] = []
        self.total_tokens: int = 0
        self.token_limit_reached: bool = False
        self.start_time = datetime.now()

    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate token count from text
        Average: 1 token ≈ 3 characters (accounting for mixed Chinese/English)
        """
        return max(1, len(text) // 3)

    def _should_process_page(self, page_tokens: int) -> bool:
        """Check if page should be processed based on token limits"""
        if self.total_tokens + page_tokens > self.max_tokens:
            logger.warning(
                f"Token limit would be exceeded: "
                f"{self.total_tokens} + {page_tokens} > {self.max_tokens}"
            )
            self.token_limit_reached = True
            return False
        return True

    def _clean_text(self, soup: BeautifulSoup) -> str:
        """Extract and clean text from BeautifulSoup object"""
        # Remove script, style, nav, header, footer elements
        for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
            tag.decompose()

        # Get text with newline separators
        text = soup.get_text(separator="\n", strip=True)

        # Clean up excessive whitespace
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n".join(lines)

    def crawl(self) -> Dict:
        """
        Start crawling the website

        Returns:
            {
                "status": "completed" | "token_limit_reached" | "page_limit_reached",
                "base_url": "...",
                "pages": [
                    {
                        "url": "...",
                        "title": "...",
                        "tokens": 1234,
                        "content": "..."
                    }
                ],
                "total_pages": 45,
                "total_tokens": 50000,
                "token_limit_reached": False,
                "summary": {
                    "avg_tokens_per_page": 1111,
                    "crawl_duration_seconds": 120
                }
            }
        """
        to_visit = [self.base_url]
        status = "completed"

        logger.info(
            f"Starting crawler for {self.base_url} "
            f"(max_tokens: {self.max_tokens}, max_pages: {self.max_pages})"
        )

        while to_visit and len(self.visited_urls) < self.max_pages:
            if self.token_limit_reached:
                status = "token_limit_reached"
                break

            url = to_visit.pop(0)

            # Skip if already visited
            if url in self.visited_urls:
                continue

            try:
                # Add logs for debugging
                logger.info(f"Crawling page: {url}")
                
                # Fetch page with shorter timeout
                response = requests.get(
                    url,
                    timeout=10,  # Shorten to 10 seconds
                    headers={"User-Agent": CRAWLER_USER_AGENT},
                    allow_redirects=True
                )
                response.raise_for_status()

                # Parse content
                soup = BeautifulSoup(response.content, "html.parser")

                # Extract text
                text = self._clean_text(soup)

                if not text:
                    logger.debug(f"No text content found at {url}")
                    self.visited_urls.add(url)
                    continue

                # Calculate tokens
                page_tokens = self._estimate_tokens(text)

                # Check token limits
                if not self._should_process_page(page_tokens):
                    continue

                # Mark as visited and save
                self.visited_urls.add(url)
                self.total_tokens += page_tokens

                # Extract title
                title_tag = soup.find("title")
                title = title_tag.text if title_tag else url

                page_data = {
                    "url": url,
                    "title": title,
                    "tokens": page_tokens,
                    "content": text,
                }
                self.discovered_pages.append(page_data)

                logger.info(
                    f"✅ Crawled: {url} "
                    f"({page_tokens} tokens, "
                    f"total: {self.total_tokens}/{self.max_tokens})"
                )

                # Discover new links
                for link in soup.find_all("a", href=True):
                    next_url = urljoin(url, link["href"])

                    # Only crawl same domain
                    if urlparse(next_url).netloc == self.base_domain:
                        # Remove URL fragments and query parameters for deduplication
                        clean_url = next_url.split("#")[0]

                        if clean_url not in self.visited_urls:
                            to_visit.append(clean_url)

            except requests.exceptions.Timeout:
                logger.warning(f"Timeout crawling {url}")
                continue
            except requests.exceptions.RequestException as e:
                logger.warning(f"Error crawling {url}: {e}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error crawling {url}: {e}")
                continue

        # Check if max pages reached
        if len(self.visited_urls) >= self.max_pages:
            status = "page_limit_reached"

        # Calculate duration
        duration = (datetime.now() - self.start_time).total_seconds()

        # Build response
        avg_tokens = (
            self.total_tokens / len(self.discovered_pages)
            if self.discovered_pages
            else 0
        )

        return {
            "status": status,
            "base_url": self.base_url,
            "pages": self.discovered_pages,
            "total_pages": len(self.visited_urls),
            "total_tokens": self.total_tokens,
            "token_limit_reached": self.token_limit_reached,
            "summary": {
                "avg_tokens_per_page": int(avg_tokens),
                "crawl_duration_seconds": round(duration, 2),
                "pages_per_second": round(len(self.discovered_pages) / duration, 2)
                if duration > 0
                else 0,
            },
        }
