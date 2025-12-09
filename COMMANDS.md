# 🚀 PKGrower - Comandos Rápidos

## Inicio

```powershell
# Opción 1: Script automático (RECOMENDADO)
.\start.ps1

# Opción 2: Comando directo
npm run dev:all

# Opción 3: Servidores por separado
npm run dev:backend     # Terminal 1
npm run dev             # Terminal 2
```

## URLs

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **API Test:** http://localhost:3000/api/sensors/latest

## Instalación

```powershell
# Instalar dependencias frontend
npm install

# Instalar dependencias backend
cd backend
npm install
cd ..
```

## Desarrollo

```powershell
# Frontend en modo watch
npm run dev

# Backend en modo watch
npm run dev:backend

# Ambos simultáneamente
npm run dev:all

# Build para producción
npm run build

# Verificar código
npm run lint
```

## Diagnóstico

```powershell
# Verificar estado de servicios
.\health-check.ps1

# Ver versión de Node.js
node --version

# Ver versión de npm
npm --version

# Limpiar caché
rm -r node_modules
npm cache clean --force
npm install
```

## Configuración

```powershell
# Editar variables frontend
# Archivo: .env.local
# Ejemplo: VITE_API_BASE_URL=http://localhost:3000

# Editar variables backend
# Archivo: backend/.env
# Ejemplo: PORT=3000
```

## Testing de API

```powershell
# Obtener sensores actuales
curl http://localhost:3000/api/sensors/latest

# Obtener histórico
curl http://localhost:3000/api/sensors/history

# Obtener dispositivos
curl http://localhost:3000/api/devices

# Enviar mensaje al chat
curl -X POST http://localhost:3000/api/chat `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Hola\"}"
```

## Puertos

| Puerto | Servicio | URL |
|--------|----------|-----|
| 5173 | Frontend (Vite) | http://localhost:5173 |
| 3000 | Backend (Express) | http://localhost:3000 |

## Troubleshooting

```powershell
# Port 3000 en uso
$env:PORT = 3001
npm run dev:backend

# Port 5173 en uso
$env:VITE_PORT = 5175
npm run dev

# Reiniciar todo
Get-Process node | Stop-Process -Force
npm run dev:all
```

## Git

```powershell
# Ver rama actual
git branch

# Crear rama
git checkout -b feat/nombre

# Commit
git add .
git commit -m "Mensaje"

# Push
git push origin feat/nombre
```

## Documentación

- `README.md` - Guía completa del proyecto
- `SETUP.md` - Instrucciones de instalación
- `STATUS.md` - Estado actual del proyecto
- `INTEGRATION_GUIDE.md` - Detalles técnicos
- `MIGRATION_PR_TEMPLATE.md` - Historial de migración

## Atajos VS Code

Presiona:
- `Ctrl+Shift+P` - Paleta de comandos
- `Ctrl+J` - Abrir terminal
- `Ctrl+Shift+D` - Depurador
- `Ctrl+K Ctrl+T` - Cambiar tema

## Tareas en VS Code

1. Abre la paleta: `Ctrl+Shift+P`
2. Escribe: `Tasks: Run Task`
3. Selecciona:
   - `🚀 Start All (Frontend + Backend)`
   - `Frontend Dev Server`
   - `Backend Dev Server`
   - `Build Production`
   - `Lint Code`

---

**¿Necesitas ayuda?** Consulta `SETUP.md`
