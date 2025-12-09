# 🏗️ PKGrower - Arquitectura del Sistema

## 📊 Diagrama General

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO (Navegador)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
        ┌──────────────────────────────────────┐
        │    FRONTEND - React 18 + Material-UI │
        │    http://localhost:5173             │
        └──────────┬───────────────────────────┘
                   │
                   │ HTTP/REST
                   │ (JSON)
                   ↓
        ┌──────────────────────────────────────┐
        │     BACKEND - Express.js             │
        │     http://localhost:3000            │
        └──────────┬───────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
    ┌────────┐ ┌──────────┐ ┌──────────┐
    │ Datos  │ │ Tuya IoT │ │ Xiaomi   │
    │(JSON)  │ │ Devices  │ │ Mi Home  │
    └────────┘ └──────────┘ └──────────┘
```

## 🎯 Componentes Principales

### 1. Frontend (React)

**Ubicación:** `/src`

```
src/
├── pages/                          # Páginas principales
│   ├── Dashboard.tsx              # Sensores y dispositivos
│   ├── AIAssistant.tsx            # Chat inteligente
│   └── Automations.tsx            # (Futuro)
│
├── components/                     # Componentes reutilizables
│   ├── Layout.tsx                 # Sidebar + main layout
│   ├── Alerts.tsx                 # Notificaciones tipo toast
│   └── dashboard/
│       ├── SensorCard.tsx         # Tarjeta individual sensor
│       ├── DeviceSwitch.tsx       # Control on/off
│       └── HistoryChart.tsx       # Gráfico histórico
│
├── api/
│   └── client.ts                  # Cliente API centralizado ⭐
│
├── lib/
│   └── utils.ts                   # Funciones de utilidad
│
├── App.tsx                        # Componente raíz
├── main.tsx                       # Punto de entrada + tema
└── index.css                      # Variables CSS globales
```

**Dependencias Clave:**
- `react@18.2.0` - Framework UI
- `@mui/material@5.14.8` - Componentes Material Design
- `@emotion/react` - CSS-in-JS
- `recharts@3.5.1` - Gráficos
- `vite@5.4.21` - Build tool

### 2. Backend (Express.js)

**Ubicación:** `/backend`

```
backend/
├── index.js                       # Servidor principal ⭐
├── package.json                   # Dependencias
└── .env                          # Configuración
```

**Dependencias Clave:**
- `express@5.2.1` - Framework web
- `cors` - CORS middleware
- `dotenv` - Variables de entorno
- `@tuya/tuya-connector-nodejs` - Integración Tuya (opcional)
- `node-mihome` - Integración Xiaomi (opcional)

### 3. Configuración

```
.env.local                         # Frontend config
backend/.env                       # Backend config
package.json                       # Scripts npm
tsconfig.json                      # TypeScript config
vite.config.ts                     # Vite config
```

## 🔄 Flujo de Datos

### Lectura de Sensores

```
Usuario abre Dashboard
    ↓
useEffect en Dashboard.tsx
    ↓
apiClient.getLatestSensors()
    ↓
Fetch GET /api/sensors/latest
    ↓
Backend recibe solicitud
    ↓
Backend retorna JSON con sensores
    ↓
React actualiza estado (sensores)
    ↓
Renderiza SensorCard para cada sensor
    ↓
Usuario ve datos actualizados
```

### Cambio de Dispositivo

```
Usuario hace click en switch
    ↓
handleToggle(deviceId) en DeviceSwitch
    ↓
apiClient.toggleDevice(deviceId)
    ↓
Fetch POST /api/device/:id/toggle
    ↓
Backend cambia estado del dispositivo
    ↓
Backend retorna nuevo estado {id, newState}
    ↓
React actualiza estado local
    ↓
Switch se actualiza inmediatamente
    ↓
Siguiente polling confirma el cambio
```

### Chat con AI

```
Usuario escribe y envía mensaje
    ↓
handleSend() en AIAssistant
    ↓
apiClient.sendChatMessage(text)
    ↓
Fetch POST /api/chat con mensaje
    ↓
Backend procesa solicitud
    ↓
Backend retorna {reply: "respuesta"}
    ↓
React añade mensaje y respuesta al historial
    ↓
Scrolls automáticamente al mensaje nuevo
    ↓
Usuario ve respuesta del AI
```

## 🌳 Arquitectura de Componentes

### Material-UI Theme

```
createTheme() en main.tsx
├── Palette
│   ├── primary (azul)
│   ├── secondary (naranja)
│   ├── background
│   └── ...CSS variables
├── Typography
│   ├── h1-h6 (headings)
│   ├── body1-2 (párrafos)
│   ├── button
│   └── caption
├── Shape
│   └── borderRadius (from CSS var)
└── Components
    ├── MuiPaper
    ├── MuiCard
    ├── MuiButton
    ├── MuiSwitch
    └── ... (7 componentes totales)
```

### Componentes de Página

**Dashboard.tsx**
```
Layout
├── Sidebar (Navigation)
└── Main Content
    ├── Page Title
    ├── Grid de SensorCards
    │   └── SensorCard x N
    ├── HistoryChart
    └── Grid de DeviceSwitches
        └── DeviceSwitch x N
