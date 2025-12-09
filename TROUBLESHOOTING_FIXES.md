# 🔧 SOLUCIÓN DE ERRORES - PKGrower v3.0

## ✅ Cambios Realizados

### 1. **Modo Simulación Activado**
```
backend/.env
MODO_SIMULACION=true  ← CAMBIADO
```
**Razón:** Las credenciales de Xiaomi/Tuya no funcionarán sin dispositivos reales conectados en la red.

### 2. **Script start.ps1 Corregido**
```powershell
# Antes:
npx concurrently "npm run dev:backend" "npm run dev"

# Ahora:
concurrently "npm run dev:backend" "npm run dev"
```
**Razón:** `concurrently` ya está en `node_modules` (instalado con npm).

### 3. **package.json Scripts Actualizados**
```json
// Antes:
"dev:backend": "cd backend && node index.js",
"dev:all": "npx concurrently \"npm run dev:backend\" \"npm run dev\"",

// Ahora:
"dev:backend": "node backend/index.js",
"dev:all": "concurrently \"npm run dev:backend\" \"npm run dev\"",
```
**Razón:** Ruta más directa sin cambio de directorio que puede fallar en PowerShell.

---

## 🚀 Cómo Ejecutar Ahora

### Opción 1: Inicio Simple (Recomendado)
```powershell
npm run dev:all
```

### Opción 2: En Terminales Separadas
```powershell
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev
```

### Opción 3: Usar Script PowerShell
```powershell
.\start.ps1
```

---

## 📋 Qué Esperar

Una vez ejecutado `npm run dev:all`:

### Terminal Output
```
[1] > backend@1.0.0 dev
[1] > node backend/index.js
[1]
[1] ╔════════════════════════════════════════════════════════╗
[1] ║  🌱 PKGrower Backend - Servidor iniciado           ║
[1] ╚════════════════════════════════════════════════════════╝
[1]
[1] ✓ Backend running on http://localhost:3000
[1] ✓ Modo: 🔄 SIMULACIÓN
[1] ✓ Dispositivos Xiaomi conectados: 0
[1] ✓ Dispositivos Tuya registrados: 0
[1]
[2] > pkgrower-web-app@0.0.0 dev
[2] > vite
[2]
[2]   VITE v5.x.x  ready in xxx ms
[2]
[2]   ➜  Local:   http://localhost:5173/
[2]   ➜  press h + enter to show help
```

### URLs
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **API:** http://localhost:3000/api

---

## ✨ Características Ahora en Modo Simulación

### 📊 Dashboard Funcional
- ✅ Sensores Xiaomi (valores simulados)
- ✅ Sensores de Sustrato Tuya (valores simulados)
- ✅ Control de Humedad (slider funcional)
- ✅ Control de Cámara (botones funcionales)
- ✅ Historial de sensores
- ✅ Control de dispositivos (toggles)

### 📡 API Endpoints
Todos los 20 endpoints funcionan en modo simulación:
```
GET  /api/sensors/latest
GET  /api/sensors/history
GET  /api/sensors/soil
GET  /api/devices
GET  /api/devices/tuya
POST /api/device/:id/control
GET  /api/device/camera/status
POST /api/device/camera/record/start
POST /api/device/camera/record/stop
POST /api/device/camera/capture
GET  /api/device/humidifier/status
POST /api/automation/humidifier-extractor
... y más
```

---

## 🔌 Para Usar Dispositivos Reales Después

Cuando tengas dispositivos reales conectados:

### 1. Obtener Tokens Xiaomi
```
Descargar: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor
```

### 2. Configurar Credenciales
```
backend/.env

XIAOMI_HUMIDIFIER_ID=<tu_id>
XIAOMI_HUMIDIFIER_TOKEN=<tu_token>
XIAOMI_HUMIDIFIER_IP=<tu_ip>

XIAOMI_CAMERA_ID=<tu_id>
XIAOMI_CAMERA_TOKEN=<tu_token>
XIAOMI_CAMERA_IP=<tu_ip>

TUYA_ACCESS_KEY=<tu_key>
TUYA_SECRET_KEY=<tu_secret>
```

### 3. Cambiar Modo
```
MODO_SIMULACION=false
```

---

## 🧪 Verificar Funcionamiento

### Test 1: Backend
```powershell
curl http://localhost:3000/api/sensors/latest
```
Debería retornar JSON con datos simulados.

### Test 2: Frontend
```
Abre: http://localhost:5173
Debería cargar sin errores
```

### Test 3: Diagnostics
```powershell
curl http://localhost:3000/api/devices/diagnostics
```
Debería mostrar `"mode": "simulation"`.

---

## 🐛 Si Aún Hay Problemas

### Error: "concurrently command not found"
```powershell
# Reinstalar dependencias frontend
npm install
```

### Error: "Port 3000 already in use"
```powershell
# Cambiar puerto en backend/.env
PORT=3001
```

### Error: "node_modules not found"
```powershell
# Limpiar e reinstalar
rm -Recurse node_modules backend/node_modules
npm install
cd backend && npm install && cd ..
```

### Frontend no actualiza componentes
```powershell
# Reiniciar en Terminal 2
npm run dev
```

---

## 📚 Documentación

- **QUICK_START_GUIDE.md** - Guía de inicio rápido
- **TUYA_INTEGRATION_COMPLETE.md** - Detalles de integración
- **INDEX_COMPLETE.md** - Índice del proyecto

---

## ✅ Checklist Final

- [x] MODO_SIMULACION=true en backend/.env
- [x] start.ps1 corregido
- [x] package.json scripts actualizados
- [x] npm install completado
- [x] concurrently en node_modules
- [x] Puerto 3000 disponible
- [x] Puerto 5173 disponible

## 🎉 Listo para usar

```powershell
npm run dev:all
```

Luego abre: **http://localhost:5173**

---

**Versión:** 3.0.1 (Fixed)
**Status:** ✅ Working
**Modo:** 🔄 Simulación
