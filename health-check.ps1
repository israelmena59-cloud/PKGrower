#!/usr/bin/env pwsh

# Health Check para PKGrower
# Verifica que ambos servidores estén funcionando correctamente

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║              🏥 PKGrower Health Check                          ║
╚════════════════════════════════════════════════════════════════╝
"@

Write-Host ""

# 1. Verificar Backend
Write-Host "Checking Backend..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/sensors/latest" -Method GET -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend: OK (http://localhost:3000)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend: NO RESPONDE (esperado en http://localhost:3000)" -ForegroundColor Red
}

Write-Host ""

# 2. Verificar Frontend
Write-Host "Checking Frontend..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend: OK (http://localhost:5173)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend: NO RESPONDE (esperado en http://localhost:5173)" -ForegroundColor Red
}

Write-Host ""

# 3. Verificar Node.js
Write-Host "Checking Node.js..." -ForegroundColor Cyan
$nodeVersion = node --version
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green

# 4. Verificar npm
Write-Host "Checking npm..." -ForegroundColor Cyan
$npmVersion = npm --version
Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green

Write-Host ""
Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Para iniciar: .\start.ps1" -ForegroundColor Yellow
Write-Host ""
