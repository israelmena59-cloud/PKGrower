// require('dotenv').config({ path: require('path').join(__dirname, '.env') });
// NOTE: In Cloud Run, env vars are set directly. No need for dotenv here.

// --- CONFIGURACIÃ“N DE LA INTEGRACIÃ“N ---
const MODO_SIMULACION = process.env.MODO_SIMULACION === 'true';

// --- CREDENCIALES XIAOMI (SOLO PARA MODO_SIMULACION = false) ---
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
  accessKey: process.env.TUYA_ACCESS_KEY || '',
  secretKey: process.env.TUYA_SECRET_KEY || '',
  apiHost: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
};

// DEBUG: Log Tuya config status
console.log('[CONFIG] TUYA_CONFIG loaded:', {
  accessKey: TUYA_CONFIG.accessKey ? `${TUYA_CONFIG.accessKey.substring(0, 10)}...` : 'EMPTY',
  secretKey: TUYA_CONFIG.secretKey ? `${TUYA_CONFIG.secretKey.substring(0, 10)}...` : 'EMPTY',
  apiHost: TUYA_CONFIG.apiHost
});

// --- MAPEO DE DISPOSITIVOS TUYA ---
const TUYA_DEVICES_MAP = {
  // SENSORES DE SUSTRATO
  sensorSustrato1: {
    name: 'Sensor Sustrato 1',
    id: process.env.TUYA_SENSOR_SUSTRATO_1_ID || 'eb33e6b487314c81cdkc1g',
    platform: 'tuya',
    deviceType: 'sensor',
    category: 'soil_sensor',
  },
  sensorSustrato2: {
    name: 'Sensor Sustrato 2',
    id: process.env.TUYA_SENSOR_SUSTRATO_2_ID || 'eb60f46a8dc4f7af11hgp9',
    platform: 'tuya',
    deviceType: 'sensor',
    category: 'soil_sensor',
  },
  sensorSustrato3: {
    name: 'Sensor Sustrato 3',
    id: process.env.TUYA_SENSOR_SUSTRATO_3_ID || 'ebe398e4908b4437f0bjuv',
    platform: 'tuya',
    deviceType: 'sensor',
    category: 'soil_sensor',
  },
  sensorAmbiente: {
    name: 'Sensor Ambiente (RH/TH)',
    id: process.env.TUYA_SENSOR_AMBIENTE_ID || 'eb000c93f43edd0cbbjkcs',
    platform: 'tuya',
    deviceType: 'sensor',
    category: 'environment_sensor',
  },

  // PANELES DE LUCES
  luzPanel1: {
    name: 'Bandeja Der Adelante',
    id: process.env.TUYA_LUZ_PANEL_1_ID || 'eba939ccdda8167e71fh7u',
    platform: 'tuya',
    deviceType: 'light',
    category: 'led_panel',
  },
  luzPanel2: {
    name: 'Bandeja Der AtrÃ¡s',
    id: process.env.TUYA_LUZ_PANEL_2_ID || 'eb2182339420bb6701wu4q',
    platform: 'tuya',
    deviceType: 'light',
    category: 'led_panel',
  },
  luzPanel3: {
    name: 'Bandeja Izq Adelante',
    id: process.env.TUYA_LUZ_PANEL_3_ID || 'ebd8dbv4btvl7h1b',
    platform: 'tuya',
    deviceType: 'light',
    category: 'led_panel',
    switchCode: 'switch_1',
  },
  luzPanel4: {
    name: 'Bandeja Izq AtrÃ¡s',
    id: process.env.TUYA_LUZ_PANEL_4_ID || 'ebf84afaludhei1x',
    platform: 'tuya',
    deviceType: 'light',
    category: 'led_panel',
    switchCode: 'switch_1',
  },

  // GATEWAYS
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

  // CONTROLADORES
  bombaControlador: {
    name: 'Controlador Bomba de Agua',
    id: process.env.TUYA_BOMBA_CONTROLLER_ID || 'ebf427eih6oxomiv',
    platform: 'tuya',
    deviceType: 'switch',
    category: 'pump_controller',
  },
  extractorControlador: {
    name: 'Controlador Extractor',
    id: process.env.TUYA_EXTRACTOR_CONTROLLER_ID || 'eb0e121ux4rrtjkf',
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

  // OTROS
  llaveAguaBluetooth: {
    name: 'Llave de Agua Bluetooth',
    id: process.env.TUYA_LLAVE_AGUA_ID,
    platform: 'tuya',
    deviceType: 'valve',
    category: 'water_valve',
  },
  ventiladorIzq: {
    name: 'Ventilador Izq',
    id: process.env.TUYA_VENTILADOR_IZQ_ID || 'eba66ay908qnuxq3',
    platform: 'tuya',
    deviceType: 'switch',
    category: 'fan_controller',
    switchCode: 'switch_1',
  },
  ventiladorDer: {
    name: 'Ventilador Derecha',
    id: process.env.TUYA_VENTILADOR_DER_ID || 'ebadc3tv1usy2xbr',
    platform: 'tuya',
    deviceType: 'switch',
    category: 'fan_controller',
    switchCode: 'switch_1',
  },
  deshumidificador: {
    name: 'Deshumidificador',
    id: process.env.TUYA_DESHUMIDIFICADOR_ID || 'eba300vycr9wpf51',
    platform: 'tuya',
    deviceType: 'switch',
    category: 'dehumidifier',
    switchCode: 'switch',
  },
};

// --- MAPEO DE DISPOSITIVOS XIAOMI ---
const XIAOMI_DEVICES_MAP = {
  humidifier: {
    name: 'Humidificador Xiaomi',
    platform: 'xiaomi',
    deviceType: 'humidifier',
    config: XIAOMI_DEVICES.humidifier,
  },
  camera: {
    name: 'CÃ¡mara Xiaomi',
    platform: 'xiaomi',
    deviceType: 'camera',
    config: XIAOMI_DEVICES.camera,
  },
};

// --- COMBINACIÃ“N DE MAPEOS ---
const DEVICE_MAP = {
  ...TUYA_DEVICES_MAP,
  ...XIAOMI_DEVICES_MAP,
};

module.exports = {
    MODO_SIMULACION,
    XIAOMI_DEVICES,
    TUYA_CONFIG,
    TUYA_DEVICES_MAP,
    XIAOMI_DEVICES_MAP,
    DEVICE_MAP
};
