const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const API_URL = 'https://strand-prompt-properties-fort.trycloudflare.com';
const API_KEY = process.env.API_KEY || '3ea88c89-43e8-495b-be3c-56b541a8cc49';

console.log(`Testing Public URL: ${API_URL}`);

(async () => {
    try {
        const res = await fetch(`${API_URL}/api/devices`, {
            headers: { 'x-api-key': API_KEY }
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();

        if (text.trim().startsWith('<')) {
            console.log('❌ RESPONSE IS HTML (Likely Cloudflare Interstitial)');
            console.log(text.substring(0, 200));
        } else {
            console.log('✅ RESPONSE IS DATA');
            console.log(text.substring(0, 200));
        }

    } catch (e) {
        console.error('❌ CONNECTION ERROR:', e.message);
    }
})();
