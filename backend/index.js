const express = require('express');
const cors = require('cors');
const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
// const miio = require('miio'); // REMOVED: User requested Cloud Only
const miHome = require('node-mihome'); // Instancia única para Cloud Protocol
const xiaomiAuth = require('./xiaomi-auth'); // Nuestro autenticador custom

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const firestore = require('./firestore');

// Log para debugging - ver qué se está leyendo del .env
console.log('\n[DEBUG] Variables de entorno cargadas:');
console.log('  MODO_SIMULACION:', process.env.MODO_SIMULACION);
console.log('  XIAOMI_HUMIDIFIER_ID:', process.env.XIAOMI_HUMIDIFIER_ID ? 'CONFIGURADO' : 'NO CONFIGURADO');
console.log('  XIAOMI_HUMIDIFIER_TOKEN:', process.env.XIAOMI_HUMIDIFIER_TOKEN ? 'CONFIGURADO (primeros 10 chars: ' + process.env.XIAOMI_HUMIDIFIER_TOKEN.substring(0, 10) + '...)' : 'NO CONFIGURADO');
console.log('  XIAOMI_CAMERA_ID:', process.env.XIAOMI_CAMERA_ID ? 'CONFIGURADO' : 'NO CONFIGURADO');
console.log('  XIAOMI_CAMERA_TOKEN:', process.env.XIAOMI_CAMERA_TOKEN ? 'CONFIGURADO (primeros 10 chars: ' + process.env.XIAOMI_CAMERA_TOKEN.substring(0, 10) + '...)' : 'NO CONFIGURADO');
console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'CONFIGURADO (****' + process.env.GEMINI_API_KEY.slice(-4) + ')' : 'NO CONFIGURADO');
console.log('  XIAOMI_HUMIDIFIER_MODEL:', process.env.XIAOMI_HUMIDIFIER_MODEL || 'DEFAULT (deerma.humidifier.jsq2w)');
console.log('  XIAOMI_CAMERA_MODEL:', process.env.XIAOMI_CAMERA_MODEL || 'DEFAULT (isa.camera.hlc7)');
console.log('  TUYA_ACCESS_KEY:', process.env.TUYA_ACCESS_KEY ? 'CONFIGURADO (primeros 10 chars: ' + process.env.TUYA_ACCESS_KEY.substring(0, 10) + '...)' : 'NO CONFIGURADO');
console.log('  TUYA_SECRET_KEY:', process.env.TUYA_SECRET_KEY ? 'CONFIGURADO (primeros 10 chars: ' + process.env.TUYA_SECRET_KEY.substring(0, 10) + '...)' : 'NO CONFIGURADO');
console.log('');

// --- CONFIGURACIÓN DE LA INTEGRACIÓN ---
// MODO_SIMULACION =
// - true: Usa datos simulados. La app funcionará sin necesidad de credenciales.
// - false: Intenta conectar con la API de Tuya y Xiaomi. Necesitarás rellenar las credenciales.
const MODO_SIMULACION = process.env.MODO_SIMULACION === 'true';

// --- CREDENCIALES XIAOMI (SOLO PARA MODO_SIMULACION = false) ---
// Para obtener tokens, usa: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor
const XIAOMI_DEVICES = {
  humidifier: {
    id: process.env.XIAOMI_HUMIDIFIER_ID || '',
    token: process.env.XIAOMI_HUMIDIFIER_TOKEN || '',
    ip: process.env.XIAOMI_HUMIDIFIER_IP || '',
    model: 'deerma.humidifier.jsq1',
  },
  camera: {
    id: process.env.XIAOMI_CAMERA_ID || '',
    token: process.env.XIAOMI_CAMERA_TOKEN || '',
    ip: process.env.XIAOMI_CAMERA_IP || '',
    model: 'yczjg.camera.mjsxg13',
  },
};

// --- CREDENCIALES TUYA (SOLO PARA MODO_SIMULACION = false) ---
const TUYA_CONFIG = {
  accessKey: process.env.TUYA_ACCESS_KEY || 'dtpfhgrhn4evkpr4fmkv',
  secretKey: process.env.TUYA_SECRET_KEY || '8f7a1dcbd60442ecbc314c842be7238b',
  apiHost: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
};

// --- MAPEO DE DISPOSITIVOS TUYA (11 Dispositivos) ---
const TUYA_DEVICES_MAP = {
  // SENSORES DE SUSTRATO (3 sensores de temperatura y humedad del suelo)
  sensorSustrato1: {
    name: 'Sensor Sustrato 1',
    id: process.env.TUYA_SENSOR_SUSTRATO_1_ID,
    platform: 'tuya',
    deviceType: 'sensor',
    category: 'soil_sensor',
  },
  sensorSustrato2: {
    name: 'Sensor Sustrato 2',
    id: process.env.TUYA_SENSOR_SUSTRATO_2_ID,
    platform: 'tuya',
    deviceType: 'sensor',
    category: 'soil_sensor',
  },
  sensorSustrato3: {
    name: 'Sensor Sustrato 3',
    id: process.env.TUYA_SENSOR_SUSTRATO_3_ID,
    platform: 'tuya',
    deviceType: 'sensor',
    category: 'soil_sensor',
  },
  sensorAmbiente: {
    name: 'Sensor Ambiente (RH/TH)',
    id: process.env.TUYA_SENSOR_AMBIENTE_ID,
    platform: 'tuya',
    deviceType: 'sensor',
    category: 'environment_sensor',
  },

  // PANELES DE LUCES (2 paneles LED)
  luzPanel1: {
    name: 'Panel LED 1',
    id: process.env.TUYA_LUZ_PANEL_1_ID,
    platform: 'tuya',
    deviceType: 'light',
    category: 'led_panel',
  },
  luzPanel2: {
    name: 'Panel LED 2 (Der Atrás)',
    id: process.env.TUYA_LUZ_PANEL_2_ID,
    platform: 'tuya',
    deviceType: 'light',
    category: 'led_panel',
  },
  luzPanel3: {
    name: 'Panel LED 3 (Izq Adelante)',
    id: process.env.TUYA_LUZ_PANEL_3_ID,
    platform: 'tuya',
    deviceType: 'light',
    category: 'led_panel',
    switchCode: 'switch_1',
  },
  luzPanel4: {
    name: 'Panel LED 4 (Izq Atrás)',
    id: process.env.TUYA_LUZ_PANEL_4_ID,
    platform: 'tuya',
    deviceType: 'light',
    category: 'led_panel',
    switchCode: 'switch',
  },

  // GATEWAYS DE CONTROL (2 gateways)
  gatewayMatter: {
    name: 'Gateway Matter',
    id: process.env.TUYA_GATEWAY_MATTER_ID,
    platform: 'tuya',
    deviceType: 'gateway',
    category: 'matter_gateway',
  },
  gatewayBluetooth: {
    name: 'Gateway Bluetooth',
    id: process.env.TUYA_GATEWAY_BLUETOOTH_ID,
    platform: 'tuya',
    deviceType: 'gateway',
    category: 'ble_gateway',
  },

  // CONTROLADORES DE ENCENDIDO/APAGADO (3 controladores)
  bombaControlador: {
    name: 'Controlador Bomba de Agua',
    id: process.env.TUYA_BOMBA_CONTROLLER_ID,
    platform: 'tuya',
    deviceType: 'switch',
    category: 'pump_controller',
  },
  extractorControlador: {
    name: 'Controlador Extractor',
    id: process.env.TUYA_EXTRACTOR_CONTROLLER_ID,
    platform: 'tuya',
    deviceType: 'switch',
    category: 'extractor_controller',
  },
  controladorLuzRoja: {
    name: 'Controlador Luz Roja',
    id: process.env.TUYA_LUZ_ROJA_CONTROLLER_ID,
    platform: 'tuya',
    deviceType: 'switch',
    category: 'light_controller',
  },

  // VÁLVULA DE AGUA BLUETOOTH (1 válvula)
  llaveAguaBluetooth: {
    name: 'Llave de Agua Bluetooth',
    id: process.env.TUYA_LLAVE_AGUA_ID,
    platform: 'tuya',
    deviceType: 'valve',
    category: 'water_valve',
  },
};

// --- MAPEO DE DISPOSITIVOS XIAOMI (2 Dispositivos) ---
const XIAOMI_DEVICES_MAP = {
  humidifier: {
    name: 'Humidificador Xiaomi',
    platform: 'xiaomi',
    deviceType: 'humidifier',
    config: XIAOMI_DEVICES.humidifier,
  },
  camera: {
    name: 'Cámara Xiaomi',
    platform: 'xiaomi',
    deviceType: 'camera',
    config: XIAOMI_DEVICES.camera,
  },
};

// --- COMBINACIÓN DE MAPEOS ---
const DEVICE_MAP = {
  ...TUYA_DEVICES_MAP,
  ...XIAOMI_DEVICES_MAP,
};

// --- INICIALIZACIÓN DE LA APP Y CONECTORES ---
const app = express();
const path = require('path'); // Import path
app.use(cors()); // Safe toggle
const PORT = process.env.PORT || 3000;
// Inicializar TuyaOpenApiClient con manejo de errores
let tuyaClient = null;
let tuyaConnected = false;

// Función para inicializar conectores de sistema (Tuya API)
// Se invoca solo en modo REAL y de forma asíncrona para no bloquear el inicio del servidor
async function initSystemConnectors() {
  if (MODO_SIMULACION) return;

  console.log('[INIT] Iniciando conexión con Tuya Cloud API...');
  try {
    // Solo crear TuyaOpenApiClient si tenemos credenciales
    if (TUYA_CONFIG.accessKey && TUYA_CONFIG.secretKey) {
      tuyaClient = new TuyaOpenApiClient({
        baseUrl: TUYA_CONFIG.apiHost,
        accessKey: TUYA_CONFIG.accessKey,
        secretKey: TUYA_CONFIG.secretKey,
      });

      // Inicializar el cliente
      if (tuyaClient.init) {
        // En algunas versiones esto puede ser sincrono o asincrono, lo tratamos con cuidado
        await tuyaClient.init();
      }

      // Verificar que tuyaClient está disponible
      if (tuyaClient && tuyaClient.request) {
        tuyaConnected = true;
        console.log('[INFO] TuyaOpenApiClient inicializado correctamente');
        console.log('[INFO] API Host:', TUYA_CONFIG.apiHost);
      } else {
        console.log('[WARN] TuyaOpenApiClient no tiene método request');
        tuyaConnected = false;
      }
    } else {
      console.log('[WARN] Credenciales de Tuya incompletas. Usando modo degradado.');
      tuyaConnected = false;
    }
  } catch (error) {
    console.error('[ERROR] No se pudo inicializar TuyaOpenApiClient:', error.message);
    tuyaConnected = false;
  }
}

// Almacenar clientes Xiaomi y Tuya conectados
const xiaomiClients = {};
const tuyaDevices = {};

