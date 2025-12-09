const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('🔑 Testing API Key:', apiKey ? 'Loaded' : 'Missing');

const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
];

async function testModel(model) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ [${model}] SUCCESS`);
                    resolve(true);
                } else {
                    console.log(`❌ [${model}] FAILED (${res.statusCode})`);
                    // console.log(data);
                    resolve(false);
                }
            });
        });

        req.on('error', e => {
            console.log(`❌ [${model}] NETWORK ERROR: ${e.message}`);
            resolve(false);
        });

        req.write(JSON.stringify({
            contents: [{ parts: [{ text: "Hi" }] }]
        }));
        req.end();
    });
}

(async () => {
    console.log('🚀 Probe Start...');
    for (const m of models) {
        await testModel(m);
    }
})();