```

**AIAssistant.tsx**
```
Layout
├── Sidebar (Navigation)
└── Main Content
    ├── Page Title
    ├── List de mensajes
    │   ├── Message de usuario
    │   └── Message de AI
    ├── TextField para input
    └── Button "Enviar"
```

## 📡 API REST Endpoints

| Método | Endpoint | Descripción | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/sensors/latest` | Últimas lecturas | - | `{temperature, humidity, light, ...}` |
| GET | `/api/sensors/history` | Histórico | - | `[{timestamp, value}, ...]` |
| GET | `/api/devices` | Estado dispositivos | - | `{lamp1, lamp2, fan, ...}` |
| POST | `/api/device/:id/toggle` | Toggle dispositivo | `{}` | `{id, newState}` |
| POST | `/api/chat` | Chat AI | `{message: "..."}` | `{reply: "..."}` |

## 🔐 Configuración

### Frontend (.env.local)

```env
VITE_API_BASE_URL=http://localhost:3000
```

**Usada en:** `src/api/client.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
```

### Backend (backend/.env)

```env
PORT=3000
MODO_SIMULACION=true
TUYA_REGION=na
TUYA_CLIENT_ID=
TUYA_SECRET=
XIAOMI_USERNAME=
XIAOMI_PASSWORD=
```

**Usada en:** `backend/index.js`

```javascript
const PORT = process.env.PORT || 3000
const MODO_SIMULACION = process.env.MODO_SIMULACION === 'true'
```

## 🚀 Scripts de Inicio

### npm run dev:all
```
npx concurrently "npm run dev:backend" "npm run dev"
```
Inicia ambos servidores simultáneamente en terminales separadas.

### npm run dev:backend
```
cd backend && node index.js
```
Solo backend en puerto 3000.

### npm run dev
```
vite
```
Solo frontend en puerto 5173.

### npm run build
```
tsc && vite build
```
Compila TypeScript y genera build optimizado.

## 📊 Estado de la Aplicación

### Estado Global

**Frontend:**
- `sensors[]` - Array de lecturas actuales
- `history[]` - Histórico de sensores
- `devices{}` - Estado de dispositivos
- `messages[]` - Historial de chat
- `loading` - Estado de carga
- `error` - Mensajes de error

**Backend:**
- `Port: 3000` - Escuchando
- `MODO_SIMULACION: true` - Sin dispositivos reales
- `Rutas registradas: 5` - /api/sensors/latest, /api/sensors/history, /api/devices, /api/device/:id/toggle, /api/chat

## 🔌 Integración IoT

### Actual (Simulación)
```
Backend
├── Genera datos ficticios
├── Sensores: temp, humidity, light
└── Dispositivos: lamp1, lamp2, fan
```

### Futuro (Tuya)
```
Backend
├── Conecta a Tuya Cloud
├── Autentica con credentials
├── Lee dispositivos reales
└── Envía comandos
```

### Futuro (Xiaomi)
```
Backend
├── Conecta a Xiaomi Mi Home
├── Autentica con credentials
├── Lee dispositivos reales
└── Envía comandos
```

## 🏃 Ejecución en Desarrollo

### Secuencia de Inicio

```
1. npm run dev:all
   ↓
2. Backend: require dotenv, read .env, start on :3000
   ↓
3. Frontend: Vite compila, start dev server on :5173
   ↓
4. Usuario abre localhost:5173
   ↓
5. React monta componentes, inicia useEffect
   ↓
6. useEffect llama apiClient.getLatestSensors()
   ↓
7. Frontend fetches http://localhost:3000/api/sensors/latest
   ↓
8. Backend responde con JSON
   ↓
9. Frontend renderiza datos
   ↓
10. Cada 5 segundos: polling automático
```

## 🎯 Patrón MVC

**Model:**
- Estado de React
- Tipos TypeScript en src/api/client.ts

**View:**
- Componentes React con MUI
- Templates en .tsx

**Controller:**
- APIClient en src/api/client.ts
- useEffect en pages

## 🔐 Capas de Seguridad

1. **Frontend:**
   - TypeScript para type safety
   - Validación de entrada en formularios

2. **Backend:**
   - CORS habilitado solo para localhost
   - Variables de entorno para credenciales
   - Error handling en endpoints

3. **Network:**
   - HTTP solo localhost (desarrollo)
   - HTTPS recomendado para producción

## 📈 Escalabilidad

**Mejoras Futuras:**
- [ ] WebSocket para real-time updates
- [ ] Base de datos para histórico
- [ ] Caché (Redis)
- [ ] Microservicios
- [ ] API Gateway
- [ ] Autenticación JWT
- [ ] Rate limiting

## 📚 Referencias

- Material-UI: https://mui.com
- React: https://react.dev
- Express: https://expressjs.com
- Vite: https://vitejs.dev
- TypeScript: https://www.typescriptlang.org

---

**Última actualización:** 2024
**Versión:** 1.0.0
**Estado:** ✅ Funcional
