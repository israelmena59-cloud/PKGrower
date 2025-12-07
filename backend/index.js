// backend/index.js
const express = require('express');
const cors = require('cors');
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const mihome = require('node-mihome'); // Importar node-mihome

// --- CONFIGURACIÓN DE LA INTEGRACIÓN ---
// MODO_SIMULACION:
// - true: Usa datos simulados. La app funcionará sin necesidad de credenciales.
// - false: Intenta conectar con la API de Tuya y Xiaomi. Necesitarás rellenar las credenciales.
const MODO_SIMULACION = false; // Mantengo en false porque el usuario lo había puesto.

// --- CREDENCIALES TUYA (SOLO PARA MODO_SIMULACION = false) ---
const TUYA_CONFIG = {
  accessKey: 'dtpfhgrhn4evkpr4fmkv', 
  secretKey: '8f7a1dcbd60442ecbc314c842be7238b',
  apiHost: 'https://openapi.tuyaus.com',
};

// --- CREDENCIALES XIAOMI (SOLO PARA MODO_SIMULACION = false) ---
// Rellena estas variables con la información de tu cuenta de Xiaomi Home.
// Más abajo encontrarás la guía para obtenerlas.
const XIAOMI_CONFIG = {
  // Tu email o ID de cuenta de Xiaomi.
  username: '6696007586',
  // Tu contraseña de Xiaomi.
  password: '@Cloruro18',
  // El servidor de tu cuenta (ej: 'us', 'eu', 'cn').
  server: 'us', 
};

// --- MAPEO DE DISPOSITIVOS ---
const DEVICE_MAP = {
  // Tuya Devices
  sensorSustrato1: { id: 'eb33e6b487314c81cdkc1g', platform: 'tuya' }, 
  sensorSustrato2: { id: 'eb60f46a8dc4f7af11hgp9', platform: 'tuya' },
  sensorSustrato3: { id: 'ebe398e4908b4437f0bjuv', platform: 'tuya' },
  luzRoja: { id: 'ebc50c11rda7ug9j', code: 'switch', platform: 'tuya' }, 
  luz1: { id: 'eba939ccdda8167e71fh7u', code: 'switch', platform: 'tuya' }, 
  luz2: { id: 'eb2182339420bb6701wu4q', code: 'switch', platform: 'tuya' },
  extractor: { id: 'eb0e121ux4rrtjkf', code: 'switch', platform: 'tuya' },
  bomba: { id: 'ebf427eih6oxomiv', code: 'switch', platform: 'tuya' },
  llaveAguaRO: { id: 'eb50dd4bggxac9zz', code: 'switch', platform: 'tuya' },
  gatewayMatter: { id: 'ebfad3e7bddeaf7660yn4f', platform: 'tuya' },
  gatewayBluetooth: { id: 'ebf51e207ba1359b93wbz9', platform: 'tuya' },

  // Xiaomi Devices
  humidifier: { id: '820474096', platform: 'xiaomi', deviceType: 'humidifier' },
  camera: { id: '1077173278', platform: 'xiaomi', deviceType: 'camera' },
};

// --- INICIALIZACIÓN DE LA APP Y CONECTORES ---
const app = express();
const PORT = 3000;
const tuyaContext = !MODO_SIMULACION ? new TuyaContext({ ...TUYA_CONFIG, schema: 'tuya-open-api' }) : null;
let miioClient = null; // Cliente de Xiaomi Mi Home

// Función para inicializar el cliente de Xiaomi
async function initXiaomiClient() {
  if (MODO_SIMULACION || !XIAOMI_CONFIG.username || !XIAOMI_CONFIG.password) {
    console.log('Modo simulación o credenciales Xiaomi incompletas. No se inicializa el cliente Xiaomi.');
    return;
  }
  try {
    console.log('Intentando iniciar sesión en Xiaomi Mi Home...');
    miioClient = await mihome.miCloud.login(XIAOMI_CONFIG.username, XIAOMI_CONFIG.password, XIAOMI_CONFIG.server);
    console.log('Sesión Xiaomi Mi Home iniciada con éxito.');
  } catch (e) {
    console.error('Error al iniciar sesión en Xiaomi Mi Home:', e.message);
    miioClient = null;
  }
}

