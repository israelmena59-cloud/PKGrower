# 🔧 DIAGNÓSTICO DE CONEXIÓN DE DISPOSITIVOS

## Estado Actual

### ✅ Backend
- ✓ Variables de entorno cargadas correctamente
- ✓ `MODO_SIMULACION=false` (Intenta conectar con dispositivos reales)
- ✓ No se cuelga
- ✓ Todos los endpoints disponibles

### ⚠️ Credenciales Cargadas
- ✓ `XIAOMI_HUMIDIFIER_ID`: CONFIGURADO
- ✓ `XIAOMI_HUMIDIFIER_TOKEN`: CONFIGURADO
- ✓ `XIAOMI_CAMERA_ID`: CONFIGURADO
- ✓ `XIAOMI_CAMERA_TOKEN`: CONFIGURADO
- ✓ `TUYA_ACCESS_KEY`: CONFIGURADO
- ✓ `TUYA_SECRET_KEY`: CONFIGURADO

### ❌ Problemas Detectados

#### 1. **Xiaomi - Handshake Timeout**
```
[ERROR] Al conectar Humidificador Xiaomi: Could not connect to device, handshake timeout
[ERROR] Al conectar Cámara Xiaomi: Could not connect to device, handshake timeout
```

**Posibles causas:**
- ❌ Token incorrecto o expirado
- ❌ IP del dispositivo incorrecta (no está en 192.168.1.13 o 192.168.1.5)
- ❌ El dispositivo no está encendido
- ❌ El dispositivo no está en la misma red WiFi
- ❌ Firewall bloqueando la conexión

**Soluciones:**
1. Verifica la IP real del dispositivo:
   ```powershell
   # En PowerShell:
   arp -a
   # Busca "deerma" o la dirección del dispositivo
   ```

2. Obtén un token fresco:
   - Descarga: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor
   - Ejecuta y copia el nuevo token (32 caracteres hex)
   - Actualiza en `backend/.env`

3. Verifica que el dispositivo responde:
   ```powershell
   Test-NetConnection -ComputerName 192.168.1.13 -Port 54321
   ```

#### 2. **Tuya - API No Disponible**
```
[WARN] TuyaContext no tiene método api.request disponible
[WARN] TuyaContext no disponible. Dispositivos Tuya no se conectarán.
```

**Posibles causas:**
- ❌ Librería `@tuya/tuya-connector-nodejs` requiere inicialización especial
- ❌ Las credenciales no son válidas para la librería

**Soluciones:**
1. Verifica las credenciales en https://iot.tuya.com/:
   - Access ID (TUYA_ACCESS_KEY)
   - Access Secret (TUYA_SECRET_KEY)

2. Verifica que tengas habilitado "IoT Device Control" en API Services

3. Verifica la región correcta:
   - USA: `https://openapi.tuyaus.com`
   - EU: `https://openapi.tuyaeu.com`
   - CN: `https://openapi.tuyacn.com`

---

## 🚀 Solución Inmediata

Para que el sistema funcione mientras verificas los dispositivos:

### Opción 1: Activar Modo Simulación (Recomendado para testing)
```env
# En backend/.env:
MODO_SIMULACION=true
```

Esto genera datos ficticios pero funcionales para probar la UI.

### Opción 2: Mantener Real pero sin Conexión (Recomendado)
El sistema ya está en **modo degradado**:
- ✓ Backend funciona
- ✓ Frontend funciona
- ✓ Endpoints disponibles
- ⚠️ Sin datos reales de dispositivos

---

## 🔍 Próximos Pasos

1. **Verifica las IPs de tus dispositivos Xiaomi:**
   ```powershell
   # Lista todos los dispositivos en tu red
   Get-NetNeighbor | Where-Object State -eq "Reachable" | Select-Object IPAddress, LinkLayerAddress
   ```

2. **Obtén tokens frescos:**
   - Usa el extractor oficial de Xiaomi
   - Reemplaza en `backend/.env`

3. **Verifica Tuya:**
   - Asegúrate de que los Device IDs sean correctos
   - Comprueba que la API esté habilitada en IoT Platform

4. **Reinicia el backend:**
   ```powershell
   npm run dev:backend
   ```

5. **Accede a la app:**
   ```
   http://localhost:5175
   ```

---

## 📊 Estado del Sistema (Actualmente)

```
✅ Backend Funcionando: http://localhost:3000
✅ Frontend Funcionando: http://localhost:5175
✅ Endpoints Disponibles: 25+
❌ Dispositivos Xiaomi: Sin conexión (timeout)
❌ Dispositivos Tuya: Sin conexión (API no disponible)
⚠️  Modo: Degradado (sin datos reales)
```

**El sistema está completamente funcional. Solo falta conectar los dispositivos reales.**

---

**Para más ayuda, consulta:**
- `CREDENCIALES_SETUP.md` - Guía de configuración
- `PASOS_FINALES.md` - Instrucciones completas
