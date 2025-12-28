const express = require('express');
const compression = require('compression');
const cors = require('cors');
// DEBUG: Check file system in Cloud Run
const fs = require('fs');
const path = require('path');
const distPath = path.join(__dirname, '../dist');
console.log('[DEBUG] Checking dist path:', distPath);
if (fs.existsSync(distPath)) {
    console.log('[DEBUG] dist folder EXISTS. Contents:', fs.readdirSync(distPath));
} else {
    console.error('[DEBUG] dist folder DOES NOT EXIST. Build failed or path wrong.');
}

const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
// const miio = require('miio'); // REMOVED: User requested Cloud Only
const miHome = require('node-mihome'); // Instancia Ãºnica para Cloud Protocol
const xiaomiAuth = require('./xiaomi-auth'); // Nuestro autenticador custom
const MerossCloud = require('meross-cloud'); // Meross Integration

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const firestore = require('./firestore');
const xiaomiBrowserAuth = require('./xiaomi-browser-auth');
const { AIService } = require('./services/ai-service'); // [NEW] AI Service Import

// Log para debugging - ver quÃ© se estÃ¡ leyendo del .env
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
// v2.6 - Force reload with env vars
console.log('');

const {
  MODO_SIMULACION,
  DEVICE_MAP,
  TUYA_CONFIG,
  XIAOMI_DEVICES,
  TUYA_DEVICES_MAP
} = require('./config');

// --- INICIALIZACIÃ“N DE LA APP Y CONECTORES ---
const app = express();
app.use(compression()); // Enable GZIP compression
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cors()); // Safe toggle

// RATE LIMITING (Phase 3 Optimization)
// const rateLimit = require('express-rate-limit');
// const limiter = rateLimit({
//    windowMs: 15 * 60 * 1000, // 15 minutes
//    limit: 1000, // Limit each IP to 1000 requests per windowMs
    // standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    // legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // message: { error: "Too many requests, please try again later." }
// });
// app.use(limiter);

const PORT = process.env.PORT || 3000;
// Inicializar TuyaOpenApiClient con manejo de errores
let tuyaClient = null;
let tuyaConnected = false;

// FunciÃ³n para inicializar conectores de sistema (Tuya API)
// Se invoca solo en modo REAL y de forma asÃ­ncrona para no bloquear el inicio del servidor
async function initSystemConnectors() {
  if (MODO_SIMULACION) return;

  console.log('[INIT] Iniciando conexiÃ³n con Tuya Cloud API...');
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

      // Verificar que tuyaClient estÃ¡ disponible
      if (tuyaClient && tuyaClient.request) {
        tuyaConnected = true;
        console.log('[INFO] TuyaOpenApiClient inicializado correctamente');
        console.log('[INFO] API Host:', TUYA_CONFIG.apiHost);
      } else {
        console.log('[WARN] TuyaOpenApiClient no tiene mÃ©todo request');
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
let xiaomiClients = {};
let tuyaDevices = {}; // Cache de estado de dispositivos Tuya (Map: key -> status)
let merossClient = null;
let merossDevices = {}; // Cache de dispositivos Meross (Map: id -> device)
let cloudConnected = false; // Estado de conexión Xiaomi Cloud
let automationRules = []; // Reglas de automatización cargadas de Firestore
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
    pumpRate: 70, // ml/minuto (CalibraciÃ³n default)
    targetVWC: 60,
    drybackTarget: 20
  },
  cropSteering: {
    stage: 'none', // 'veg', 'flower', 'none'
    targetVWC: 50,
    targetDryback: 15
  }
};

// --- CUSTOM DEVICES MANAGEMENT ---
// Devices configured by user in Frontend (persisted in Firestore)
let customDeviceConfigs = {};

async function loadCustomDevices() {
    try {
        customDeviceConfigs = await firestore.getDeviceConfigs();
        console.log(`[INIT] Custom devices loaded: ${Object.keys(customDeviceConfigs).length}`);
    } catch(e) {
        console.warn('[WARN] Failed to load custom devices:', e.message);
    }
}


// --- PERSISTENCIA ---
// const fs = require('fs'); // Removed duplicate

// const SETTINGS_FILE = path.join(__dirname, 'settings.json'); // REMOVED: Render has no persistent disk
// Instead, we use a global settings object maintained in memory and persisted to Firestore
// We will load this on startup AFTER firestore init
// ... (loadSettings/saveSettings stay same)

// --- HEALTH CHECK (PUBLIC) ---
// Must be defined BEFORE Security Middleware to allow Cloud Run/Uptime checks
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- HELPER: Pump Auto-Detection ---
function autoDetectPumpID() {
    // 1. Check override in settings
    if (appSettings.irrigation?.pumpId) return appSettings.irrigation.pumpId;

    // 2. Search in Meross Devices (Priority)
// Helper: Normalize string
    const normalize = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const TERMS = ['bomba', 'agua', 'pump', 'water'];
    const isMatch = (str) => {
        if (!str) return false;
        const norm = normalize(str);
        return TERMS.some(t => norm.includes(t));
    };

    // 1. Check override in settings (BUT VERIFY IT EXISTS)
    if (appSettings.irrigation?.pumpId) {
        const id = appSettings.irrigation.pumpId;
        // Verify existence to avoid phantom IDs blocking auto-detect
        if (merossDevices[id] || tuyaDevices[id]) {
            return id;
        }
        console.log(`[PUMP] Stale pump ID in settings (${id}) - Device not found. Retrying auto-detect...`);
    }

    // 2. Search in Meross Devices (Priority)
    for (const key of Object.keys(merossDevices)) {
        const d = merossDevices[key];
        const candidates = [
            d.name,
            d.customName,
            d.device?.def?.name,
            d.device?.def?.uuid
        ];

        // Check custom config override
        if (typeof customDeviceConfigs !== 'undefined' && customDeviceConfigs[key]) {
            candidates.push(customDeviceConfigs[key].name);
        }

        if (candidates.some(isMatch)) {
            console.log(`[PUMP] Auto-detected Meross (Deep): ${d.name} (${key})`);
            return key;
        }
    }

    // 3. Search in Tuya Devices
    for (const key of Object.keys(tuyaDevices)) {
        const d = tuyaDevices[key];
        if (d.deviceType === 'sensor') continue;

        const candidates = [
            d.name,
            d.cloudDevice?.name,
            d.cloudDevice?.local_name,
            d.cloudDevice?.product_name
        ];

        // Check custom config override
        if (typeof customDeviceConfigs !== 'undefined' && customDeviceConfigs[d.id]) {
            candidates.push(customDeviceConfigs[d.id].name);
        }

        if (candidates.some(isMatch)) {
             console.log(`[PUMP] Auto-detected Tuya (Deep): ${d.name} (${key})`);
             return key;
        }
    }

    // 4. Fallback default
    return 'bombaControlador';
}

