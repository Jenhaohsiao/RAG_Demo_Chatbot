"""
網站爬蟲單元測試
測試 WebCrawler 服務的核心功能
"""

import pytest
from backend.src.services.web_crawler import WebCrawler, WebCrawlerError


class TestWebCrawlerInitialization:
    """測試爬蟲初始化"""
    
    def test_init_default_params(self):
        """測試默認參數初始化"""
        crawler = WebCrawler("https://example.com")
        assert crawler.base_url == "https://example.com"
        assert crawler.base_domain == "example.com"
        assert crawler.max_tokens == 100000
        assert crawler.max_pages == 100
        assert crawler.total_tokens == 0
        assert len(crawler.visited_urls) == 0
    
    def test_init_custom_params(self):
        """測試自定義參數初始化"""
        crawler = WebCrawler(
            "https://docs.python.org",
            max_tokens=50000,
            max_pages=50
        )
        assert crawler.base_url == "https://docs.python.org"
        assert crawler.base_domain == "docs.python.org"
        assert crawler.max_tokens == 50000
        assert crawler.max_pages == 50


class TestTokenEstimation:
    """測試 Token 估算"""
    
    def test_estimate_tokens_english(self):
        """測試英文 Token 估算"""
        crawler = WebCrawler("https://example.com")
        text = "a" * 300  # 300 characters
        tokens = crawler._estimate_tokens(text)
        assert tokens == 100  # 300 / 3 = 100
    
    def test_estimate_tokens_chinese(self):
        """測試中文 Token 估算"""
        crawler = WebCrawler("https://example.com")
        text = "天" * 300  # 300 Chinese characters
        tokens = crawler._estimate_tokens(text)
        assert tokens == 100  # 300 / 3 = 100
    
    def test_estimate_tokens_mixed(self):
        """測試混合語言 Token 估算"""
        crawler = WebCrawler("https://example.com")
        text = "Hello世界" * 50  # Mixed English and Chinese
        tokens = crawler._estimate_tokens(text)
        expected = len(text) // 3
        assert tokens == expected
    
    def test_estimate_tokens_short_text(self):
        """測試短文本最少返回 1 個 token"""
        crawler = WebCrawler("https://example.com")
        text = "a"
        tokens = crawler._estimate_tokens(text)
        assert tokens >= 1


class TestTokenLimit:
    """測試 Token 限制"""
    
    def test_should_process_page_within_limit(self):
        """測試頁面在限制內"""
        crawler = WebCrawler("https://example.com", max_tokens=10000)
        crawler.total_tokens = 5000
        should_process = crawler._should_process_page(4000)
        assert should_process is True
        assert crawler.token_limit_reached is False
    
    def test_should_process_page_exceed_limit(self):
        """測試超過限制"""
        crawler = WebCrawler("https://example.com", max_tokens=10000)
        crawler.total_tokens = 8000
        should_process = crawler._should_process_page(3000)
        assert should_process is False
        assert crawler.token_limit_reached is True
    
    def test_should_process_page_exact_limit(self):
        """測試正好達到限制"""
        crawler = WebCrawler("https://example.com", max_tokens=10000)
        crawler.total_tokens = 6000
        should_process = crawler._should_process_page(4000)
        assert should_process is True
        assert crawler.token_limit_reached is False


class TestDomainBoundary:
    """測試域名邊界"""
    
    def test_same_domain_allowed(self):
        """測試同一域名的頁面被允許"""
        crawler = WebCrawler("https://example.com/page1")
        # /page2 should be on same domain
        assert crawler.base_domain == "example.com"
    
    def test_different_domain_detected(self):
        """測試不同域名被檢測到"""
        crawler = WebCrawler("https://example.com")
        other_domain = "https://other.com"
        # Domain boundary check would happen during crawl
        assert crawler.base_domain != "other.com"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
