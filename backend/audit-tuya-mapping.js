const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const config = {
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
  baseUrl: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
};

const client = new TuyaOpenApiClient(config);

// Reconstruct the Map from .env (Simplified)
const LOCAL_MAP = [
    { name: 'Sustrato 1', id: process.env.TUYA_SENSOR_SUSTRATO_1_ID },
    { name: 'Sustrato 2', id: process.env.TUYA_SENSOR_SUSTRATO_2_ID },
    { name: 'Sustrato 3', id: process.env.TUYA_SENSOR_SUSTRATO_3_ID },
    { name: 'Ambiente', id: process.env.TUYA_SENSOR_AMBIENTE_ID },
    { name: 'Panel 1', id: process.env.TUYA_LUZ_PANEL_1_ID },
    { name: 'Panel 2', id: process.env.TUYA_LUZ_PANEL_2_ID },
    { name: 'Panel 3', id: 'eb854fi6faf2sfwl' }, // Hardcoded in index.js?
    { name: 'Panel 4', id: 'ebf84afaludhei1x' },
    { name: 'Gateway Matter', id: process.env.TUYA_GATEWAY_MATTER_ID },
    { name: 'Gateway BLE', id: process.env.TUYA_GATEWAY_BLUETOOTH_ID },
    { name: 'Bomba', id: process.env.TUYA_BOMBA_CONTROLLER_ID },
    { name: 'Extractor', id: process.env.TUYA_EXTRACTOR_CONTROLLER_ID },
    { name: 'Luz Roja', id: process.env.TUYA_LUZ_ROJA_CONTROLLER_ID },
    { name: 'Llave Agua', id: process.env.TUYA_LLAVE_AGUA_ID }
];

(async () => {
    console.log('🔍 AUDITORIA TUYA VS LOCAL');

    // 1. Get Cloud List
    const res = await client.request({
        method: 'GET',
        path: '/v1.0/iot-01/associated-users/devices',
        query: { size: 100 }
    });

    // FIXED: Unpack Axios
    const devices = (res.data && res.data.result && res.data.result.devices) ? res.data.result.devices : [];

    console.log(`☁️ Cloud Total: ${devices.length}`);

    // 2. Compare
    console.log('\n--- COMPARATIVA ---');
    let matches = 0;

    LOCAL_MAP.forEach(local => {
        const found = devices.find(d => d.id === local.id);
        if (found) {
            console.log(`✅ MATCH: ${local.name.padEnd(15)} ID: ${local.id}`);
            matches++;
        } else {
            console.log(`❌ MISSING: ${local.name.padEnd(15)} ID: ${local.id || 'UNDEFINED'} (No está en la nube)`);
        }
    });

    console.log(`\n Total Mapeados: ${matches} / ${LOCAL_MAP.length}`);

    // 3. Reveal Orphans (Cloud devices not in Local)
    console.log('\n--- HUÉRFANOS EN LA NUBE (IDs Reales) ---');
    devices.forEach(d => {
        const isMapped = LOCAL_MAP.find(l => l.id === d.id);
        if (!isMapped) {
            console.log(`❓ UNMAPPED: "${d.name}" ID: ${d.id}`);
        }
    });

    // 4. Reveal Status Codes
    console.log('\n--- DATOS REALES (Status Codes) ---');
     devices.forEach(d => {
         const statuses = d.status ? d.status.map(s=>`${s.code}:${s.value}`).join(', ') : 'No Status';
         console.log(`Device: ${d.name} -> [${statuses}]`);
     });


})();
