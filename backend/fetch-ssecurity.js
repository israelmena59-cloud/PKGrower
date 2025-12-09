const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
    const userId = process.env.XIAOMI_USER_ID;
    const serviceToken = process.env.XIAOMI_SERVICE_TOKEN;

    if (!userId || !serviceToken) {
        console.error('❌ Missing XIAOMI_USER_ID or XIAOMI_SERVICE_TOKEN in .env');
        process.exit(1);
    }

    console.log('🔄 Attempting to fetch SSecurity using captured ServiceToken...');

    // We need to hit the auth endpoint pretending to be the user
    // The key is sending the ServiceToken as a cookie
    const url = 'https://account.xiaomi.com/pass/serviceLoginAuth2?sid=xiaomiio&_json=true';

    try {
        const res = await fetch(url, {
            headers: {
                'Cookie': `userId=${userId}; serviceToken=${serviceToken}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const text = await res.text();
        console.log('📡 Response:', text.substring(0, 100) + '...');

        const cleanText = text.replace('&&&START&&&', '');
        const json = JSON.parse(cleanText);

        if (json.ssecurity) {
            console.log('✅ SSecurity ACQUIRED:', json.ssecurity);

            const envPath = path.join(__dirname, '.env');
            fs.appendFileSync(envPath, `\nXIAOMI_SSECURITY=${json.ssecurity}\n`);
            console.log('💾 Saved to .env');
        } else {
            console.error('❌ Failed to get ssecurity. JSON:', json);
        }

    } catch (e) {
        console.error('❌ Request Failed:', e);
    }
})();
