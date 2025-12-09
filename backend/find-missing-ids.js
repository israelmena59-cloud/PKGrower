const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const client = new TuyaOpenApiClient({
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
  baseUrl: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
});

(async () => {
    // FIX: Unpack response correctly
    const { data } = await client.request({
        method: 'GET',
        path: '/v1.0/iot-01/associated-users/devices',
        query: { size: 100 }
    });

    if (data && data.result && data.result.devices) {
        console.log('--- BUSCANDO PANELES IZQUIERDOS ---');
        data.result.devices.forEach(d => {
            if (d.name.toLowerCase().includes('izq') || d.name.toLowerCase().includes('panel')) {
                console.log(`FOUND: "${d.name}" | ID: ${d.id} | StatusCodes: ${d.status.map(s=>s.code).join(',')}`);
            }
        });
    }
})();
