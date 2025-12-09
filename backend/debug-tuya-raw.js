const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const config = {
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
  baseUrl: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
};

console.log('🔍 TUYA RAW DEBUGGER');
console.log('Credentiales:', config.accessKey ? 'Presentes' : 'Faltan');

const client = new TuyaOpenApiClient(config);

(async () => {
    try {
        console.log('Connecting...');
        // Official Tuya method to get user devices
        // Usually /v1.0/iot-01/associated-users/devices

        const res = await client.request({
            method: 'GET',
            path: '/v1.0/iot-01/associated-users/devices',
            query: { size: 50 }
        });

        if (res.success) {
            console.log(`✅ Success! Found ${res.result.devices.length} devices.`);
            if (res.result.devices.length > 0) {
                console.log('Sample Device (0):');
                console.log(JSON.stringify(res.result.devices[0], null, 2));

                // Print all names
                console.log('\nList of Names found:');
                res.result.devices.forEach(d => console.log(`- ${d.name} (Online: ${d.online})`));
            }
        } else {
            console.log('❌ Failed:', res);

            // Try Plan B (Individual Fetch)
            console.log('\nTrying Plan B (Fetch by ID)...');
            const sensorId = process.env.TUYA_SENSOR_SUSTRATO_1_ID;
            if (sensorId) {
                const res2 = await client.request({ method: 'GET', path: `/v1.0/devices/${sensorId}` });
                console.log('Sensor 1 Fetch:', res2);
            }
        }

    } catch(e) {
        console.error('❌ EXCEPTION:', e);
    }
})();
