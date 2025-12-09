const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const client = new TuyaOpenApiClient({
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
  baseUrl: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
});

(async () => {
    console.log('--- TUYA DEVICE DUMP ---');
    const res = await client.request({
        method: 'GET',
        path: '/v1.0/iot-01/associated-users/devices',
        query: { size: 50 }
    });

    if (res.success && res.result.devices) {
        console.log(`Found ${res.result.devices.length} devices.`);
        res.result.devices.forEach(d => {
            console.log(`\nName: ${d.name}`);
            console.log(`ID:   ${d.id}`);
            console.log(`Online: ${d.online}`);
            console.log(`Codes: ${d.status ? d.status.map(s => `${s.code}=${s.value}`).join(', ') : 'NONE'}`);
        });
    } else {
        console.log('Error fetching devices:', res);
    }
})();
