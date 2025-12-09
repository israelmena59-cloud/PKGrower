const http = require('http');

const API_URL = 'http://localhost:3000';

const testEndpoint = (name, path, method = 'GET', body = null) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': '3ea88c89-43e8-495b-be3c-56b541a8cc49'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const status = res.statusCode;
                const success = status >= 200 && status < 300;
                console.log(`[${success ? 'PASS' : 'FAIL'}] ${name} (${method} ${path}) - Status: ${status}`);
                if (!success) {
                    console.log(`   Error: ${data.substring(0, 100)}...`);
                } else {
                    // Optional: Validation
                    try {
                        const json = JSON.parse(data);
                        if (name === 'Sensors') {
                            console.log(`   Temp: ${json.temperature}°C, Hum: ${json.humidity}%, VPD: ${json.vpd}`);
                        }
                    } catch (e) {}
                }
                resolve(success);
            });
        });

        req.on('error', (e) => {
            console.log(`[FAIL] ${name} - Connection Error: ${e.message}`);
            resolve(false);
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

const runTests = async () => {
    console.log("=== PKGrower System Health Check ===");

    // 1. Basic Sensors
    await testEndpoint('Sensors Latest', '/api/sensors/latest');

    // 2. Device States
    await testEndpoint('Device States', '/api/devices');

    // 3. AI Chat (Local/Mock check)
    await testEndpoint('AI Chat', '/api/chat', 'POST', {
        message: "Status report",
        context: { phase: 'testing' }
    });

    // 4. Settings
    await testEndpoint('Settings', '/api/settings');

    console.log("=== Verification Complete ===");
};

runTests();
