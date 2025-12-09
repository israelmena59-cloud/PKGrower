#!/usr/bin/env pwsh

# PKGrower Smart Installation & Launch Script
# This script ensures all dependencies are installed and starts the app correctly

Write-Host "`n" -ForegroundColor White
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       🌱 PKGrower - Smart Installation & Launch         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n"

# --- STEP 1: Check Node.js ---
Write-Host "📋 Verificando Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js no está instalado." -ForegroundColor Red
    Write-Host "📥 Descargar desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
$nodeVersion = node --version
Write-Host "✅ Node.js $nodeVersion encontrado" -ForegroundColor Green

# --- STEP 2: Check npm ---
Write-Host "`n📋 Verificando npm..." -ForegroundColor Yellow
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm no está instalado." -ForegroundColor Red
    exit 1
}
$npmVersion = npm --version
Write-Host "✅ npm $npmVersion encontrado" -ForegroundColor Green

# --- STEP 3: Install Frontend Dependencies ---
Write-Host "`n📦 Verificando dependencias del frontend..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "⚙️  Instalando dependencias del frontend (esto puede tardar)..." -ForegroundColor Cyan
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias del frontend" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencias del frontend instaladas" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencias del frontend ya instaladas" -ForegroundColor Green
}

# --- STEP 4: Install Backend Dependencies ---
Write-Host "`n📦 Verificando dependencias del backend..." -ForegroundColor Yellow
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "⚙️  Instalando dependencias del backend (esto puede tardar)..." -ForegroundColor Cyan
    Set-Location backend
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias del backend" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "✅ Dependencias del backend instaladas" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencias del backend ya instaladas" -ForegroundColor Green
}

# --- STEP 5: Verify Configuration ---
Write-Host "`n📋 Verificando configuración..." -ForegroundColor Yellow

# Check if backend/.env exists
if (-not (Test-Path "backend/.env")) {
    Write-Host "⚠️  backend/.env no encontrado. Creando con valores por defecto..." -ForegroundColor Yellow
    Copy-Item "backend/.env.example" "backend/.env" -ErrorAction SilentlyContinue
    if (-not (Test-Path "backend/.env")) {
        Write-Host "❌ No se pudo crear backend/.env" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Configuración lista (backend/.env)" -ForegroundColor Green

# --- STEP 6: Check Concurrently ---
Write-Host "`n📋 Verificando concurrently..." -ForegroundColor Yellow
$concurrentlyExists = npm list concurrently | Select-String "concurrently" | Measure-Object | Select-Object -ExpandProperty Count
if ($concurrentlyExists -eq 0) {
    Write-Host "⚙️  Instalando concurrently..." -ForegroundColor Cyan
    npm install concurrently --save-dev
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar concurrently" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ concurrently disponible" -ForegroundColor Green

# --- STEP 7: Check Ports ---
Write-Host "`n📋 Verificando puertos..." -ForegroundColor Yellow

# Check port 3000
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count
if ($port3000 -gt 0) {
    Write-Host "⚠️  Puerto 3000 ya está en uso. Intenta: netstat -ano | findstr :3000" -ForegroundColor Yellow
} else {
    Write-Host "✅ Puerto 3000 disponible" -ForegroundColor Green
}

# Check port 5173
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count
if ($port5173 -gt 0) {
    Write-Host "⚠️  Puerto 5173 ya está en uso. Intenta: netstat -ano | findstr :5173" -ForegroundColor Yellow
} else {
    Write-Host "✅ Puerto 5173 disponible" -ForegroundColor Green
}

# --- STEP 8: Ready to Start ---
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                   ✅ LISTO PARA INICIAR                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n🚀 Iniciando PKGrower..." -ForegroundColor Green
Write-Host "`n📌 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "`n⏹️  Presiona Ctrl+C para detener los servidores" -ForegroundColor Yellow
Write-Host "`n"

# --- STEP 9: Start Both Servers ---
# Using npx to find concurrently in node_modules
$concurrentlyPath = (npm bin) + "/concurrently"

# Verify concurrently exists
if (-not (Test-Path $concurrentlyPath)) {
    Write-Host "Usando npx concurrently..." -ForegroundColor Cyan
    npx concurrently "npm run dev:backend" "npm run dev"
} else {
    Write-Host "Usando concurrently local..." -ForegroundColor Cyan
    & $concurrentlyPath "npm run dev:backend" "npm run dev"
}
