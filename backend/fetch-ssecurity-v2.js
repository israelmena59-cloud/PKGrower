const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    // Get the LAST token (most recent)
    const userIdMatch = [...envContent.matchAll(/XIAOMI_USER_ID=(.+)/g)].pop();
    const serviceTokenMatch = [...envContent.matchAll(/XIAOMI_SERVICE_TOKEN=(.+)/g)].pop();

    if (!userIdMatch || !serviceTokenMatch) {
        console.error('❌ Tokens not found');
        return;
    }

    const userId = userIdMatch[1].trim();
    const serviceToken = serviceTokenMatch[1].trim();

    console.log(`Using Token: ${serviceToken.substring(0, 15)}...`);

    const url = 'https://account.xiaomi.com/pass/serviceLoginAuth2?sid=xiaomiio&_json=true';

    try {
        const res = await fetch(url, {
            headers: {
                'Cookie': `userId=${userId}; serviceToken=${serviceToken}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio'
            }
        });

        const text = await res.text();

        if (text.includes('ssecurity')) {
            console.log('✅ FOUND SSECURITY!');
            const clean = text.replace('&&&START&&&', '');
            const json = JSON.parse(clean);
            console.log('Key:', json.ssecurity);

            fs.appendFileSync(envPath, `\nXIAOMI_SSECURITY=${json.ssecurity}\n`);
            console.log('Saved to .env');
        } else {
            console.log('❌ Response was not JSON with ssecurity.');
            console.log('Preview:', text.substring(0, 500));
        }

    } catch (e) {
        console.error(e);
    }
})();
