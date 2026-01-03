# 測試爬蟲 API
# 測試是否可以正確調用爬蟲端點

Write-Host "=== 測試爬蟲 API ===" -ForegroundColor Cyan

# 1. 創建會話
Write-Host "`n1. 創建測試會話..." -ForegroundColor Yellow
try {
    $sessionResp = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/session" -Method Post -ContentType "application/json"
    $sessionId = $sessionResp.session_id
    Write-Host "✓ 會話創建成功: $sessionId" -ForegroundColor Green
} catch {
    Write-Host "✗ 會話創建失敗: $_" -ForegroundColor Red
    exit 1
}

# 2. 測試爬蟲端點
Write-Host "`n2. 測試爬蟲端點..." -ForegroundColor Yellow
Write-Host "URL: http://localhost:8000/api/v1/upload/$sessionId/website" -ForegroundColor Gray

$crawlerData = @{
    url = "https://cambimm.ca"
    max_tokens = 10000
    max_pages = 2
} | ConvertTo-Json

try {
    Write-Host "發送請求..." -ForegroundColor Gray
    $crawlResp = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/upload/$sessionId/website" `
        -Method Post `
        -ContentType "application/json" `
        -Body $crawlerData `
        -TimeoutSec 60
    
    Write-Host "✓ 爬蟲請求成功" -ForegroundColor Green
    Write-Host "  文檔 ID: $($crawlResp.document_id)" -ForegroundColor Gray
    Write-Host "  頁面數: $($crawlResp.pages_found)" -ForegroundColor Gray
    Write-Host "  Token 數: $($crawlResp.total_tokens)" -ForegroundColor Gray
    Write-Host "  狀態: $($crawlResp.crawl_status)" -ForegroundColor Gray
    
    # 顯示爬取的頁面
    if ($crawlResp.crawled_pages -and $crawlResp.crawled_pages.Count -gt 0) {
        Write-Host "`n  爬取的頁面:" -ForegroundColor Gray
        foreach ($page in $crawlResp.crawled_pages) {
            Write-Host "    - $($page.title) ($($page.tokens) tokens)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "✗ 爬蟲請求失敗" -ForegroundColor Red
    Write-Host "錯誤詳情: $_" -ForegroundColor Red
    
    # 嘗試顯示詳細錯誤
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "響應內容: $responseBody" -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host "`n=== 測試完成 ===" -ForegroundColor Cyan
