const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, path, method = 'GET', body = null) {
    try {
        console.log(`Testing ${name} (${method} ${path})...`);
        const options = { method };
        if (body) {
            options.body = JSON.stringify(body);
            options.headers = { 'Content-Type': 'application/json' };
        }

        const res = await fetch(`${BASE_URL}${path}`, options);
        if (res.ok) {
            console.log(`  ✓ ${name}: OK (${res.status})`);
            const data = await res.json();
            // console.log('    Data:', JSON.stringify(data).substring(0, 100) + '...');
        } else {
            console.log(`  ✗ ${name}: Failed (${res.status})`);
            const text = await res.text();
            console.log('    Error:', text);
        }
    } catch (err) {
        console.log(`  ✗ ${name}: Network Error - ${err.message}`);
    }
}

async function runTests() {
    console.log('--- Iniciando Verificación de Backend ---');
    await testEndpoint('Sensores Recientes', '/api/sensors/latest');
    await testEndpoint('Estado Dispositivos', '/api/devices');
    await testEndpoint('Tuya Devices', '/api/devices/tuya');
    await testEndpoint('Settings', '/api/settings');
    console.log('--- Fin de Tests ---');
}

runTests();