if (!MODO_SIMULACION) {
  initXiaomiClient(); // Intentar iniciar sesión en Xiaomi al inicio
}

app.use(cors());
app.use(express.json());

// --- LÓGICA DE SIMULACIÓN (SI ESTÁ ACTIVADA) ---
let sensorHistory = [];
const MAX_HISTORY_LENGTH = 100;
let deviceStates = { 
  luzRoja: false, 
  extractor: false, 
  bomba: false, 
  humidifier: false,
  camera: false, // Añadimos la cámara al estado de simulación
};

const updateSensorData = () => {
  const newTemperature = parseFloat((20 + Math.random() * 10).toFixed(1));
  const newHumidity = parseFloat((50 + Math.random() * 20).toFixed(0));
  const newSubstrateHumidity = parseFloat((40 + Math.random() * 40).toFixed(0));

  const newSensorData = {
    timestamp: new Date().toISOString(),
    temperature: newTemperature,
    humidity: newHumidity,
    substrateHumidity: newSubstrateHumidity,
    vpd: parseFloat((newTemperature * (1 - (newHumidity / 100)) / 10).toFixed(1)),
  };

  sensorHistory.push(newSensorData);
  if (sensorHistory.length > MAX_HISTORY_LENGTH) {
    sensorHistory.shift();
  }
};

if (MODO_SIMULACION) {
  setInterval(updateSensorData, 5000);
  updateSensorData();
}

// --- RUTAS DE LA API ---