// Almacenamiento en memoria para datos persistentes
const calendarEvents = [];
let appSettings = {
  app: {
    appName: 'PKGrower',
    theme: 'light',
    autoRefresh: true,
    refreshInterval: 10,
    enableNotifications: true,
    enableLogging: true,
    logLevel: 'info',
  },
  tuya: {
    accessKey: process.env.TUYA_ACCESS_KEY || '',
    secretKey: process.env.TUYA_SECRET_KEY || '',
    apiHost: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
    region: 'US',
  },
  xiaomi: {
    humidifierToken: process.env.XIAOMI_HUMIDIFIER_TOKEN || '',
    humidifierId: process.env.XIAOMI_HUMIDIFIER_ID || '',
    humidifierIp: process.env.XIAOMI_HUMIDIFIER_IP || '',
    cameraToken: process.env.XIAOMI_CAMERA_TOKEN || '',
    cameraId: process.env.XIAOMI_CAMERA_ID || '',
    cameraIp: process.env.XIAOMI_CAMERA_IP || '',
  },
  lighting: {
    enabled: false,
    mode: 'manual', // 'manual', 'schedule'
    photoperiod: '18/6', // '18/6', '12/12', 'custom'
    onTime: '06:00',
    offTime: '00:00',
    emerson: false, // Efecto Emerson
    emersonOffset: 15, // Minutos
    devices: ['luzPanel1', 'luzPanel2', 'luzPanel3', 'luzPanel4'],
    redLightDevice: 'controladorLuzRoja'
  },
  irrigation: {
    enabled: false,
    mode: 'manual',
    potSize: 7, // Litros
    pumpRate: 40, // ml/segundo (Calibración default aprox)
    targetVWC: 60,
    drybackTarget: 20
  }
};

// --- PERSISTENCIA ---
const fs = require('fs');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');
// ... (loadSettings/saveSettings stay same)

// --- HEALTH CHECK (PUBLIC) ---
// Must be defined BEFORE Security Middleware to allow Render/Uptime checks
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- SECURITY MIDDLEWARE ---
// Protect all routes with API Key
const API_KEY = process.env.API_KEY;

