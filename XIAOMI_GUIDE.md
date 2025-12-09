# 🏠 Integración Xiaomi Mi Home - Guía Completa

## ✨ ¿Qué es lo Nuevo?

PKGrower ahora puede conectarse directamente con tus dispositivos Xiaomi Mi Home y SmartLife. Sin necesidad de servidores en la nube, todo funciona localmente.

### Dispositivos Soportados
- ✅ **Humidificadores** (Deerma, Smartmi, etc.)
- ✅ **Luces LED** (Yeelight, etc.)
- ✅ **Bombas de Agua** (Smartmi Pump, etc.)
- ✅ **Cámaras** (Xiaomi Mijia)
- ✅ **Enchufes Inteligentes** (Mi Smart Plug)
- ✅ **Cualquier dispositivo con protocolo miio**

## 🚀 Instalación en 3 Pasos

### Paso 1: Obtener Tokens (5 minutos)

**Descargar Token Extractor:**

1. Ve a: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor/releases
2. Descarga `Xiaomi-Cloud-Tokens-Extractor.exe` (Windows)
3. Ejecuta el programa
4. Ingresa:
   - Email de tu cuenta Xiaomi
   - Contraseña
   - País: `us` (USA), `eu` (Europa), `cn` (China), `in` (India)

5. El programa te mostrará algo como:
```
Device: Deerma Humidifier
   ID: 12345678
   Token: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
   IP: 192.168.1.100
   Model: deerma.humidifier.jsq1
```

**Repite para cada dispositivo que quieras conectar.**

### Paso 2: Configurar backend/.env (2 minutos)

Abre el archivo `backend/.env` en VS Code:

```powershell
code backend\.env
```

Reemplaza los valores vacíos con los que obtuviste:

```env
PORT=3000
MODO_SIMULACION=false

# Tu humidificador
XIAOMI_HUMIDIFIER_ID=12345678
XIAOMI_HUMIDIFIER_TOKEN=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
XIAOMI_HUMIDIFIER_IP=192.168.1.100

# Tu bombilla (si tienes)
XIAOMI_LIGHT_ID=87654321
XIAOMI_LIGHT_TOKEN=xyxyxyxyxyxyxyxyxyxyxyxyxyxyxyxy
XIAOMI_LIGHT_IP=192.168.1.101

# Tu bomba (si tienes)
XIAOMI_PUMP_ID=...
XIAOMI_PUMP_TOKEN=...
XIAOMI_PUMP_IP=...
```

**Nota:** Solo rellena los que tengas. Puedes dejar vacíos los que no uses.

Guarda con `Ctrl+S`.

### Paso 3: Reiniciar y Probar (2 minutos)

**Terminal 1 - Backend:**
```powershell
npm run dev:backend
```

Deberías ver:
```
✓ CONECTADO - Humidificador (deerma.humidifier.jsq1)
✓ CONECTADO - Bombilla (yeelight.light.color1)
✓ LISTO - Conectado con 2 dispositivo(s) Xiaomi
Backend server running on http://localhost:3000
```

**Terminal 2 - Frontend:**
```powershell
npm run dev
```

**Abre:** http://localhost:5173

✅ **¡Listo!** Deberías ver:
- Sensores con datos reales del humidificador
- Dispositivos con estado correcto
- Control en tiempo real

## 🎮 Cómo Usar

### Dashboard
- **Sensores:** Temperatura y humedad en tiempo real
- **Dispositivos:** Toggle para encender/apagar
- **Gráficos:** Historial de datos

### Control Remoto
Haz click en cualquier dispositivo para encender/apagar. El cambio ocurre **instantáneamente** en tu device real.

### Chat AI
Usa el asistente de IA para análisis y recomendaciones.

## 🔍 Verificación

### Test 1: ¿Backend conectado?
```powershell
curl http://localhost:3000/api/devices/diagnostics
```

Respuesta esperada:
```json
{
  "mode": "real",
  "xiaomiDevices": {
    "humidifier": {
      "name": "Humidificador",
      "model": "deerma.humidifier.jsq1",
      "connected": true,
      "ipAddress": "192.168.1.100"
    }
  }
}
```

### Test 2: ¿Sensores funcionan?
```powershell
curl http://localhost:3000/api/sensors/latest
```

Respuesta esperada:
```json
{
  "timestamp": "2024-12-07T15:30:45.123Z",
  "temperature": 24.5,
  "humidity": 65,
  "substrateHumidity": 65,
  "vpd": 0.8
}
```

