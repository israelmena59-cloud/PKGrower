# 🗺️ Mapa de la Aplicación: PKGrower

Este documento ofrece una visión general de la estructura y arquitectura de `PKGrower`.

## 🏗️ Estructura General

La aplicación es un sistema **Full Stack** para la gestión de cultivos/IoT, dividida en dos partes principales:

| Parte | Tecnología | Directorio | Puerto (Dev) |
|-------|------------|------------|--------------|
| **Frontend** | React (Vite) + MUI | `/src` | `5173` |
| **Backend** | Node.js (Express) | `/backend` | `3000` |

---

## 💻 Frontend (`/src`)

Interfaz de usuario moderna construida con React y Material UI.

### 📂 Directorios Clave
- **`/pages`**: Vistas principales de la aplicación.
    - `Dashboard.tsx`: Panel de control principal con sensores y dispositivos.
    - `AIAssistant.tsx`: Chat con la IA para asistencia en el cultivo.
- **`/components`**: Bloques de construcción reutilizables.
    - `Layout.tsx`: Estructura base (Sidebar, Header).
    - `/dashboard`: Componentes específicos como `SensorCard`, `DeviceSwitch`, `HistoryChart`.
- **`/api`**: Comunicación con el backend.
    - `client.ts`: Cliente HTTP centralizado para llamadas a la API.
- **`/context`**: Gestión de estado global (React Context).

### 🛠️ Tecnologías
- **Core**: React 18, TypeScript, Vite.
- **UI**: Material UI (`@mui/material`), Lucide React (iconos).
- **Gráficos**: Recharts.
- **Estilos**: Tailwind CSS (configurado junto con MUI).

---

## ⚙️ Backend (`/backend`)

Servidor API REST que gestiona la lógica de negocio y la comunicación con dispositivos IoT.

### 📂 Estructura
- **`index.js`**: Punto de entrada del servidor Express.
- **`/routes`**: Definición de endpoints de la API.
    - `ai.js`: Endpoints para el asistente de IA (Gemini).
    - `automation.js`: Lógica de automatización.
    - `devices.js`: Control de dispositivos (Luces, Ventiladores).
    - `sensors.js`: Lectura de datos de sensores.
    - `calendar.js`: Gestión de calendarios/eventos.
    - `settings.js`: Configuración del sistema.
- **Integraciones IoT**: Scripts para conectar con nubes de terceros.
    - `tuya_*`: Scripts para integración con dispositivos Tuya.
    - `xiaomi_*` / `node-mihome`: Integración con dispositivos Xiaomi.
- **Lógica de Cultivo**:
    - `cropSteeringEngine.js`: Motor de decisiones para el "Crop Steering".

---

## 🔌 Integraciones y Servicios Externos

1.  **Firebase**:
    - Configurado en `.firebase`, `firebase.json` y `backend/firestore.js`.
    - Probablemente usado para Hosting (`deploy:frontend` script) y Base de Datos (Firestore).
2.  **Google Gemini AI**:
    - Integrado en `backend/routes/ai.js` para el asistente inteligente.
3.  **IoT Clouds**:
    - **Tuya IoT Platform**: Para enchufes y sensores genéricos.
    - **Xiaomi Mi Home**: Para sensores de temperatura/humedad específicos.

## 🌍 Entorno de Producción

*   **URL Pública**: [pk-grower.web.app](https://pk-grower.web.app)
*   **Project ID**: `pk-grower` (confirmado en `.firebaserc`)
*   **Hosting**: Sirve el directorio `dist` (SPA configurada).

## 🚀 Comandos Principales

- **Iniciar Todo (Dev)**: `npm run dev:all` (Inicia Frontend y Backend).
- **Frontend Solo**: `npm run dev`.
- **Backend Solo**: `npm run dev:backend`.
- **Desplegar**:
    - Frontend: `npm run deploy:frontend` (a Firebase).
    - Backend: `npm run deploy:backend` (a Google Cloud Run).

## 📄 Documentación

El proyecto cuenta con una documentación extensiva en la raíz:
- `ARCHITECTURE.md`: Visión técnica detallada.
- `QUICK_START_GUIDE.md`: Guía para empezar rápido.
- `TROUBLESHOOTING_FIXES.md`: Solución de problemas comunes.
