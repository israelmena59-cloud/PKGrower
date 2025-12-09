# Frontend-Backend Integration Guide

## ✅ Integración Completada

La aplicación PKGrower ahora tiene frontend (React + Material-UI) y backend (Express) totalmente integrados.

## 🚀 Cómo Ejecutar

### Opción 1: Ejecutar Frontend y Backend simultáneamente (RECOMENDADO)

```powershell
npm run dev:all
```

Esto abrirá:
- **Backend**: http://localhost:3000 (servidor API)
- **Frontend**: http://localhost:5174 (aplicación React)

### Opción 2: Ejecutar por separado

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
# O simplemente:
npm run dev:backend
```

**Terminal 2 - Frontend:**
```powershell
npm run dev
```

## 📡 Comunicación Frontend ↔ Backend

### API Client Centralizado

El frontend usa un cliente API centralizado en `src/api/client.ts` que:
- Centraliza todas las llamadas al backend en una clase `APIClient`
- Usa TypeScript para type-safety
- Maneja errores automáticamente
- Expone métodos simples:

```typescript
// Sensores
apiClient.getLatestSensors()
apiClient.getSensorHistory()

// Dispositivos
apiClient.getDeviceStates()
apiClient.toggleDevice('luzRoja')

// Chat IA
apiClient.sendChatMessage('mensaje')
```

### Endpoints Backend Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/sensors/latest` | Obtiene último dato de sensores |
| `GET` | `/api/sensors/history` | Obtiene historial de sensores |
| `GET` | `/api/devices` | Obtiene estado de dispositivos |
| `POST` | `/api/device/:id/toggle` | Cambia estado de un dispositivo |
| `POST` | `/api/chat` | Envía mensaje al asistente IA |

## ⚙️ Configuración

### Variables de Entorno

**Frontend** (`.env.local`):
```
VITE_API_BASE_URL=http://localhost:3000
```

**Backend** (`backend/.env`):
```
PORT=3000
MODO_SIMULACION=true
TUYA_ACCESS_KEY=...
TUYA_SECRET_KEY=...
XIAOMI_USERNAME=...
XIAOMI_PASSWORD=...
```

### Modo Simulación (Desarrollo)

El backend está configurado en **modo simulación** por defecto (`MODO_SIMULACION=true`):
- ✅ No necesita credenciales reales de Tuya/Xiaomi
- ✅ Genera datos de sensores aleatorios
- ✅ Simula cambios de estado en dispositivos
- ✅ Permite desarrollar sin hardware real

### Cambiar a Credenciales Reales

Para conectar a dispositivos reales de Tuya y Xiaomi:

1. Edita `backend/.env`:
```
MODO_SIMULACION=false
TUYA_ACCESS_KEY=tu_access_key
TUYA_SECRET_KEY=tu_secret_key
XIAOMI_USERNAME=tu_usuario
XIAOMI_PASSWORD=tu_contraseña
```

2. Reinicia el backend:
```powershell
npm run dev:backend
```

## 📊 Flujo de Datos

```
Frontend (React + MUI)
    ↓
API Client (src/api/client.ts)
    ↓
fetch() → Backend (Express)
    ↓
Modo Simulación / APIs Tuya/Xiaomi
    ↓
Sensores (temperatura, humedad, VPD)
Dispositivos (luces, extractores, bombas)
```

## 🔍 Testing

### 1. Verificar Backend está corriendo
```powershell
# Debería retornar datos JSON
Invoke-WebRequest http://localhost:3000/api/sensors/latest | Select-Object -ExpandProperty Content
```

### 2. Verificar Frontend se conecta
- Abre http://localhost:5174 en el navegador
- Deberías ver datos en tiempo real:
  - Tarjetas de sensores (temperatura, humedad, etc.)
  - Gráficas de historial
  - Controles de dispositivos (switches)

### 3. Probar Chat IA
- Haz clic en "Asistente de IA"
- Escribe un mensaje y presiona "Enviar"
- Deberías recibir una respuesta del backend

## 🛠️ Troubleshooting

### Error: "Failed to connect to backend server"

**Solución:**
1. Verifica que el backend esté corriendo: `npm run dev:backend`
2. Confirma que está en puerto 3000: http://localhost:3000
3. Revisa la consola del backend para errores

### Error: CORS

**Solución:**
- El backend ya tiene CORS habilitado (`app.use(cors())`)
- Si ves errores, verifica que el backend está activo

### Datos no actualizando

**Solución:**
1. Abre DevTools (F12) → Console
2. Verifica que no hay errores de red
3. Comprueba que el backend genera datos (revisa su consola)

## 📝 Cambios Realizados

### Frontend
- ✅ Creado `src/api/client.ts` con cliente API centralizado
- ✅ Actualizado `src/pages/Dashboard.tsx` para usar API client
- ✅ Actualizado `src/pages/AIAssistant.tsx` para usar API client
- ✅ Agregado `.env.local` con URL del API

### Backend
- ✅ Agregado soporte para variables de entorno (`dotenv`)
- ✅ Actualizado para leer `MODO_SIMULACION` desde `.env`
- ✅ Agregado `backend/.env` con configuración
- ✅ Agregado `dotenv` a dependencias

### Package.json
- ✅ Agregados scripts `dev:backend` y `dev:all`
- ✅ Agregado `concurrently` para ejecutar simultáneamente

## 🎯 Próximos Pasos (Opcional)

1. **Agregar validación de entrada** en el backend
2. **Implementar autenticación** para proteger la API
3. **Agregar historial a base de datos** (actualmente en memoria)
4. **Crear dashboard admin** para gestionar credenciales
5. **Documentar endpoints** con Swagger/OpenAPI
6. **Agregar tests** para frontend y backend

---

## 🚀 ¡Listo para usar!

Ejecuta en una terminal:
```powershell
npm run dev:all
```

Abre en tu navegador:
- Frontend: http://localhost:5174
- Backend API: http://localhost:3000

¡La app debería mostrar datos en tiempo real! 🎉
