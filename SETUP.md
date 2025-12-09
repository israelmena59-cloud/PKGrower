# 🌱 PKGrower - Guía de Configuración

## Inicio Rápido

### Opción 1: Script de Inicio (Recomendado para Windows)

```powershell
.\start.ps1
```

Este script automáticamente:
- ✅ Verifica que npm está instalado
- ✅ Instala dependencias del frontend (si es necesario)
- ✅ Instala dependencias del backend (si es necesario)
- ✅ Inicia ambos servidores (frontend + backend)

### Opción 2: Inicio Manual

#### Paso 1: Instalar dependencias del frontend
```powershell
npm install
```

#### Paso 2: Instalar dependencias del backend
```powershell
cd backend
npm install
cd ..
```

#### Paso 3: Iniciar ambos servidores
```powershell
npm run dev:all
```

## URLs de Acceso

- **Frontend (React + Material-UI):** http://localhost:5174
- **Backend API (Express):** http://localhost:3000

## Variables de Entorno

### Frontend (.env.local)
```
VITE_API_BASE_URL=http://localhost:3000
```

### Backend (backend/.env)
```
PORT=3000
MODO_SIMULACION=true
```

## Otras Opciones de Inicio

### Solo Frontend
```powershell
npm run dev
```

### Solo Backend
```powershell
npm run dev:backend
```

## Características Principales

### 🎨 Frontend (React 18 + Material-UI 5)
- Dashboard de sensores en tiempo real
- Control de dispositivos
- Chat AI Assistant
- Tema claro/oscuro
- Diseño responsivo

### 🔌 Backend (Express)
- API REST para sensores
- Control de dispositivos
- Endpoint de chat
- Modo simulación (sin credenciales)
- Soporte para Tuya y Xiaomi Mi Home

## Troubleshooting

### Error: "Port already in use"
Si el puerto 5174 o 3000 ya está en uso:

```powershell
# Frontend en puerto diferente
$env:VITE_PORT = 5175
npm run dev

# O backend en puerto diferente
$env:PORT = 3001
npm run dev:backend
```

### Error: "Cannot find module"
Reinstalar dependencias:
```powershell
rm -r node_modules, backend/node_modules
npm install
cd backend; npm install; cd ..
```

### El API retorna 502 Bad Gateway
Verificar que el backend está ejecutándose en `http://localhost:3000`

## Desarrollo

### Estructura del Proyecto
```
PKGrower/
├── src/                      # Código del frontend (React)
│   ├── pages/               # Páginas principales
│   ├── components/          # Componentes reutilizables
│   ├── api/                 # Cliente API
│   └── lib/                 # Utilidades
├── backend/                 # Código del backend (Node.js/Express)
│   └── index.js            # Servidor principal
├── components/              # Componentes de UI base (Material-UI)
├── .env.local              # Variables frontend
├── backend/.env            # Variables backend
└── package.json            # Dependencias
```

### Scripts Disponibles

```powershell
npm run dev              # Desarrollo frontend
npm run dev:backend      # Desarrollo backend
npm run dev:all          # Ambos servidores simultáneamente
npm run build            # Build para producción
npm run lint             # Verificar código
```

## Siguiente Paso

Para integrar con dispositivos reales (Tuya/Xiaomi):
1. Obtener credenciales API
2. Actualizar `backend/.env` con tus credenciales
3. Cambiar `MODO_SIMULACION=false`
4. Reiniciar backend

Ver `INTEGRATION_GUIDE.md` para detalles completos.
