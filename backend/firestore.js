const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
let db = null;

try {
  // Support Cloud Path (Render Secret) or Local Path
  const serviceAccountPath = process.env.FIREBASE_KEY_PATH || path.join(__dirname, 'service-account.json');
  console.log(`[FIRESTORE] Buscando credenciales en: ${serviceAccountPath}`);

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  db = admin.firestore();
  console.log('[FIRESTORE] Conexión exitosa a la base de datos.');
} catch (error) {
  console.error('[FIRESTORE] Error inicializando Firebase Admin:', error.message);
  console.error('[FIRESTORE] Asegúrate de que "service-account.json" existe en la carpeta backend.');
}

const COLLECTION_NAME = 'sensor_history';

/**
 * Save a sensor data record to Firestore
 * @param {Object} data - The sensor data object
 */
async function saveSensorRecord(data) {
  if (!db) return;

  try {
    // Add timestamp if missing
    const record = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(COLLECTION_NAME).add(record);
    console.log('[FIRESTORE] ✓ Registro guardado (para gráficas).'); // Verbose confirmed
  } catch (error) {
    console.error('[FIRESTORE] Error guardando registro:', error.message);
  }
}

/**
 * Get sensor history from Firestore
 * @param {number} limit - Number of records to retrieve
 * @returns {Promise<Array>} Array of sensor data objects
 */
async function getSensorHistory(limit = 100) {
  if (!db) return [];

  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .orderBy('timestamp', 'desc') // Latest first
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return [];
    }

    // Map and reverse to return chronological order (oldest to newest) for charts
    const history = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamp to ISO string if necessary, but we stored ISO string 'timestamp'
        return data;
    }).reverse();

    return history;
  } catch (error) {
    console.error('[FIRESTORE] Error leyendo historial:', error.message);
    return [];
  }
}

/**
 * Get sensor history within a date range
 * @param {string} start - Start date ISO string
 * @param {string} end - End date ISO string
 * @returns {Promise<Array>} Array of sensor data objects
 */
async function getSensorHistoryRange(start, end) {
  if (!db) return [];

  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .orderBy('timestamp', 'asc')
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('[FIRESTORE] Error leyendo rango:', error.message);
    return [];
  }
}

/**
 * Save device configuration (custom name/type)
 * @param {Object} deviceConfig - { id, name, type, ... }
 */
async function saveDeviceConfig(deviceConfig) {
  if (!db || !deviceConfig.id) return;
  try {
    await db.collection('device_configs').doc(deviceConfig.id).set({
        ...deviceConfig,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`[FIRESTORE] Device config saved: ${deviceConfig.id}`);
  } catch (error) {
    console.error('[FIRESTORE] Error saving device config:', error.message);
  }
}

/**
 * Get all custom device configurations
 * @returns {Promise<Object>} Map of id -> config
 */
async function getDeviceConfigs() {
  if (!db) return {};
  try {
    const snapshot = await db.collection('device_configs').get();
    const configs = {};
    if (snapshot.empty) return {};

    snapshot.forEach(doc => {
        configs[doc.id] = doc.data();
    });
    return configs;
  } catch (error) {
    console.error('[FIRESTORE] Error getting device configs:', error.message);
    return {};
  }
}

module.exports = {
  saveSensorRecord,
  getSensorHistory,
  getSensorHistoryRange,
  saveIrrigationLog,
  getLastIrrigationLog,
  saveDeviceConfig,
  getDeviceConfigs
};

/**
 * Save an irrigation/runoff log to Firestore
 * @param {Object} data - The irrigation log object
 */
async function saveIrrigationLog(data) {
  if (!db) return;
  try {
    const record = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('irrigation_logs').add(record);
    console.log('[FIRESTORE] ✓ Bitácora de riego guardada.');
  } catch (error) {
    console.error('[FIRESTORE] Error guardando bitácora:', error.message);
  }
}

/**
 * Get the last irrigation log
 * @returns {Promise<Object|null>}
 */
async function getLastIrrigationLog() {
  if (!db) return null;
  try {
    const snapshot = await db.collection('irrigation_logs')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  } catch (error) {
    console.error('[FIRESTORE] Error getting last log:', error.message);
    return null;
  }
}
