const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

async function getTokens() {
    console.log('🚀 Launching Browser for Manual Login...');
    console.log('👉 Please login using standard method (Password, SMS 2FA, or QR Code) in the opened window.');
    console.log('⏳ Waiting for tokens...');

    // Launch visible browser
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null // Responsivo
    });

    const page = await browser.newPage();

    // Go to login
    await page.goto('https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio&_json=true', {
        waitUntil: 'networkidle2'
    });

    // Validar login exitoso monitoreando cookies o respuestas
    // Xiaomi redirecto a location con serviceToken

    // Poll for cookies
    const checkInterval = setInterval(async () => {
        const cookies = await page.cookies();

        const userIdCookie = cookies.find(c => c.name === 'userId');
        const serviceTokenCookie = cookies.find(c => c.name === 'serviceToken');
        // 'ssecurity' usually comes in response body of login step 2, but sometimes in cookie?
        // Actually, Piotr Machowski's key logic relies on interception.
        // But simpler: If we have userId and serviceToken, we might be good for CLOUD connection?
        // Wait, 'ssecurity' is derived or returned. We might need to INTERCEPT the response.

        if (userIdCookie && serviceTokenCookie) {
             // Found cookies!
        }
    }, 1000);

    // Better: Intercept the specific response
    let tokens = {};

    // Aggressive Traffic Inspection
    page.on('response', async response => {
        // Always listen, even if we found cookies, just in case ssecurity comes late

        try {
            const url = response.url();
            // Check for Auth Endpoints OR any JSON response
            if (url.includes('serviceLoginAuth2') || url.includes('mi.com') || url.includes('callback') || response.headers()['content-type']?.includes('json')) {

                // Avoid large files
                const headers = response.headers();
                if (headers['content-length'] && parseInt(headers['content-length']) > 50000) return;

                const text = await response.text();
                // Check if ssecurity is inside
                if (text.includes('ssecurity')) {
                    console.log('🎯 Found "ssecurity" in response from:', url);

                    const cleanText = text.replace('&&&START&&&', '');
                    try {
                        const json = JSON.parse(cleanText);
                        if (json.ssecurity) {
                             console.log('🔐 SSecurity Captured:', json.ssecurity);

                             // Append to .env immediately
                             const envPath = path.join(__dirname, '.env');

                             // Check if already saved this specific ssecurity
                             const currentEnv = fs.readFileSync(envPath, 'utf8');
                             if (!currentEnv.includes(json.ssecurity)) {
                                 fs.appendFileSync(envPath, `\nXIAOMI_SSECURITY=${json.ssecurity}`);
                                 console.log('✅ Appended SSecurity to .env');
                             }
                        }
                    } catch(e) {}
                }
            }
        } catch (e) {}
    });

    // Wait until we have everything
    // Actually, simpler method used by other tools:
    // Just wait for navigation to the "success" callback?
    // Let's rely on finding ALL cookies.

    // Correct approach to get ssecurity via Puppeteer:
    // It is HARD to get ssecurity from cookies because it is NOT a cookie. It is part of the auth response.
    // So we MUST intercept the response.
}

// SIMPLER SCRIPT v2 (Focus on "The User just wants to login")
// We can use the open-source python logic adapted.
// Step 1: Open Login Page.
// Step 2: User Logs in.
// Step 3: Browser redirects to "sts.api.io.mi.com/..."
// Step 4: Capture that query param?

// LET'S TRY:
// Just intercept the login success response.

