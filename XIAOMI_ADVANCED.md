# 💻 PKGrower + Xiaomi - Ejemplos de Código Avanzado

Para desarrolladores que quieren personalizar la integración.

## 🔧 Agregar un Dispositivo Personalizado

### Paso 1: Obtener Token

```bash
# Usar Token Extractor
https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor/releases

# Resultado:
# Device ID: 123456789
# Token: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
# Model: deerma.humidifier.jsq1
```

### Paso 2: Actualizar backend/.env

```env
# Mi nuevo dispositivo
XIAOMI_MI_DEVICE_ID=123456789
XIAOMI_MI_DEVICE_TOKEN=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
XIAOMI_MI_DEVICE_IP=192.168.1.100
```

### Paso 3: Agregar a DEVICE_MAP

**En backend/index.js:**

```javascript
const XIAOMI_DEVICES = {
  // ... dispositivos existentes ...

  // Tu nuevo dispositivo
  myDevice: {
    id: process.env.XIAOMI_MY_DEVICE_ID || '',
    token: process.env.XIAOMI_MY_DEVICE_TOKEN || '',
    ip: process.env.XIAOMI_MY_DEVICE_IP || '',
    model: 'deerma.humidifier.jsq1',
  },
};

const DEVICE_MAP = {
  // ... dispositivos existentes ...

  myDevice: {
    name: 'Mi Dispositivo Personalizado',
    platform: 'xiaomi',
    deviceType: 'humidifier',  // Cambiar según tipo
    config: XIAOMI_DEVICES.myDevice,
  },
};
```

## 📡 Usar el API Directamente

### JavaScript/Fetch

```javascript
// Obtener estado de sensores
async function getSensors() {
  const response = await fetch('http://localhost:3000/api/sensors/latest');
  const data = await response.json();
  console.log('Temperature:', data.temperature);
  console.log('Humidity:', data.humidity);
  return data;
}

// Obtener estado de dispositivos
async function getDevices() {
  const response = await fetch('http://localhost:3000/api/devices');
  const devices = await response.json();
  console.log('Humidifier:', devices.humidifier); // true/false
  return devices;
}

// Encender/apagar dispositivo
async function toggleDevice(deviceId) {
  const response = await fetch(
    `http://localhost:3000/api/device/${deviceId}/toggle`,
    { method: 'POST' }
  );
  const result = await response.json();
  console.log(`${deviceId} está ahora:`, result.newState);
  return result;
}

// Usar las funciones
getSensors().then(console.log);
getDevices().then(console.log);
toggleDevice('humidifier').then(console.log);
```

### PowerShell

```powershell
# Obtener sensores
$sensors = curl http://localhost:3000/api/sensors/latest | ConvertFrom-Json
Write-Host "Temperature: $($sensors.temperature)°C"
Write-Host "Humidity: $($sensors.humidity)%"

# Obtener dispositivos
$devices = curl http://localhost:3000/api/devices | ConvertFrom-Json
Write-Host "Humidifier: $($devices.humidifier)"

# Encender/apagar
$toggle = curl -X POST http://localhost:3000/api/device/humidifier/toggle | ConvertFrom-Json
Write-Host "New state: $($toggle.newState)"
```

### Python

```python
import requests
import json

# Configurar URL base
BASE_URL = "http://localhost:3000"

# Obtener sensores
def get_sensors():
    response = requests.get(f"{BASE_URL}/api/sensors/latest")
    return response.json()

# Obtener dispositivos
def get_devices():
    response = requests.get(f"{BASE_URL}/api/devices")
    return response.json()

# Encender/apagar dispositivo
def toggle_device(device_id):
    response = requests.post(f"{BASE_URL}/api/device/{device_id}/toggle")
    return response.json()

# Obtener diagnóstico
def get_diagnostics():
    response = requests.get(f"{BASE_URL}/api/devices/diagnostics")
    return response.json()

# Ejemplos de uso
if __name__ == "__main__":
    # Obtener sensores
    sensors = get_sensors()
    print(f"Temperature: {sensors['temperature']}°C")
    print(f"Humidity: {sensors['humidity']}%")

    # Obtener dispositivos
    devices = get_devices()
    print(f"Humidifier: {devices['humidifier']}")

    # Encender/apagar
    result = toggle_device('humidifier')
    print(f"Humidifier is now: {result['newState']}")

    # Diagnóstico
    diag = get_diagnostics()
    print(json.dumps(diag, indent=2))
```

## 🛠️ Extender la Clase APIClient

**En src/api/client.ts:**

```typescript
class APIClient {
  // ... métodos existentes ...

  // Agregar nuevo método personalizado
  async getDeviceInfo(deviceId: string): Promise<any> {
    return this.request(`/devices/${deviceId}/info`);
  }

  // Agregar control avanzado
  async setDeviceBrightness(deviceId: string, brightness: number): Promise<any> {
    return this.request(`/device/${deviceId}/brightness`, {
      method: 'POST',
      body: JSON.stringify({ brightness }),
    });
  }

  // Agregar control de color (para luces)
  async setDeviceColor(deviceId: string, color: string): Promise<any> {
    return this.request(`/device/${deviceId}/color`, {
      method: 'POST',
      body: JSON.stringify({ color }),
    });
  }
}

// Usar los nuevos métodos
const info = await apiClient.getDeviceInfo('lightbulb');
await apiClient.setDeviceBrightness('lightbulb', 80);
await apiClient.setDeviceColor('lightbulb', '#FF0000');
```

## ✨ Crear Automatizaciones

### Apagar todo automáticamente

```javascript
// En backend/index.js, agregar ruta:

app.post('/api/automation/shutdown-all', async (req, res) => {
  try {
    const devices = Object.keys(DEVICE_MAP).filter(
      d => DEVICE_MAP[d].platform === 'xiaomi'
    );

    const results = {};

    for (const deviceId of devices) {
      if (xiaomiClients[deviceId]) {
        try {
          await xiaomiClients[deviceId].setPower(false);
          results[deviceId] = 'off';
        } catch (e) {
          results[deviceId] = 'error: ' + e.message;
        }
      }
    }

    res.json({ message: 'Shutdown complete', results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

### Encender basado en condiciones

```javascript
// En backend/index.js, agregar ruta:

app.post('/api/automation/smart-control', async (req, res) => {
  const { humidity_threshold } = req.body;

  try {
    const sensors = sensorHistory[sensorHistory.length - 1];

    if (sensors && sensors.humidity > humidity_threshold) {
      // Si la humedad es mayor al umbral, encender humidificador
      if (xiaomiClients.humidifier) {
        await xiaomiClients.humidifier.setPower(false);
        return res.json({
          message: 'High humidity detected, turning off humidifier',
          current_humidity: sensors.humidity
        });
      }
    } else {
      // Si es baja, encender
      if (xiaomiClients.humidifier) {
        await xiaomiClients.humidifier.setPower(true);
        return res.json({
          message: 'Low humidity detected, turning on humidifier',
          current_humidity: sensors.humidity
        });
      }
    }

    res.json({ message: 'No action needed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

## 📊 Agregar Monitoreo de Consumo de Energía

```javascript
// En backend/index.js

// Historial de consumo
let powerConsumption = {};

app.get('/api/power-consumption/:deviceId', async (req, res) => {
  const deviceId = req.params.deviceId;

  if (!xiaomiClients[deviceId]) {
    return res.status(404).json({ error: 'Device not found' });
  }

  try {
    const device = xiaomiClients[deviceId];

    // Intentar obtener propiedades de consumo
    const properties = await device.getProperties(['power_consumption', 'power']);

    res.json({
      deviceId,
      timestamp: new Date().toISOString(),
      properties,
      consumption: powerConsumption[deviceId] || 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

## 🔔 Webhooks/Notificaciones

```javascript
// En backend/index.js

// Array de suscriptores
const subscribers = [];

// Agregar webhook
app.post('/api/webhooks/subscribe', (req, res) => {
  const { url } = req.body;
  subscribers.push(url);
  res.json({ message: 'Subscribed', url });
});

// Notificar cuando dispositivo cambia
async function notifySubscribers(event) {
  for (const url of subscribers) {
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(err => console.error('Webhook error:', err));
    } catch (e) {
      console.error('Notification failed:', e);
    }
  }
}

// Usar en toggle
app.post('/api/device/:id/toggle', async (req, res) => {
  // ... código existente ...

  // Notificar cambio
  await notifySubscribers({
    deviceId,
    event: 'toggled',
    newState,
    timestamp: new Date().toISOString(),
  });

  res.json({ id: deviceId, newState });
});
```

## 🎨 Custom Dashboard Components

```typescript
// src/components/XiaomiDeviceCard.tsx

import React from 'react';
import { Card, CardContent, Typography, Button, Switch } from '@mui/material';
import { apiClient } from '@/api/client';

interface DeviceCardProps {
  deviceId: string;
  deviceName: string;
  isOn: boolean;
  onStateChange: (newState: boolean) => void;
}

export const XiaomiDeviceCard: React.FC<DeviceCardProps> = ({
  deviceId,
  deviceName,
  isOn,
  onStateChange,
}) => {
  const handleToggle = async () => {
    try {
      const result = await apiClient.toggleDevice(deviceId);
      onStateChange(result.newState);
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  return (
    <Card sx={{ minWidth: 300 }}>
      <CardContent>
        <Typography variant="h6">{deviceName}</Typography>
        <Typography variant="body2" color="textSecondary">
          Estado: {isOn ? '🟢 Encendido' : '🔴 Apagado'}
        </Typography>

        <Switch
          checked={isOn}
          onChange={handleToggle}
          color="primary"
          sx={{ mt: 2 }}
        />

        <Button
          variant="outlined"
          color="primary"
          onClick={handleToggle}
          fullWidth
          sx={{ mt: 1 }}
        >
          {isOn ? 'Apagar' : 'Encender'}
        </Button>
      </CardContent>
    </Card>
  );
};
```

## 📈 Logging y Debugging

```javascript
// En backend/index.js

// Logging detallado
const DEBUG = process.env.DEBUG === 'true';

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
  };

  if (DEBUG) {
    console.log(JSON.stringify(logEntry, null, 2));
  }
}

// Uso:
log('INFO', 'Connecting to Xiaomi', { device: 'humidifier' });
log('ERROR', 'Failed to connect', { error: e.message });
log('DEBUG', 'Sensor reading', { temperature: 24.5, humidity: 65 });
```

## 🚀 Deploy a Producción

```bash
# 1. Build frontend
npm run build

# 2. Cambiar MODO_SIMULACION a false en .env

# 3. Usar PM2 para persistencia
npm install -g pm2
pm2 start backend/index.js --name "pkgrower-backend"
pm2 start npm -- run dev --name "pkgrower-frontend"

# 4. Guardar config
pm2 save

# 5. Hacer que inicie al rebootear
pm2 startup
```

## 🔗 Recursos

- **miio docs:** https://github.com/Apollon77/miio
- **Xiaomi specs:** https://miot-spec.org/
- **Token Extractor:** https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor

---

**¡Felicidades!** Ya sabes cómo personalizar PKGrower al máximo. 🌱