// --- DEBUG ENDPOINT ---
app.get('/api/debug/pump', (req, res) => {
    try {
        const detectedId = autoDetectPumpID();

        const getCandidates = (d, platform) => {
            const list = [d.name];
            if (platform === 'meross') {
                if(d.customName) list.push(d.customName);
                if(d.device?.def?.name) list.push(d.device.def.name);
            } else if (platform === 'tuya') {
                 if(d.cloudDevice?.name) list.push(d.cloudDevice.name);
                 if(d.cloudDevice?.product_name) list.push(d.cloudDevice.product_name);
            }
             if (typeof customDeviceConfigs !== 'undefined' && customDeviceConfigs[d.id]) {
                list.push(`Custom: ${customDeviceConfigs[d.id].name}`);
            }
            return list;
        };

        const merossList = Object.values(merossDevices).map(d => ({
            id: d.id,
            name: d.name,
            candidates: getCandidates(d, 'meross')
        }));
        const tuyaList = Object.values(tuyaDevices).map(d => ({
            id: d.id,
            name: d.name,
            candidates: getCandidates(d, 'tuya')
        }));

        res.json({
            success: true,
            detectedId,
            merossDevices: merossList,
            tuyaDevices: tuyaList,
            message: detectedId === 'bombaControlador' ? 'Using default/fallback ID' : 'Auto-detected successfully'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- HELPER: Unified Device Control ---
async function setDeviceState(deviceId, state) {
    if (MODO_SIMULACION) {
        deviceStates[deviceId] = state;
        return;
    }

    // Resolve Alias for Pump
    let targetId = deviceId;
    if (deviceId === 'bombaControlador') {
        targetId = autoDetectPumpID();
        if (targetId !== deviceId) {
             console.log(`[CONTROL] Redirecting 'bombaControlador' to '${targetId}'`);
        }
    }

    // 1. Tuya
    const tDev = tuyaDevices[targetId] || Object.values(tuyaDevices).find(d => d.id === targetId);
    if (tDev) {
        const code = tDev.switchCode || 'switch_1';
        try {
            await tuyaClient.request({
                method: 'POST',
                path: `/v1.0/iot-03/devices/${tDev.id}/commands`,
                body: { commands: [{ code: code, value: state }] }
            });
            tDev.on = state;
            return;
        } catch(e) {
            console.error(`[CONTROL] Tuya Error (${targetId}):`, e.message);
        }
    }

    // 2. Xiaomi
    const deviceConfig = DEVICE_MAP[targetId];
    if ((deviceConfig && deviceConfig.platform === 'xiaomi') || xiaomiClients[targetId]) {
        const client = xiaomiClients[targetId];
        if (client) {
            try {
                if (client.setPower) await client.setPower(state);
                else await client.call('set_power', [state ? 'on' : 'off']);
            } catch(e) {
                console.error(`[CONTROL] Xiaomi Error (${targetId}):`, e.message);
            }
        }
    }

    // 3. Meross
    if (merossDevices[targetId]) {
         try {
             const mDev = merossDevices[targetId].deviceInstance || merossDevices[targetId];
             if (mDev && mDev.controlToggleX) {
                 mDev.controlToggleX(0, state, () => {});
             }
         } catch(e) {
            console.error(`[CONTROL] Meross Error (${targetId}):`, e.message);
         }
    }
}

// --- CLOUD SCHEDULER KEEP-ALIVE ENDPOINT ---
// This endpoint should be called by Cloud Scheduler every 5 minutes
// to keep the instance alive and run background tasks
app.post('/api/tick', async (req, res) => {
    const tickStart = Date.now();
    console.log('[TICK] ⏰ Cloud Scheduler heartbeat received');

    const results = {
        timestamp: new Date().toISOString(),
        tasks: {},
        errors: []
    };

    try {
        // 1. Refresh Tuya devices (if not in simulation mode)
        if (!MODO_SIMULACION && tuyaConnected && tuyaClient) {
            try {
                console.log('[TICK] Refreshing Tuya devices...');
                await initTuyaDevices();
                results.tasks.tuya = 'refreshed';
            } catch (e) {
                console.error('[TICK] Tuya refresh error:', e.message);
                results.errors.push({ task: 'tuya', error: e.message });
            }
        }

        // 2. Run scheduler logic (lighting)
        try {
            runSchedulerTick();
            results.tasks.scheduler = 'executed';
        } catch (e) {
            console.error('[TICK] Scheduler error:', e.message);
            results.errors.push({ task: 'scheduler', error: e.message });
        }

        // 3. Run automation rules
        try {
            await runAutomationRulesTick();
            results.tasks.automation = 'executed';
        } catch (e) {
            console.error('[TICK] Automation error:', e.message);
            results.errors.push({ task: 'automation', error: e.message });
        }

        // 4. Save sensor data snapshot (if real mode)
        if (!MODO_SIMULACION) {
            try {
                await saveSensorSnapshot();
                results.tasks.sensors = 'saved';
            } catch (e) {
                console.error('[TICK] Sensor save error:', e.message);
                results.errors.push({ task: 'sensors', error: e.message });
            }
        }

        results.duration = Date.now() - tickStart;
        console.log(`[TICK] ✅ Completed in ${results.duration}ms`);
        res.json({ success: true, ...results });

    } catch (e) {
        console.error('[TICK] Critical error:', e.message);
        res.status(500).json({ success: false, error: e.message, ...results });
    }
});

// --- SCHEDULER TICK FUNCTION (Extracted from setInterval) ---
function runSchedulerTick() {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

    // --- LIGHTING ---
    const lighting = appSettings.lighting;
    if (lighting && lighting.enabled && lighting.mode === 'schedule') {
        const { onTime, offTime, devices } = lighting;

        // Check if we should be ON or OFF based on current time
        // This handles recovery from cold starts (not just exact trigger)
        const shouldBeOn = isTimeBetween(currentTime, onTime, offTime);

        console.log(`[SCHEDULER-TICK] Time: ${currentTime}, OnTime: ${onTime}, OffTime: ${offTime}, ShouldBeOn: ${shouldBeOn}`);

        // Set all light devices to the correct state
        if (devices && devices.length > 0) {
            devices.forEach(devKey => {
                setDeviceState(devKey, shouldBeOn).catch(e =>
                    console.error(`[SCHEDULER-TICK] Error setting ${devKey} to ${shouldBeOn}:`, e.message)
                );
            });
        }
    }
}

// Helper: Check if current time is between start and end times (handles overnight)
function isTimeBetween(current, start, end) {
    // Convert "HH:MM" to minutes since midnight
    const toMinutes = (t) => {
        if (!t || typeof t !== 'string') return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
    };

    const curr = toMinutes(current);
    const s = toMinutes(start);
    const e = toMinutes(end);

    // Handle overnight (e.g., start=18:00, end=06:00)
    if (s > e) {
        return curr >= s || curr < e;
    }
    return curr >= s && curr < e;
}

// --- AUTOMATION RULES TICK FUNCTION ---
async function runAutomationRulesTick() {
    if (!automationRules || automationRules.length === 0) return;

    const latest = sensorHistory && sensorHistory.length > 0
        ? sensorHistory[sensorHistory.length - 1]
        : null;
    if (!latest) return;

    for (const rule of automationRules) {
        if (!rule.enabled) continue;

        try {
            let val = latest[rule.sensor];
            if (val === undefined || val === null) continue;
            val = Number(val);

            let triggered = false;
            const threshold = Number(rule.value);

            if (rule.operator === '>' && val > threshold) triggered = true;
            if (rule.operator === '<' && val < threshold) triggered = true;
            if (rule.operator === '=' && val === threshold) triggered = true;

            if (triggered) {
                const targetState = rule.action === 'on';
                console.log(`[RULES-TICK] Triggered: ${rule.name}. Setting ${rule.deviceId} to ${rule.action}`);

                await setDeviceState(rule.deviceId, targetState);
            }
        } catch (e) {
            console.error(`[RULES-TICK] Error processing rule ${rule.name}:`, e.message);
        }
    }
}

// --- SENSOR SNAPSHOT FUNCTION ---
// --- SENSOR SNAPSHOT FUNCTION ---
async function saveSensorSnapshot() {
    if (MODO_SIMULACION) return;

    // Aggregate sensor data from tuyaDevices cache
    let avgTemp = 0, avgHum = 0, avgSubstrate = 0;
    let countTemp = 0, countHum = 0, countSubstrate = 0;

    // Environment sensor
    if (tuyaDevices['sensorAmbiente']) {
        if (tuyaDevices['sensorAmbiente'].temperature !== undefined) {
            avgTemp = tuyaDevices['sensorAmbiente'].temperature;
            countTemp = 1;
        }
        if (tuyaDevices['sensorAmbiente'].humidity !== undefined) {
            avgHum = tuyaDevices['sensorAmbiente'].humidity;
            countHum = 1;
        }
    }

    // Substrate sensors (Enhanced check for humidity or value)
    ['sensorSustrato1', 'sensorSustrato2', 'sensorSustrato3'].forEach(key => {
        const dev = tuyaDevices[key];
        const val = dev?.humidity !== undefined ? dev.humidity : dev?.value;
        if (val !== undefined && val !== null) {
            avgSubstrate += val;
            countSubstrate++;
        }
    });

    const temp = countTemp > 0 ? parseFloat(avgTemp.toFixed(1)) : null;
    const hum = countHum > 0 ? parseFloat(avgHum.toFixed(0)) : null;
    const sub = countSubstrate > 0 ? parseFloat((avgSubstrate / countSubstrate).toFixed(0)) : null;

    // CRITICAL: Do not log zeroes if they look invalid (basic sanity check)
    if (temp === 0 && hum === 0) return;

    const newRecord = {
        timestamp: new Date().toISOString(),
        temperature: temp,
        humidity: hum,
        substrateHumidity: sub
    };

    // Only save if we have at least one valid reading
    if (newRecord.temperature !== null || newRecord.humidity !== null) {
        sensorHistory.push(newRecord);
        if (sensorHistory.length > MAX_HISTORY_LENGTH) sensorHistory.shift();

        try {
            await firestore.saveSensorRecord(newRecord);
            console.log('[TICK] Sensor snapshot saved:', newRecord);
        } catch (e) {
            console.error('[TICK] Error saving snapshot:', e.message);
        }
    }
}

// --- SECURITY MIDDLEWARE ---
// Protect all routes with API Key (only when API_KEY is set)
const API_KEY = process.env.API_KEY;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

app.use('/api', (req, res, next) => {
    // Exempt CORS preflight (OPTIONS)
    if (req.method === 'OPTIONS') return next();

    // In Cloud Run production without API_KEY configured, skip auth
    // The service is protected by Cloud Run IAM / allow-unauthenticated setting
    if (IS_PRODUCTION && !API_KEY) {
        return next();
    }

    // EXEMPTIONS: Allow Dashboard Read-Only access without strict Key (Fixes 401 on refresh)
    // Only apply for GET requests to specific data endpoints
    if (req.method === 'GET' && (
        req.path.startsWith('/sensors') ||
        req.path.startsWith('/devices') ||
        req.path.startsWith('/settings') ||
        req.path.startsWith('/history') ||
        req.path.startsWith('/irrigation') ||
        req.path.startsWith('/calendar') ||
        req.path.startsWith('/ai')
    )) {
        return next();
    }

    // Check Header - Only enforce if API_KEY is configured
    const clientKey = req.headers['x-api-key'];
    if (API_KEY && clientKey !== API_KEY) {
        console.warn(`[SECURITY] Unauthorized access attempt from ${req.ip} to ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    next();
});

// --- API IRRIGATION EVENTS (GET) ---
app.get('/api/irrigation/events', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Try to get irrigation events from Firestore
        let events = [];
        try {
            if (firestore && firestore.getIrrigationEvents) {
                events = await firestore.getIrrigationEvents(targetDate);
            }
        } catch (e) {
            console.log('[IRRIGATION] No events found or Firestore error:', e.message);
        }

        res.json({
            success: true,
            date: targetDate,
            events: events || []
        });
    } catch (error) {
        console.error('[IRRIGATION] Error getting events:', error);
        res.json({ success: true, date: req.query.date, events: [] });
    }
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

        console.log(`[IRRIGATION] ðŸ’§ Shot Request: ${percentage}% of ${config.potSize}L`);
        console.log(`[IRRIGATION] -> Volume: ${volumeMl}ml. Duration: ${durationMs}ms`);

        // 3. Ejecutar Disparo
        const pumpKey = autoDetectPumpID();

        // Prender
        await setDeviceState(pumpKey, true);

        // Temporizador Apagado
        setTimeout(async () => {
            await setDeviceState(pumpKey, false);
            console.log(`[IRRIGATION] âœ… Shot Complete (${durationMs}ms)`);
        }, durationMs);

        res.json({ success: true, message: `Riego iniciado: ${volumeMl}ml (${(durationMs/1000).toFixed(1)}s)` });
    } catch (error) {
        console.error('[IRRIGATION] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/*
async function loadSettings() {
    try {
        const remoteSettings = await firestore.getGlobalSettings();
        if (remoteSettings && Object.keys(remoteSettings).length > 0) {
            appSettings = { ...appSettings, ...remoteSettings };
            // Populate process.env overrides
            if (appSettings.tuya.accessKey) process.env.TUYA_ACCESS_KEY = appSettings.tuya.accessKey;
            if (appSettings.tuya.secretKey) process.env.TUYA_SECRET_KEY = appSettings.tuya.secretKey;
            // Meross
            if (appSettings.meross) {
                if (appSettings.meross.email) process.env.MEROSS_EMAIL = appSettings.meross.email;
                if (appSettings.meross.password) process.env.MEROSS_PASSWORD = appSettings.meross.password;
            }
            console.log('[SETTINGS] Loaded from Firestore.');
        } else {
            console.log('[SETTINGS] No remote settings found. Using defaults/env.');
        }
    } catch(e) {
        console.warn('[SETTINGS] Load error:', e.message);
    }
}
*/
async function loadSettings() {
    try {
        const remoteSettings = await firestore.getGlobalSettings();
        if (remoteSettings && Object.keys(remoteSettings).length > 0) {
            // Deep merge to preserve defaults
            if (remoteSettings.app) Object.assign(appSettings.app, remoteSettings.app);
            if (remoteSettings.tuya) Object.assign(appSettings.tuya, remoteSettings.tuya);
            if (remoteSettings.xiaomi) Object.assign(appSettings.xiaomi, remoteSettings.xiaomi);

            // Meross Special Handling
            if (remoteSettings.meross) {
                 process.env.MEROSS_EMAIL = remoteSettings.meross.email;
                 process.env.MEROSS_PASSWORD = remoteSettings.meross.password;
                 console.log('[SETTINGS] Meross credentials restored from database.');
                 appSettings.meross = remoteSettings.meross; // Ensure it's in appSettings structure if needed
            }

            // Sync Process Env for Tuya/Xiaomi
            if (appSettings.tuya.accessKey) process.env.TUYA_ACCESS_KEY = appSettings.tuya.accessKey;
            if (appSettings.tuya.secretKey) process.env.TUYA_SECRET_KEY = appSettings.tuya.secretKey;

            console.log('[SETTINGS] Loaded from Firestore.');
        } else {
            console.log('[SETTINGS] No remote settings found. Using defaults/env.');
        }
    } catch(e) {
        console.warn('[SETTINGS] Load error:', e.message);
    }
}

async function saveSettings() {
    try {
         // Create a clean object to save (remove secrets from logs if we were logging)
         const toSave = {
             app: appSettings.app,
             tuya: appSettings.tuya,
             xiaomi: appSettings.xiaomi,
             meross: {
                 email: process.env.MEROSS_EMAIL,
                 password: process.env.MEROSS_PASSWORD
             }
         };
         await firestore.saveGlobalSettings(toSave);
         console.log('[SETTINGS] Saved to Firestore.');
    } catch (err) {
        console.error('[SETTINGS] Error saving settings:', err.message);
    }
}

// Cargar configuraciÃ³n al inicio
loadSettings();

// --- CREDENCIALES XIAOMI CLOUD (Opcional, para control fuera de casa) ---
const XIAOMI_CLOUD_CREDENTIALS = {
  username: process.env.XIAOMI_CLOUD_USERNAME,
  password: process.env.XIAOMI_CLOUD_PASSWORD,
  region: process.env.XIAOMI_CLOUD_REGION || 'us', // us, de, si, cn
};

// FunciÃ³n Helper para llamadas Xiaomi seguras (Auto-Login en 401)
async function safeXiaomiCall(operationName, operationFn) {
    try {
        return await operationFn();
    } catch (error) {
        // Detectar si es error de Auth (401 o mensaje de token)
        const msg = error.message || '';
        const isAuthError = msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('token expired') || msg.includes('1001'); // 1001 a veces es auth

        if (isAuthError) {
            console.log(`[XIAOMI-AUTO-REFRESH] âš ï¸ SesiÃ³n expirada en ${operationName}. Renovando...`);
            try {
                // Leer credenciales frescas (pueden haber cambiado en settings)
                const user = process.env.XIAOMI_CLOUD_USERNAME;
                const pass = process.env.XIAOMI_CLOUD_PASSWORD;

                if (!user || !pass) throw new Error('Credenciales no configuradas');

                // Usamos nuestro xiaomiAuth para obtener tokens frescos
                const authRes = await xiaomiAuth.login(user, pass);

                if (authRes.status === 'ok') {
                    // Inyectar en la librerÃ­a
                    miHome.miCloudProtocol.userId = authRes.userId;
                    miHome.miCloudProtocol.serviceToken = authRes.serviceToken;
                    miHome.miCloudProtocol.ssecurity = authRes.ssecurity;

                    console.log('[XIAOMI-AUTO-REFRESH] âœ“ SesiÃ³n renovada. Reintentando...');
                    return await operationFn();
                } else {
                    console.error('[XIAOMI-AUTO-REFRESH] âŒ RenovaciÃ³n fallÃ³ (Status: ' + authRes.status + ')');
                }
            } catch (authErr) {
                 console.error('[XIAOMI-AUTO-REFRESH] âŒ Error fatal renovaciÃ³n:', authErr.message);
            }
        }
        throw error; // Re-lanzar si no se pudo arreglar
    }
}

// FunciÃ³n para conectar dispositivos Xiaomi
// FunciÃ³n para conectar dispositivos Xiaomi (CLOUD ONLY)
async function initXiaomiDevices() {
  if (MODO_SIMULACION) {
    console.log('[INFO] Modo simulaciÃ³n activado.');
    return;
  }

  console.log('[XIAOMI-CLOUD] Inicializando conexiÃ³n Cloud...');

  // 1. Authenticate with Captured Tokens (Priority)
  // We prefer using the captured tokens over username/password login
  if (process.env.XIAOMI_USER_ID && process.env.XIAOMI_SERVICE_TOKEN && process.env.XIAOMI_SSECURITY) {
      console.log('[XIAOMI-CLOUD] ðŸ”“ Usando tokens capturados (userId/serviceToken/ssecurity)');

      // Inject into node-mihome
      miHome.miCloudProtocol.userId = process.env.XIAOMI_USER_ID;
      miHome.miCloudProtocol.serviceToken = process.env.XIAOMI_SERVICE_TOKEN;
      miHome.miCloudProtocol.ssecurity = process.env.XIAOMI_SSECURITY;

      // Manually set isLoggedIn true if library allows, or just assuming calls will work
      // node-mihome doesn't have a public 'isLoggedIn' property usually, but setting tokens is enough.
  } else if (XIAOMI_CLOUD_CREDENTIALS.username && XIAOMI_CLOUD_CREDENTIALS.password) {
       console.log('[XIAOMI-CLOUD] âš ï¸ No hay tokens capturados. Intentando login Legacy (puede fallar por 2FA)...');
       try {
          await miHome.miCloudProtocol.login(XIAOMI_CLOUD_CREDENTIALS.username, XIAOMI_CLOUD_CREDENTIALS.password);
          console.log('[XIAOMI-CLOUD] âœ“ Login Legacy exitoso.');
       } catch (e) {
          console.error('[XIAOMI-CLOUD] âŒ FallÃ³ login Legacy:', e.message);
          console.warn('ðŸ‘‰ Por favor ejecuta "node backend/login-cloud-permanent.js" para capturar tokens nuevos.');
       }
  } else {
      console.warn('[XIAOMI-CLOUD] âš ï¸ No hay credenciales ni tokens. La conexiÃ³n fallarÃ¡.');
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
     console.log(`  âœ“ [CLOUD LISTENER] ${deviceName} ready.`);
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

         // DEBUG: Log status codes for soil sensors if humidity/temp not found
         if (mapDef.category === 'soil_sensor') {
             console.log(`[DEBUG-SENSOR] ${key} (${mapDef.name}) codes:`, cloudDevice.status.map(s => `${s.code}=${s.value}`).join(', '));
         }

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

      console.log(`[âœ“ MAPPED] ${mapDef.name} (${mapDef.id}) - ONLINE`);
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
      // ignore devices already mapped strictly
      if (mappedIds.has(cloudDevice.id)) return;

      // EXPLICIT FILTER: Remove old "Panel 3" specifically requested by user
      if (cloudDevice.id === 'eb854fi6faf2sfwl') {
          console.log('[FILTER] Ignoring old Panel 3 device (eb854fi6faf2sfwl)');
          return;
      }

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

          console.log(`[â˜… AUTO-DISCOVERED] ${cloudDevice.name} (${cloudDevice.id})`);
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

        console.warn('[WARN] Tuya no devolviÃ³ lista masiva. Iniciando Plan B...');
        // ... Log logic ...

        await syncTuyaDevicesIndividual();
        return;
    }

    const devices = data.result.devices;

// Log seguro para diagnÃ³sitco
if (data) {
    console.log(`[DEBUG-TUYA] API Status: success=${data.success}, msg="${data.msg || 'OK'}"`);
}

    // FALLBACK: Si la lista masiva falla o viene vacÃ­a, consultar dispositivos individualmente
    if (!devices || devices.length === 0) {
        console.log('[WARN] Tuya no devolviÃ³ lista masiva. Iniciando consulta individual de dispositivos (Plan B)...');
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
                    // console.log(`  âœ— No datos para: ${mapDef.name}`);
                }
             } catch(e) {
                console.log(`  âœ— Error consultando ${mapDef.name}: ${e.message}`);
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
      // FIX: Do NOT clear old devices. Merge new ones. This prevents data loss if API returns partial list.
      // for (const key in tuyaDevices) delete tuyaDevices[key];
      Object.assign(tuyaDevices, mappedDevices);

      console.log(`[INFO] SincronizaciÃ³n completada. ${Object.keys(tuyaDevices).length} dispositivos en sistema.`);
    }
  } catch (error) {
    console.error('[ERROR] Fallo sincronizaciÃ³n Tuya:', error.message);
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
            console.warn(`  âœ— Error consultando ${mapDef.name}: ${e.message}`);
         }
    }

    if (fallbackDevices.length > 0) {
        console.log(`[Plan B] Recuperados ${fallbackDevices.length} dispositivos individualmente.`);

        // Process them
        const mappedDevices = processTuyaDevices(fallbackDevices);

        // Update global object
        // FIX: Do NOT clear old devices. Merge new ones.
        // for (const key in tuyaDevices) delete tuyaDevices[key];
        Object.assign(tuyaDevices, mappedDevices);

        console.log(`[CLOUD] Procesando ${fallbackDevices.length} dispositivos Tuya.`);
        console.log(`[INFO] SincronizaciÃ³n completada. ${Object.keys(tuyaDevices).length} dispositivos en sistema.`);
    } else {
        console.warn("[Plan B] No se pudieron recuperar dispositivos.");
    }
};

// Initialize Meross Devices - See initMerossDevices() in MEROSS INTEGRATION section (~line 2400)

// Inicializar dispositivos Xiaomi y Tuya si no estamos en modo simulaciÃ³n
if (!MODO_SIMULACION) {
  // Esperar un poco para que el servidor estÃ© listo, luego intentar conexiÃ³n
  setTimeout(() => {
    loadCustomDevices(); // Load custom configs first
    initXiaomiDevices().catch(err => {
      console.error('[ERROR] Fatal al inicializar Xiaomi:', err);
    });
    initTuyaDevices().catch(err => {
      console.error('[ERROR] Fatal al inicializar Tuya:', err);
    });
    initMerossDevices().catch(err => {
      console.error('[ERROR] Fatal al inicializar Meross:', err);
    });
  }, 1000);
}

app.use(express.json());

// --- LÃ“GICA DE SIMULACIÃ“N (SI ESTÃ ACTIVADA) ---
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
  camera: false, // AÃ±adimos la cÃ¡mara al estado de simulaciÃ³n
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

// --- CALENDAR ROUTE MOUNT ---
app.use('/api/calendar', require('./routes/calendar')({
    getEvents: () => calendarEvents,
    addEvent: (evt) => calendarEvents.push(evt),
    removeEvent: (id) => {
        const index = calendarEvents.findIndex(e => e.id == id); // Loose equality for string/number
        if (index !== -1) {
            calendarEvents.splice(index, 1);
            return true;
        }
        return false;
    }
}));

// [REMOVED DUPLICATE SENSOR ENDPOINT - USE THE ONE BELOW]

// --- SENSORS ROUTE MOUNT ---
app.use('/api/sensors', require('./routes/sensors')({
    getTuyaDevices: () => tuyaDevices,
    getSimulationMode: () => MODO_SIMULACION,
    firestore: firestore,
}));

// --- DEVICES ROUTE MOUNT ---
const devicesRouter = require('./routes/devices')({
    getTuyaDevices: () => tuyaDevices,
    getTuyaStatus: () => ({ connected: tuyaConnected, config: TUYA_CONFIG }),
    getMerossDevices: () => merossDevices,
    getXiaomiClients: () => xiaomiClients,
    getDeviceMap: () => DEVICE_MAP,
    getCustomConfigs: () => customDeviceConfigs,
    getSimulationMode: () => MODO_SIMULACION,
    getDeviceStates: () => deviceStates,
    setDeviceStates: (s) => { deviceStates = s; },
    tuyaClient: tuyaClient,
    firestore: firestore,
    initTuyaDevices: initTuyaDevices,
    initMerossDevices: initMerossDevices,
    getTuyaConnected: () => tuyaConnected
});

app.use('/api/devices', devicesRouter);
app.use('/api/device', devicesRouter); // Alias for compatibility
app.use('/api/camera', devicesRouter); // Alias for camera
app.use('/api/automation', devicesRouter); // Alias for automation endpoints defined there

// Removing legacy duplicate endpoints implemented in module...

// NOTE: /api/sensors/latest is defined later in the file (around line 1804)
// with proper VPD calculation. Removed duplicate endpoint here.

// Dispositivos (combinado Tuya y Xiaomi)

// FIX: Use native 'https' to avoid dependency issues with fetch in older Node versions
const https = require('https');

// CACHE DE RESPALDO (In-Memory)
let lastAiResponse = "ðŸŒ¿ Todo se ve nominal. Los parÃ¡metros estÃ¡n estables. Â¡Sigue asÃ­! (Modo Respaldo)";
let lastAiCallTimestamp = 0;
const AI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache


// [REMOVED LEGACY AI SERVICE IMPLEMENTATION]


// --- MEROSS INTEGRATION ---
async function initMerossDevices() {
    if (MODO_SIMULACION) {
        console.log('[MEROSS] Simulation Mode. Skipping connection.');
        return;
    }

    const email = process.env.MEROSS_EMAIL || appSettings.meross?.email;
    const password = process.env.MEROSS_PASSWORD || appSettings.meross?.password;

    if (!email || !password) {
        console.warn('[MEROSS] Meross credentials missing. Skipping.');
        return;
    }

    try {
        console.log(`[MEROSS] Connecting as ${email}...`);
        merossClient = new MerossCloud({
            email,
            password,
            logger: console.log
        });

        // Event Listeners
        merossClient.on('deviceInitialized', (deviceId, deviceDef, device) => {
            console.log(`[MEROSS] New Device: ${deviceDef.name} (${deviceDef.type})`);
            merossDevices[deviceId] = {
                id: deviceId,
                name: deviceDef.name,
                type: deviceDef.type,
                online: device.online,
                device: device // Keep reference for control
            };
        });

        merossClient.on('data', (deviceId, namespace, payload) => {
             // console.log(`[MEROSS] Data from ${deviceId}:`, payload);
             // Update status if needed
        });

        // Connect
        await merossClient.connect();
        console.log('[MEROSS] Successfully connected!');

    } catch (e) {
        console.error('[MEROSS] Connection failed:', e.message);
    }
}

// [REMOVED DUPLICATE] GET /api/sensors/soil - Duplicate of ~2410

// ===== DEVICES - GET ALL =====
app.get('/api/devices/all', async (req, res) => {
  try {
    const devices = [];

    // Agregar dispositivos Tuya (desde tuyaDevices que estÃ¡ actualizado)
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
          properties: {
              ...device, // Include all internal props
              online: device.status !== 'offline'
          }
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
          name: 'CÃ¡mara Xiaomi',
          type: 'camera',
          status: !!device,
          platform: 'xiaomi',
          value: 100,
          unit: '',
          description: 'CÃ¡mara Xiaomi MJSXG13',
          lastUpdate: new Date().toLocaleTimeString(),
          isCloudOnly: device.isCloudOnly || false,
        });
      }
    }

    // Agregar dispositivos Meross to output
    for (const [key, device] of Object.entries(merossDevices)) {
        devices.push({
            id: device.id,
            name: device.name,
            type: device.type || 'outlet',
            status: device.online,
            platform: 'meross',
            value: 0,
            unit: '',
            description: `${device.name} (Meross)`,
            lastUpdate: new Date().toLocaleTimeString(),
            properties: {
                online: device.online,
                type: device.type
            }
        });
    }

    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    res.json(appSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// [REMOVED DUPLICATE] GET /api/device/humidifier/status - Duplicate of ~2700

// [REMOVED DUPLICATE] GET /api/device/camera/status - Duplicate of ~2441

// Import authenticator
// Import authenticator (Moved to top)

// --- SETTINGS ROUTE MOUNT ---
app.use('/api/settings', require('./routes/settings')({
    getSettings: () => appSettings,
    saveSettings: saveSettings,
    resetSettings: async () => {
         appSettings.app = {
              appName: 'PKGrower',
              theme: 'light',
              autoRefresh: true,
              refreshInterval: 10,
              enableNotifications: true,
              enableLogging: true,
              logLevel: 'info',
         };
         // Note: Does not reset connection configs (Tuya/Xiaomi)
         await saveSettings();
    },
    reconnectTuya: initTuyaDevices,
    reconnectMeross: initMerossDevices,
    reconnectXiaomi: initXiaomiDevices,
    xiaomiAuth: xiaomiAuth,
    miHome: miHome,
    setEnv: (key, val) => { process.env[key] = val; },
    setCloudConnected: (val) => { cloudConnected = val; }
}));


// [REMOVED DUPLICATE] POST /api/settings - Duplicate of ~3124

// [REMOVED DUPLICATE] GET /api/settings - Duplicate of ~3082

// --- API CROP STEERING ---
app.get('/api/cropsteering/settings', async (req, res) => {
    try {
        const settings = await firestore.getCropSteeringSettings();
        res.json({ success: true, settings: settings || appSettings.cropSteering });
    } catch (error) {
        console.error('[CROPSTEERING] Error getting settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cropsteering/settings', async (req, res) => {
    try {
        const newSettings = req.body;

        // Update in-memory settings
        appSettings.cropSteering = { ...appSettings.cropSteering, ...newSettings };

        // Ensure stage compatibility (sync currentStage -> stage)
        if (newSettings.currentStage) {
            appSettings.cropSteering.stage = newSettings.currentStage;
        }

        // Persist to Firestore
        await firestore.saveCropSteeringSettings(appSettings.cropSteering);

        console.log('[CROPSTEERING] Settings updated:', Object.keys(newSettings).join(', '));
        res.json({ success: true, settings: appSettings.cropSteering });
    } catch (error) {
        console.error('[CROPSTEERING] Error saving settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- API CROP STEERING (Frontend format with hyphen) ---
const cropSteeringEngine = require('./cropSteeringEngine');

// States list for dropdown
const CROP_STAGES = [
    { id: 'veg_early', name: 'Vegetativo Temprano' },
    { id: 'veg_late', name: 'Vegetativo Tardío' },
    { id: 'transition', name: 'Transición' },
    { id: 'flower_early', name: 'Floración Temprana' },
    { id: 'flower_mid', name: 'Floración Media' },
    { id: 'flower_late', name: 'Floración Tardía' },
    { id: 'ripening', name: 'Maduración' }
];

// GET /api/crop-steering/status - Current crop steering status
app.get('/api/crop-steering/status', async (req, res) => {
    try {
        const cropSettings = appSettings.cropSteering || {};
        const stage = cropSettings.stage || cropSettings.currentStage || 'veg_early';
        const direction = cropSettings.direction || 'vegetative';
        const phaseInfo = cropSteeringEngine.getCurrentPhase(appSettings.lighting || {}, direction);

        // Calculate Days in Cycle dynamically
        let daysInCycle = 0;
        const now = new Date();

        if (stage.includes('flower') || stage === 'ripening' || stage === 'transition') {
            // Flower mode - calculate from flipDate
            if (cropSettings.flipDate) {
                const start = new Date(cropSettings.flipDate);
                const diffTime = Math.abs(now - start);
                daysInCycle = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        } else {
            // Veg mode - calculate from growStartDate
            if (cropSettings.growStartDate) {
                const start = new Date(cropSettings.growStartDate);
                const diffTime = Math.abs(now - start);
                daysInCycle = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }

        // Get current VWC from latest sensor data
        let currentVWC = 0;
        const subHums = [];
        ['sensorSustrato1', 'sensorSustrato2', 'sensorSustrato3'].forEach(k => {
            if (tuyaDevices[k]?.humidity !== undefined) {
                subHums.push(tuyaDevices[k].humidity);
            }
        });
        if (subHums.length > 0) {
            currentVWC = subHums.reduce((a, b) => a + b, 0) / subHums.length;
        }

        res.json({
            success: true,
            stage: stage,
            direction: direction,
            currentVWC: Math.round(currentVWC),
            targetVWC: cropSettings.targetVWC || 55,
            phase: phaseInfo.phase,
            phaseMessage: phaseInfo.message,
            isInWindow: phaseInfo.isInWindow,
            lightsOn: phaseInfo.lightsOn,
            daysInCycle: daysInCycle
        });
    } catch (error) {
        console.error('[CROP-STEERING] Error getting status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/crop-steering/recommendation - Irrigation recommendation
app.get('/api/crop-steering/recommendation', async (req, res) => {
    try {
        const pumpState = {
            lastOffTime: appSettings.irrigation?.lastIrrigationTime || null,
            lastVwcAtOn: appSettings.irrigation?.lastVwcAtOn || null
        };

        const decision = cropSteeringEngine.evaluateIrrigation(
            sensorHistory,
            appSettings,
            pumpState
        );

        res.json({
            success: true,
            recommendation: {
                shouldIrrigate: decision.shouldIrrigate,
                phase: decision.phase,
                reason: decision.reasoning,
                suggestedPercentage: decision.eventSize || 0,
                nextIrrigationIn: null
            }
        });
    } catch (error) {
        console.error('[CROP-STEERING] Error getting recommendation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/crop-steering/stages - Available stages list
app.get('/api/crop-steering/stages', (req, res) => {
    res.json({
        success: true,
        stages: CROP_STAGES
    });
});

// POST /api/crop-steering/stage - Change current stage
app.post('/api/crop-steering/stage', async (req, res) => {
    try {
        const { stage } = req.body;

        if (!stage || !CROP_STAGES.find(s => s.id === stage)) {
            return res.status(400).json({ success: false, error: 'Invalid stage' });
        }

        // Map stage to direction
        let direction = 'vegetative';
        if (stage.includes('flower') || stage === 'ripening') {
            direction = stage === 'ripening' ? 'ripening' : 'generative';
        } else if (stage === 'transition') {
            direction = 'balanced';
        }

        appSettings.cropSteering = {
            ...appSettings.cropSteering,
            stage: stage,
            currentStage: stage, // Sync for compatibility
            direction: direction,
            stageChangedAt: new Date().toISOString()
        };

        // Persist to Firestore
        await firestore.saveCropSteeringSettings(appSettings.cropSteering);

        console.log(`[CROP-STEERING] Stage changed to ${stage} (direction: ${direction})`);
        res.json({ success: true, stage, direction });


    } catch (error) {
        console.error('[CROP-STEERING] Error setting stage:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API AUTOMATION RULES ---
app.get('/api/automation/rules', async (req, res) => {
    try {
        const rules = await firestore.getAutomationRules();
        res.json({ success: true, rules });
    } catch (error) {
        console.error('[AUTOMATION] Error getting rules:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/automation/rules', async (req, res) => {
    try {
        const { rules } = req.body;

        if (!Array.isArray(rules)) {
            return res.status(400).json({ error: 'Rules must be an array' });
        }

        await firestore.saveAutomationRules(rules);
        console.log(`[AUTOMATION] ${rules.length} rules saved`);
        res.json({ success: true, count: rules.length });
    } catch (error) {
        console.error('[AUTOMATION] Error saving rules:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/automation/rules/:ruleId/toggle', async (req, res) => {
    try {
        const { ruleId } = req.params;
        const { enabled } = req.body;

        const rules = await firestore.getAutomationRules();
        const ruleIndex = rules.findIndex(r => r.id === ruleId);

        if (ruleIndex === -1) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        rules[ruleIndex].enabled = enabled;
        await firestore.saveAutomationRules(rules);

        console.log(`[AUTOMATION] Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`);
        res.json({ success: true, rule: rules[ruleIndex] });
    } catch (error) {
        console.error('[AUTOMATION] Error toggling rule:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/automation/event', async (req, res) => {
    try {
        const event = req.body;
        await firestore.logAutomationEvent(event);
        res.json({ success: true });
    } catch (error) {
        console.error('[AUTOMATION] Error logging event:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- API IRRIGATION TRIGGER ---
app.post('/api/irrigation/trigger', async (req, res) => {
    try {
        const { shotSize = 100, phase = 'manual' } = req.body;

        // Find pump device (Auto-detect)
        const pumpKey = autoDetectPumpID();
        if (!pumpKey) {
            return res.status(404).json({ error: 'No pump device found or configured (bomba/pump/agua).' });
        }

        console.log(`[IRRIGATION] Triggering irrigation: ${shotSize}ml using device: ${pumpKey}`);

        // Calculate duration based on pump rate (default 70ml/min)
        const pumpRate = appSettings.irrigation?.pumpRate || 70;
        const durationMs = (shotSize / pumpRate) * 60 * 1000;

        // Use unified control to turn ON
        await setDeviceState(pumpKey, true);

        // Send immediate response to client
        res.json({
            success: true,
            message: `Riego iniciado: ${shotSize}ml (${(durationMs/1000).toFixed(1)}s)`,
            device: pumpKey,
            durationMs
        });

        // Schedule turn OFF in background
        setTimeout(async () => {
             try {
                await setDeviceState(pumpKey, false);
                console.log(`[IRRIGATION] Shot finished (${durationMs}ms)`);

                // Log event to Firestore
                try {
                    const event = {
                        timestamp: new Date().toISOString(),
                        type: 'manual_shot',
                        volumeMl: Number(shotSize),
                        durationSec: Math.round(durationMs / 1000),
                        phase,
                        device: pumpKey
                    };

                    if (firestore && firestore.logIrrigationEvent) {
                        await firestore.logIrrigationEvent(event);
                    } else if (firestore && firestore.saveIrrigationLog) {
                        // Compatibility with alternate method name if exists
                         await firestore.saveIrrigationLog({
                            shotSize,
                            phase,
                            pumpDuration: durationMs,
                            source: 'api'
                        });
                    }
                } catch(e) {
                    console.error('[IRRIGATION] Error logging event:', e.message);
                }

             } catch(e) {
                 console.error('[IRRIGATION] Error turning off pump:', e.message);
             }
        }, durationMs);

    } catch (error) {
        console.error('[IRRIGATION] Error triggering:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- SCHEDULER ENGINE (Motor de AutomatizaciÃ³n) ---


// --- SCHEDULER ENGINE (Motor de AutomatizaciÃ³n) ---
setInterval(() => {
    try {
        runSchedulerTick();
    } catch (e) {
        console.error('[SCHEDULER] Error in interval:', e.message);
    }
}, 60000); // Check every 60 seconds

// [REMOVED DUPLICATE] POST /api/ai/analyze-image - Duplicate of ~2216

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

// [Moved Catch-All to end of file]



// --- HISTORY LOGGER (REAL MODE) ---
// Poll real sensors and save to history every 60 seconds
setInterval(async () => {
    if (!MODO_SIMULACION) {
        try {
            await saveSensorSnapshot();
        } catch (e) {
             console.error('[HISTORY] Error logging real data:', e.message);
        }
    }
}, 60000);

const xiaomiBrowserService = require('./xiaomi-browser-service');
// xiaomiAuth already required at top of file (line 18)

// --- XIAOMI AUTH ENDPOINTS ---

// 1. Initial Login
app.post('/api/settings/xiaomi-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

        if (MODO_SIMULACION) {
             return res.json({ status: '2fa_required', context: { username } });
        }

        console.log(`[AUTH] Starting Login for user: ${username}`);

        // Try Browser-based login first (works better locally)
        try {
            const result = await xiaomiBrowserService.startLogin(username, password);

            if (result.status === 'ok') {
                process.env.XIAOMI_USER_ID = result.userId;
                process.env.XIAOMI_SERVICE_TOKEN = result.serviceToken;
                process.env.XIAOMI_SSECURITY = result.ssecurity;
                setTimeout(() => initXiaomiDevices(), 1000);
            }

            return res.json(result);
        } catch (browserErr) {
            console.warn('[AUTH] Browser login failed, trying API fallback:', browserErr.message);
        }

        // Fallback: Use xiaomi-auth (API-based)
        try {
            const result = await xiaomiAuth.login(username, password);

            if (result.status === 'ok') {
                process.env.XIAOMI_USER_ID = result.userId;
                process.env.XIAOMI_SERVICE_TOKEN = result.serviceToken;
                process.env.XIAOMI_SSECURITY = result.ssecurity;
                setTimeout(() => initXiaomiDevices(), 1000);
            }

            return res.json(result);
        } catch (apiErr) {
            console.error('[AUTH] API login also failed:', apiErr.message);
            throw new Error('Both browser and API authentication failed. Check credentials or try again later.');
        }

    } catch (e) {
        console.error('[AUTH] Login Error:', e);
        res.status(500).json({ error: e.message || 'Unknown error during login' });
    }
});


// 2. Verify 2FA Code
app.post('/api/settings/verify-2fa', async (req, res) => {
    try {
        const { code, context } = req.body;
        const username = context?.username || req.body.username; // Safer access

        if (!code || !username) return res.status(400).json({ error: 'Missing code or username' });

        if (MODO_SIMULACION) {
            return res.json({ status: 'ok', userId: 'mock', serviceToken: 'mock' });
        }

        console.log(`[AUTH] Submitting Browser 2FA for: ${username}`);
        const result = await xiaomiBrowserService.submitTwoFACode(username, code);

        if (result.status === 'ok') {
            console.log('[AUTH] 2FA Success! Tokens obtained via Browser.');
            process.env.XIAOMI_USER_ID = result.userId;
            process.env.XIAOMI_SERVICE_TOKEN = result.serviceToken;
            process.env.XIAOMI_SSECURITY = result.ssecurity;

            setTimeout(() => initXiaomiDevices(), 1000);
        }

        res.json(result);

    } catch (e) {
        console.error('[AUTH] 2FA Error:', e);
        res.status(500).json({ error: e.message });
    }
});


// [Removed duplicate app.listen wrapper]
  console.log(`\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—`);
  console.log(`â•‘     ðŸŒ± PKGrower Backend - Servidor iniciado           â•‘`);
  console.log(`â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n`);
  console.log(`âœ“ Backend running on http://localhost:${PORT}`);
  console.log(`âœ“ Modo: ${MODO_SIMULACION ? 'ðŸŸ¢ SIMULACIÃ“N' : 'ðŸ”´ MODO REAL'}`);

  // Inicializar dispositivos (IMMEDIATE - FIXED)
  if (!MODO_SIMULACION) {
    console.log('\n📱 Iniciando conexión con Tuya/Xiaomi INMEDIATAMENTE...');

    // Execute immediately instead of setTimeout
    (async () => {
        try {
            console.log('📱 [INIT] Conectando con Tuya Cloud API...');

            // 1. Conectar Cliente Tuya (Core)
            await initSystemConnectors();

            // 2. Descubrir Dispositivos
            await initTuyaDevices();
            await initXiaomiDevices();
            console.log('�� [INIT] Dispositivos inicializados correctamente.');

        } catch (err) {
            console.error('❌ [INIT ERROR]', err);
        }
    })();

    // Iniciar Polling de Tuya (Cada 60 segundos)
    setInterval(async () => {
        console.log('[POLLING] Actualizando estados de Tuya...');
        await initTuyaDevices();

        // Actualizar historial de sensores
        try {
             await saveSensorSnapshot();
        } catch (e) {
             console.error('[HISTORY-BG] Error saving snapshot:', e.message);
        }
    }, 60000); // 60s
  }

// --- RULES ENGINE LOGIC ---\n// automationRules declarada arriba en línea ~291
(async () => {
    try {
        automationRules = await firestore.getRules();
        console.log(`[RULES] Loaded ${automationRules.length} rules.`);
    } catch(e){console.error(e)}
})();

// --- AUTOMATION RULES ROUTE MOUNT ---
app.use('/api/rules', require('./routes/automation')({
    getRules: () => automationRules,
    addRule: async (rule) => {
        if(!rule.id) rule.id = 'rule_' + Date.now();
        automationRules.push(rule);
        await firestore.saveRules(automationRules);
        return rule;
    },
    deleteRule: async (id) => {
        // Reassignment works because of closure scope
        automationRules = automationRules.filter(r => r.id !== id);
        await firestore.saveRules(automationRules);
    }
}));

// --- AI SERVICE INITIALIZATION & ROUTES ---
// We initialize this AFTER Firestore/Devices are ready to inject dependencies
const aiService = new AIService(process.env.GEMINI_API_KEY, {
    deviceController: {
        control: setDeviceState, // Wrapper to our global function
        getStates: async () => {
             // Return simplified state map
             const states = {};
             // Tuya
             Object.entries(tuyaDevices).forEach(([k, v]) => states[k] = v.on);
             return states;
        }
    },
    sensorReader: {
        getLatest: async () => {
             // Get fresh data from Tuya devices (same logic as /api/sensors/latest)
             let temp = 0, hum = 0, subHum = 0, vpd = 0;

             // Environment sensor
             if (tuyaDevices.sensorAmbiente && tuyaDevices.sensorAmbiente.temperature !== undefined) {
                 temp = tuyaDevices.sensorAmbiente.temperature;
                 hum = tuyaDevices.sensorAmbiente.humidity || 0;
             }

             // Substrate sensors
             const subHums = [];
             ['sensorSustrato1', 'sensorSustrato2', 'sensorSustrato3'].forEach(k => {
                 const val = tuyaDevices[k]?.humidity !== undefined ? tuyaDevices[k].humidity : tuyaDevices[k]?.value;
                 if (val !== undefined && val !== null) subHums.push(val);
             });
             if (subHums.length > 0) {
                 subHum = subHums.reduce((a, b) => a + b, 0) / subHums.length;
             }

             // Calculate VPD
             if (temp > 0 && hum > 0) {
                 const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
                 vpd = parseFloat((svp * (1 - hum / 100)).toFixed(2));
             }

             return {
                 temperature: temp,
                 humidity: hum,
                 vpd: vpd,
                 substrateHumidity: parseFloat(subHum.toFixed(1)),
                 timestamp: new Date().toISOString()
             };
        }
    },
    irrigationController: {
        startIrrigation: async (duration, volume) => {
             // Logic similar to POST /api/irrigation/shot
             console.log(`[AI-ACTION] Triggering irrigation: ${duration}s`);
             // Implementation omitted for brevity, reusing existing logic via direct call or refactor would be best
             // preventing circular deps. For now, we mock success or call the global logic if extracted.
        }
    }
});

// Mount AI Routes
app.use('/api', require('./routes/ai')({
    getAIService: () => aiService,
    model: aiService.getModel(false), // Legacy support if needed
    systemContext: aiService.systemPrompt
}));

// Rules Loop (10s)
setInterval(async () => {
    try {
        await runAutomationRulesTick();
    } catch (e) {
        console.error('[RULES] Error in interval:', e.message);
    }
}, 10000);

// --- SERVE FRONTEND STATIC FILES (Only in local development) ---
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
    console.log('[SERVER] Serving static files from dist folder');
    app.use(express.static(distDir));

    // The "catchall" handler: matches any request not handled by API
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
    });
} else {
    console.log('[SERVER] No dist folder found - frontend served from Firebase Hosting');
    // Health check / root endpoint for Cloud Run
    app.get('/', (req, res) => {
        res.json({ status: 'ok', message: 'PKGrower API Backend', timestamp: new Date().toISOString() });
    });
}

// --- GLOBAL ERROR HANDLER ---
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  const logger = require('./utils/logger');
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Tuya Devices Registered: ${Object.keys(tuyaDevices).length}`);
  logger.info(`Frontend URL: http://localhost:5173`);
});
