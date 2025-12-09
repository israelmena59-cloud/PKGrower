# 🌱 PKGrower

Sistema de monitoreo de plantas IoT con interfaz web moderna y control de dispositivos en tiempo real.

## ⚡ Inicio Rápido

```powershell
.\start.ps1
```

Esto iniciará automáticamente:
- ✅ Backend Express en `http://localhost:3000`
- ✅ Frontend React en `http://localhost:5173`

**Luego abre el navegador en:** `http://localhost:5173`

## 📋 Características Principales

### 🎨 Frontend (React 18 + Material-UI 5)
- **Dashboard Interactivo**: Visualización de sensores en tiempo real
- **Gráficos Históricos**: Análisis de datos con Recharts
- **Control de Dispositivos**: Encender/apagar en tiempo real
- **AI Assistant**: Chat interactivo para comandos
- **Tema Claro/Oscuro**: Soporte completo con CSS variables
- **Diseño Responsivo**: Funciona en desktop, tablet y móvil

### 🔌 Backend (Express.js)
- **API REST**: Endpoints para sensores, dispositivos y chat
- **Modo Simulación**: Funciona sin dispositivos reales
- **Escalable**: Listo para integración con Tuya y Xiaomi
- **CORS Habilitado**: Comunicación segura con frontend

## 🗂️ Estructura del Proyecto

```
PKGrower/
├── 📁 src/                    # Frontend (React + TypeScript)
│   ├── pages/                # Páginas principales (Dashboard, AIAssistant)
│   ├── components/           # Componentes reutilizables
│   ├── api/                  # Cliente API centralizado
│   └── lib/                  # Utilidades y helpers
│
├── 📁 backend/               # Backend (Express.js)
│   └── index.js             # Servidor principal
│
├── 📁 components/            # Componentes base Material-UI
│   └── ui/                  # Button, Card, Switch
│
├── 📄 package.json           # Dependencias frontend
├── 📄 backend/package.json   # Dependencias backend
├── 📄 .env.local             # Variables frontend
└── 📄 backend/.env           # Variables backend
```

## 🚀 Comandos Disponibles

### Desarrollo
```powershell
npm run dev:all        # Frontend + Backend simultáneamente ⭐
npm run dev            # Solo Frontend
npm run dev:backend    # Solo Backend
```

### Verificación
```powershell
npm run build          # Build para producción
npm run lint           # Análisis de código
.\health-check.ps1     # Verificar estado de servicios
```

### Instalación
```powershell
npm install            # Instalar dependencias frontend
cd backend; npm install  # Instalar dependencias backend
```

## 🔧 Configuración

### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:3000
```

### Backend (backend/.env)
```env
PORT=3000
MODO_SIMULACION=true

# Opcional - Credenciales Tuya
# TUYA_REGION=
# TUYA_CLIENT_ID=
# TUYA_SECRET=

# Opcional - Credenciales Xiaomi
# XIAOMI_USERNAME=
# XIAOMI_PASSWORD=
```

## 📖 Documentación

| Archivo | Descripción |
|---------|------------|
| `SETUP.md` | Guía detallada de instalación y troubleshooting |
| `INTEGRATION_GUIDE.md` | Detalles técnicos de la integración frontend-backend |
| `MIGRATION_PR_TEMPLATE.md` | Detalles de la migración de Tailwind a Material-UI |

## 🎯 Uso

### 1. **Dashboard**
   - Ver sensores en tiempo real
   - Visualizar gráficos históricos
   - Controlar dispositivos

### 2. **AI Assistant**
   - Chat interactivo
   - Comandos naturales
   - Respuestas contextuales

### 3. **Configuración**
   - Conectar dispositivos reales (Tuya/Xiaomi)
   - Personalizar temas
   - Ajustar intervalos de actualización

## ⚙️ Stack Tecnológico

**Frontend:**
- React 18.2.0
- TypeScript 5.2.2
- Material-UI 5.14.8
- Vite 5.4.21
- Recharts 2.10.3

**Backend:**
- Express 5.2.1
- Node.js
- CORS
- Dotenv

**Herramientas:**
- Concurrently (ejecución simultánea)
- ESLint (análisis de código)
- Prettier (formateo)

## 🐛 Troubleshooting

### Error: "Port already in use"
```powershell
# Cambia el puerto en el script
$env:VITE_PORT = 5175
npm run dev
```

### Error: "Cannot find module"
```powershell
# Reinstala dependencias
rm -r node_modules, backend/node_modules
npm install
cd backend; npm install; cd ..
```

### Backend no responde
```powershell
# Verifica que está en puerto 3000
# Y que MODO_SIMULACION=true en backend/.env
.\health-check.ps1
```

## 🌍 Próximos Pasos

1. ✅ **Implementado**: Frontend moderno con Material-UI
2. ✅ **Implementado**: Backend con Express
3. ✅ **Implementado**: Integración frontend-backend
4. 📋 **Pendiente**: Integración con dispositivos reales (Tuya/Xiaomi)
5. 📋 **Pendiente**: Deploy a producción

Para integrar dispositivos reales:
1. Obtener credenciales de Tuya Cloud o Xiaomi
2. Actualizar `backend/.env` con credenciales
3. Cambiar `MODO_SIMULACION=false`
4. Reiniciar backend

## 📝 Notas de Desarrollo

- **TypeScript**: Todo el código está tipado
- **Material-UI**: Sistema de diseño consistente
- **API Centralizada**: Un único cliente para todas las llamadas
- **Modo Simulación**: Desarrollo sin dispositivos reales

## 🤝 Contribución

Para contribuir:
1. Crear rama desde `develop`
2. Hacer cambios
3. Crear Pull Request
4. Esperar revisión

## 📄 Licencia

Proyecto privado - PKGrower 2024

---

**¿Problemas?** Consulta `SETUP.md` o `INTEGRATION_GUIDE.md`

**¿Listo para empezar?** Ejecuta: `.\start.ps1`
