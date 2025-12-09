const miio = require('miio');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
    console.log('--- Verifying Local Tokens ---');

    const devices = [
        {
            name: 'Humidifier',
            id: process.env.XIAOMI_HUMIDIFIER_ID,
            ip: process.env.XIAOMI_HUMIDIFIER_IP,
            token: process.env.XIAOMI_HUMIDIFIER_TOKEN,
            model: process.env.XIAOMI_HUMIDIFIER_MODEL
        },
        {
            name: 'Camera',
            id: process.env.XIAOMI_CAMERA_ID,
            ip: process.env.XIAOMI_CAMERA_IP,
            token: process.env.XIAOMI_CAMERA_TOKEN,
            model: process.env.XIAOMI_CAMERA_MODEL
        }
    ];

    for (const d of devices) {
        if (!d.ip || !d.token) {
            console.log(`[SKIP] ${d.name}: Missing IP or Token`);
            continue;
        }

        console.log(`\nTesting ${d.name} (${d.ip})...`);
        try {
            const device = await miio.device({ address: d.ip, token: d.token });
            console.log(`✅ CONNECTION SUCCESS: ${d.name}`);
            console.log(`   Model: ${device.miioModel}`);
            console.log(`   State: ${JSON.stringify(await device.property('power') || 'unknown')}`);
            device.destroy();
        } catch (e) {
            console.error(`❌ CONNECTION FAILED: ${d.name}`);
            console.error(`   Error: ${e.message}`);
        }
    }

    process.exit(0);
})();
