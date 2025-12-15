#!/usr/bin/env pwsh
# Start RAG Demo Chatbot Backend with Persistent Process
# This script solves the VS Code terminal auto-shutdown issue by launching
# the backend as an independent process instead of a terminal session child

param(
    [switch]$Frontend,
    [switch]$Qdrant,
    [switch]$All
)

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "RAG Demo Chatbot - Service Launcher" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

# Start Qdrant if requested or --all
if ($Qdrant -or $All) {
    Write-Host "🐳 Starting Qdrant Docker container..." -ForegroundColor Yellow
    docker-compose -f (Join-Path $projectRoot "docker-compose.yml") up -d qdrant
    Start-Sleep -Seconds 3
    Write-Host "✅ Qdrant started" -ForegroundColor Green
}

# Start Backend
Write-Host "🚀 Starting Backend Server (persistent process)..." -ForegroundColor Yellow
Push-Location $backendDir
try {
    # Clear problematic environment variables
    $env:PYTHONSTARTUP = ""
    $env:PYTHONDONTWRITEBYTECODE = ""
    
    # Start as independent process (doesn't die when terminal closes)
    $backendProcess = Start-Process `
        -FilePath "py" `
        -ArgumentList @("-3.12", "run_persistent_server.py") `
        -NoNewWindow `
        -PassThru `
        -WorkingDirectory $backendDir
    
    Write-Host "✅ Backend started (PID: $($backendProcess.Id))" -ForegroundColor Green
    Write-Host "   Server running on http://127.0.0.1:8000" -ForegroundColor Green
    Write-Host "   API docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
} finally {
    Pop-Location
}

# Start Frontend if requested or --all
if ($Frontend -or $All) {
    Write-Host "⚛️  Starting Frontend Dev Server..." -ForegroundColor Yellow
    Push-Location $frontendDir
    try {
        # Start frontend in a new terminal window
        Start-Process `
            -FilePath "cmd.exe" `
            -ArgumentList @("/k", "npm run dev") `
            -WorkingDirectory $frontendDir
        
        Write-Host "✅ Frontend started (http://localhost:5173)" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "Services started successfully!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Usage:" -ForegroundColor Cyan
Write-Host "  ./start-services.ps1           # Start backend only" -ForegroundColor Gray
Write-Host "  ./start-services.ps1 -Frontend # Start backend + frontend" -ForegroundColor Gray
Write-Host "  ./start-services.ps1 -All      # Start Qdrant + backend + frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "📍 Endpoints:" -ForegroundColor Cyan
Write-Host "  Backend API:  http://127.0.0.1:8000" -ForegroundColor Gray
Write-Host "  API Docs:     http://127.0.0.1:8000/docs" -ForegroundColor Gray
Write-Host "  Frontend:     http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 To stop backend: Get-Process py | Where-Object {$_.Id -eq $($backendProcess.Id)} | Stop-Process" -ForegroundColor Yellow