### Test 3: ¿Dispositivos responden?
```powershell
curl http://localhost:3000/api/devices
```

Respuesta esperada:
```json
{
  "humidifier": true,
  "lightbulb": false,
  "pump": true
}
```

## 🐛 Troubleshooting

### ❌ "Cannot connect to device"

**Causa probable:**
- Token incorrecto o expirado
- Dispositivo apagado
- Dispositivo no en la red WiFi

**Solución:**
1. Regenerar token con Token Extractor
2. Verificar que el dispositivo esté encendido
3. Verificar que está en la misma red WiFi
4. Intentar con IP vacía (descubrimiento automático)

### ❌ "Device not found"

**Causa probable:**
- ID del dispositivo incorrecto
- Dispositivo desconectado

**Solución:**
1. Verificar ID en Mi Home App
2. Buscar en "Mis Dispositivos"
3. Hacer reset del dispositivo

### ❌ "Token expired"

**Causa probable:**
- Cambio de contraseña
- Expiración normal

**Solución:**
1. Ejecutar nuevamente Token Extractor
2. Copiar nuevo token a backend/.env
3. Reiniciar backend

### ❌ "Connection timeout"

**Causa probable:**
- IP incorrecta
- Firewall bloqueando
- Red WiFi inestable

**Solución:**
```bash
# 1. Dejar IP vacía para usar descubrimiento automático
XIAOMI_HUMIDIFIER_IP=

# 2. O especificar IP manualmente
XIAOMI_HUMIDIFIER_IP=192.168.1.100

# 3. Reiniciar backend
npm run dev:backend
```

## 📚 Dispositivos Comunes

### Deerma Humidifier (JSQ1)
```env
XIAOMI_HUMIDIFIER_ID=12345678
XIAOMI_HUMIDIFIER_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
XIAOMI_HUMIDIFIER_IP=192.168.1.100
# Obtiene: temperature, humidity
# Control: power on/off
```

### Yeelight LED Bulb (Color1)
```env
XIAOMI_LIGHT_ID=87654321
XIAOMI_LIGHT_TOKEN=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
XIAOMI_LIGHT_IP=192.168.1.101
# Control: power on/off, brightness, color
```

### Xiaomi Mi Smart Plug
```env
XIAOMI_PUMP_ID=11111111
XIAOMI_PUMP_TOKEN=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
XIAOMI_PUMP_IP=192.168.1.102
# Control: power on/off
# Obtiene: power consumption
```

### Xiaomi Mijia Camera
```env
XIAOMI_CAMERA_ID=22222222
XIAOMI_CAMERA_TOKEN=wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
XIAOMI_CAMERA_IP=192.168.1.103
# Control: recording on/off
```

## 🔧 Configuración Avanzada

### Usar Descubrimiento Automático

Si no conoces la IP:

```env
# Dejar IP vacía para que miio la descubra automáticamente
XIAOMI_HUMIDIFIER_IP=
```

Miio intentará encontrar el dispositivo automáticamente.

### Polling de Sensores

Los sensores se actualizan automáticamente cada 5 segundos. Para cambiar:

**En backend/index.js:**
```javascript
const SENSOR_POLL_INTERVAL = 3000; // 3 segundos
```

### Caché de Datos

Para reducir carga en dispositivos:

```javascript
const CACHE_DURATION = 30000; // 30 segundos
```

## ✅ Checklist Final

Antes de considerar completado:

- [ ] Token Extractor descargado y ejecutado
- [ ] Tokens copiados a backend/.env
- [ ] MODO_SIMULACION = false
- [ ] Backend iniciado sin errores
- [ ] Frontend cargado sin errores
- [ ] Sensores muestran datos reales
- [ ] Control de dispositivos funciona
- [ ] Verificación de diagnóstico OK

## 🎉 ¡Completado!

Ahora tienes:
- ✅ Control remoto en tiempo real
- ✅ Monitoreo de sensores
- ✅ Historial de datos
- ✅ IA para análisis
- ✅ Interfaz intuitiva

## 📞 Ayuda

**¿Dónde obtener más información?**
- Tokens: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor
- Modelos: https://miot-spec.org/miot-spec-v2/instance/
- Documentación: `XIAOMI_SETUP.md`

**¿Problemas?**
- Revisa los logs en la terminal
- Consulta la sección Troubleshooting
- Verifica que el dispositivo está en la misma red

---

**¡Disfruta PKGrower con tus dispositivos Xiaomi!** 🌱
