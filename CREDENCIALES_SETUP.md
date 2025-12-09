# 🔐 Guía de Configuración de Credenciales

## Estado actual
- ✅ Sistema ejecutándose correctamente
- ❌ Dispositivos Xiaomi: No conectados (credenciales incompletas)
- ❌ Dispositivos Tuya: No conectados (necesita verificación)

---

## 1. Configuración de Xiaomi

### Paso 1: Obtener Tokens
1. Descargar: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor
2. Ejecutar el extractor
3. Ingresar tu email/usuario de Xiaomi Mi Home
4. Copiar los tokens generados

### Paso 2: Configurar en .env
Editar `backend/.env` con los valores reales:

```env
# Humidificador
XIAOMI_HUMIDIFIER_ID=820474096        # Tu ID real
XIAOMI_HUMIDIFIER_TOKEN=c2bafea7...   # Tu token real de 32 caracteres
XIAOMI_HUMIDIFIER_IP=192.168.1.13     # IP de tu dispositivo en la red local

# Cámara
XIAOMI_CAMERA_ID=1077173278           # Tu ID real
XIAOMI_CAMERA_TOKEN=46327369...       # Tu token real de 32 caracteres
XIAOMI_CAMERA_IP=192.168.1.5          # IP de tu dispositivo en la red local
```

### Verificar IPs
Para encontrar las IPs en tu red:
```powershell
# En PowerShell:
arp -a
# O acceder a tu router WiFi y ver dispositivos conectados
```

---

## 2. Configuración de Tuya

### Paso 1: Crear Cuenta en Tuya IoT
1. Ir a: https://iot.tuya.com/
2. Crear cuenta (si no la tienes)
3. Acceder al console

### Paso 2: Crear Proyecto
1. Cloud → Projects → Create Project
2. Nombre: "PKGrower"
3. Authorization Scope: **Smart Home** (importante!)
4. Data Center: **USA** (o tu región)

### Paso 3: Obtener Credenciales
1. Ir a Project Settings
2. Copiar:
   - **Access ID** → `TUYA_ACCESS_KEY`
   - **Access Secret** → `TUYA_SECRET_KEY`

3. Ir a API Services
4. Habilitar: `IoT Device Control`
5. Copiar el **API Endpoint**

### Paso 4: Vincular Dispositivos
1. Agregar Home → Agregar Dispositivos
2. Conectar tus 11 dispositivos Tuya a través de la app Tuya Smart
3. En IoT Platform → My Devices → copiar los **Device IDs**

### Paso 5: Actualizar .env

```env
# Tuya Cloud
TUYA_ACCESS_KEY=dtpfhgrhn4evkpr4fmkv     # Tu Access ID real
TUYA_SECRET_KEY=8f7a1dcbd60442ecbc31...  # Tu Access Secret real
TUYA_API_HOST=https://openapi.tuyaus.com # Según tu región:
                                           # USA: openapi.tuyaus.com
                                           # EU: openapi.tuyaeu.com
                                           # CN: openapi.tuyacn.com

# IDs de tus dispositivos reales
TUYA_SENSOR_SUSTRATO_1_ID=eb33e6b487314c81cdkc1g
TUYA_SENSOR_SUSTRATO_2_ID=eb60f46a8dc4f7af11hgp9
TUYA_SENSOR_SUSTRATO_3_ID=ebe398e4908b4437f0bjuv
# ... etc
```

---

## 3. Obtener Device IDs de Tuya

En la consola de Tuya IoT:
1. IoT Platform → My Devices
2. Click en cada dispositivo → Details → copiar el **Device ID**

**Mapeo de dispositivos:**
```
Panel LED 1        → TUYA_LUZ_PANEL_1_ID
Panel LED 2        → TUYA_LUZ_PANEL_2_ID
Sensor Sustrato 1  → TUYA_SENSOR_SUSTRATO_1_ID
Sensor Sustrato 2  → TUYA_SENSOR_SUSTRATO_2_ID
Sensor Sustrato 3  → TUYA_SENSOR_SUSTRATO_3_ID
Gateway Matter     → TUYA_GATEWAY_MATTER_ID
Gateway Bluetooth  → TUYA_GATEWAY_BLUETOOTH_ID
Puerta Matter      → TUYA_PUERTA_MATTER_ID
Puerta Bluetooth   → TUYA_PUERTA_BLUETOOTH_ID
Bomba Agua Ctrl    → TUYA_BOMBA_CONTROLLER_ID
Extractor Ctrl     → TUYA_EXTRACTOR_CONTROLLER_ID
Luz Roja Ctrl      → TUYA_LUZ_ROJA_CONTROLLER_ID
Llave Agua         → TUYA_LLAVE_AGUA_ID
```

---

## 4. Verificar Conexión

Después de configurar:

1. **Detener servidor actual:**
   ```powershell
   Ctrl+C en la terminal
   ```

2. **Reiniciar:**
   ```powershell
   npm run dev:all
   ```

3. **Verificar en la consola:**
   - ✅ `Ô£ô Modo: ­ƒö┤ MODO REAL`
   - ✅ `Dispositivos Xiaomi conectados: 4`
   - ✅ `Dispositivos Tuya registrados: 11`

---

## 5. Solución de Problemas

### "Dispositivos Xiaomi: Token o ID no configurado"
**Solución:** Asegúrate de que los tokens y IDs en `.env` no estén vacíos

### "Error al conectar con Tuya: Cannot read properties"
**Solución:**
- Verifica que `TUYA_ACCESS_KEY` y `TUYA_SECRET_KEY` sean correctos
- Asegúrate de haber habilitado `IoT Device Control` en Tuya

### "Timeout conectando a Tuya Cloud"
**Solución:**
- Verifica tu conexión a Internet
- Cambia de datacenter en Tuya (USA/EU/CN)
- Aumenta el timeout en `backend/index.js` línea 210

### Dispositivos no responden en la app
**Solución:**
- Verifica que los Device IDs sean correctos
- Asegúrate que los dispositivos estén conectados a WiFi
- Reinicia los dispositivos

---

## 6. Modo Simulación vs. Real

En `backend/.env`:

```env
# Para desarrollo sin dispositivos:
MODO_SIMULACION=true

# Para conectar con dispositivos reales:
MODO_SIMULACION=false
```

**MODO_SIMULACION=false** requiere:
- ✅ Credenciales válidas de Tuya
- ✅ Tokens válidos de Xiaomi
- ✅ Conexión a Internet
- ✅ Dispositivos conectados a red local

---

## 7. Próximos Pasos

Una vez conectados los dispositivos:

1. ✅ Ir a `http://localhost:5175` (o el puerto que use Vite)
2. ✅ Ir a **Dispositivos** → deberías ver todos los dispositivos
3. ✅ Ir a **Configuración** → Pestaña "Tuya Cloud" para verificar conexión
4. ✅ Controlar dispositivos desde el Dashboard

---

**¿Necesitas ayuda?**
- Revisa los logs en la terminal del backend
- Verifica que las credenciales sean exactas (sin espacios)
- Prueba con un dispositivo a la vez
