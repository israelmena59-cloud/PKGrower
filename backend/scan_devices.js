const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const TUYA_CONFIG = {
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
  apiHost: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
};

async function scan() {
  console.log('--- STARTING TUYA SCAN ---');
  console.log('Host:', TUYA_CONFIG.apiHost);

  if (!TUYA_CONFIG.accessKey || !TUYA_CONFIG.secretKey) {
      console.error('Missing TUYA_ACCESS_KEY or TUYA_SECRET_KEY in .env');
      return;
  }

  const client = new TuyaOpenApiClient({
    baseUrl: TUYA_CONFIG.apiHost,
    accessKey: TUYA_CONFIG.accessKey,
    secretKey: TUYA_CONFIG.secretKey,
  });

  // Init client (if required by version)
  if (client.init) await client.init();

  try {
    // 1. Get User ID (Often needed for associated-users search)
    // Actually, asking for devices directly is usually easier via v1.0/iot-01/associated-users/devices
    // But let's try the standard user search first if needed.

    console.log('Fetching devices...');
    const res = await client.request({
      method: 'GET',
      path: '/v1.0/iot-01/associated-users/devices',
      query: { size: 100 }
    });

    const responseData = res.data;

    if (!responseData || !responseData.success) {
        console.error('API Error:', responseData || res);
        return;
    }

    const devices = responseData.result.devices || [];

    // Write to file to avoid console noise
    const fs = require('fs');
    const path = require('path');
    const outFile = path.join(__dirname, 'devices_found.json');

    const simpleList = devices.map(d => ({
        name: d.name,
        id: d.id,
        key: d.local_key || 'N/A',
        category: d.category,
        online: d.online
    }));

    fs.writeFileSync(outFile, JSON.stringify(simpleList, null, 2));
    console.log(`Saved ${devices.length} devices to ${outFile}`);

    devices.forEach(d => {
        console.log(`[DEVICE]`);
        console.log(`  Name: ${d.name}`);
        console.log(`  ID:   ${d.id}`);
        console.log(`  Cat:  ${d.category}`);
        console.log(`  On:   ${d.online}`);
        console.log('-----------------------------------');
    });

  } catch (e) {
      console.error('Scan failed:', e.message);
  }
}

scan();
