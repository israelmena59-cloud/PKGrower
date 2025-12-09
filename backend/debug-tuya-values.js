const { TuyaOpenApiClient } = require('@tuya/tuya-connector-nodejs');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const client = new TuyaOpenApiClient({
  accessKey: process.env.TUYA_ACCESS_KEY,
  secretKey: process.env.TUYA_SECRET_KEY,
  baseUrl: process.env.TUYA_API_HOST || 'https://openapi.tuyaus.com',
});

// COPY OF THE MAPPING LOGIC FROM INDEX.JS (Simplified for test)
function processDevice(d) {
    let temperature = null;
    let humidity = null;
    let isOn = false;
    let debugCodes = [];

    if (d.status) {
        debugCodes = d.status.map(s => `${s.code}:${s.value}`);

        // Temp
        const tempStatus = d.status.find(s => ['va_temperature', 'temp_current', 'temperature', 'T', 'temp_soil'].includes(s.code));
        if (tempStatus) temperature = tempStatus.value;

        // Hum
        const humStatus = d.status.find(s => ['va_humidity', 'humidity_value', 'humidity', 'rh', 'hum_soil'].includes(s.code));
        if (humStatus) humidity = humStatus.value;

        // Switch
        const switchStatus = d.status.find(s => ['switch_1', 'switch_led', 'switch'].includes(s.code));
        if (switchStatus) isOn = switchStatus.value === true;
    }

    return {
        name: d.name,
        id: d.id,
        online: d.online,
        MAPPED_TEMP: temperature,
        MAPPED_HUM: humidity,
        MAPPED_ON: isOn,
        RAW_CODES: debugCodes
    };
}

(async () => {
    console.log('--- DATA MAPPING DEBUG ---');
    const { data } = await client.request({
        method: 'GET',
        path: '/v1.0/iot-01/associated-users/devices',
        query: { size: 50 }
    });

    if (data && data.result && data.result.devices) {
        data.result.devices.forEach(d => {
            const result = processDevice(d);
            console.log(`\n[${result.name}]`);
            console.log(` > Online: ${result.online}`);
            console.log(` > Mapped Values: Temp=${result.MAPPED_TEMP}, Hum=${result.MAPPED_HUM}, On=${result.MAPPED_ON}`);
            console.log(` > Raw Codes: ${result.RAW_CODES.join(', ')}`);
        });
    }
})();
