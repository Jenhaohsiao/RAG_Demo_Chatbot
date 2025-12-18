#!/usr/bin/env pwsh
# Phase 5 User Testing - Automated Setup Script
# This script automates the setup and verification of services for Phase 5 testing

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Phase 5 User Testing - Automated Setup" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker Desktop
Write-Host "[1/6] Checking Docker Desktop..." -ForegroundColor Yellow
try {
    $dockerCheck = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please start Docker Desktop manually:" -ForegroundColor Yellow
        Write-Host "  1. Open Docker Desktop application" -ForegroundColor White
        Write-Host "  2. Wait for it to fully start (icon turns green)" -ForegroundColor White
        Write-Host "  3. Re-run this script" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    Write-Host "✅ Docker Desktop is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Step 2: Build and start services
Write-Host ""
Write-Host "[2/6] Building and starting services..." -ForegroundColor Yellow
docker-compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Services started" -ForegroundColor Green

# Step 3: Wait for services to be ready
Write-Host ""
Write-Host "[3/6] Waiting for services to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 4: Check service status
Write-Host ""
Write-Host "[4/6] Checking service status..." -ForegroundColor Yellow
$services = docker-compose ps --format json | ConvertFrom-Json

$qdrantRunning = $false
$backendRunning = $false

foreach ($service in $services) {
    if ($service.Service -eq "qdrant" -and $service.State -eq "running") {
        $qdrantRunning = $true
        Write-Host "  ✅ Qdrant: Running" -ForegroundColor Green
    }
    if ($service.Service -eq "backend" -and $service.State -eq "running") {
        $backendRunning = $true
        Write-Host "  ✅ Backend: Running" -ForegroundColor Green
    }
}

if (-not $qdrantRunning) {
    Write-Host "  ❌ Qdrant: Not running" -ForegroundColor Red
}
if (-not $backendRunning) {
    Write-Host "  ❌ Backend: Not running" -ForegroundColor Red
}

if (-not ($qdrantRunning -and $backendRunning)) {
    Write-Host ""
    Write-Host "❌ Some services failed to start. Check logs with:" -ForegroundColor Red
    Write-Host "   docker-compose logs" -ForegroundColor White
    exit 1
}

# Step 5: Verify service health
Write-Host ""
Write-Host "[5/6] Verifying service health..." -ForegroundColor Yellow

# Check Qdrant
Write-Host "  Testing Qdrant..." -ForegroundColor Gray
try {
    $qdrantHealth = Invoke-RestMethod -Uri "http://localhost:6333/healthz" -Method Get -TimeoutSec 5
    Write-Host "  ✅ Qdrant is healthy" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Qdrant health check failed (may still be starting)" -ForegroundColor Yellow
}

# Check Backend
Write-Host "  Testing Backend API..." -ForegroundColor Gray
$maxRetries = 5
$retryCount = 0
$backendHealthy = $false

while ($retryCount -lt $maxRetries -and -not $backendHealthy) {
    try {
        $backendHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 5
        Write-Host "  ✅ Backend is healthy" -ForegroundColor Green
        Write-Host "     Model: $($backendHealth.model)" -ForegroundColor Gray
        $backendHealthy = $true
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "  ⏳ Backend not ready, retrying ($retryCount/$maxRetries)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
}

if (-not $backendHealthy) {
    Write-Host "  ❌ Backend health check failed after $maxRetries retries" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check backend logs with:" -ForegroundColor Yellow
    Write-Host "   docker-compose logs backend" -ForegroundColor White
    exit 1
}

# Step 6: Final summary
Write-Host ""
Write-Host "[6/6] Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Services are ready for testing!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Service URLs:" -ForegroundColor Cyan
Write-Host "   Backend API:  http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host "   Qdrant:       http://localhost:6333" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open a new terminal" -ForegroundColor White
Write-Host "   2. Run: cd frontend" -ForegroundColor White
Write-Host "   3. Run: npm run dev" -ForegroundColor White
Write-Host "   4. Open browser: http://localhost:5173" -ForegroundColor White
Write-Host "   5. Start testing!" -ForegroundColor White
Write-Host ""
Write-Host "📚 Testing Guide:" -ForegroundColor Cyan
Write-Host "   See: docs/PHASE5_QUICK_START.md" -ForegroundColor White
Write-Host ""
Write-Host "🔍 View Logs:" -ForegroundColor Cyan
Write-Host "   Backend: docker-compose logs backend -f" -ForegroundColor White
Write-Host "   Qdrant:  docker-compose logs qdrant -f" -ForegroundColor White
Write-Host ""
Write-Host "🛑 Stop Services:" -ForegroundColor Cyan
Write-Host "   docker-compose down" -ForegroundColor White
Write-Host ""