// Sensores
app.get('/api/sensors/latest', async (req, res) => {
  if (MODO_SIMULACION || (!tuyaContext && !miioClient)) { // Si ambos están en modo simulación
    return res.json(sensorHistory[sensorHistory.length - 1] || {});
  }
  try {
    // Intentar obtener de Tuya (sensor principal)
    if (tuyaContext && DEVICE_MAP.sensorSustrato1.platform === 'tuya') {
      const { result } = await tuyaContext.device.getDeviceStatus(DEVICE_MAP.sensorSustrato1.id);
      const temperature = result.find(s => s.code === 'temp_value')?.value / 10 || 0;
      const humidity = result.find(s => s.code === 'humidity_value')?.value || 0;
      // Asumimos que el sensor de sustrato también puede dar humedad ambiente o viceversa para el ejemplo
      return res.json({ timestamp: new Date().toISOString(), temperature, humidity, substrateHumidity: humidity, vpd: 0 });
    } 
    // Intentar obtener de Xiaomi (humidificador como sensor de temp/hum)
    else if (miioClient && DEVICE_MAP.humidifier.platform === 'xiaomi') {
      // Necesitarás obtener el device object correctamente después del login
      // const device = await miioClient.devices.getDevice(DEVICE_MAP.humidifier.id);
      // const status = await device.miioModel.properties(['temp_dec', 'humidity']); 
      // const temperature = status.temp_dec / 10 || 0;
      // const humidity = status.humidity || 0;
      return res.json({ timestamp: new Date().toISOString(), temperature: 0, humidity: 0, substrateHumidity: 0, vpd: 0 }); // Datos placeholder
    }

    res.status(404).json({ error: 'No primary sensor found or configured for real data' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch sensor data', details: e.message });
  }
});

app.get('/api/sensors/history', (req, res) => {
  if (MODO_SIMULACION || (!tuyaContext && !miioClient)) {
    return res.json(sensorHistory);
  }
  // El historial real requeriría una base de datos.
  res.json([]);
});

// Dispositivos (combinado Tuya y Xiaomi)
app.get('/api/devices', async (req, res) => {
    if (MODO_SIMULACION || (!tuyaContext && !miioClient)) {
        return res.json(deviceStates);
    }
    const realDeviceStates = {
        luzRoja: false, extractor: false, bomba: false, humidifier: false, camera: false
    };

    try {
        // Tuya devices
        if (tuyaContext) {
            const luzRojaStatus = (await tuyaContext.device.getDeviceStatus(DEVICE_MAP.luzRoja.id)).result.find(s => s.code === DEVICE_MAP.luzRoja.code)?.value;
            const extractorStatus = (await tuyaContext.device.getDeviceStatus(DEVICE_MAP.extractor.id)).result.find(s => s.code === DEVICE_MAP.extractor.code)?.value;
            const bombaStatus = (await tuyaContext.device.getDeviceStatus(DEVICE_MAP.bomba.id)).result.find(s => s.code === DEVICE_MAP.bomba.code)?.value;
            realDeviceStates.luzRoja = luzRojaStatus;
            realDeviceStates.extractor = extractorStatus;
            realDeviceStates.bomba = bombaStatus;
        }

        // Xiaomi devices
        if (miioClient) {
            // Humidificador
            // const humidifierDevice = await miioClient.devices.getDevice(DEVICE_MAP.humidifier.id);
            // const humidifierStatus = await humidifierDevice.getPower(); 
            // realDeviceStates.humidifier = humidifierStatus;
            
            // Cámara (suponemos un estado simple, el control real es complejo)
            // const cameraDevice = await miioClient.devices.getDevice(DEVICE_MAP.camera.id);
            // realDeviceStates.camera = await cameraDevice.getPower(); 
        }
        
        res.json(realDeviceStates);
    } catch (e) {
        console.error('Error fetching real device statuses:', e);
        res.status(500).json({ error: 'Failed to fetch real device statuses', details: e.message });
    }
});

app.post('/api/device/:id/toggle', async (req, res) => {
    const deviceId = req.params.id;
    const tuyaDevice = DEVICE_MAP[deviceId];
    const xiaomiDevice = DEVICE_MAP[deviceId];

    if (MODO_SIMULACION || (!tuyaContext && !miioClient)) {
        if (deviceStates.hasOwnProperty(deviceId)) {
            deviceStates[deviceId] = !deviceStates[deviceId];
            console.log(`(Simulated) Device ${deviceId} toggled to: ${deviceStates[deviceId]}`);
            return res.json({ id: deviceId, newState: deviceStates[deviceId] });
        }
        return res.status(404).json({ message: 'Device not found in simulation' });
    }

    try {
        if (tuyaContext && tuyaDevice && tuyaDevice.platform === 'tuya' && tuyaDevice.code) {
            const { result } = await tuyaContext.device.getDeviceStatus(tuyaDevice.id);
            const isOn = result.find(s => s.code === tuyaDevice.code)?.value;
            await tuyaContext.device.sendDeviceCommands(tuyaDevice.id, [{ code: tuyaDevice.code, value: !isOn }]);
            console.log(`(Tuya Real) Device ${deviceId} toggled to: ${!isOn}`);
            return res.json({ id: deviceId, newState: !isOn });
        } else if (miioClient && xiaomiDevice && xiaomiDevice.platform === 'xiaomi' && xiaomiDevice.deviceType === 'humidifier') {
            const device = await miioClient.devices.getDevice(xiaomiDevice.id);
            const currentPower = await device.getPower();
            await device.setPower(!currentPower);
            console.log(`(Xiaomi Real) Device ${deviceId} toggled to: ${!currentPower}`);
            return res.json({ id: deviceId, newState: !currentPower });
        } else if (miioClient && xiaomiDevice && xiaomiDevice.platform === 'xiaomi' && xiaomiDevice.deviceType === 'camera') {
            console.log(`(Xiaomi Real - Cámara) ${deviceId} toggle solicitado. Control de cámara es complejo, solo simulado.`);
            deviceStates[deviceId] = !deviceStates[deviceId];
            return res.json({ id: deviceId, newState: deviceStates[deviceId] });
        }

        res.status(404).json({ message: `Device ${deviceId} not found or not supported for toggle` });
    } catch (e) {
        console.error(`Error toggling real device ${deviceId}:`, e);
        res.status(500).json({ error: `Failed to toggle real device ${deviceId}`, details: e.message });
    }
});

app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  console.log('Received chat message:', message);

  setTimeout(() => {
    res.json({
      reply: `He recibido tu mensaje: "${message}". Como IA, te ayudaría a analizar los datos de tus sensores y a optimizar tu estrategia de riego según los nutrientes de Athena Pro.`
    });
  }, 1500);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Modo de simulación: ${MODO_SIMULACION ? 'ACTIVADO' : 'DESACTIVADO'}`);
});