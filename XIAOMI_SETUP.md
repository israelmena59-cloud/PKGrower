# 🏠 Integración con Xiaomi Mi Home y SmartLife

Guía paso a paso para conectar PKGrower con dispositivos reales de Xiaomi Mi Home y SmartLife.

## 📋 Tabla de Contenidos

1. [Requisitos](#requisitos)
2. [Obtener Credenciales](#obtener-credenciales)
3. [Configuración](#configuración)
4. [Dispositivos Soportados](#dispositivos-soportados)
5. [Pruebas](#pruebas)
6. [Troubleshooting](#troubleshooting)

## ✅ Requisitos

### Hardware
- Mínimo 1 dispositivo Xiaomi Mi Home compatible
- Router WiFi
- Cable USB para inicialización (opcional)

### Software
- Node.js 14+
- npm o yarn
- PowerShell 5.1+ (Windows) o Terminal (Mac/Linux)

### Cuenta Xiaomi
- Cuenta activa en Mi Home o SmartLife
- Dispositivos ya añadidos y configurados en la app
- Acceso a contraseña (la usaremos para obtener token)

## 🔐 Obtener Credenciales

### Paso 1: Obtener Token del Dispositivo

#### Opción A: Usar `Xiaomi Cloud Tokens Extractor` (Recomendado)

1. Descarga: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor/releases

2. Ejecuta el programa (descargable para Windows/Mac/Linux)

3. Ingresa:
   - **Email/ID:** Tu email de Xiaomi
   - **Password:** Tu contraseña
   - **Country:** Tu región (US, EU, CN, IN, etc.)

4. El programa te mostrará:
   ```
   device_id: xxxxxxxxxxxxx
   token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   model: deerma.humidifier.jsq1
   ```

5. **Guarda estos datos** en un archivo seguro

#### Opción B: Obtener Token con Python (Alternativo)

```bash
pip install xiaomi-cloud-map-extractor
mi-cloud-extractor --email your@email.com --password your_password --country us
```

### Paso 2: Identificar tus Dispositivos

En Mi Home App:
1. Abre cada dispositivo
2. En Configuración → Información
3. Anota:
   - **Nombre:** (ej: "Humidificador Deerma")
   - **ID del Dispositivo:** (usualmente en detalles)
   - **Modelo:** (ej: "deerma.humidifier.jsq1")

### Paso 3: Encontrar IP Local del Dispositivo (Opcional pero recomendado)

```powershell
# En Windows PowerShell
arp -a | Select-String "WLAN0"

# En Mac/Linux
arp -a | grep wlan0
```

O en tu router, busca los dispositivos conectados por MAC address.

## ⚙️ Configuración

### Paso 1: Actualizar backend/.env

Abre `backend/.env` y reemplaza con tus valores:

```env
PORT=3000
MODO_SIMULACION=false

# --- XIAOMI MI HOME CREDENTIALS ---
XIAOMI_EMAIL=tu@email.com
XIAOMI_PASSWORD=tu_contraseña
XIAOMI_SERVER=us

# --- XIAOMI DEVICE TOKENS (Token extractor output) ---
# Formato: device_id:token
# Repetir para cada dispositivo
XIAOMI_DEVICE_1_ID=123456789
XIAOMI_DEVICE_1_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
XIAOMI_DEVICE_1_IP=192.168.1.100

XIAOMI_DEVICE_2_ID=987654321
XIAOMI_DEVICE_2_TOKEN=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
XIAOMI_DEVICE_2_IP=192.168.1.101

# --- TUYA DEVICES (Opcional, si también usas Tuya) ---
TUYA_ACCESS_KEY=
TUYA_SECRET_KEY=
TUYA_API_HOST=https://openapi.tuyaus.com
```

### Paso 2: Mapear Dispositivos

En `backend/index.js`, actualiza `DEVICE_MAP`:

```javascript
const DEVICE_MAP = {
  // Xiaomi Devices
  humidifier: {
    id: '123456789',           // Tu device_id
    token: 'xxxxx...xxxxx',    // Tu token
    ip: '192.168.1.100',       // Tu IP local (opcional)
    platform: 'xiaomi',
    deviceType: 'humidifier',
    model: 'deerma.humidifier.jsq1',
  },

  camera: {
    id: '987654321',
    token: 'yyyyy...yyyyy',
    ip: '192.168.1.101',
    platform: 'xiaomi',
    deviceType: 'camera',
    model: 'yczjg.camera.mjsxg13',
  },

  lightbulb: {
    id: '111222333',
    token: 'zzzzz...zzzzz',
    ip: '192.168.1.102',
    platform: 'xiaomi',
    deviceType: 'light',
    model: 'yeelight.light.color1',
  },

  // Puedes combinar con Tuya si lo necesitas
  // ...tuya devices
};
```

### Paso 3: Instalar Dependencias Xiaomi

```bash
cd backend
npm install node-mihome miio
npm install
```

## 🎯 Dispositivos Soportados

### Humidificadores (Deerma, Smartmi)
```javascript
{
  id: 'device_id',
  token: 'token_aqui',
  ip: '192.168.1.x',
  platform: 'xiaomi',
  deviceType: 'humidifier',
  model: 'deerma.humidifier.jsq1',
}
```

**Métodos disponibles:**
- `getPower()` - Obtener estado (true/false)
- `setPower(state)` - Encender/apagar
- `getHumidity()` - Obtener humedad ambiente
- `getTemperature()` - Obtener temperatura

### Bombas de Agua (Xiaomi Smart Pump)
```javascript
{
  id: 'device_id',
  token: 'token_aqui',
  ip: '192.168.1.x',
  platform: 'xiaomi',
  deviceType: 'pump',
  model: 'deerma.humidifier.1c',
}
```

**Métodos disponibles:**
- `getPower()` - Obtener estado
- `setPower(state)` - Encender/apagar
- `getProperty(['power', 'mode'])` - Obtener propiedades

### Luces Inteligentes (Yeelight)
```javascript
{
  id: 'device_id',
  token: 'token_aqui',
  ip: '192.168.1.x',
  platform: 'xiaomi',
  deviceType: 'light',
  model: 'yeelight.light.color1',
}
```

**Métodos disponibles:**
- `getPower()` - Obtener estado
- `setPower(state)` - Encender/apagar
- `setColor(rgb)` - Cambiar color
- `setBrightness(value)` - Ajustar brillo (0-100)
- `setColorTemperature(value)` - Ajustar temperatura de color (1700-6500K)

### Cámaras (Xiaomi Mijia)
```javascript
{
  id: 'device_id',
  token: 'token_aqui',
  ip: '192.168.1.x',
  platform: 'xiaomi',
  deviceType: 'camera',
  model: 'yczjg.camera.mjsxg13',
}
```

**Métodos disponibles:**
- `getPower()` - Obtener estado (grabando/no)
- `setPower(state)` - Iniciar/detener grabación
- `getProperties()` - Obtener estado general

### Enchufes Inteligentes (Mi Smart Plug)
```javascript
{
  id: 'device_id',
  token: 'token_aqui',
  ip: '192.168.1.x',
  platform: 'xiaomi',
  deviceType: 'plug',
  model: 'chuangmi.plug.m1',
}
```

**Métodos disponibles:**
- `getPower()` - Obtener estado
- `setPower(state)` - Encender/apagar
- `getPowerConsumption()` - Obtener consumo (watts)

## 🧪 Pruebas

### Paso 1: Verificar Conexión

```powershell
# Probar ping al dispositivo
ping 192.168.1.100

# Debe responder correctamente
```

### Paso 2: Iniciar Backend

```powershell
# Asegúrate que MODO_SIMULACION=false en backend/.env
npm run dev:backend
```

Debe ver algo como:
```
Conectando con Xiaomi Mi Home...
Dispositivos detectados: 3
  - Humidificador (ID: 123456789)
  - Cámara (ID: 987654321)
  - Bombilla (ID: 111222333)
Backend server running on http://localhost:3000
```

### Paso 3: Probar Endpoint de Sensores

```powershell
# En otra terminal
curl http://localhost:3000/api/sensors/latest

# Respuesta esperada:
# {
#   "temperature": 24.5,
#   "humidity": 65,
#   "timestamp": "2024-12-07T...",
#   "substrateHumidity": 78
# }
```

### Paso 4: Probar Dispositivos

```powershell
# Obtener estado de todos los dispositivos
curl http://localhost:3000/api/devices

# Respuesta esperada:
# {
#   "humidifier": true,
#   "camera": false,
#   "lightbulb": true
# }

# Toggle de dispositivo
curl -X POST http://localhost:3000/api/device/humidifier/toggle

# Respuesta esperada:
# {
#   "id": "humidifier",
#   "newState": false
# }
```

### Paso 5: Verificar en Frontend

1. Abre http://localhost:5173
2. Deberías ver:
   - Dashboard con sensores en tiempo real
   - Dispositivos con estado correcto
   - Los datos que se actualizan

## 🐛 Troubleshooting

### Error: "Cannot connect to Xiaomi"

**Causa:** Credenciales incorrectas o token expirado

**Solución:**
1. Regenerar token con Token Extractor
2. Verificar email/password en `backend/.env`
3. Verificar región (us, eu, cn, in)

```bash
# Limpiar y reinstalar
cd backend
rm -r node_modules
npm install
```

### Error: "Device not found"

**Causa:** ID del dispositivo incorrecto

**Solución:**
1. Verificar ID en Mi Home App
2. Asegurarse que el dispositivo está en la misma red WiFi
3. Intentar con IP local en lugar de ID

### Error: "Token expired"

**Causa:** El token de Xiaomi ha expirado

**Solución:**
1. Ejecutar nuevamente Token Extractor
2. Reemplazar el token en `backend/.env`
3. Reiniciar backend

### Dispositivo no responde después de conectar

**Causa:** Puede ser timeout o problema de red

**Solución:**
```bash
# 1. Verificar conexión WiFi del dispositivo en Mi Home App
# 2. Resetear el dispositivo físicamente
# 3. Ejecutar comando de diagnóstico:

curl -X GET http://localhost:3000/api/devices/diagnostics

# 4. Revisar logs en terminal de backend
```

### Puerto 5000 ya en uso (Xiaomi)

Algunos dispositivos Xiaomi usan puerto 5000 localmente.

**Solución:**
```bash
# Cambiar puerto en backend/.env
PORT=3001

# Luego actualizar frontend .env.local
VITE_API_BASE_URL=http://localhost:3001
```

## 🔧 Configuración Avanzada

### Usar IP Local en lugar de Cloud

Para mejor rendimiento, se recomienda usar IP local:

```javascript
const DEVICE_MAP = {
  humidifier: {
    id: '123456789',
    token: 'xxxxx',
    ip: '192.168.1.100',  // ← Usar IP local
    platform: 'xiaomi',
    useLocalIp: true,     // ← Forzar IP local
  },
};
```

### Polling Automático

Actualizar sensores cada X segundos:

```javascript
// En backend/index.js
const SENSOR_POLL_INTERVAL = 5000; // 5 segundos

setInterval(async () => {
  // Fetch from real devices
  // Update sensorHistory
}, SENSOR_POLL_INTERVAL);
```

### Caché de Datos

Para reducir llamadas a API:

```javascript
const CACHE_DURATION = 30000; // 30 segundos

let lastSensorData = null;
let lastSensorTime = 0;

app.get('/api/sensors/latest', async (req, res) => {
  const now = Date.now();

  // Retornar caché si es reciente
  if (lastSensorData && (now - lastSensorTime) < CACHE_DURATION) {
    return res.json(lastSensorData);
  }

  // Obtener datos frescos
  // ...
  lastSensorData = data;
  lastSensorTime = now;
  res.json(data);
});
```

## 📚 Recursos Adicionales

### Documentación Oficial
- **Mi Home:** https://home.mi.com
- **Xiaomi IoT:** https://iot.mi.com
- **SmartLife:** https://www.smartlifehome.com

### Librerías Utilizadas
- **node-mihome:** https://github.com/Apollon77/node-mihome
- **miio:** https://github.com/Apollon77/miio

### Modelos Soportados
Busca tu modelo aquí: https://miot-spec.org/miot-spec-v2/instance/

### GitHub Token Extractor
https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor

## ✨ Próximos Pasos

1. **Obtener tokens** de todos tus dispositivos
2. **Mapear dispositivos** en backend/index.js
3. **Actualizar backend/.env** con credenciales
4. **Cambiar MODO_SIMULACION=false**
5. **Reiniciar backend**: `npm run dev:backend`
6. **Probar en frontend**: http://localhost:5173
7. **Monitorear logs** en terminal

## 🎉 ¡Listo!

Una vez configurado, deberías ver:
- ✅ Sensores en tiempo real del humidificador
- ✅ Control remoto de dispositivos
- ✅ Historial de datos
- ✅ Chat con análisis

---

**¿Problemas?** Revisa la sección Troubleshooting arriba o consulta los logs del backend.

**Versión:** 1.0.0
**Última actualización:** 2024
**Status:** ✅ Fully Supported
