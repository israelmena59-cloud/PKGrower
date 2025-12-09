#!/usr/bin/env pwsh

# PKGrower - Xiaomi Token Helper
# Ayuda a configurar tokens de dispositivos Xiaomi

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║     🌱 PKGrower - Configurador de Dispositivos Xiaomi         ║
╚════════════════════════════════════════════════════════════════╝
"@

Write-Host ""
Write-Host "Este script te ayudará a obtener tus tokens de Xiaomi." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar si Token Extractor está descargado
Write-Host "📥 Paso 1: Descargar Token Extractor" -ForegroundColor Yellow
Write-Host "═════════════════════════════════════════"
Write-Host ""
Write-Host "Necesitas: Xiaomi-Cloud-Tokens-Extractor" -ForegroundColor White
Write-Host ""
Write-Host "1. Ve a: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor/releases"
Write-Host "2. Descarga la versión para Windows (.exe)"
Write-Host "3. Ejecuta el programa"
Write-Host "4. Usa tus credenciales Xiaomi (email + contraseña)"
Write-Host "5. Anota los siguientes valores:"
Write-Host ""
Write-Host "   ├─ Device ID" -ForegroundColor Cyan
Write-Host "   ├─ Token" -ForegroundColor Cyan
Write-Host "   ├─ IP Address" -ForegroundColor Cyan
Write-Host "   └─ Model" -ForegroundColor Cyan
Write-Host ""

# 2. Configurar variables de entorno
Write-Host ""
Write-Host "⚙️  Paso 2: Configurar backend/.env" -ForegroundColor Yellow
Write-Host "═════════════════════════════════════════"
Write-Host ""

$envPath = "backend\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ No se encontró $envPath" -ForegroundColor Red
    Write-Host "Asegúrate de estar en la carpeta raíz de PKGrower"
    exit
}

Write-Host "✓ Archivo $envPath encontrado" -ForegroundColor Green
Write-Host ""

# Leer el archivo actual
$envContent = Get-Content $envPath -Raw

# Mostrar instrucciones
Write-Host "Opciones:" -ForegroundColor Yellow
Write-Host "  1 - Editar backend/.env manualmente"
Write-Host "  2 - Editar en VS Code"
Write-Host "  3 - Ver contenido actual"
Write-Host "  4 - Salir"
Write-Host ""

$choice = Read-Host "¿Qué deseas hacer? (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Abre el archivo en tu editor favorito:" -ForegroundColor Yellow
        Write-Host "  > code backend\.env" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Y rellena con tus valores:" -ForegroundColor White
        Write-Host ""
        Write-Host "XIAOMI_HUMIDIFIER_ID=12345678"
        Write-Host "XIAOMI_HUMIDIFIER_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        Write-Host "XIAOMI_HUMIDIFIER_IP=192.168.1.100"
        Write-Host ""
        Write-Host "Guarda el archivo (Ctrl+S)" -ForegroundColor Green
    }

    "2" {
        Write-Host "Abriendo VS Code..." -ForegroundColor Cyan
        code backend\.env
    }

    "3" {
        Write-Host "Contenido actual de backend/.env:" -ForegroundColor Yellow
        Write-Host "════════════════════════════════════"
        Write-Host ""
        Write-Host $envContent
        Write-Host ""
        Write-Host "════════════════════════════════════"
    }

    default {
        Write-Host "Saliendo." -ForegroundColor Yellow
        exit
    }
}

Write-Host ""
Write-Host "✓ Paso 2 completado" -ForegroundColor Green
Write-Host ""

# 3. Reiniciar backend
Write-Host "🔄 Paso 3: Reiniciar Backend" -ForegroundColor Yellow
Write-Host "═════════════════════════════════════════"
Write-Host ""

$startBackend = Read-Host "¿Deseas iniciar el backend ahora? (s/n)"

if ($startBackend -eq "s" -or $startBackend -eq "S") {
    Write-Host ""
    Write-Host "Iniciando backend..." -ForegroundColor Cyan
    Write-Host ""
    npm run dev:backend
} else {
    Write-Host ""
    Write-Host "Para iniciar el backend manualmente:" -ForegroundColor Yellow
    Write-Host "  > npm run dev:backend" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "✓ Configuración completada" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Inicia backend: npm run dev:backend"
Write-Host "  2. En otra terminal: npm run dev"
Write-Host "  3. Abre: http://localhost:5173"
Write-Host "  4. Verifica que los datos aparecen"
Write-Host ""
Write-Host "Más información: XIAOMI_SETUP.md" -ForegroundColor Cyan
Write-Host ""
