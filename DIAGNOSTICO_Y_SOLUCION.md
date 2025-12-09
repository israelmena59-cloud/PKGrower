# 📋 Diagnóstico y Solución - Conexión de Dispositivos

## Estado Actual ✅✅✅

**Backend**: ✅ Funcionando correctamente en http://localhost:3000
**Frontend**: ✅ Disponible en http://localhost:5175
**API**: ✅ 25+ endpoints disponibles
**Código**: ✅ Sin errores

## Problemas Detectados

### 1. 🔴 Xiaomi - "handshake timeout"

**Síntoma**:
```
[ERROR] Al conectar Humidificador Xiaomi: Could not connect to device, handshake timeout
```

**Causa**: La IP en el archivo `.env` es incorrecta o el dispositivo está apagado

**Solución - QUE DEBES HACER TÚ:**

#### Paso 1: Encontrar la IP correcta de tus dispositivos Xiaomi

Abre PowerShell como administrador y ejecuta:
```powershell
# Ver todos los dispositivos en la red
arp -a

# O más detallado, si tienes el rango de red (ej: 192.168.1.x):
for ($i=1; $i -le 254; $i++) {
  Test-NetConnection -ComputerName "192.168.1.$i" -Port 54321 -ErrorAction SilentlyContinue |
  Where-Object TcpTestSucceeded | Select-Object -Property ComputerName
}
```

**Busca una IP que responda en puerto 54321** - ese es tu dispositivo Xiaomi.

Normalmente es algo como: `192.168.1.10`, `192.168.1.15`, etc.

#### Paso 2: Obtener el token válido

1. Descarga el extractor oficial de Xiaomi:
   - Ve a: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor/releases
   - Descarga la versión para Windows (`.exe`)

2. Ejecuta el programa y:
   - Inicia sesión con tu cuenta de Xiaomi (la misma que configuraste los dispositivos)
   - Selecciona tu región (ej: USA, Europe, etc.)
   - Copia los tokens y IDs correctos para cada dispositivo

#### Paso 3: Actualizar `.env`

Edita `backend/.env` con los valores correctos:

```env
# Tu IP real encontrada en el paso 1
XIAOMI_HUMIDIFIER_IP=192.168.1.10      # CAMBIAR ESTO
XIAOMI_HUMIDIFIER_TOKEN=c2bafea7...    # Verificar que sea válido

XIAOMI_CAMERA_IP=192.168.1.11          # CAMBIAR ESTO
XIAOMI_CAMERA_TOKEN=463273696...       # Verificar que sea válido
```

#### Paso 4: Verificar conectividad

Desde PowerShell, verifica que puedes alcanzar el dispositivo:

```powershell
# Reemplaza 192.168.1.10 con tu IP real
Test-NetConnection -ComputerName 192.168.1.10 -Port 54321

# Resultado esperado:
# TcpTestSucceeded : True
```

---

### 2. 🟡 Tuya - "No se pudieron obtener dispositivos de Tuya Cloud"

**Síntoma**:
```
[WARN] No se pudieron obtener dispositivos de Tuya Cloud
[HINT] Verifica que TUYA_ACCESS_KEY y TUYA_SECRET_KEY son correctos
[✓ LISTO] 0 dispositivo(s) Tuya registrado(s)
```

**Causa**: Las credenciales de Tuya son inválidas, expiradas o pertenecen a otra región

**Solución - QUE DEBES HACER TÚ:**

#### Opción A: Si tus credenciales están vencidas

1. Ve a la Plataforma IoT de Tuya:
   - URL: https://iot.tuya.com (elige tu región)
   - Inicia sesión con tu cuenta

2. En el panel izquierdo, ve a: **Cloud → All Projects**

3. Selecciona tu proyecto (ej: "PKGrower")

4. Ve a **Service Management → API Groups**

5. Haz clic en tu grupo de API

6. Copia los valores nuevos:
   - **Access ID** → va en `TUYA_ACCESS_KEY`
   - **Access Secret** → va en `TUYA_SECRET_KEY`

7. Verifica que el API Host sea el correcto para tu región:
   - USA: `https://openapi.tuyaus.com` ✅ (el que tienes)
   - Europe: `https://openapi.tuyaeu.com`
   - China: `https://openapi.tuyacn.com`
   - India: `https://openapi.tuyain.com`

#### Opción B: Si no tienes proyecto Tuya

1. Crea una cuenta en: https://iot.tuya.com
2. Crea un nuevo proyecto
3. Agrégale tus dispositivos Tuya Smart
4. Obtén las credenciales (ver Opción A, pasos 2-6)

---

## 🛠️ Guía Rápida de Verificación

Ejecuta estos comandos desde PowerShell en `C:\Users\Israel\Desktop\PKGrower`:

### 1. Ver qué credenciales están cargadas

