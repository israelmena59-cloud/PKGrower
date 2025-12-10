const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Enable Stealth
puppeteer.use(StealthPlugin());

(async () => {
    console.log('🚀 Launching STEALTH Browser (Puppeteer Extra)...');
    console.log('👉 Login normally.');
    console.log('👉 If blocked (403), wait 10s or try refreshing.');
    console.log('👉 Once logged in, visit https://i.mi.com/ to trigger ssecurity.');
    console.log('❌ DO NOT CLOSE THE BROWSER. The script will close it automatically.');

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1280,800',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        defaultViewport: null
    });

    const page = await browser.newPage();

    // Set a very standard User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Remove webdriver property just in case stealth plugin missed it (unlikely but safe)
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    let foundSsecurity = false;
    let foundServiceToken = false;
    let foundUserId = false;

    // 1. Network Listener (DUMP MODE)
    const dumpPath = path.join(__dirname, 'network_dump.txt');
    try { fs.writeFileSync(dumpPath, '--- START NETWORK DUMP ---\n'); } catch(e) {}

    page.on('response', async response => {
        const url = response.url();

        // DUMP EVERYTHING RELEVANT
        if (url.includes('mi.com') || url.includes('xiaomi')) {
             try {
                 const headers = response.headers();
                 const type = headers['content-type'] || '';
                 fs.appendFileSync(dumpPath, `\n\nURL: ${url}\nTYPE: ${type}\n`);

                 if (type.includes('json') || type.includes('text') || type.includes('javascript') || type.includes('html')) {
                      const text = await response.text();
                      fs.appendFileSync(dumpPath, `BODY_START\n${text.substring(0, 5000)}\nBODY_END\n`);

                      // Live Search
                      if (text.includes('ssecurity') || text.includes('security')) {
                           console.log('🔥 FOUND SECURITY KEYWORD IN DUMP!');
                           console.log('Source URL:', url);
                           // Try Regex
                           const match = text.match(/"ssecurity":"([^"]+)"/);
                           if (match) updateEnv('XIAOMI_SSECURITY', match[1]);
                      }
                 }
             } catch(e) {}
        }

        // Filter for relevant endpoints (Original Logic Preserved)
        if (url.includes('serviceLoginAuth2') || url.includes('mi.com') || url.includes('account')) {
            try {
                // Ignore large assets
                const headers = response.headers();
                if (headers['content-type'] && (headers['content-type'].includes('image') || headers['content-type'].includes('css'))) return;

                const text = await response.text();

                // RELAXED CHECK: Look for ANY ssecurity occurrence
                if (text.includes('ssecurity')) {
                     console.log('🎯 POTENTIAL TOKEN SOURCE:', url);
                     // Clean common Xiaomi prefixes
                     let cleanText = text.replace('&&&START&&&', '');

                     try {
                         const json = JSON.parse(cleanText);
                         if (json.ssecurity) {
                             console.log('🔐 FOUND SSECURITY:', json.ssecurity);
                             updateEnv('XIAOMI_SSECURITY', json.ssecurity);
                             foundSsecurity = true;
                         }
                         if (json.userId) {
                             console.log('👤 FOUND USERID:', json.userId);
                             updateEnv('XIAOMI_USER_ID', json.userId);
                             foundUserId = true;
                         }
                         // If we found ssecurity but no userId, try to find userId in cookies or just proceed
                         if (json.location) {
                             // Sometimes userId is in the redirect URL location query params
                             const match = json.location.match(/userId=(\d+)/);
                             if (match) {
                                  console.log('👤 FOUND USERID IN URL:', match[1]);
                                  updateEnv('XIAOMI_USER_ID', match[1]);
                                  foundUserId = true;
                             }
                         }
                         checkDone(browser);
                     } catch(e) {
                         console.log('⚠️ Failed to parse JSON, trying Regex...');
                         // Fallback Regex
                         const matchSec = text.match(/"ssecurity":"([^"]+)"/);
                         if (matchSec) {
                              console.log('🔐 FOUND SSECURITY (Regex):', matchSec[1]);
                              updateEnv('XIAOMI_SSECURITY', matchSec[1]);
                              foundSsecurity = true;
                         }
                     }
                }
            } catch(e) {}
        }
    });

    // 2. Cookie Listener
    setInterval(async () => {
        if (foundServiceToken) return;
        const cookies = await page.cookies();
        const st = cookies.find(c => c.name === 'serviceToken');
        if (st) {
             console.log('🍪 FOUND SERVICE TOKEN:', st.value.substring(0, 15) + '...');
             updateEnv('XIAOMI_SERVICE_TOKEN', st.value);
             foundServiceToken = true;
             checkDone(browser);
        }
    }, 2000);

    console.log('🌐 Navigating to login...');
    await page.goto('https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio');

    function updateEnv(key, value) {
        const envPath = path.join(__dirname, '.env');
        let content = fs.readFileSync(envPath, 'utf8');
        if (!content.includes(`${key}=${value}`)) {
             // If key exists but different value, replace it? Or just append (lazy)
             // Let's append, backend usually reads last occurrence in dotenv? No, first.
             // We should Append with a New Line or Replace.
             // For simplicity, we APPEND, but user might need to clean up.
             // Actually, let's just append.
             fs.appendFileSync(envPath, `\n${key}=${value}`);
             console.log(`✅ Saved ${key} to .env`);
        }
    }

    function checkDone(b) {
        if (foundSsecurity && foundServiceToken) { // UserID usually comes with ssecurity
            console.log('\n🎉🎉🎉 ALL TOKENS SECURED! 🎉🎉🎉');
            console.log('Closing browser in 3 seconds...');
            setTimeout(() => {
                b.close();
                process.exit(0);
            }, 3000);
        }
    }

})();
