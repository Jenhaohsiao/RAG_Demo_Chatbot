/**
 * 網站爬蟲組件集成測試
 * 測試 WebsiteCrawlerPanel 組件的功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WebsiteCrawlerPanel from '../components/WebsiteCrawlerPanel/WebsiteCrawlerPanel';


describe('WebsiteCrawlerPanel Component', () => {
  const mockOnCrawl = vi.fn();

  beforeEach(() => {
    mockOnCrawl.mockClear();
  });

  it('應該正確渲染組件', () => {
    render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={false}
      />
    );

    expect(screen.getByText(/Website Crawler/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/https:\/\/example.com/i)).toBeInTheDocument();
  });

  it('應該驗證空 URL', async () => {
    const { getByText } = render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={false}
      />
    );

    const startButton = getByText('Start Crawl');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockOnCrawl).not.toHaveBeenCalled();
    });
  });

  it('應該驗證無效的 URL 格式', async () => {
    const { getByPlaceholderText, getByText } = render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={false}
      />
    );

    const urlInput = getByPlaceholderText(/https:\/\/example.com/i);
    await userEvent.type(urlInput, 'not-a-url');

    const startButton = getByText('Start Crawl');
    fireEvent.click(startButton);

    // 應該顯示錯誤訊息
    await waitFor(() => {
      expect(mockOnCrawl).not.toHaveBeenCalled();
    });
  });

  it('應該接受有效的 HTTPS URL', async () => {
    const { getByPlaceholderText, getByText } = render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={false}
      />
    );

    const urlInput = getByPlaceholderText(/https:\/\/example.com/i);
    await userEvent.type(urlInput, 'https://example.com');

    const startButton = getByText('Start Crawl');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockOnCrawl).toHaveBeenCalledWith(
        'https://example.com',
        100000,  // default max_tokens
        100      // default max_pages
      );
    });
  });

  it('應該接受 HTTP URL', async () => {
    const { getByPlaceholderText, getByText } = render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={false}
      />
    );

    const urlInput = getByPlaceholderText(/https:\/\/example.com/i);
    await userEvent.type(urlInput, 'http://example.com');

    const startButton = getByText('Start Crawl');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockOnCrawl).toHaveBeenCalled();
    });
  });

  it('應該支持 Token 限制滑塊', async () => {
    const { getByRole, getByText } = render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={false}
      />
    );

    const slider = getByRole('slider') as HTMLInputElement;
    
    // 改變滑塊值
    fireEvent.change(slider, { target: { value: '50000' } });
    
    expect(slider.value).toBe('50000');
  });

  it('應該在禁用時隱藏按鈕', () => {
    const { getByText } = render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={true}
      />
    );

    const startButton = getByText('Start Crawl') as HTMLButtonElement;
    expect(startButton.disabled).toBe(true);
  });

  it('應該在加載時顯示加載狀態', () => {
    const { getByText } = render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={true}
        disabled={false}
      />
    );

    expect(screen.getByText(/Crawling.../i)).toBeInTheDocument();
  });

  it('應該顯示爬蟲結果', () => {
    const mockResults = {
      pages_found: 5,
      total_tokens: 25000,
      crawl_status: 'completed',
      crawled_pages: [
        { url: 'https://example.com/page1', title: 'Page 1', tokens: 5000, content: 'Content...' },
        { url: 'https://example.com/page2', title: 'Page 2', tokens: 5000, content: 'Content...' },
      ],
    };

    render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={false}
        crawlResults={mockResults}
      />
    );

    expect(screen.getByText('Pages Found')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/25K/)).toBeInTheDocument();
  });

  it('應該顯示錯誤訊息', () => {
    render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={false}
        error="Failed to crawl website"
      />
    );

    expect(screen.getByText('Failed to crawl website')).toBeInTheDocument();
  });

  it('應該在 Enter 鍵時提交', async () => {
    const { getByPlaceholderText } = render(
      <WebsiteCrawlerPanel
        onCrawl={mockOnCrawl}
        isLoading={false}
        disabled={false}
      />
    );

    const urlInput = getByPlaceholderText(/https:\/\/example.com/i);
    await userEvent.type(urlInput, 'https://example.com{Enter}');

    await waitFor(() => {
      expect(mockOnCrawl).toHaveBeenCalled();
    });
  });
});
