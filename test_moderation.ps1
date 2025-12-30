# Content Moderation Test Script

Write-Host "=== Content Moderation Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Adult Content (should BLOCK)
Write-Host "Test 1: Adult Content" -ForegroundColor Yellow
$s1 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/session/create" -Method Post -ContentType "application/json" -Body '{"language":"zh-TW"}'
$adult = '{"content":"xxx porn videos","source_reference":"https://www.xvideos.com","academic_mode":false}'
try {
    $r1 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/upload/$($s1.session_id)/moderate" -Method Post -ContentType "application/json" -Body $adult
    if ($r1.is_approved) {
        Write-Host "❌ FAILED: Should be BLOCKED but got APPROVED" -ForegroundColor Red
    } else {
        Write-Host "✅ PASSED: Correctly BLOCKED" -ForegroundColor Green  
    }
    Write-Host "   Status: $($r1.status), Reason: $($r1.reason)"
} catch {
    Write-Host "✅ PASSED: Content BLOCKED" -ForegroundColor Green
}
Write-Host ""

# Test 2: Normal Academic Content (should PASS)
Write-Host "Test 2: Academic Content" -ForegroundColor Yellow
$s2 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/session/create" -Method Post -ContentType "application/json" -Body '{"language":"zh-TW"}'
$academic = '{"content":"Machine learning agents and reinforcement learning","source_reference":"06_agents.pdf","academic_mode":false}'
try {
    $r2 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/upload/$($s2.session_id)/moderate" -Method Post -ContentType "application/json" -Body $academic
    if ($r2.is_approved) {
        Write-Host "✅ PASSED: Correctly APPROVED" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED: Should be APPROVED but got BLOCKED" -ForegroundColor Red
    }
    Write-Host "   Status: $($r2.status)"
} catch {
    Write-Host "❌ FAILED: Should not be blocked" -ForegroundColor Red
}
Write-Host ""

# Test 3: Normal Website (should PASS)
Write-Host "Test 3: Normal Website" -ForegroundColor Yellow
$s3 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/session/create" -Method Post -ContentType "application/json" -Body '{"language":"zh-TW"}'
$website = '{"content":"CCMBIMM consulting services for business management","source_reference":"https://ccmbimm.ca","academic_mode":false}'
try {
    $r3 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/upload/$($s3.session_id)/moderate" -Method Post -ContentType "application/json" -Body $website
    if ($r3.is_approved) {
        Write-Host "✅ PASSED: Correctly APPROVED" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED: Should be APPROVED but got BLOCKED" -ForegroundColor Red
    }
    Write-Host "   Status: $($r3.status)"
} catch {
    Write-Host "❌ FAILED: Should not be blocked" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Tests Complete ===" -ForegroundColor Cyan