(async () => {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();

    console.log('--- STARTING INTERACTIVE LOGIN ---');
    console.log('Please Login in the browser window...');

    let foundCreds = false;

    // Listen for the AUTH response
    page.on('response', async response => {
        if (foundCreds) return;

        if (response.url().includes('serviceLoginAuth2')) {
            try {
                const text = await response.text();
                const jsonText = text.replace('&&&START&&&', '');
                const json = JSON.parse(jsonText);

                if (json.code === 0 && json.ssecurity && json.userId) {
                    console.log('\n🎉 LOGIN SUCCESS DETECTED!');
                    console.log('UserID:', json.userId);
                    console.log('ssecurity:', json.ssecurity);

                    // We also need serviceToken. This comes from visiting the 'location' URL.
                    // Puppeteer will likely follow that redirect.
                    // We need to grab the cookie "serviceToken" AFTER this request.
                    console.log('⏳ Waiting for ServiceToken cookie...');

                    foundCreds = true;

                    // Wait a moment for redirect/cookie set
                    setTimeout(async () => {
                        const cookies = await page.cookies();
                        const stCookie = cookies.find(c => c.name === 'serviceToken');

                        if (stCookie) {
                            console.log('✅ ServiceToken FOUND:', stCookie.value);

                            // SAVE TO .ENV
                            const envPath = path.join(__dirname, '.env');
                            let envContent = fs.readFileSync(envPath, 'utf8');

                            // Regex replace or append
                            const keys = {
                                'XIAOMI_CLOUD_USERNAME': `"${json.userId}"`, // Use ID to be safe or original? User input better.
                                // Actually, stick to keeping the existing username if possible, or update it.
                                'XIAOMI_CLOUD_PASSWORD': '"SAVED_VIA_TOKEN"', // Hide pass
                                'XIAOMI_SERVICE_TOKEN': stCookie.value, // We need to ADD this variable support to backend if not exists
                                // Wait, backend needs password to re-login?
                                // NO! If we have tokens, we can use them directly?
                                // node-mihome usually takes login/pass.
                                // BUT if we use "miio" or custom, raw tokens are better.

                                // PROBLEM: Standard node-mihome logs in with Password.
                                // We need to check if we can inject TOKENS into node-mihome.
                                // Inspecting backend/index.js line 2044:
                                // miHome.miCloudProtocol.userId = authResult.userId;
                                // miHome.miCloudProtocol.serviceToken = authResult.serviceToken;
                                // miHome.miCloudProtocol.ssecurity = authResult.ssecurity;

                                // YES! We can inject them.
                            };

                            // We need to persist these so upon restart they are loaded.
                            // The backend currently only reads User/Pass from .env and DOES AUTH.
                            // We need to modify backend to accept TOKENS from .env to SKIP auth.

                            console.log('⚠️  TOKENS CAPTURED. Please copy these to your .env manually if script fails to save:');
                            console.log(`XIAOMI_USER_ID=${json.userId}`);
                            console.log(`XIAOMI_SERVICE_TOKEN=${stCookie.value}`);
                            console.log(`XIAOMI_SSECURITY=${json.ssecurity}`);

                            // Append to file
                            fs.appendFileSync(envPath, `\n# --- AUTH TOKENS (Interactive) ---\nXIAOMI_USER_ID=${json.userId}\nXIAOMI_SERVICE_TOKEN=${stCookie.value}\nXIAOMI_SSECURITY=${json.ssecurity}\n`);
                            console.log('✅ Saved to backend/.env');

                            await browser.close();
                            process.exit(0);
                        } else {
                            console.log('❌ ServiceToken cookie missing. Check browser.');
                        }
                    }, 3000);
                }
            } catch (e) {}
        }
    });

    // Navigate to HTML Login Page (No _json=true)
    await page.goto('https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio');

    // Poll for cookies constantly
    let userId = null;
    let serviceToken = null;

    // Check every 2 seconds
    const interval = setInterval(async () => {
         if (foundCreds) return;
         try {
             const cookies = await page.cookies();
             const uCookie = cookies.find(c => c.name === 'userId');
             const sCookie = cookies.find(c => c.name === 'serviceToken');

             if (uCookie && sCookie) {
                 console.log('\n🎉 COOKIES DETECTED!');
                 userId = uCookie.value;
                 serviceToken = sCookie.value;

                 // We still need ssecurity from interception if possible,
                 // BUT sometimes just serviceToken + userId is enough for basic http?
                 // No, miio/micloud needs ssecurity to sign.
                 // However, let's save what we have.

                 foundCreds = true;
                 clearInterval(interval);

                  // SAVE TO .ENV
                  const envPath = path.join(__dirname, '.env');
                  // check if ssecurity captured from network. If not, we might be stuck.
                  // But let's save what we have.

                  console.log(`XIAOMI_USER_ID=${userId}`);
                  console.log(`XIAOMI_SERVICE_TOKEN=${serviceToken}`);

                  fs.appendFileSync(envPath, `\n# --- AUTH TOKENS (Interactive) ---\nXIAOMI_USER_ID=${userId}\nXIAOMI_SERVICE_TOKEN=${serviceToken}\n`);
                  console.log('✅ Saved tokens to backend/.env');

                  console.log('⚠️ Note: If "ssecurity" was not captured via network, full connectivity might be limited.');
                  console.log('Closing browser in 5 seconds...');
                  setTimeout(() => {
                      browser.close();
                      process.exit(0);
                  }, 5000);
             }
         } catch(e) {}
    }, 2000);

})();
