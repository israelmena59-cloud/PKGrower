# 🚀 GUÍA DE INICIO RÁPIDO - PKGrower v3.0

## Prerequisitos
```
✓ Node.js v18+ instalado
✓ npm v9+ instalado
✓ Git (opcional)
✓ Terminal PowerShell
```

## 1️⃣ Instalación de Dependencias (5 min)

### Frontend
```powershell
# Instalar dependencias del proyecto principal
npm install

# Esperar a que termine (~2 min)
```

### Backend
```powershell
# Instalar dependencias del backend
cd backend
npm install

# Esperar a que termine (~2 min)
cd ..
```

## 2️⃣ Configuración de Variables de Entorno

### Backend (.env)
```
📁 backend/.env

Ya está configurado con:
✓ Xiaomi Credentials (Humidificador + Cámara)
✓ 11 Dispositivos Tuya (IDs + tokens)
✓ MODO_SIMULACION = false (usa datos reales)

Si deseas simular:
MODO_SIMULACION=true
```

## 3️⃣ Iniciar el Servidor

### Opción A: En una línea (Recomendado)
```powershell
npm run dev:all
```
Esto inicia automáticamente:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

### Opción B: En terminales separadas

**Terminal 1 - Backend**
```powershell
npm run dev:backend
```
Esperar: `Backend running on http://localhost:3000`

**Terminal 2 - Frontend**
```powershell
npm run dev
```
Esperar: Vite dev server listening...

## 4️⃣ Acceder a la Aplicación

### URL Principal
```
http://localhost:5173
```

### Secciones del Dashboard

#### 📊 Sensores Xiaomi (Ambiente)
- Temperatura
- Humedad ambiente
- Humedad sustrato
- VPD

#### 🌱 Sensores de Sustrato Tuya (Nuevo)
- Sensor 1, 2, 3
- Temperatura + Humedad por sensor

#### 💨 Control de Humedad (Nuevo)
- Humedad actual vs objetivo
- Slider (30-90%)
- Modo automático/manual
- Estado en tiempo real

#### 📹 Control de Cámara (Nuevo)
- Estado de conexión
- Iniciar/detener grabación
- Timer de grabación
- Capturar fotos

#### 📈 Historial
- Gráficos de temperatura
- Gráficos de humedad
- Gráficos de sustrato

#### ⚙️ Control de Dispositivos
- Luz roja
- Extractor
- Bomba de riego
- Humidificador

## 5️⃣ Verificar Conexiones

### Backend Diagnostics
```bash
curl http://localhost:3000/api/devices/diagnostics
```

Debería retornar:
```json
{
  "mode": "real",
  "xiaomiDevices": {
    "humidifier": { "connected": true },
    "camera": { "connected": true }
  },
  "tuyaDevices": {
    "connected": true
  }
}
```

### Sensores Tuya
```bash
curl http://localhost:3000/api/sensors/soil
```

Debería retornar datos de 3 sensores.

### Cámara
```bash
curl http://localhost:3000/api/device/camera/status
```

### Humidificador
```bash
curl http://localhost:3000/api/device/humidifier/status
```

## 🐛 Troubleshooting

### "No se pudo conectar con Tuya"
1. ✓ Verificar credenciales en `backend/.env`
2. ✓ Verificar conexión a Internet
3. ✓ Verificar que `MODO_SIMULACION=false`

### "Cámara no conectada"
1. ✓ Verificar que la cámara esté encendida
2. ✓ Verificar IP en `backend/.env`
3. ✓ Verificar token no ha expirado

### "Puerto 3000 ya en uso"
```powershell
# Cambiar puerto en backend/.env
PORT=3001
```

### "npm ERR! ERESOLVE unable to resolve dependency tree"
```powershell
npm install --legacy-peer-deps
```

## 📱 Funcionalidades Principales

### 🎥 Cámara
- ✅ Ver estado de conexión
- ✅ Iniciar/detener grabación
- ✅ Timer en vivo durante grabación
- ✅ Capturar fotos
- ✅ Alertas de éxito/error

### 💨 Humidificador + Extractor
- ✅ Ver humedad actual
- ✅ Ajustar humedad objetivo (30-90%)
- ✅ Modo automático (lógica inteligente)
- ✅ Ver estado visual de dispositivos
- ✅ Rango recomendado (55-75%)

### 🌱 Sensores de Sustrato
- ✅ Grid de 3 sensores
- ✅ Temperatura por sensor
- ✅ Humedad por sensor
- ✅ Auto-refresh (30s)
- ✅ Última actualización

### 🌍 Dispositivos Tuya
- ✅ Listar 11 dispositivos
- ✅ Ver estado de cada uno
- ✅ Control On/Off
- ✅ Información de categoría

## 📚 Documentación Relacionada

```
Lectura recomendada en orden:

1. README.md - Descripción general
2. SETUP.md - Instalación detallada
3. TUYA_INTEGRATION_COMPLETE.md - Esta integración
4. XIAOMI_GUIDE.md - Integración Xiaomi (si necesitas)
5. INDEX_COMPLETE.md - Índice completo del proyecto
```

## 🎯 Próximos Pasos (Opcional)

### A Corto Plazo
- [ ] Base de datos para históricos
- [ ] Scheduling automático
- [ ] Notificaciones por email

### A Mediano Plazo
- [ ] Aplicación móvil
- [ ] Integración Home Assistant
- [ ] Dashboard de analytics

## 💡 Tips

### Para Desarrollo
```powershell
# Modo con actualización automática de código
npm run dev

# Modo simulación (sin dispositivos reales)
# backend/.env → MODO_SIMULACION=true
```

### Para Producción
```powershell
# Build
npm run build

# Previewar build
npm run preview
```

### Limpiar Caché
```powershell
# Instalar de nuevo
rm -Recurse node_modules
npm install

cd backend
rm -Recurse node_modules
npm install
cd ..
```

## 🔗 Comandos Útiles

```bash
# Ver versión de Node
node --version

# Ver versión de npm
npm --version

# Ver puerto 3000 en uso
netstat -ano | findstr :3000

# Matar proceso en puerto 3000
taskkill /PID <PID> /F

# Ver estructura de carpetas
tree /F

# Compilar TypeScript
npm run build
```

## 📞 Contacto / Soporte

Si encontras problemas:
1. Revisar archivo `TUYA_INTEGRATION_COMPLETE.md`
2. Ejecutar `/api/devices/diagnostics`
3. Revisar consola del navegador (F12)
4. Revisar logs en terminal del backend

---

## ✅ Checklist Antes de Empezar

- [x] Node.js v18+ instalado
- [x] npm install completado (Frontend)
- [x] cd backend && npm install completado
- [x] backend/.env con credenciales
- [x] Puerto 3000 disponible
- [x] Puerto 5173 disponible

## 🎉 ¡Listo para empezar!

```powershell
npm run dev:all
```

Luego abre: **http://localhost:5173**

---

**Versión:** 3.0
**Última actualización:** Hoy
**Status:** ✅ Production Ready