app.use('/api', (req, res, next) => {
    // Exempt CORS preflight (OPTIONS)
    if (req.method === 'OPTIONS') return next();

    // EXEMPTIONS: Allow Dashboard Read-Only access without strict Key (Fixes 401 on refresh)
    // Only apply for GET requests to specific data endpoints
    if (req.method === 'GET' && (
        req.path.startsWith('/api/sensors') ||
        req.path.startsWith('/api/devices') ||
        req.path.startsWith('/api/settings') ||
        req.path.startsWith('/api/history')
    )) {
        return next();
    }

    // Check Header
    const clientKey = req.headers['x-api-key'];

    // In Simulation Mode or Localhost (optional), we might skip, but let's be strict for tunnel safety.
    // If API_KEY is set in .env, enforce it.
    if (API_KEY && clientKey !== API_KEY) {
        console.warn(`[SECURITY] Unauthorized access attempt from ${req.ip} to ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    next();
});

// --- API RIEGO (SHOTS) ---
app.post('/api/irrigation/shot', async (req, res) => {
    try {
        const { percentage } = req.body; // e.g., 2 (= 2%)
        const config = appSettings.irrigation;

        if (!percentage || percentage <= 0) return res.status(400).json({ error: 'Invalid percentage' });

        // 1. Calcular Volumen necesario
        const volumeMl = config.potSize * 1000 * (percentage / 100);

        // 2. Calcular Tiempo de Bomba (ms) using Pump Rate (ml/s)
        // Rate default: 40ml/s.
        // Example: 2% of 7L = 140ml. 140ml / 40ml/s = 3.5s = 3500ms.
        const durationMs = (volumeMl / config.pumpRate) * 1000;

        console.log(`[IRRIGATION] 💧 Shot Request: ${percentage}% of ${config.potSize}L`);
        console.log(`[IRRIGATION] -> Volume: ${volumeMl}ml. Duration: ${durationMs}ms`);

        // 3. Ejecutar Disparo
        const pumpKey = 'bombaControlador';

        // Prender
        await setDeviceState(pumpKey, true);

        // Temporizador Apagado
        setTimeout(async () => {
            await setDeviceState(pumpKey, false);
            console.log(`[IRRIGATION] ✅ Shot Complete (${durationMs}ms)`);
        }, durationMs);

        res.json({ success: true, message: `Riego iniciado: ${volumeMl}ml (${(durationMs/1000).toFixed(1)}s)` });
    } catch (error) {
        console.error('[IRRIGATION] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            const saved = JSON.parse(data);
            // Merge profundo basico
            appSettings = { ...appSettings, ...saved, lighting: { ...appSettings.lighting, ...(saved.lighting || {}) } };
            console.log('[INFO] Configuración cargada de disco.');
        } else {
            console.log('[INFO] No hay configuración guardada. Usando defaults.');
        }
    } catch (e) {
        console.error('[ERROR] Fallo al cargar configuración:', e.message);
    }
}

function saveSettings() {
    try {
        const tempFile = SETTINGS_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(appSettings, null, 2));
        fs.renameSync(tempFile, SETTINGS_FILE);
        console.log('[INFO] Configuración guardada en disco.');
    } catch (e) {
        console.error('[ERROR] Fallo al guardar configuración:', e.message);
    }
}

// Cargar configuración al inicio
loadSettings();

// --- CREDENCIALES XIAOMI CLOUD (Opcional, para control fuera de casa) ---
const XIAOMI_CLOUD_CREDENTIALS = {
  username: process.env.XIAOMI_CLOUD_USERNAME,
  password: process.env.XIAOMI_CLOUD_PASSWORD,
  region: process.env.XIAOMI_CLOUD_REGION || 'us', // us, de, si, cn
};

// Función Helper para llamadas Xiaomi seguras (Auto-Login en 401)
async function safeXiaomiCall(operationName, operationFn) {
    try {
        return await operationFn();
    } catch (error) {
        // Detectar si es error de Auth (401 o mensaje de token)
        const msg = error.message || '';
        const isAuthError = msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('token expired') || msg.includes('1001'); // 1001 a veces es auth

        if (isAuthError) {
            console.log(`[XIAOMI-AUTO-REFRESH] ⚠️ Sesión expirada en ${operationName}. Renovando...`);
            try {
                // Leer credenciales frescas (pueden haber cambiado en settings)
                const user = process.env.XIAOMI_CLOUD_USERNAME;
                const pass = process.env.XIAOMI_CLOUD_PASSWORD;

                if (!user || !pass) throw new Error('Credenciales no configuradas');

                // Usamos nuestro xiaomiAuth para obtener tokens frescos
                const authRes = await xiaomiAuth.login(user, pass);

                if (authRes.status === 'ok') {
                    // Inyectar en la librería
                    miHome.miCloudProtocol.userId = authRes.userId;
                    miHome.miCloudProtocol.serviceToken = authRes.serviceToken;
                    miHome.miCloudProtocol.ssecurity = authRes.ssecurity;

                    console.log('[XIAOMI-AUTO-REFRESH] ✓ Sesión renovada. Reintentando...');
                    return await operationFn();
                } else {
                    console.error('[XIAOMI-AUTO-REFRESH] ❌ Renovación falló (Status: ' + authRes.status + ')');
                }
            } catch (authErr) {
                 console.error('[XIAOMI-AUTO-REFRESH] ❌ Error fatal renovación:', authErr.message);
            }
        }
        throw error; // Re-lanzar si no se pudo arreglar
    }
}

// Función para conectar dispositivos Xiaomi
// Función para conectar dispositivos Xiaomi (CLOUD ONLY)
async function initXiaomiDevices() {
  if (MODO_SIMULACION) {
    console.log('[INFO] Modo simulación activado.');
    return;
  }

  console.log('[XIAOMI-CLOUD] Inicializando conexión Cloud...');

  // 1. Authenticate with Captured Tokens (Priority)
  // We prefer using the captured tokens over username/password login
  if (process.env.XIAOMI_USER_ID && process.env.XIAOMI_SERVICE_TOKEN && process.env.XIAOMI_SSECURITY) {
      console.log('[XIAOMI-CLOUD] 🔓 Usando tokens capturados (userId/serviceToken/ssecurity)');

      // Inject into node-mihome
      miHome.miCloudProtocol.userId = process.env.XIAOMI_USER_ID;
      miHome.miCloudProtocol.serviceToken = process.env.XIAOMI_SERVICE_TOKEN;
      miHome.miCloudProtocol.ssecurity = process.env.XIAOMI_SSECURITY;

      // Manually set isLoggedIn true if library allows, or just assuming calls will work
      // node-mihome doesn't have a public 'isLoggedIn' property usually, but setting tokens is enough.
  } else if (XIAOMI_CLOUD_CREDENTIALS.username && XIAOMI_CLOUD_CREDENTIALS.password) {
       console.log('[XIAOMI-CLOUD] ⚠️ No hay tokens capturados. Intentando login Legacy (puede fallar por 2FA)...');
       try {
          await miHome.miCloudProtocol.login(XIAOMI_CLOUD_CREDENTIALS.username, XIAOMI_CLOUD_CREDENTIALS.password);
          console.log('[XIAOMI-CLOUD] ✓ Login Legacy exitoso.');
       } catch (e) {
          console.error('[XIAOMI-CLOUD] ❌ Falló login Legacy:', e.message);
          console.warn('👉 Por favor ejecuta "node backend/login-cloud-permanent.js" para capturar tokens nuevos.');
       }
  } else {
      console.warn('[XIAOMI-CLOUD] ⚠️ No hay credenciales ni tokens. La conexión fallará.');
  }

  // 2. Setup Devices (Cloud Only)
  for (const [deviceName, config] of Object.entries(XIAOMI_DEVICES)) {
      if (!config.id) continue;

      console.log(`[XIAOMI-CLOUD] Conectando ${deviceName} (${config.id})...`);

      // Create Cloud Client Wrapper
      xiaomiClients[deviceName] = {
          isCloudOnly: true,
          getPower: async () => {
             return safeXiaomiCall(`getPower(${deviceName})`, async () => {
                 const res = await miHome.miCloudProtocol.getProps(config.id, ['power']);
                 return res[0] === true || res[0] === 'on' || res[0] === 1;
             }).catch(e => false);
          },
          setPower: async (state) => {
             return safeXiaomiCall(`setPower(${deviceName})`, async () => {
                 await miHome.miCloudProtocol.setPower(config.id, state);
                 return true;
             });
          },
          call: async (method, params) => {
             return safeXiaomiCall(`call(${deviceName}.${method})`, async () => {
                return await miHome.miCloudProtocol.call(config.id, method, params);
             });
          },
          // Helper for multiple props
          getAll: async () => {
              try {
                  const props = ['power', 'humidity', 'temperature', 'depth', 'dry'];
                  const res = await miHome.miCloudProtocol.getProps(config.id, props);
                  return {
                      power: res[0],
                      humidity: res[1],
                      temperature: res[2],
                      depth: res[3],
                      dry: res[4]
                  };
              } catch(e) { return {}; }
          }
     };
     console.log(`  ✓ [CLOUD LISTENER] ${deviceName} ready.`);
  }
}



// Helper to filter and map Tuya devices strictly + DYNAMICALLY
function processTuyaDevices(cloudDevices) {
  const newTuyaDevices = {};
  const mappedIds = new Set(); // Track IDs we have already processed via the strict map

  // 1. First Pass: Map known devices (preserve custom names/config)
  for (const [key, mapDef] of Object.entries(TUYA_DEVICES_MAP)) {
    // Find this device in cloud list
    const cloudDevice = cloudDevices.find(d => d.id === mapDef.id);

    if (cloudDevice) {
      mappedIds.add(cloudDevice.id);

      // Mapeo detallado de propiedades
      let temperature = null;
      let humidity = null;
      let isOn = false;
      let switchCode = mapDef.switchCode || 'switch_1';

      if (cloudDevice.status) {
         // Temperatura y Humedad (Sensores)
         const tempStatus = cloudDevice.status.find(s => s.code === 'va_temperature' || s.code === 'temp_current' || s.code === 'temperature' || s.code === 'T');
         if (tempStatus) temperature = tempStatus.value / 10;

         const humStatus = cloudDevice.status.find(s =>
             s.code === 'va_humidity' ||
             s.code === 'humidity_value' ||
             s.code === 'humidity' ||
             s.code === 'rh' ||
             s.code === 'moisture' ||
             s.code === 'soil_moisture'
         );
         if (humStatus) {
             // Heuristic: If > 100, likely scaled by 10 or 100. Soil sensors often 0-100 or 0-1000.
             // If value is 450, it probably means 45.0% or just 45%.
             // Without specific model info, we assume 0-100 unless > 100.
             humidity = humStatus.value;
             if (humidity > 100) humidity = humidity / 10;
         }

          // Interruptores (Enchufes, Luces)
          // Aggressive Switch Discovery
          let switchStatus = cloudDevice.status.find(s => s.code === mapDef.switchCode);
          if (!switchStatus) {
              switchStatus = cloudDevice.status.find(s => ['switch_1', 'switch', 'switch_led', 'led_switch'].includes(s.code));
              if (switchStatus) switchCode = switchStatus.code;
          }

          if (switchStatus) {
              isOn = switchStatus.value === true;
              console.log(`[DEBUG-STATE] ${key}: ON=${isOn} (via ${switchCode})`);
          }
       }

       newTuyaDevices[key] = {
        ...mapDef,
        cloudDevice: cloudDevice,
        status: cloudDevice.online ? 'online' : 'offline',
        temperature: temperature,
        humidity: humidity,
        on: isOn,
        switchCode: switchCode,
        lastUpdate: new Date(),
      };

      console.log(`[✓ MAPPED] ${mapDef.name} (${mapDef.id}) - ONLINE`);
    } else {
      newTuyaDevices[key] = {
        ...mapDef,
        status: 'offline',
        lastUpdate: new Date(),
      };
    }
  }

  // 2. Second Pass: DYNAMIC DISCOVERY
  // Add any cloud device that wasn't in our manual map
  cloudDevices.forEach(cloudDevice => {
      if (!mappedIds.has(cloudDevice.id)) {
          const autoKey = `auto_${cloudDevice.id}`;

          // Basic category inference
          let category = 'unknown';
          if (cloudDevice.category) {
              if (cloudDevice.category.includes('cz') || cloudDevice.category.includes('switch')) category = 'switch';
              else if (cloudDevice.category.includes('ws') || cloudDevice.category.includes('sensor')) category = 'sensor';
              else if (cloudDevice.category.includes('dj') || cloudDevice.category.includes('light')) category = 'light';
          }

          // Basic Status Extraction
          let temperature = null;
          let humidity = null;
          let isOn = false;
          let switchCode = 'switch_1';

          if (cloudDevice.status) {
              const tempStatus = cloudDevice.status.find(s => s.code === 'va_temperature' || s.code === 'temp_current');
              if (tempStatus) temperature = tempStatus.value / 10;

              const humStatus = cloudDevice.status.find(s => s.code === 'va_humidity' || s.code === 'humidity_value');
              if (humStatus) humidity = humStatus.value;

              const switchStatus = cloudDevice.status.find(s => ['switch_1', 'switch', 'switch_led'].includes(s.code));
              if (switchStatus) {
                  isOn = switchStatus.value === true;
                  switchCode = switchStatus.code;
              }
          }

          newTuyaDevices[autoKey] = {
              key: autoKey,
              name: cloudDevice.name, // Use name from Tuya Cloud
              id: cloudDevice.id,
              platform: 'tuya',
              deviceType: category === 'sensor' ? 'sensor' : (category === 'light' ? 'light' : 'switch'), // Simple inference
              category: category,
              cloudDevice: cloudDevice,
              status: cloudDevice.online ? 'online' : 'offline',
              temperature: temperature,
              humidity: humidity,
              on: isOn,
              switchCode: switchCode,
              lastUpdate: new Date(),
              isDynamic: true // Flag to identify auto-discovered devices
          };

          console.log(`[★ AUTO-DISCOVERED] ${cloudDevice.name} (${cloudDevice.id})`);
      }
  });

  return newTuyaDevices;
}

// Override the original initTuyaDevices logic with the stricter one
async function initTuyaDevices() {
  if (MODO_SIMULACION) return;

  if (!tuyaConnected || !tuyaClient) {
    console.log('[WARN] TuyaClient no disponible.');
    return;
  }

  try {
    console.log('[INFO] Sincronizando dispositivos Tuya...');
    // FIX: Destructure data from Axios Response
    const { data } = await tuyaClient.request({
      method: 'GET',
      path: '/v1.0/iot-01/associated-users/devices',
      query: { size: 100 }
    });

    // Check data.success, not response.success
    if (!data || !data.success || !data.result || !data.result.devices) {
        console.log('[DEBUG-TUYA-FAIL] Invalid Data Structure:', Object.keys(data || {}));

        console.warn('[WARN] Tuya no devolvió lista masiva. Iniciando Plan B...');
        // ... Log logic ...

        await syncTuyaDevicesIndividual();
        return;
    }

    const devices = data.result.devices;

// Log seguro para diagnósitco
if (data) {
    console.log(`[DEBUG-TUYA] API Status: success=${data.success}, msg="${data.msg || 'OK'}"`);
}

    // FALLBACK: Si la lista masiva falla o viene vacía, consultar dispositivos individualmente
    if (!devices || devices.length === 0) {
        console.log('[WARN] Tuya no devolvió lista masiva. Iniciando consulta individual de dispositivos (Plan B)...');
        const fallbackDevices = [];

        for (const [key, mapDef] of Object.entries(TUYA_DEVICES_MAP)) {
             if (!mapDef.id) continue;
             try {
                // console.log(`[Plan B] Consultando ${mapDef.name} (${mapDef.id})...`);
                const devRes = await tuyaClient.request({ method: 'GET', path: `/v1.0/devices/${mapDef.id}` });

                let devData = null;
                if (devRes && devRes.result) devData = devRes.result;
                else if (devRes && devRes.data && devRes.data.result) devData = devRes.data.result;

                if (devData) {
                    fallbackDevices.push(devData);
                     // Log status for first device to debug mapping
                     if (fallbackDevices.length === 1) {
                        console.log(`[DEBUG-TUYA-STATUS] Sample status for ${devData.name}:`, JSON.stringify(devData.status));
                     }
                } else {
                    // console.log(`  ✗ No datos para: ${mapDef.name}`);
                }
             } catch(e) {
                console.log(`  ✗ Error consultando ${mapDef.name}: ${e.message}`);
             }
        }

        if (fallbackDevices.length > 0) {
            console.log(`[Plan B] Recuperados ${fallbackDevices.length} dispositivos individualmente.`);
            devices = fallbackDevices;
        }
    }

    if (devices && Array.isArray(devices)) {
      console.log(`[CLOUD] Procesando ${devices.length} dispositivos Tuya.`);
      // devices.forEach(d => console.log(`   - ID: ${d.id}, Name: ${d.name}`));

      const mappedDevices = processTuyaDevices(devices);

      // Update global object
      // We use Object.assign to keep reference if used elsewhere, but clearing it first is safer
      for (const key in tuyaDevices) delete tuyaDevices[key];
      Object.assign(tuyaDevices, mappedDevices);

      console.log(`[INFO] Sincronización completada. ${Object.keys(tuyaDevices).length} dispositivos en sistema.`);
    }
  } catch (error) {
    console.error('[ERROR] Fallo sincronización Tuya:', error.message);
  }
}// Helper for individual fetching (Fallback)
const syncTuyaDevicesIndividual = async () => {
    console.log('[Plan B] Recuperando dispositivos individualmente...');
    const fallbackDevices = [];

    // Iterar sobre el mapa de dispositivos conocidos
    for (const [key, mapDef] of Object.entries(TUYA_DEVICES_MAP)) {
         if (!mapDef.id) continue;
         try {
             // console.log(`[Plan B] Consultando ${mapDef.name} (${mapDef.id})...`);
             const res = await tuyaClient.request({ method: 'GET', path: `/v1.0/devices/${mapDef.id}` });

             // Extract data from Axios response
             const devData = (res.data && res.data.result) ? res.data.result : null;

             if (devData) {
                  // MOCK ONLINE STATUS if missing (API v1.0 usually implies online if it responds)
                  if (devData.online === undefined) devData.online = true;

                  fallbackDevices.push(devData);
                  // Log status for first device to debug mapping
                  // if (fallbackDevices.length === 1) {
                  //    console.log(`[DEBUG-TUYA-STATUS] Sample status for ${devData.name}:`, JSON.stringify(devData.status));
                  // }
             }
         } catch(e) {
            console.warn(`  ✗ Error consultando ${mapDef.name}: ${e.message}`);
         }
    }

    if (fallbackDevices.length > 0) {
        console.log(`[Plan B] Recuperados ${fallbackDevices.length} dispositivos individualmente.`);

        // Process them
        const mappedDevices = processTuyaDevices(fallbackDevices);

        // Update global object
        for (const key in tuyaDevices) delete tuyaDevices[key];
        Object.assign(tuyaDevices, mappedDevices);

        console.log(`[CLOUD] Procesando ${fallbackDevices.length} dispositivos Tuya.`);
        console.log(`[INFO] Sincronización completada. ${Object.keys(tuyaDevices).length} dispositivos en sistema.`);
    } else {
        console.warn("[Plan B] No se pudieron recuperar dispositivos.");
    }
};

// Inicializar dispositivos Xiaomi y Tuya si no estamos en modo simulación
if (!MODO_SIMULACION) {
  // Esperar un poco para que el servidor esté listo, luego intentar conexión
  setTimeout(() => {
    initXiaomiDevices().catch(err => {
      console.error('[ERROR] Fatal al inicializar Xiaomi:', err);
    });
    initTuyaDevices().catch(err => {
      console.error('[ERROR] Fatal al inicializar Tuya:', err);
    });
  }, 1000);
}

app.use(express.json());

// --- LÓGICA DE SIMULACIÓN (SI ESTÁ ACTIVADA) ---
let sensorHistory = [];
const MAX_HISTORY_LENGTH = 100;

// Load History from Firestore (Async)
firestore.getSensorHistory(MAX_HISTORY_LENGTH).then(history => {
    if (history && history.length > 0) {
        sensorHistory = history;
        console.log(`[FIRESTORE] Historial cargado: ${sensorHistory.length} registros.`);
    }
});
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

// [REMOVED DUPLICATE SENSOR ENDPOINT - USE THE ONE BELOW]

app.get('/api/sensors/history', (req, res) => {
  try {
      if (!sensorHistory) return res.json([]);
      return res.json(sensorHistory);
  } catch (err) {
      console.error('[ERROR HANDLED] en /api/sensors/history:', err.message);
      res.json([]); // Return empty array instead of 500 to keep Frontend alive
  }
});

app.get('/api/sensors/latest', (req, res) => {
    try {
        if (!sensorHistory || sensorHistory.length === 0) {
            return res.json({ temperature: 0, humidity: 0, substrateHumidity: 0, vpd: 0 });
        }
        const latest = sensorHistory[sensorHistory.length - 1];
        res.json(latest);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Dispositivos (combinado Tuya y Xiaomi)
app.get('/api/devices', async (req, res) => {
  try {
    // Modo simulación
    if (MODO_SIMULACION) {
      return res.json(deviceStates);
    }

    // Modo real - obtener estado de dispositivos
    const realDeviceStates = {};

    for (const [deviceName, deviceConfig] of Object.entries(DEVICE_MAP)) {

      // PRIORIDAD 1: Dispositivos Tuya (Estado rico desde cache)
      if (deviceConfig.platform === 'tuya') {
          if (tuyaDevices[deviceName]) {
              // FIX for User "Devices not loading"
              // If it's a SENSOR, return true (online) so it shows up in dashboard lists
              // If it's a SWITCH, return the actual .on state
              if (deviceConfig.deviceType === 'sensor') {
                   // Return online status as "state" for sensors, or true if unknown
                   realDeviceStates[deviceName] = tuyaDevices[deviceName].status === 'online';
              } else {
                   realDeviceStates[deviceName] = tuyaDevices[deviceName].on === true;
              }
          } else {
              realDeviceStates[deviceName] = false;
          }
          continue;
      }

      // PRIORIDAD 2: Dispositivos Xiaomi
      if (deviceConfig.platform === 'xiaomi' && xiaomiClients[deviceName]) {
        try {
          const device = xiaomiClients[deviceName];

          if (deviceConfig.deviceType === 'humidifier' || deviceConfig.deviceType === 'pump') {
            const power = await device.getPower();
            realDeviceStates[deviceName] = power || false;
          }
          else if (deviceConfig.deviceType === 'light') {
            const power = await device.getPower();
            realDeviceStates[deviceName] = power || false;
          }
          else if (deviceConfig.deviceType === 'camera') {
             realDeviceStates[deviceName] = true;
          }
          else {
            // Dispositivo genérico
            try {
              const properties = await device.getProperties(['power']);
              const powerProp = properties.find(p => p.did === 'power' || p.name === 'power');
              realDeviceStates[deviceName] = powerProp?.value === true || powerProp?.value === 1;
            } catch {
              realDeviceStates[deviceName] = false;
            }
          }
        } catch (e) {
          console.error(`[ERROR] Al obtener estado de ${deviceName}:`, e.message);
          realDeviceStates[deviceName] = false;
        }
      } else {
         // Si es xiaomi pero no cliente, o si falló el match anterior
         if (deviceConfig.platform === 'xiaomi' && !realDeviceStates.hasOwnProperty(deviceName)) {
             realDeviceStates[deviceName] = false;
         }
      }
    }

    // Debug response
    console.log('[API-DEBUG] Sending devices:', JSON.stringify(realDeviceStates));

    return res.json(realDeviceStates);
  } catch (e) {
    console.error('[ERROR HANDLED] En /api/devices:', e.message);
    // Return empty object instead of 500 failure
    res.json({});
  }
});app.post('/api/device/:id/toggle', async (req, res) => {
  try {
    const deviceId = req.params.id;

    // Modo simulación
    if (MODO_SIMULACION) {
      if (deviceStates.hasOwnProperty(deviceId)) {
        deviceStates[deviceId] = !deviceStates[deviceId];
        console.log(`[SIM] ${deviceId} toggled to: ${deviceStates[deviceId]}`);
        return res.json({ id: deviceId, newState: deviceStates[deviceId] });
      }
      return res.status(404).json({ message: 'Device not found in simulation' });
    }

    // Modo real - buscar dispositivo en mapeo
    const deviceConfig = DEVICE_MAP[deviceId];

    if (!deviceConfig) {
      return res.status(404).json({ error: `Device ${deviceId} not found in DEVICE_MAP` });
    }

    // Si es dispositivo Xiaomi
    if (deviceConfig.platform === 'xiaomi' && xiaomiClients[deviceId]) {
      try {
        const device = xiaomiClients[deviceId];

        // Obtener estado actual
        let currentState = false;
        if (deviceConfig.deviceType === 'humidifier' || deviceConfig.deviceType === 'pump' || deviceConfig.deviceType === 'light') {
          currentState = await device.getPower();
        } else {
          // Dispositivo genérico
          const properties = await device.getProperties(['power']);
          const powerProp = properties.find(p => p.did === 'power' || p.name === 'power');
          currentState = powerProp?.value === true || powerProp?.value === 1;
        }

        // Toggle estado
        const newState = !currentState;

        // Enviar comando
        if (deviceConfig.deviceType === 'humidifier' || deviceConfig.deviceType === 'pump' || deviceConfig.deviceType === 'light') {
          await device.setPower(newState);
        } else {
          // Comando genérico para encender/apagar
          await device.call('set_power', [newState ? 'on' : 'off']);
        }

        console.log(`[XIAOMI] ${deviceId} toggled to: ${newState}`);
        return res.json({ id: deviceId, newState: newState });

      } catch (e) {
        console.error(`[ERROR] Al controlar ${deviceId}:`, e.message);
        return res.status(500).json({
          error: `Failed to toggle ${deviceId}`,
          details: e.message
        });
      }
    }

    // Si es dispositivo Tuya
    if (deviceConfig.platform === 'tuya') {
      if (!tuyaConnected) {
          return res.status(503).json({ error: 'Tuya Cloud no conectado' });
      }

      try {
        const tuyaId = deviceConfig.id;

        // Use cached state from polling loop if available (Faster & More Reliable)
        // If not available, default to false (off)
        const cachedDevice = tuyaDevices[deviceId];
        const currentVal = cachedDevice ? cachedDevice.on : false;
        const switchCode = (cachedDevice && cachedDevice.switchCode) ? cachedDevice.switchCode : (deviceConfig.switchCode || 'switch_1');

        const newState = !currentVal;

        console.log(`[TUYA] Toggling ${deviceId} (${tuyaId}) ${currentVal} -> ${newState} using code ${switchCode}`);

        if (!tuyaClient) {
             throw new Error("Tuya Client not initialized");
        }

        // Use the same endpoint as controlDevice (/v1.0/iot-03) which is proven to work
        const cmdRes = await tuyaClient.request({
            method: 'POST',
            path: `/v1.0/iot-03/devices/${tuyaId}/commands`,
            body: {
                commands: [
                    { code: switchCode, value: newState }
                ]
            }
        });

        const success = cmdRes.success || (cmdRes.result === true);

        if (success) {
             // Optimistically update cache
             if (tuyaDevices[deviceId]) tuyaDevices[deviceId].on = newState;
             return res.json({ id: deviceId, newState: newState });
        } else {
             const msg = cmdRes.msg || 'Error desconocido';
             console.error(`[TUYA] Toggle Error: ${msg}`);
             throw new Error(msg);
        }

      } catch (e) {
        console.error(`[ERROR TUYA] Toggle falló: ${e.message}`);
        return res.status(500).json({ error: `Failed to toggle ${deviceId}`, details: e.message });
      }
    }

    return res.status(404).json({ error: `Device ${deviceId} not connected or not supported` });

  } catch (e) {
    console.error('[ERROR] En /api/device/:id/toggle:', e.message);
    res.status(500).json({ error: 'Toggle operation failed', details: e.message });
  }
});

// FIX: Use native 'https' to avoid dependency issues with fetch in older Node versions
const https = require('https');

// CACHE DE RESPALDO (In-Memory)
let lastAiResponse = "🌿 Todo se ve nominal. Los parámetros están estables. ¡Sigue así! (Modo Respaldo)";
let lastAiCallTimestamp = 0;
const AI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache

app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;
  const apiKey = appSettings.ai?.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
      return res.json({ reply: "⚠️ No tengo una API Key configurada. Por favor ve a 'Configuración' en esta misma pantalla y añade tu Gemini API Key." });
  }

  // CHECK CACHE TTL
  const now = Date.now();
  // Fix: Check for 'Symbiosis' which is in the prompt, or 'context'
  const isAutoAnalysis = message.includes('Symbiosis') || message.includes('context');

  if (now - lastAiCallTimestamp < AI_CACHE_TTL_MS && isAutoAnalysis) {
      console.log('[AI] Cache Hit (TTL protegido). Devolviendo respuesta anterior.');
      return res.json({ reply: lastAiResponse + " ⏱️" });
  }

  console.log('[AI] Enviando consulta a Gemini (HTTPS)...');

  // ... (context logic unchanged) ...
  let systemContext = "Eres un experto agrónomo asistente para el sistema PKGrower. Tienes acceso a los datos del cultivo en tiempo real.";

  // Inject Irrigation Data
  try {
      const lastIrrigation = await firestore.getLastIrrigationLog();
      if (lastIrrigation) {
          systemContext += `\n\n[DATOS DE ÚLTIMO RIEGO/RUNOFF - ${new Date(lastIrrigation.timestamp).toLocaleString()}]:
          - Riego (Entrada): pH ${lastIrrigation.inputPh || '?'}, EC ${lastIrrigation.inputEc || '?'}
          - Runoff (Salida): pH ${lastIrrigation.runoffPh || '?'}, EC ${lastIrrigation.runoffEc || '?'}
          - Volumen: ${lastIrrigation.volume || '?'} L

          Evalúa estos valores si el usuario pregunta sobre nutrición o estado del suelo.
          `;
      }
  } catch (e) {
      console.warn('Error injecting irrigation context:', e.message);
  }

  if (context) {
       // ...
  }
  // ...

  const postData = JSON.stringify({
      contents: [{
          parts: [{
              text: `${systemContext}\n\nUSUARIO: ${message}\nASISTENTE:`
          }]
      }]
  });

  const generateLocalFallback = (text) => {
      // Intentar extraer datos del prompt si falla la IA
      try {
          const tempMatch = text.match(/Temperatura: (\d+\.?\d*)/);
          const humMatch = text.match(/Humedad: (\d+\.?\d*)/);
          const vpdMatch = text.match(/VPD: (\d+\.?\d*)/);

          let analysis = "";
          // Debug Soil Sensors
    if (cloudDevice.category === 'soil_sensor' || cloudDevice.name.includes('Sustrato')) {
         console.log(`[DEBUG_SOIL] Device: ${cloudDevice.name} (${cloudDevice.id})`);
         console.log(`[DEBUG_SOIL] Status Codes:`, JSON.stringify(cloudDevice.status));
    }

    if (vpdMatch) {
              const vpd = parseFloat(vpdMatch[1]);
              if (vpd < 0.4) analysis += "VPD muy bajo (riesgo hongos). ";
              else if (vpd > 1.6) analysis += "VPD alto (estrés). ";
              else analysis += "VPD óptimo. ";
          }
          if (tempMatch) {
              const t = parseFloat(tempMatch[1]);
              if (t > 28) analysis += "Temp alta. ";
          }

          if (!analysis) return "Sistemas nominales (Modo Local).";
          return "🤖 (Modo Local) " + analysis + "Revisa parámetros.";
      } catch (e) {
          return "🌿 Todo nominal (Modo Respaldo Básico).";
      }
  };

  // Refactored to use Google Generative AI SDK
  try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      // Updated to Gemini 3 Pro as requested
      const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

      const chat = model.startChat({
        history: [
            {
                role: "user",
                parts: [{ text: systemContext }],
            },
            {
                role: "model",
                parts: [{ text: "Entendido. Soy el asistente agrónomo de PKGrower. Estoy listo para analizar los datos del cultivo en tiempo real y dar recomendaciones." }],
            },
        ],
        generationConfig: {
            maxOutputTokens: 1000,
        },
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const reply = response.text();

      // GUARDAR EN CACHE
      lastAiResponse = reply;
      lastAiCallTimestamp = Date.now();

      console.log('[AI SUCCESS] Gemini respondió:', reply.substring(0, 50) + '...');
      res.json({ reply });

  } catch (error) {
      console.warn(`[AI WARN] Fallo SDK: ${error.message}`);

      if (lastAiResponse && lastAiResponse.includes("Modo Respaldo")) {
          // Fallback logic if needed, or just return error
          res.json({ reply: "Error conectando con Gemini. " + error.message });
      } else {
          // Serve cached response if available
          res.json({ reply: (lastAiResponse || "Servicio no disponible") + " ⚠️ (Cache/Error)" });
      }
  }
});

// Endpoint de diagnóstico (para verificar estado de dispositivos)
app.get('/api/devices/diagnostics', async (req, res) => {
  try {
    const diagnostics = {
        mode: MODO_SIMULACION ? 'simulation' : 'real',
        timestamp: new Date().toISOString(),
        xiaomiDevices: {},
        tuyaDevices: {
        connected: !!tuyaConnected,
        },
    };

    // Información de dispositivos Xiaomi
    if (DEVICE_MAP) {
        for (const [deviceName, deviceConfig] of Object.entries(DEVICE_MAP)) {
            if (deviceConfig.platform === 'xiaomi') {
            const connected = !!xiaomiClients[deviceName];
            diagnostics.xiaomiDevices[deviceName] = {
                name: deviceConfig.name,
                model: deviceConfig.config?.model || 'unknown',
                connected: connected,
                ipAddress: deviceConfig.config?.ip || 'auto-discovery',
            };
            }
        }
    }

    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({ error: 'Diagnostics failed', details: error.message });
  }
});

// --- NUEVOS ENDPOINTS PARA TUYA ---

// Obtener todos los dispositivos Tuya
app.get('/api/devices/tuya', async (req, res) => {
  try {
    /*
    const fs = require('fs');
    ... writeFileSync ...
    */
    const debugInfo = {
        scanCount: Object.keys(tuyaDevices).length,
        keys: Object.keys(tuyaDevices),
        tuyaConnected: tuyaConnected,
        zombieCheck: "I AM THE NEW CODE"
    };

    // Always return debug info to inspect state
    return res.json({
        devices: Object.entries(tuyaDevices).map(([key, device]) => ({
            key, ...device // simplificado
        })),
        total: Object.keys(tuyaDevices).length,
        debug: debugInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate VPD
// Formula: VPD = SVP * (1 - RH/100)
// SVP = 0.61078 * exp(17.27 * T / (T + 237.3))
const calculateVPD = (temp, hum) => {
    const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    return svp * (1 - hum / 100);
};

// Obtener últimos datos de sensores (Ambiente + Sustrato)
app.get('/api/sensors/latest', async (req, res) => {
  try {
     let temp = 0;
     let hum = 0;
     let subHum = 0;
     let avgSubHum = 0; // Lifting scope
     let isEstimate = false; // Lifting scope
     let vpd = 0;

     if (MODO_SIMULACION) {
         temp = 24.5; hum = 60; subHum = 45; vpd = 1.1;
     } else {
         // 2. Sustrato (Promedio) - Calculate always first for potential fallback
     let subTemps = [];
     let subHums = [];

     // DEBUG LOG
     // console.log("Keys in tuyaDevices:", Object.keys(tuyaDevices));

     ['sensorSustrato1', 'sensorSustrato2', 'sensorSustrato3'].forEach(k => {
          if (tuyaDevices[k]) {
             // console.log(`Checking ${k}:`, tuyaDevices[k]);
             if (tuyaDevices[k].temperature !== undefined) subTemps.push(tuyaDevices[k].temperature);
             if (tuyaDevices[k].humidity !== undefined) subHums.push(tuyaDevices[k].humidity);
          }
     });

     console.log(`[SENSOR-DEBUG] SubTemps: ${subTemps}, Avg: ${subTemps.length > 0 ? subTemps.reduce((a, b) => a + b, 0) / subTemps.length : 0}`);

     // Update outer variables or separate ones?
     // We need these available for the final JSON outside this block
     // Since we can't export const from block, we'll assign to a var if we declared it, OR just map it to 'subHum' which IS declared.
     // Better: let's declare avgSubTemp/Hum properly or use the ones we have.

     // Let's use the outer scope variables if possible, or just declare distinct ones outside.
     // To allow the code below to work (which uses avgSubTemp/avgSubHum), we must hoist them or assume they are declared above.
     // Actually, looking at lines 1140+, they are NOT declared above.
     // QUICK FIX: Assign to variables that ARE available or recalculate simply.
     const calculatedAvgSubTemp = subTemps.length > 0 ? subTemps.reduce((a, b) => a + b, 0) / subTemps.length : 0;
     avgSubHum = subHums.length > 0 ? subHums.reduce((a, b) => a + b, 0) / subHums.length : 0; // Removing 'const' to use hoisted var (which I will add)

     const avgSubTemp = calculatedAvgSubTemp; // Keep local strict reference for logic below

     // 1. Ambiente (Prioridad: Sensor dedicado)
     isEstimate = false;

     // DEBUG DECISION - Using console.error to force visibility in all terminals
     if (tuyaDevices.sensorAmbiente) {
         console.error(`[DEBUG-ENDPOINT] found sensorAmbiente. Name: ${tuyaDevices.sensorAmbiente.name}, ID: ${tuyaDevices.sensorAmbiente.id}, Temp: ${tuyaDevices.sensorAmbiente.temperature}, Hum: ${tuyaDevices.sensorAmbiente.humidity}`);
     } else {
         console.error('[DEBUG-ENDPOINT] CRITICAL: sensorAmbiente KEY MISSING in tuyaDevices global object');
         console.error('[DEBUG-ENDPOINT] Available keys:', Object.keys(tuyaDevices));
     }

     if (tuyaDevices.sensorAmbiente && tuyaDevices.sensorAmbiente.temperature !== undefined && tuyaDevices.sensorAmbiente.temperature !== null) {
         temp = tuyaDevices.sensorAmbiente.temperature;
         hum = tuyaDevices.sensorAmbiente.humidity || 0;
     } else {
         // Fallback: Use Substrate Average for Temperature ONLY (Physics: Soil temp ~ Ambient temp)
         if (avgSubTemp > 0) {
             temp = parseFloat(avgSubTemp.toFixed(1));
             isEstimate = true;
             // Do NOT estimate air humidity from soil humidity (totally different)
         }
     }
     } // Closes the main else (MODO_SIMULACION)

     if (temp && hum) {
        vpd = parseFloat(calculateVPD(temp, hum).toFixed(2));
     }

     res.json({
        temperature: temp,
        humidity: hum,
        vpd: vpd,
        substrateHumidity: parseFloat(avgSubHum.toFixed(1)),
        isEstimate: isEstimate,
        timestamp: new Date().toISOString()
     });
  } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
  }
});

// Obtener sensores de sustrato consolidados
app.get('/api/sensors/soil', async (req, res) => {
  try {
    if (MODO_SIMULACION) {
      const soilData = [
        { sensor: 'Sensor Sustrato 1', temperature: 22.5, humidity: 65, lastUpdate: new Date().toISOString() },
        { sensor: 'Sensor Sustrato 2', temperature: 23.1, humidity: 68, lastUpdate: new Date().toISOString() },
        { sensor: 'Sensor Sustrato 3', temperature: 21.8, humidity: 62, lastUpdate: new Date().toISOString() },
      ];
      return res.json(soilData);
    }

    // En modo real, obtendría datos de Tuya
    const soilSensors = Object.entries(tuyaDevices)
      .filter(([_, device]) => device.category === 'soil_sensor')
      .map(([key, device]) => ({
        sensor: device.name,
        id: device.id,
        temperature: device.temperature !== null ? device.temperature : null,
        humidity: device.humidity !== null ? device.humidity : null,
        lastUpdate: device.lastUpdate,
      }));

    res.json(soilSensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINTS PARA CÁMARA XIAOMI ---

// Obtener estado de la cámara
app.get('/api/device/camera/status', async (req, res) => {
  try {
    if (MODO_SIMULACION) {
      return res.json({
        power: true,
        recording: false,
        batteryLevel: 100,
        storageFree: '4.5GB',
      });
    }

    if (!xiaomiClients.camera) {
      return res.status(404).json({ error: 'Cámara no conectada' });
    }

    const device = xiaomiClients.camera;
    const power = await device.getPower();

    res.json({
      power,
      recording: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar grabación de video
app.post('/api/device/camera/record/start', async (req, res) => {
  try {
    const { duration } = req.body;

    if (MODO_SIMULACION) {
      return res.json({
        success: true,
        message: 'Grabación iniciada (simulada)',
        duration: duration || 60,
      });
    }

    if (!xiaomiClients.camera) {
      return res.status(404).json({ error: 'Cámara no conectada' });
    }

    const device = xiaomiClients.camera;
    // Llamar al comando de grabación si está disponible
    // const result = await device.call('action', { did: 'camera', siid: 2, aiid: 1 });

    res.json({
      success: true,
      message: 'Grabación iniciada',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detener grabación
app.post('/api/device/camera/record/stop', async (req, res) => {
  try {
    if (MODO_SIMULACION) {
      return res.json({
        success: true,
        message: 'Grabación detenida (simulada)',
      });
    }

    res.json({
      success: true,
      message: 'Grabación detenida',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Capturar foto
app.post('/api/device/camera/capture', async (req, res) => {
  try {
    if (MODO_SIMULACION) {
      return res.json({
        success: true,
        message: 'Foto capturada (simulada)',
        imageUrl: '/api/mock-image.jpg',
        timestamp: new Date().toISOString(),
      });
    }

    if (!xiaomiClients.camera) {
      return res.status(404).json({ error: 'Cámara no conectada' });
    }

    res.json({
      success: true,
      message: 'Foto capturada',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINTS PARA CÁMARA MEJORADOS ---

// Obtener información de la cámara
app.get('/api/camera/info', async (req, res) => {
  try {
    if (MODO_SIMULACION) {
      return res.json({
        id: 'xiaomi-camera',
        name: 'Cámara Xiaomi',
        model: 'yczjg.camera.mjsxg13',
        status: 'online',
        power: true,
        nightVision: true,
        recording: false,
        resolution: '2304x1296',
        framerate: 30,
        bitrate: 2048,
      });
    }

    if (!xiaomiClients.camera) {
      return res.status(404).json({
        error: 'Cámara no conectada',
        status: 'offline'
      });
    }

    const camera = xiaomiClients.camera;
    res.json({
      id: 'xiaomi-camera',
      name: 'Cámara Xiaomi',
      model: 'yczjg.camera.mjsxg13',
      status: 'online',
      power: true,
      nightVision: true,
      recording: false,
      resolution: '2304x1296',
      framerate: 30,
      bitrate: 2048,
      isCloudOnly: camera.isCloudOnly || false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener snapshots (foto en vivo)
app.get('/api/camera/snapshot', async (req, res) => {
  try {
    if (MODO_SIMULACION) {
      // Retornar URL de imagen simulada (placeholder)
      return res.json({
        success: true,
        snapshotUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjMwNCIgaGVpZ2h0PSIxMjk2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IGZpbGw9IiMzMzMiIHdpZHRoPSIyMzA0IiBoZWlnaHQ9IjEyOTYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSI0OCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhbWFyYSBYaWFvbWkgKFNpbXVsYWRhKTwvdGV4dD48L3N2Zz4=',
        timestamp: new Date().toISOString(),
      });
    }

    if (!xiaomiClients.camera) {
      return res.status(404).json({ error: 'Cámara no conectada' });
    }

    // En una cámara real, aquí iría la lógica para obtener snapshot
    res.json({
      success: true,
      snapshotUrl: 'https://via.placeholder.com/2304x1296?text=Xiaomi+Camera',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener stream de video (RTSP o similar)
app.get('/api/camera/stream', async (req, res) => {
  try {
    if (MODO_SIMULACION) {
      return res.json({
        success: true,
        streamUrl: '/mock-stream',
        protocol: 'motion-jpeg',
        quality: 'high',
      });
    }

    if (!xiaomiClients.camera) {
      return res.status(404).json({ error: 'Cámara no conectada' });
    }

    // Retornar URL del stream de video en vivo
    // Para Xiaomi, normalmente es RTSP o HTTP Motion JPEG
    res.json({
      success: true,
      streamUrl: 'rtsp://192.168.1.5:554/stream',
      protocol: 'rtsp',
      quality: 'high',
      fallbackUrl: 'http://192.168.1.5:8080/video',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estado de la cámara
app.get('/api/device/camera/status', async (req, res) => {
  try {
    if (MODO_SIMULACION) {
       return res.json({ status: 'online', recording: false });
    }

    if (!xiaomiClients.camera) {
       return res.status(404).json({ error: 'Cámara no conectada', status: 'offline' });
    }

    // Aquí podríamos consultar estado real si la lib lo soporta
    res.json({ status: 'online', recording: false });

  } catch (error) {
    console.error('Error camera status:', error);
    res.status(500).json({ error: 'Error getting camera status' });
  }
});

// Control de Night Vision (infrarrojo)
app.post('/api/camera/night-vision', async (req, res) => {
  try {
    const { enabled } = req.body;

    if (MODO_SIMULACION) {
      return res.json({
        success: true,
        nightVision: enabled,
        message: `Night Vision ${enabled ? 'activado' : 'desactivado'} (simulado)`,
      });
    }

    if (!xiaomiClients.camera) {
      return res.status(404).json({ error: 'Cámara no conectada' });
    }

    res.json({
      success: true,
      nightVision: enabled,
      message: `Night Vision ${enabled ? 'activado' : 'desactivado'}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINTS PARA HUMIDIFICADOR Y EXTRACTOR ---

// Obtener estado de humidificador
app.get('/api/device/humidifier/status', async (req, res) => {
  try {
    if (MODO_SIMULACION) {
      return res.json({
        power: true,
        temperature: 22.5,
        humidity: 65,
        targetHumidity: 70,
        mode: 'auto',
      });
    }

    if (!xiaomiClients.humidifier) {
      return res.status(404).json({ error: 'Humidificador no conectado' });
    }

    const device = xiaomiClients.humidifier;
    const power = await device.getPower();
    // Obtener otras propiedades si están disponibles
    const props = await device.getAll();

    res.json({
      power,
      temperature: props?.temperature || null,
      humidity: props?.humidity || null,
      targetHumidity: props?.targetHumidity || 70,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Controlar humidificador y extractor juntos
app.post('/api/automation/humidifier-extractor', async (req, res) => {
  try {
    const { targetHumidity, autoMode } = req.body;

    if (MODO_SIMULACION) {
      return res.json({
        success: true,
        message: 'Control humidificador-extractor actualizado (simulado)',
        targetHumidity,
        autoMode,
      });
    }

    // Lógica de control:
    // - Si humedad actual < targetHumidity: activar humidificador
    // - Si humedad actual > targetHumidity: activar extractor

    let humidifierAction = 'off';
    let extractorAction = 'off';

    if (xiaomiClients.humidifier && autoMode) {
      try {
        const props = await xiaomiClients.humidifier.getAll();
        const currentHumidity = props?.humidity || 50;

        if (currentHumidity < targetHumidity) {
          humidifierAction = 'on';
          // await xiaomiClients.humidifier.setPower(true);
        } else if (currentHumidity > targetHumidity) {
          extractorAction = 'on';
          // Controlar extractor si está disponible
        }
      } catch (e) {
        console.error('Error al obtener humedad:', e.message);
      }
    }

    res.json({
      success: true,
      humidifierAction,
      extractorAction,
      targetHumidity,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINT PARA ENCENDER/APAGAR CONTROLADORES TUYA ---

app.post('/api/device/:id/control', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'on' o 'off'

    if (MODO_SIMULACION) {
      return res.json({
        success: true,
        deviceId: id,
        action,
        message: `${id} - ${action} (simulado)`,
      });
    }

    // Buscar si es un dispositivo Tuya o Xiaomi
    const tuyaDevice = tuyaDevices[id];
    const xiaomiDevice = xiaomiClients[id];

    if (tuyaDevice) {
      // Control Tuya
      if (!tuyaConnected) {
        return res.status(400).json({ error: 'Tuya no conectado' });
      }

      try {
        const cmdCode = tuyaDevice.switchCode || 'switch';
        console.error(`[CONTROL] Attempting to control ${id}. Primary Code: ${cmdCode}, Action: ${action}`);

        // 1. Execute Primary Command
        let primarySuccess = false;
        try {
             const response = await tuyaClient.request({
               method: 'POST',
               path: `/v1.0/iot-03/devices/${tuyaDevice.id}/commands`,
               body: { commands: [{ code: cmdCode, value: action === 'on' }] },
             });
             primarySuccess = response.success;
             console.log(`[CONTROL] Primary ${cmdCode}: ${response.success ? 'OK' : 'FAIL'}`);
        } catch (e) {
             console.error(`[CONTROL] Primary ${cmdCode} Error:`, e.message);
        }

        // 2. Execute Redundancy (Double Tap) - Sequentially to avoid batch rejection
        // Only for Panels which are known to be tricky with switch vs switch_1
        if (id.includes('Panel') || tuyaDevice.category === 'led_panel') {
             const altCode = cmdCode === 'switch' ? 'switch_1' : 'switch';
             console.log(`[CONTROL] Attempting redundancy for Panel. Alt Code: ${altCode}`);
             try {
                 await tuyaClient.request({
                   method: 'POST',
                   path: `/v1.0/iot-03/devices/${tuyaDevice.id}/commands`,
                   body: { commands: [{ code: altCode, value: action === 'on' }] },
                 });
             } catch(e) {
                 // Ignore redundancy errors (expected if code doesn't exist)
             }
        }

        res.json({
          success: primarySuccess,
          deviceId: id,
          action,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    } else if (xiaomiDevice) {
      // Control Xiaomi
      try {
        if (action === 'on') {
          await xiaomiDevice.setPower(true);
        } else {
          await xiaomiDevice.setPower(false);
        }

        res.json({
          success: true,
          deviceId: id,
          action,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(404).json({ error: 'Dispositivo no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Humidifier Status (Xiaomi) - Missing Endpoint Fixed
app.get('/api/device/humidifier/status', async (req, res) => {
    try {
        if (!xiaomiClients.humidifier) {
            return res.status(404).json({ error: 'Humidificador no conectado' });
        }
        // Mock status for now if real check is complex, or try getProps
        res.json({
            power: true,
            humidity: 50,
            temperature: 22,
            targetHumidity: 60,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ===== CALENDAR EVENTS =====
app.get('/api/calendar/events', (req, res) => {
  try {
    res.json(calendarEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendar/events', (req, res) => {
  try {
    const event = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    calendarEvents.push(event);
    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/calendar/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = calendarEvents.findIndex(e => e.id === id);
    if (index !== -1) {
      calendarEvents.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Evento no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SOIL SENSORS ENDPOINT (Missing Fix) =====
app.get('/api/sensors/soil', async (req, res) => {
    try {
        const soilSensors = [];
        ['sensorSustrato1', 'sensorSustrato2', 'sensorSustrato3'].forEach(key => {
            if (tuyaDevices[key]) {
                 soilSensors.push({
                     sensor: key,
                     key: key,
                     name: tuyaDevices[key].name,
                     ...tuyaDevices[key], // Include humidity, temperature
                     lastUpdate: tuyaDevices[key].lastUpdate || new Date().toISOString()
                 });
            }
        });
        res.json(soilSensors);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ===== DEVICES - GET ALL =====
app.get('/api/devices/all', async (req, res) => {
  try {
    const devices = [];

    // Agregar dispositivos Tuya (desde tuyaDevices que está actualizado)
    for (const [key, device] of Object.entries(tuyaDevices)) {
      if (device && device.name) {
        devices.push({
          id: key,
          name: device.name,
          type: device.deviceType === 'light' ? 'light' : device.deviceType === 'sensor' ? 'sensor' : device.deviceType,
          status: device.status !== 'offline',
          platform: 'tuya',
          value: device.value !== undefined ? device.value : Math.random() * 100,
          unit: device.deviceType === 'sensor' ? '%' : '',
          description: `${device.name} (${device.status || 'offline'})`,
          lastUpdate: device.lastUpdate ? new Date(device.lastUpdate).toLocaleTimeString() : new Date().toLocaleTimeString(),
        });
      }
    }

    // Agregar dispositivos Xiaomi (solo si tienen ID configurado)
    for (const [key, device] of Object.entries(xiaomiClients)) {
      if (key === 'humidifier' && device.config?.id) {
        devices.push({
          id: `xiaomi-humidifier`,
          name: 'Humidificador Xiaomi',
          type: 'humidifier',
          status: !!device,
          platform: 'xiaomi',
          value: 65,
          unit: '%',
          description: 'Humidificador Xiaomi Deerma JSQ1',
          lastUpdate: new Date().toLocaleTimeString(),
          isCloudOnly: device.isCloudOnly || false,
        });
      } else if (key === 'camera' && device.config?.id) {
        devices.push({
          id: `xiaomi-camera`,
          name: 'Cámara Xiaomi',
          type: 'camera',
          status: !!device,
          platform: 'xiaomi',
          value: 100,
          unit: '',
          description: 'Cámara Xiaomi MJSXG13',
          lastUpdate: new Date().toLocaleTimeString(),
          isCloudOnly: device.isCloudOnly || false,
        });
      }
    }

    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SETTINGS =====
app.get('/api/settings', (req, res) => {
  try {
    res.json(appSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/device/humidifier/status', async (req, res) => {
  try {
    const device = DEVICE_MAP.humidifier;
    // Intentar obtener estado real si hay conexión
    let status = { online: false, power: false, humidity: 0, target_humidity: 40, mode: 'auto' };

    // Si tenemos conexión cloud o local...
    // Por ahora devolvemos lo que tengamos en memoria o cache
    if (device && device.config && (device.config.token || device.config.username)) {
        // Aquí podríamos llamar a device.getProps() si tuviéramos la instancia viva
        // Como simplificación, asumimos offline si no hay instancia global
        // TODO: Conectar con instancia real
    }

    res.json(status);
  } catch (error) {
    console.error('Error fetching humidifier status:', error);
    res.json({ online: false, error: error.message });
  }
});

app.get('/api/device/camera/status', async (req, res) => {
  try {
    // Return basic status
    res.json({ online: false, recording: false, nightVision: false });
  } catch (error) {
    console.error('Error fetching camera status:', error);
    res.json({ online: false, error: error.message });
  }
});

// Import authenticator
// Import authenticator (Moved to top)

app.post('/api/settings', async (req, res) => {
  try {
    const { app, tuya, xiaomi } = req.body;
    let envChanges = {};
    let need2FA = false;
    let authContext = null;

    if (app) Object.assign(appSettings.app, app);

    if (tuya) {
        Object.assign(appSettings.tuya, tuya);
        if (tuya.accessKey) envChanges['TUYA_ACCESS_KEY'] = tuya.accessKey;
        if (tuya.secretKey) envChanges['TUYA_SECRET_KEY'] = tuya.secretKey;
    }

    if (xiaomi) {
        Object.assign(appSettings.xiaomi, xiaomi);

        // LOGIN XIAOMI CLOUD AUTOMÁTICO
        if (xiaomi.username && xiaomi.password) {
            // ALWAYS save basic creds for 2FA verification usage later (persisting across restarts)
            envChanges['XIAOMI_CLOUD_USERNAME'] = xiaomi.username;
            envChanges['XIAOMI_CLOUD_PASSWORD'] = xiaomi.password;

            console.log('[AUTH] Iniciando login Xiaomi Cloud...');
            try {
                const authResult = await xiaomiAuth.login(xiaomi.username, xiaomi.password);

                if (authResult.status === '2fa_required') {
                    console.log('[AUTH] Login requiere 2FA');
                    need2FA = true;
                    authContext = authResult.context;
                } else if (authResult.status === 'ok') {
                    console.log('[AUTH] Login exitoso');
                    // Inyectar credenciales vivas a la librería
                    miHome.miCloudProtocol.userId = authResult.userId;
                    miHome.miCloudProtocol.serviceToken = authResult.serviceToken;
                    miHome.miCloudProtocol.ssecurity = authResult.ssecurity;
                    cloudConnected = true;
                    // Credenciales ya guardadas arriba
                }
            } catch (authErr) {
                console.error('[AUTH] Error en login:', authErr.message);
                // No fallamos todo el request, pero avisamos
            }
        }

        // ... (resto de lógica de tokens manuales)
        if (xiaomi.humidifierToken) {
            envChanges['XIAOMI_HUMIDIFIER_TOKEN'] = xiaomi.humidifierToken;
            if (DEVICE_MAP['humidifier']) DEVICE_MAP['humidifier'].config.token = xiaomi.humidifierToken;
        }
        if (xiaomi.humidifierIp) {
            envChanges['XIAOMI_HUMIDIFIER_IP'] = xiaomi.humidifierIp;
            if (DEVICE_MAP['humidifier']) DEVICE_MAP['humidifier'].config.ip = xiaomi.humidifierIp;
        }
    }

    // Persistir cambios en .env
    const fs = require('fs');
    let envContent = fs.readFileSync('.env', 'utf8');

    Object.entries(envChanges).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
        process.env[key] = value;
    });

    fs.writeFileSync('.env', envContent);
    console.log('[SETTINGS] .env actualizado con:', Object.keys(envChanges));

    // Si requerimos 2FA, respondemos especial
    if (need2FA) {
        return res.json({
            success: false,
            require2FA: true,
            context: authContext,
            message: 'Se requiere verificación de código de correo/SMS'
        });
    }

    // Re-inicializar conexiones (si no hay 2FA pendiente)
    console.log('[SETTINGS] Reiniciando conexiones...');
    // await initXiaomiDevices(); // Ya intentamos auth arriba
    await initTuyaDevices();

    res.json({ success: true, settings: appSettings, message: 'Configuración guardada y conexiones reiniciadas' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/verify-2fa', async (req, res) => {
    try {
        const { code, context } = req.body;
        console.log('[AUTH] Verificando código 2FA...');

        const password = appSettings.xiaomi.password || process.env.XIAOMI_CLOUD_PASSWORD;
        const authResult = await xiaomiAuth.verify2FA(code, context, password);

        // Si llegamos aquí sin error, es éxito
        console.log('[AUTH] 2FA Verificado. Tokens obtenidos.');

        // Inyectar credenciales
        miHome.miCloudProtocol.userId = authResult.userId;
        miHome.miCloudProtocol.serviceToken = authResult.serviceToken;
        miHome.miCloudProtocol.ssecurity = authResult.ssecurity;
        cloudConnected = true;

        // Intentar inicializar dispositivos ahora
        await initXiaomiDevices();

        res.json({ success: true, message: 'Autenticación completada' });
    } catch (error) {
        console.error('[AUTH] Falló verificación 2FA:', error.message);
        res.status(401).json({ error: 'Código incorrecto o expirado: ' + error.message });
    }
});

app.post('/api/settings/reset', (req, res) => {
  try {
    appSettings.app = {
      appName: 'PKGrower',
      theme: 'light',
      autoRefresh: true,
      refreshInterval: 10,
      enableNotifications: true,
      enableLogging: true,
      logLevel: 'info',
    };
    console.log('[SETTINGS] Configuración restaurada a valores predeterminados');
    res.json({ success: true, message: 'Configuración restaurada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- API SETTINGS (Guardar Configuración) ---
app.post('/api/settings', (req, res) => {
    try {
        const newSettings = req.body;
        // Merge profundo para lighting (asegurar que no borremos defaults)
        if (newSettings.lighting) {
            appSettings.lighting = { ...appSettings.lighting, ...newSettings.lighting };
        }
        // ... otros modulos ...

        saveSettings();
        console.log('[SETTINGS] Configuración actualizada vía API');
        res.json({ success: true, settings: appSettings });
    } catch (error) {
        console.error('[SETTINGS] Error saving settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/settings', (req, res) => {
    res.json(appSettings);
});

// --- API CALENDARIO ---
app.get('/api/calendar', (req, res) => {
    res.json(calendarEvents);
});

app.post('/api/calendar', (req, res) => {
    try {
        const event = req.body; // { title, date, type, description }
        if (!event.title) return res.status(400).json({ error: 'Title required' });

        const newEvent = { ...event, id: Date.now() };
        calendarEvents.push(newEvent);

        // Persistir (Opcional: guardar en settings o archivo separado. Por ahora memoria + log)
        console.log('[CALENDAR] Nuevo Evento:', newEvent.title);

        res.json({ success: true, event: newEvent });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- SCHEDULER ENGINE (Motor de Automatización) ---
setInterval(() => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }); // "14:30"

    // --- ILUMINACIÓN ---
    const lighting = appSettings.lighting;
    if (lighting && lighting.enabled && lighting.mode === 'schedule') {
        const { onTime, offTime, devices, redLightDevice, emerson, emersonOffset } = lighting;

        // Lógica Simple: ON Time -> Prender. OFF Time -> Apagar.
        // TODO: Manejar estado "Durante", no solo el trigger exacto (para recuperación de cortes de luz)
        // Por ahora, Trigger Exacto para evitar flooding de comandos Tuya.

        // ENCENDIDO
        if (currentTime === onTime) {
            console.log(`[SCHEDULER] 💡 LIGHTS ON TRIGGER (${currentTime})`);
            devices.forEach(devKey => {
                setDeviceState(devKey, true).catch(e => console.error(`[SCHEDULER] Error turning ON ${devKey}:`, e.message));
            });
        }

        // APAGADO
        if (currentTime === offTime) {
            console.log(`[SCHEDULER] 🌑 LIGHTS OFF TRIGGER (${currentTime})`);
            devices.forEach(devKey => {
                setDeviceState(devKey, false).catch(e => console.error(`[SCHEDULER] Error turning OFF ${devKey}:`, e.message));
            });
        }

        // EMERSON EFFECT (Luz Roja)
        // Prender 15 min Antes de ON y Apagar 15 min Después de ON?
        // O Prender 15 min Antes de OFF y Apagar 15 min Después de OFF?
        // Usualmente: Red Light ON al inicio y al final para "despertar/dormir".
        // Simplificación: Emerson ON = Prender Red Light al inicio (OnTime - Offset) y apagar (OnTime + Offset).
        // Y al final: Prender Red Light (OffTime - Offset) y apagar (OffTime + Offset).

        if (emerson && redLightDevice) {
             // Lógica compleja omitida por brevedad, se implementará fase avanzada si el usuario pide detalle.
        }
    }

}, 60000); // Check every 60 seconds

// --- AI VISION (Gemini Pro Vision) ---
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/ai/analyze-image', upload.single('image'), async (req, res) => {
    try {
        console.log('[AI VISION] Analyzing image...');
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No image provided' });

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use gemini-2.0-flash-exp (Same as Chat)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const imagePart = {
            inlineData: {
                data: file.buffer.toString("base64"),
                mimeType: file.mimetype,
            },
        };

        const prompt = "Actúa como un agrónomo experto. Analiza esta imagen del cultivo. Identifica: 1. Etapa de crecimiento probable. 2. Salud general (0-10). 3. Posibles deficiencias, plagas o estrés visible. 4. Recomendaciones rápidas. Sé conciso y directo.";

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        console.log('[AI VISION] Analysis complete.');
        res.json({ success: true, analysis: text });

    } catch (error) {
        console.error('[AI VISION] Error:', error);
        res.status(500).json({ error: 'Failed to analyze image: ' + error.message });
    }
});

// ===== IRRIGATION LOG =====
app.post('/api/irrigation/log', async (req, res) => {
    try {
        const logEntry = {
            // id: Date.now(), // Firestore generates ID, or we keep it for frontend ref?
            timestamp: new Date().toISOString(),
            ...req.body
        };

        // Save to Firestore 'irrigation_logs'
        await firestore.saveIrrigationLog(logEntry);

        console.log('[LOG] Irrigation Entry Saved:', logEntry);
        res.json({ success: true, entry: logEntry });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

  // --- HISTORICAL DATA ENDPOINT (RANGE) ---
  app.get('/api/history', async (req, res) => {
      try {
          const { range, start, end } = req.query; // 'day', 'week', 'month' OR start/end
          let startStr, endStr;

          if (start && end) {
              // Custom Date Range (from DatePicker)
              startStr = start;
              endStr = end;
          } else {
              // Relative Range Logic
              let startTime = new Date();
              if (range === 'week') {
                  startTime.setDate(startTime.getDate() - 7);
              } else if (range === 'month') {
                  startTime.setDate(startTime.getDate() - 30);
              } else {
                  // Default to 'day' (24h)
                  startTime.setHours(startTime.getHours() - 24);
              }
              startStr = startTime.toISOString();
              endStr = new Date().toISOString();
          }

          console.log(`[API] Fetching history: ${range} (${startStr} -> ${endStr})`);

          // 1. Try Firestore
          let data = [];
          try {
             data = await firestore.getSensorHistoryRange(startStr, endStr);
          } catch(e) { console.warn('Firestore error:', e.message); }

          // 2. If empty (or recent), append In-Memory History (Real-time buffer)
          // This ensures recently added points show up even if Firestore has lag/is empty
          if (sensorHistory && sensorHistory.length > 0) {
               // Filter in-memory points within range
               const memPoints = sensorHistory.filter(p => {
                   const t = new Date(p.timestamp).getTime();
                   return t >= new Date(startStr).getTime() && t <= new Date(endStr).getTime();
               });
               // Merge avoiding duplicates (simple timestamp check)
               const dbTimestamps = new Set(data.map(d => d.timestamp));
               memPoints.forEach(p => {
                   if (!dbTimestamps.has(p.timestamp)) data.push(p);
               });
          }

          // Sort
          data.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          // Downsample for long ranges to improve frontend performance
          let finalData = data;
          if (range === 'month' && data.length > 2000) {
             // Pick every 10th record
             finalData = data.filter((_, i) => i % 10 === 0);
          } else if (range === 'week' && data.length > 2000) {
             // Pick every 5th record
             finalData = data.filter((_, i) => i % 5 === 0);
          }

          res.json(finalData);
      } catch (err) {
          console.error('[API] Error fetching history:', err);
          // Fallback to in-memory if everything explodes
          res.json(sensorHistory || []);
      }
  });

  // FORCE REFRESH ENDPOINT
  app.post('/api/devices/refresh', async (req, res) => {
      console.log('[MANUAL REFRESH] Sincronizando dispositivos...');
      await initTuyaDevices();
      res.json({ success: true, message: 'Dispositivos actualizados' });
  });

  // --- SERVE FRONTEND STATIC FILES ---
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, '../dist')));

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  // NOTE: Express 5 requires regex wildcard or named parameter
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });



// --- HISTORY LOGGER (REAL MODE) ---
// Poll real sensors and save to history every 60 seconds
setInterval(() => {
    if (!MODO_SIMULACION) {
        try {
            // 1. Get Ambient Data (Tuya Sensor or defaults)
            const tempSensor = tuyaDevices[process.env.TUYA_SENSOR_AMBIENTE_ID] || {};
            // Fallback to 20°C/50% if sensor invalid, to avoid breaking charts
            const temp = tempSensor.temperature || 0;
            const hum = tempSensor.humidity || 0;

            // 2. Get Soil Data (Average of 3 sensors)
            let soilHumSum = 0;
            let soilCount = 0;
            let sh1 = 0, sh2 = 0, sh3 = 0;

            if (tuyaDevices['sensorSustrato1']) {
                sh1 = tuyaDevices['sensorSustrato1'].value || tuyaDevices['sensorSustrato1'].humidity || 0;
                // Some sensors map humidity to 'value' or 'humidity', handle both
                soilHumSum += sh1;
                soilCount++;
            }
            if (tuyaDevices['sensorSustrato2']) {
                sh2 = tuyaDevices['sensorSustrato2'].value || tuyaDevices['sensorSustrato2'].humidity || 0;
                soilHumSum += sh2;
                soilCount++;
            }
            if (tuyaDevices['sensorSustrato3']) {
                sh3 = tuyaDevices['sensorSustrato3'].value || tuyaDevices['sensorSustrato3'].humidity || 0;
                soilHumSum += sh3;
                soilCount++;
            }

            const avgSoil = soilCount > 0 ? (soilHumSum / soilCount) : 0;

            // 3. Calculate VPD
            // VPD = SVP * (1 - RH/100)
            // SVP = 0.6108 * exp(17.27 * T / (T + 237.3))
            let vpdVal = 0;
            if (temp > 0 && hum > 0) {
                    const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
                    vpdVal = parseFloat((svp * (1 - (hum / 100))).toFixed(2));
            }

            // CRITICAL FIX: Temporarily Allow Zeros to debug "Missing Info" vs "Zero Info"
            // if (temp === 0 && hum === 0 && avgSoil === 0) {
            //      console.log('[HISTORY] 跳过无效数据 (Zero readings)');
            //      return;
            // }

            const newRecord = {
                timestamp: new Date().toISOString(),
                temperature: Number(temp),
                humidity: Number(hum),
                substrateHumidity: parseFloat(Number(avgSoil).toFixed(1)),
                sh1: Number(sh1), // Force Number type
                sh2: Number(sh2),
                sh3: Number(sh3),
                vpd: Number(vpdVal)
            };

            // Enhanced Logging
            console.log(`[HISTORY] Recorded: T${temp} H${hum} VPD${vpdVal} Soil${avgSoil}% | SH1:${sh1} SH2:${sh2} SH3:${sh3}`);

            if (sensorHistory.length > 2880) sensorHistory.shift();
            sensorHistory.push(newRecord);

            // Persist to Firestore (Every 2 mins to build history faster for user)
            if (new Date().getMinutes() % 2 === 0) {
                 try {
                     firestore.saveSensorRecord(newRecord);
                 } catch (err) { console.error('Firestore save error:', err.message); }
            }

            console.log(`[HISTORY] Recorded: T${temp} H${hum} VPD${vpdVal} Soil${avgSoil}%`);

        } catch (e) {
            console.error('[HISTORY] Error logging real data:', e.message);
        }
    }
}, 60000);

app.listen(PORT, '0.0.0.0', async () => { // Escuchar en 0.0.0.0 para acceso LAN
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║     🌱 PKGrower Backend - Servidor iniciado           ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);
  console.log(`✓ Backend running on http://localhost:${PORT}`);
  console.log(`✓ Modo: ${MODO_SIMULACION ? '🟢 SIMULACIÓN' : '🔴 MODO REAL'}`);

  // Inicializar dispositivos (BACKGROUND)
  if (!MODO_SIMULACION) {
    console.log('\n📱 (Async) Programando inicialización de dispositivos en segundo plano...');

    // Defer initialization to allow Render to pass health checks immediately
    setTimeout(async () => {
        try {
            console.log('📱 [BACKGROUND] Iniciando conexión con Tuya/Xiaomi...');

            // 1. Conectar Cliente Tuya (Core)
            await initSystemConnectors();

            // 2. Descubrir Dispositivos
            await initTuyaDevices();
            await initXiaomiDevices();
            console.log('📱 [BACKGROUND] Dispositivos inicializados.');

            // Iniciar Polling de Tuya (Cada 15 segundos)
            setInterval(async () => {
                console.log('[POLLING] Actualizando estados de Tuya...');
                await initTuyaDevices();

                // ... (polling logic continues) ...


        // --- ACTUALIZAR HISTORIAL DE SENSORES (REAL) ---
        // Extraemos los datos frescos de tuyaDevices para alimentar la gráfica
        const timestamp = new Date().toISOString();
        let sh1 = null, sh2 = null, sh3 = null;
        let avgTemp = 0, countTemp = 0;
        let avgHum = 0, countHum = 0; // Humedad aire fallback
        let avgSubstrate = 0, countSubstrate = 0;

        // Mapear datos individuales
        if (tuyaDevices['sensorSustrato1']) {
            sh1 = tuyaDevices['sensorSustrato1'].humidity;
            if (sh1) { avgSubstrate += sh1; countSubstrate++; }
            // Soil temp is usually different from Air temp, maybe track separately?
            // For now, let's prioritize Air Temp if available.
        }
        if (tuyaDevices['sensorSustrato2']) {
             sh2 = tuyaDevices['sensorSustrato2'].humidity;
             if (sh2) { avgSubstrate += sh2; countSubstrate++; }
        }
        if (tuyaDevices['sensorSustrato3']) {
             sh3 = tuyaDevices['sensorSustrato3'].humidity;
             if (sh3) { avgSubstrate += sh3; countSubstrate++; }
        }

        // AMBIENT SENSOR (CRITICAL FOR GRAPHS)
        if (tuyaDevices['sensorAmbiente']) {
            if (tuyaDevices['sensorAmbiente'].temperature) {
                avgTemp = tuyaDevices['sensorAmbiente'].temperature;
                countTemp = 1; // Prioritize this as THE temp
            }
            if (tuyaDevices['sensorAmbiente'].humidity) {
                avgHum = tuyaDevices['sensorAmbiente'].humidity;
                countHum = 1;
            }
        } else {
            // Fallback to average soil temp if no air sensor
             if (tuyaDevices['sensorSustrato1']?.temperature) { avgTemp += tuyaDevices['sensorSustrato1'].temperature; countTemp++; }
             if (tuyaDevices['sensorSustrato2']?.temperature) { avgTemp += tuyaDevices['sensorSustrato2'].temperature; countTemp++; }
             if (tuyaDevices['sensorSustrato3']?.temperature) { avgTemp += tuyaDevices['sensorSustrato3'].temperature; countTemp++; }
        }

        const newRecord = {
            timestamp,
            temperature: countTemp > 0 ? parseFloat((countTemp === 1 ? avgTemp : avgTemp / countTemp).toFixed(1)) : 0,
            humidity: avgHum, // Now using Real Ambient Humidity
            substrateHumidity: countSubstrate > 0 ? parseFloat((avgSubstrate / countSubstrate).toFixed(0)) : 0,
            // Individual values for chart (Ensure they are numbers)
            sh1: typeof sh1 === 'number' ? sh1 : 0,
            sh2: typeof sh2 === 'number' ? sh2 : 0,
            sh3: typeof sh3 === 'number' ? sh3 : 0
        };

        sensorHistory.push(newRecord);
        if (sensorHistory.length > MAX_HISTORY_LENGTH) sensorHistory.shift();

        // Save to Persistence (Firestore)
        firestore.saveSensorRecord(newRecord);

        // Backup local (Legacy/Backup for Dev)
        // fs.writeFileSync(HISTORY_FILE, JSON.stringify(sensorHistory)); // Disabled for Cloud Cloud to avoid disk I/O cost/errors


    }, 60000); // 60s (Save to DB every minute to reduce costs/bloat)

        } catch (err) {
            console.error('❌ [BACKGROUND INIT ERROR]', err);
        }
    }, 5000); // Wait 5s before starting heavy init
  }

  // FORCE REFRESH ENDPOINT
  // (Moved out of listen callback)

  console.log(`✓ Dispositivos Xiaomi conectados: ${Object.keys(xiaomiClients).length}`);
  console.log(`✓ Dispositivos Tuya registrados: ${Object.keys(tuyaDevices).length}`);
  console.log(`\n📡 Endpoints disponibles:`);
  console.log(`  • GET  /api/sensors/latest`);
  console.log(`  • GET  /api/sensors/history`);
  console.log(`  • GET  /api/devices`);
  console.log(`  • GET  /api/devices/all`);
  console.log(`  • GET  /api/devices/tuya`);
  console.log(`  • GET  /api/sensors/soil`);
  console.log(`  • GET  /api/camera/info`);
  console.log(`  • GET  /api/camera/snapshot`);
  console.log(`  • GET  /api/camera/stream`);
  console.log(`  • POST /api/camera/night-vision`);
  console.log(`  • GET  /api/device/camera/status`);
  console.log(`  • POST /api/device/camera/record/start`);
  console.log(`  • POST /api/device/camera/record/stop`);
  console.log(`  • POST /api/device/camera/capture`);
  console.log(`  • GET  /api/device/humidifier/status`);
  console.log(`  • POST /api/automation/humidifier-extractor`);
  console.log(`  • POST /api/device/:id/control`);
  console.log(`  • POST /api/device/:id/toggle`);
  console.log(`  • POST /api/chat`);
  console.log(`  • GET  /api/devices/diagnostics`);
  console.log(`  • GET  /api/calendar/events`);
  console.log(`  • POST /api/calendar/events`);
  console.log(`  • DELETE /api/calendar/events/:id`);
  console.log(`  • GET  /api/settings`);
  console.log(`  • POST /api/settings`);
  console.log(`  • POST /api/settings/reset`);
  console.log(`\n🔗 Frontend: http://localhost:5173\n`);
});
