const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const config = {
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
  baseUrl: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
};

const client = new TuyaOpenApiClient(config);

(async () => {
    try {
        console.log('🔍 FETCHING FULL TUYA STATUS...');
        const res = await client.request({
            method: 'GET',
            path: '/v1.0/iot-01/associated-users/devices',
            query: { size: 50 }
        });

        if (res.success) {
            console.log(`✅ Found ${res.result.devices.length} devices.`);

            res.result.devices.forEach(d => {
                console.log(`\n📦 [${d.name}] (ID: ${d.id})`);
                console.log(`   Online: ${d.online}`);
                console.log('   STATUS_CODES:');
                if (d.status && d.status.length) {
                    d.status.forEach(s => {
                         console.log(`     - code: "${s.code}" | value: ${s.value}`);
                    });
                } else {
                    console.log('     (Empty Status Array)');
                }
            });
        } else {
            console.log('❌ Failed:', res);
        }

    } catch(e) {
        console.error('❌ EXCEPTION:', e);
    }
})();
