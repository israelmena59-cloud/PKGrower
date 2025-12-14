const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Local Backup Config
const BACKUP_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(BACKUP_DIR)) {
    try { fs.mkdirSync(BACKUP_DIR, { recursive: true }); } catch (e) {}
}
const BACKUP_FILE = path.join(BACKUP_DIR, 'sensor_backup.jsonl');

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
  console.error('[FIRESTORE] Modo Offline: Se usarán copias locales.');
}

const COLLECTION_NAME = 'sensor_history';

/**
 * Save a sensor data record to Firestore (with Local Fallback)
 * @param {Object} data - The sensor data object
 */
async function saveSensorRecord(data) {
  const record = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      // Use simple ISO string for local compatibility, logic handles Firestore Timestamp if needed
      createdAt: new Date().toISOString()
  };

  // Try Firestore
  if (db) {
      try {
        await db.collection(COLLECTION_NAME).add({
            ...record,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('[FIRESTORE] ✓ Registro guardado.');
        return;
      } catch (error) {
        console.error('[FIRESTORE] Error guardando registro (Cloud):', error.message);
        // Fallthrough to local backup
      }
  }

  // Local Fallback
  try {
      const line = JSON.stringify(record) + '\n';
      fs.appendFile(BACKUP_FILE, line, (err) => {
          if (err) console.error('[BACKUP] Fallo escritura local:', err.message);
          else console.log('[BACKUP] ✓ Registro guardado localmente (JSONL).');
      });
  } catch (err) {
      console.error('[BACKUP] Error crítico sistema de archivos:', err.message);
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

/**
 * Delete a device configuration
 * @param {string} deviceId
 */
async function deleteDeviceConfig(deviceId) {
  if (!db || !deviceId) return;
  try {
    await db.collection('device_configs').doc(deviceId).delete();
    console.log(`[FIRESTORE] Device config deleted: ${deviceId}`);
  } catch (error) {
    console.error('[FIRESTORE] Error deleting device config:', error.message);
  }
}

module.exports = {
  saveSensorRecord,
  getSensorHistory,
  getSensorHistoryRange,
  saveIrrigationLog,
  getLastIrrigationLog,
  saveDeviceConfig,
  getDeviceConfigs,
  deleteDeviceConfig,
  saveGlobalSettings,
  getGlobalSettings,
  saveRules,
  getRules,
  // Crop Steering
  saveCropSteeringSettings,
  getCropSteeringSettings,
  saveAutomationRules,
  getAutomationRules,
  logAutomationEvent
};

/**
 * Save crop steering settings
 * @param {Object} settings - Crop steering settings object
 */
async function saveCropSteeringSettings(settings) {
  if (!db) {
    console.log('[FIRESTORE] No DB - saving crop steering to local');
    try {
      const localPath = path.join(BACKUP_DIR, 'crop_steering_settings.json');
      fs.writeFileSync(localPath, JSON.stringify(settings, null, 2));
      console.log('[BACKUP] Crop steering settings saved locally.');
    } catch (e) {
      console.error('[BACKUP] Error saving crop steering locally:', e.message);
    }
    return;
  }

  try {
    await db.collection('settings').doc('cropSteering').set({
      ...settings,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('[FIRESTORE] Crop steering settings saved.');
  } catch (error) {
    console.error('[FIRESTORE] Error saving crop steering settings:', error.message);
    throw error;
  }
}

/**
 * Get crop steering settings
 * @returns {Promise<Object>}
 */
async function getCropSteeringSettings() {
  if (!db) {
    // Try local backup
    try {
      const localPath = path.join(BACKUP_DIR, 'crop_steering_settings.json');
      if (fs.existsSync(localPath)) {
        return JSON.parse(fs.readFileSync(localPath, 'utf8'));
      }
    } catch (e) {}
    return null;
  }

  try {
    const doc = await db.collection('settings').doc('cropSteering').get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (error) {
    console.error('[FIRESTORE] Error getting crop steering settings:', error.message);
    return null;
  }
}

/**
 * Save automation rules for crop steering
 * @param {Array} rules - Array of automation rule objects
 */
async function saveAutomationRules(rules) {
  if (!db) {
    try {
      const localPath = path.join(BACKUP_DIR, 'automation_rules.json');
      fs.writeFileSync(localPath, JSON.stringify(rules, null, 2));
      console.log('[BACKUP] Automation rules saved locally.');
    } catch (e) {
      console.error('[BACKUP] Error saving automation rules locally:', e.message);
    }
    return;
  }

  try {
    await db.collection('automation').doc('rules').set({
      list: rules,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('[FIRESTORE] Automation rules saved.');
  } catch (error) {
    console.error('[FIRESTORE] Error saving automation rules:', error.message);
    throw error;
  }
}

/**
 * Get automation rules
 * @returns {Promise<Array>}
 */
async function getAutomationRules() {
  if (!db) {
    try {
      const localPath = path.join(BACKUP_DIR, 'automation_rules.json');
      if (fs.existsSync(localPath)) {
        return JSON.parse(fs.readFileSync(localPath, 'utf8'));
      }
    } catch (e) {}
    return [];
  }

  try {
    const doc = await db.collection('automation').doc('rules').get();
    if (!doc.exists) return [];
    return doc.data().list || [];
  } catch (error) {
    console.error('[FIRESTORE] Error getting automation rules:', error.message);
    return [];
  }
}

/**
 * Log automation event
 * @param {Object} event - Automation event details
 */
async function logAutomationEvent(event) {
  const record = {
    ...event,
    timestamp: new Date().toISOString()
  };

  if (!db) {
    try {
      const logPath = path.join(BACKUP_DIR, 'automation_log.jsonl');
      fs.appendFileSync(logPath, JSON.stringify(record) + '\n');
    } catch (e) {}
    return;
  }

  try {
    await db.collection('automation_logs').add({
      ...record,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('[FIRESTORE] Automation event logged:', event.ruleId);
  } catch (error) {
    console.error('[FIRESTORE] Error logging automation event:', error.message);
  }
}

/**
 * Save automation rules
 * @param {Array} rules - Array of rule objects
 */
async function saveRules(rules) {
  if (!db) return;
  try {
    // Save as a single document 'config' in 'rules' collection for simplicity,
    // or as individual docs. Array in one doc is easier for "full sync".
    await db.collection('rules').doc('config').set({
        list: rules,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('[FIRESTORE] Automation rules saved.');
  } catch (error) {
    console.error('[FIRESTORE] Error saving rules:', error.message);
  }
}

/**
 * Get automation rules
 * @returns {Promise<Array>}
 */
async function getRules() {
  if (!db) return [];
  try {
    const doc = await db.collection('rules').doc('config').get();
    if (!doc.exists) return [];
    return doc.data().list || [];
  } catch (error) {
    console.error('[FIRESTORE] Error getting rules:', error.message);
    return [];
  }
}

/**
 * Save global settings (credentials, etc.)
 * @param {Object} settings - The settings object
 */
async function saveGlobalSettings(settings) {
  if (!db) return;
  try {
    await db.collection('settings').doc('global').set({
        ...settings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('[FIRESTORE] Global settings saved.');
  } catch (error) {
    console.error('[FIRESTORE] Error saving global settings:', error.message);
    throw error;
  }
}

/**
 * Get global settings
 * @returns {Promise<Object>}
 */
async function getGlobalSettings() {
  if (!db) return {};
  try {
    const doc = await db.collection('settings').doc('global').get();
    if (!doc.exists) return {};
    return doc.data();
  } catch (error) {
    console.error('[FIRESTORE] Error getting global settings:', error.message);
    return {};
  }
}

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
