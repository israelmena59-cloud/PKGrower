const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const client = new TuyaOpenApiClient({
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
  baseUrl: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
});

(async () => {
    try {
        console.log('--- STRUCT DUMP ---');
        const res = await client.request({
            method: 'GET',
            path: '/v1.0/iot-01/associated-users/devices',
            query: { size: 50 }
        });

        console.log('Keys in RES:', Object.keys(res));
        console.log('Success:', res.success);
        console.log('Code:', res.code);

        if (res.result) {
            console.log('Result Keys:', Object.keys(res.result));
            if (res.result.devices) {
                console.log('Devices Key Exists. Length:', res.result.devices.length);
            }
        }

        // Try Single Device
        const testID = process.env.TUYA_SENSOR_SUSTRATO_1_ID; // Should be loaded
        if (testID) {
             console.log(`\nChecking Single ID: ${testID}`);
             const res2 = await client.request({
                method: 'GET',
                path: `/v1.0/devices/${testID}`
             });
             console.log('Single Res Success:', res2.success);
             if (res2.result) {
                 console.log('Single Name:', res2.result.name);
                 console.log('Single Status:', JSON.stringify(res2.result.status));
             }
        }

    } catch(e) { console.error('ERROR:', e); }
})();
