const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
    console.log('🚀 Launching FINAL Browser Script...');
    console.log('👉 Please login manually in the window.');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null
    });
    const page = await browser.newPage();

    // Disable cache to ensure we get fresh network responses
    await page.setCacheEnabled(false);

    let ssecurityFound = false;
    let userId = null;
    let serviceToken = null;

    // 1. Network Listener (Primary Capture Method)
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('serviceLoginAuth2') || url.includes('mi.com')) {
            try {
                const text = await response.text();
                // console.log('DEBUG NET:', url); // Too noisy
                if (text.includes('ssecurity')) {
                    const cleanText = text.replace('&&&START&&&', '');
                    const json = JSON.parse(cleanText);
                    if (json.ssecurity) {
                        console.log('🎯 SSecurity Captured from Network!');
                        saveTokens(json.userId, null, json.ssecurity);
                        ssecurityFound = true;
                    }
                }
            } catch(e) {}
        }
    });

    // 2. Navigate to Login
    await page.goto('https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio');

    // 3. Polling Loop
    const interval = setInterval(async () => {
        if (ssecurityFound && userId && serviceToken) {
            console.log('✅ ALL TOKENS FOUND! Closing...');
            clearInterval(interval);
            await browser.close();
            process.exit(0);
        }

        try {
            const cookies = await page.cookies();
            const uCookie = cookies.find(c => c.name === 'userId');
            const sCookie = cookies.find(c => c.name === 'serviceToken');

            if (uCookie && sCookie) {
                if (!userId) console.log('🍪 Cookies Detected! Checking for SSecurity...');
                userId = uCookie.value;
                serviceToken = sCookie.value;
                saveTokens(userId, serviceToken, null);

                // ULTRA-MOVE: If we have cookies but NO ssecurity yet...
                if (!ssecurityFound) {
                    console.log('⚡ Force-Checking Auth Endpoint for ssecurity...');
                    // Navigate the EXISTING PAGE to the auth endpoint
                    // This uses the active session cookies naturally
                    await page.goto('https://account.xiaomi.com/pass/serviceLoginAuth2?sid=xiaomiio&_json=true');

                    // The network listener above should catch the response.
                    // But we can also parse the body text here directly.
                    try {
                        await page.waitForSelector('body');
                        const content = await page.evaluate(() => document.body.innerText);
                        if (content.includes('ssecurity')) {
                             const clean = content.replace('&&&START&&&', '');
                             const json = JSON.parse(clean);
                             if (json.ssecurity) {
                                 console.log('✅ SSecurity Force-Fetched!');
                                 saveTokens(null, null, json.ssecurity);
                                 ssecurityFound = true;
                             }
                        }
                    } catch(e) {}
                }
            }
        } catch(e) {}
    }, 3000);

    function saveTokens(uid, token, sec) {
        const envPath = path.join(__dirname, '.env');
        let content = fs.readFileSync(envPath, 'utf8');
        let modified = false;

        if (uid && !content.includes(`XIAOMI_USER_ID=${uid}`)) {
            fs.appendFileSync(envPath, `\nXIAOMI_USER_ID=${uid}`);
            modified = true;
        }
        if (token && !content.includes(`XIAOMI_SERVICE_TOKEN=${token}`)) {
            fs.appendFileSync(envPath, `\nXIAOMI_SERVICE_TOKEN=${token}`);
            modified = true;
        }
        if (sec && !content.includes(`XIAOMI_SSECURITY=${sec}`)) {
            fs.appendFileSync(envPath, `\nXIAOMI_SSECURITY=${sec}`);
            modified = true;
            console.log('💾 SSecurity Saved to .env');
        }
    }
})();
