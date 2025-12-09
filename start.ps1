#!/usr/bin/env pwsh

# Start PKGrower Application
# Usage: .\start.ps1

Write-Host "🌱 PKGrower - Starting Application..." -ForegroundColor Green
Write-Host ""

# Check if npm is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

Write-Host "✅ npm found" -ForegroundColor Green

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
}

Write-Host ""
Write-Host "🚀 Starting PKGrower (Frontend + Backend)..." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend API will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Yellow
Write-Host ""

# Start both servers in parallel
# Start both servers using the npm script (which handles local bins correctly)
npm run dev:all
