const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
    // 1. Read existing tokens
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    // Robust parsing
    const userIdMatch = [...envContent.matchAll(/XIAOMI_USER_ID=(.+)/g)].pop();
    const serviceTokenMatch = [...envContent.matchAll(/XIAOMI_SERVICE_TOKEN=(.+)/g)].pop();

    if (!userIdMatch || !serviceTokenMatch) {
         console.error('❌ Tokens not found in .env');
         process.exit(1);
    }

    const userId = userIdMatch[1].trim();
    const serviceToken = serviceTokenMatch[1].trim();

    console.log(`🔑 UserID: ${userId}`);
    console.log(`🔑 ServiceToken (truncated): ${serviceToken.substring(0, 10)}...`);

    // 2. Launch Puppeteer
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // 3. Set standard User-Agent (Important!)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // 4. Inject Cookies
    await page.setCookie(
        { name: 'userId', value: userId, domain: '.xiaomi.com' },
        { name: 'serviceToken', value: serviceToken, domain: '.xiaomi.com' }
    );

    console.log('🍪 Cookies injected. Setup Network Listener...');

    // 5. Network Listener
    let found = false;
    let saved = false;

    page.on('response', async response => {
        if (saved) return;
        const url = response.url();
        console.log('📡 Response:', url);

        try {
            // Check for potential ssecurity sources
            if (url.includes('serviceLoginAuth2') || url.includes('callback') || url.includes('mi.com')) {
                const contentType = response.headers()['content-type'] || '';

                // Only inspect text/json-like responses
                // Avoid images/css
                if (contentType.includes('image') || contentType.includes('css')) return;

                const text = await response.text();
                if (text.includes('ssecurity')) {
                    console.log('🎯 SSecurity found in response from:', url);
                    const cleanText = text.replace('&&&START&&&', '');
                    try {
                        const json = JSON.parse(cleanText);
                        if (json.ssecurity) {
                            console.log('✅ SSecurity ACQUIRED:', json.ssecurity);

                            // Check duplication
                            if (!envContent.includes(json.ssecurity)) {
                                fs.appendFileSync(envPath, `\nXIAOMI_SSECURITY=${json.ssecurity}\n`);
                                console.log('💾 Saved to .env');
                            } else {
                                console.log('ℹ️ Already in .env');
                            }
                            saved = true;
                        }
                    } catch(e) {}
                }
            }
        } catch(e) { /* Ignore parsing errors */ }
    });

    console.log('🚀 Navigating to Auth Endpoint...');
    // We hit the endpoint that returns JSON if logged in
    await page.goto('https://account.xiaomi.com/pass/serviceLoginAuth2?sid=xiaomiio&_json=true');

    // Wait for network idle
    await new Promise(r => setTimeout(r, 5000));

    if (!saved) {
        console.log('⚠️ SSecurity not captured yet. Trying alternative URL...');
        await page.goto('https://i.mi.com/mobile/device_list');
        await new Promise(r => setTimeout(r, 5000));
    }

    await browser.close();
})();
