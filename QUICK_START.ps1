#!/usr/bin/env pwsh

# Quick Start Guide for PKGrower

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                  🌱 PKGrower Quick Start                       ║
╚════════════════════════════════════════════════════════════════╝

✅ SETUP COMPLETADO:

  1. ✓ Frontend migrado de Tailwind a Material-UI 5
  2. ✓ Backend Express configurado con dotenv
  3. ✓ Cliente API centralizado en src/api/client.ts
  4. ✓ Variables de entorno configuradas
  5. ✓ npm scripts para inicio simultáneo

📍 ACCESO:

  Frontend:    http://localhost:5173
  Backend API: http://localhost:3000

🎯 FUNCIONALIDADES:

  ✨ Dashboard de Sensores
     - Visualización en tiempo real
     - Gráficos históricos
     - Actualización cada 5 segundos

  🤖 AI Assistant
     - Chat interactivo
     - Procesamiento de comandos

  🔌 Control de Dispositivos
     - Encender/Apagar
     - Sincronización en tiempo real

⚙️ CONFIGURACIÓN:

  Frontend:  .env.local (VITE_API_BASE_URL)
  Backend:   backend/.env (PORT, MODO_SIMULACION)

🚀 COMANDOS ÚTILES:

  npm run dev:all        # Inicia frontend + backend
  npm run dev            # Solo frontend
  npm run dev:backend    # Solo backend
  npm run build          # Build para producción
  npm run lint           # Verificar código

📂 ESTRUCTURA:

  src/                   - Código React (TypeScript)
  backend/               - Servidor Express
  components/            - Componentes Material-UI
  .env.local             - Configuración frontend
  backend/.env           - Configuración backend

💡 PRÓXIMOS PASOS:

  1. Abrir http://localhost:5173 en el navegador
  2. Probar Dashboard (sensores y dispositivos)
  3. Probar AI Assistant (chat)
  4. Para dispositivos reales: actualizar backend/.env con credenciales Tuya/Xiaomi

📚 DOCUMENTACIÓN:

  - SETUP.md              - Guía detallada de instalación
  - INTEGRATION_GUIDE.md  - Integración frontend-backend
  - MIGRATION_PR_TEMPLATE.md - Detalles de la migración

═════════════════════════════════════════════════════════════════
"@

Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Yellow
Read-Host
