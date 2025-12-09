# 🚀 Inicio Rápido - Integración Xiaomi

Guía rápida (10 minutos) para conectar PKGrower con tu Xiaomi Mi Home.

## 📋 Checklist de 5 Pasos

### 1️⃣ Obtener Token del Dispositivo (5 min)

**Opción Rápida:**
1. Descarga: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor/releases
2. Ejecuta el programa
3. Ingresa: email, contraseña, país (us/eu/cn)
4. **Copia**: `device_id`, `token`, `ip` (si te lo muestra)

**Resultado esperado:**
```
Device Name: Deerma Humidifier
Device ID: 12345678
Token: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
IP: 192.168.1.100
Model: deerma.humidifier.jsq1
```

### 2️⃣ Actualizar backend/.env (2 min)

Abre `backend/.env` y pega tus valores:

```env
PORT=3000
MODO_SIMULACION=false

# Humidificador
XIAOMI_HUMIDIFIER_ID=12345678
XIAOMI_HUMIDIFIER_TOKEN=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
XIAOMI_HUMIDIFIER_IP=192.168.1.100
```

**Nota:** Solo rellena los que tengas. Puedes dejar vacíos los que no uses.

### 3️⃣ Reiniciar Backend (1 min)

```powershell
# En terminal, detener servidor actual (Ctrl+C) y luego:
npm run dev:backend
```

Deberías ver:
```
✓ CONECTADO - Humidificador (deerma.humidifier.jsq1)
✓ LISTO - Conectado con 1 dispositivo(s) Xiaomi
Backend server running on http://localhost:3000
```

### 4️⃣ Iniciar Frontend (2 min)

En otra terminal:
```powershell
npm run dev
```

Abre: http://localhost:5173

### 5️⃣ Probar Conexión (1 min)

En Dashboard deberías ver:
- ✅ Temperatura y humedad del humidificador
- ✅ Dispositivos con estado real
- ✅ Control on/off funcionando

## 🔍 Verificar Estado

```powershell
# Test 1: ¿Backend responde?
curl http://localhost:3000/api/devices

# Test 2: ¿Sensor tiene datos?
curl http://localhost:3000/api/sensors/latest

# Test 3: ¿Dispositivos conectados?
curl http://localhost:3000/api/devices/diagnostics
```

## ⚠️ Problemas Comunes

### "Cannot connect to device"
```
❌ Token incorrecto
❌ IP incorrecta (prueba sin IP primero)
❌ Dispositivo apagado
```

**Solución:** Regenerar token con Token Extractor

### "Token expired"
```
Obtén un nuevo token y actualiza backend/.env
```

### "Device not found"
```
Verificar ID en Mi Home App → Configuración → Información
```

## 📚 Modelos Soportados

**Humidificadores:**
- ✅ Deerma (JSQ1, 1C, etc.)
- ✅ Smartmi
- ✅ Otros con miio support

**Luces:**
- ✅ Yeelight (todos los modelos)
- ✅ Philips Hue (con adaptador)

**Enchufes:**
- ✅ Mi Smart Plug
- ✅ Xiaomi Smart Plug

**Bombas:**
- ✅ Smartmi Pump
- ✅ Otros con protocolo miio

## 🎯 Siguiente Paso

Después de verificar que funciona:
1. Añade más dispositivos (luz, bomba, etc.)
2. Lee `XIAOMI_SETUP.md` para configuración avanzada
3. Personaliza Dashboard con tus dispositivos

## ❓ Ayuda

- **Tokens:** https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor
- **Modelos:** https://miot-spec.org/miot-spec-v2/instance/
- **Docs:** Consulta `XIAOMI_SETUP.md` para más detalles

---

**¡Listo!** En 10 minutos deberías tener todo funcionando. 🌱