```powershell
cd c:\Users\Israel\Desktop\PKGrower\backend
node -e "
require('dotenv').config({ path: '.env' });
console.log('XIAOMI_HUMIDIFIER_IP:', process.env.XIAOMI_HUMIDIFIER_IP);
console.log('XIAOMI_CAMERA_IP:', process.env.XIAOMI_CAMERA_IP);
console.log('TUYA_API_HOST:', process.env.TUYA_API_HOST);
console.log('TUYA_ACCESS_KEY existe:', !!process.env.TUYA_ACCESS_KEY);
console.log('TUYA_SECRET_KEY existe:', !!process.env.TUYA_SECRET_KEY);
"
```

### 2. Probar conectividad a Xiaomi

```powershell
# Reemplaza 192.168.1.10 con tu IP
Test-NetConnection -ComputerName 192.168.1.10 -Port 54321 -ErrorAction Continue
```

### 3. Probar API de Tuya

```powershell
# Prueba que la API está disponible
Invoke-WebRequest -Uri "https://openapi.tuyaus.com/v1.0/users/devices" -Method GET
```

---

## 📝 Checklist de Solución

- [ ] Encontré la IP correcta de mi Humidificador Xiaomi
- [ ] Encontré la IP correcta de mi Cámara Xiaomi
- [ ] Obtuve tokens válidos del Xiaomi Cloud Tokens Extractor
- [ ] Actualicé `backend/.env` con IPs y tokens correctos
- [ ] Probé conectividad con `Test-NetConnection` - resultado: `True`
- [ ] Obtuve credenciales válidas de Tuya IoT Platform
- [ ] Verifiqué que el API Host es correcto para mi región
- [ ] Reinicié el backend: `npm run dev:backend`
- [ ] ✅ Ahora veo `[✓ CONECTADO]` en los logs

---

## 🚀 Después de Actualizar Credenciales

Una vez que hayas actualizado `.env`:

1. **Detén el backend** (Ctrl+C en la terminal)
2. **Reinicia**:
   ```powershell
   cd c:\Users\Israel\Desktop\PKGrower
   npm run dev:all
   ```
3. **Observa los logs**:
   - Deberías ver: `[✓ CONECTADO]` para cada dispositivo
   - En lugar de: `[ERROR] Could not connect`

---

## 📞 Si Aún Sigue Sin Funcionar

Ejecuta este comando para obtener información de diagnóstico:

```powershell
curl http://localhost:3000/api/devices/diagnostics
```

Esto te dará:
- Qué dispositivos se han intentado conectar
- Qué errores específicos tuvo cada uno
- Estado actual de cada dispositivo

---

## 💡 Modo Simulación (Alternativa)

Si no puedes conseguir las credenciales correctas, puedes usar **modo simulación** para probar la app:

Edita `backend/.env`:
```env
MODO_SIMULACION=true
```

Esto:
- ✅ Genera datos falsos pero realistas
- ✅ Permite probar toda la interfaz
- ❌ No controla dispositivos reales

Luego reinicia con `npm run dev:all`

---

## 📊 Estado Después de la Reparación Esperado

```
[DEBUG] Variables de entorno cargadas:
  MODO_SIMULACION: false
  XIAOMI_HUMIDIFIER_ID: CONFIGURADO
  XIAOMI_CAMERA_ID: CONFIGURADO
  TUYA_ACCESS_KEY: CONFIGURADO
  TUYA_SECRET_KEY: CONFIGURADO

[INFO] TuyaOpenApiClient inicializado correctamente
✓ Backend running on http://localhost:3000
✓ Modo: 🔴 MODO REAL

[INFO] Intentando conectar con dispositivos Xiaomi...
[CONECTANDO] Humidificador Xiaomi (deerma.humidifier.jsq1)...
[✓ CONECTADO] Humidificador Xiaomi - Modelo: deerma.humidifier.jsq1, FW: 1.8.6_153
[✓ CONECTADO] Cámara Xiaomi - Modelo: yczjg.camera.mjsxg13, FW: 8.1.2_165

[INFO] Intentando conectar con dispositivos Tuya...
[✓] Obtenidos 11 dispositivos de Tuya Cloud
[✓ REGISTRADO] Sensor Sustrato 1
[✓ REGISTRADO] Sensor Sustrato 2
[✓ REGISTRADO] Panel LED 1
... (más dispositivos)

✓ Dispositivos Xiaomi conectados: 2
✓ Dispositivos Tuya registrados: 11
```

---

## 🎯 Resumen

| Problema | Solución |
|----------|----------|
| Xiaomi timeout | Verificar IP y token en extractor oficial |
| Tuya no obtiene dispositivos | Verificar credenciales en IoT Platform |
| Sin internet | Verificar conexión de red |
| Token expirado | Regenerar en Tuya IoT Platform |

**Después de actualizar credenciales, reinicia el backend y deberías ver "✓ CONECTADO"**
