const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class XiaomiBrowserService {
    constructor() {
        this.sessions = new Map(); // Store active browser instances by username
    }

    async startLogin(username, password) {
        console.log(`[BROWSER-AUTH] Starting login flow for ${username}...`);

        // Launch a new browser for this session
        const browser = await puppeteer.launch({
            headless: false, // User needs to see this to trust it / debug
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--window-size=1280,800'
            ]
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Store session
            this.sessions.set(username, { browser, page, stage: 'init' });

            // Go to Login
            await page.goto('https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio&_json=true');

            // Wait for inputs
            await page.waitForSelector('input[name="user"]');
            await page.type('input[name="user"]', username);
            await page.type('input[name="password"]', password);

            // Click Login (using generic selector or button ID)
            await page.click('#login-button'); // Typical ID, usually verified via visuals but 'button[type="submit"]' is safer
            // Note: Xiaomi login button id is usually "login-button" or class "btn-login"
            // Let's rely on KeyPress Enter or finding the button text
            await page.keyboard.press('Enter');

            // Wait for navigation or 2FA
            // We check for 3 outcomes:
            // 1. Success (redirect to success URL or returns JSON token)
            // 2. 2FA (page text contains "verification" or "notificationUrl")
            // 3. Error (invalid pass)

            try {
                // Wait 5s to see what happens
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
            } catch(e) {}

            const content = await page.content();
            const currentUrl = page.url();

            // Check if 2FA page appeared
            // Xiaomi 2FA page often has "Enter code" or "Send code"
            if (content.includes('notificationUrl') || content.includes('verification') || currentUrl.includes('serviceLoginAuth2')) {
                console.log('[BROWSER-AUTH] 2FA Detected!');

                // If it asks to "Send Code" via a button, we might need to click it.
                // But usually, it auto-sends or presents the option.
                // Assuming it's in the state waiting for code or selection.

                return { status: '2fa_required', type: 'browser_managed' };
            }

            // Check for Success (JSON response in raw text if we used the JSON link)
            if (content.includes('ssecurity') && content.includes('userId')) {
                // Parse it
                const jsonText = await page.evaluate(() => document.body.innerText);
                const cleanJson = jsonText.replace('&&&START&&&', '');
                const data = JSON.parse(cleanJson);

                await browser.close();
                this.sessions.delete(username);

                return {
                    status: 'ok',
                    userId: data.userId,
                    ssecurity: data.ssecurity,
                    location: data.location
                };
            }

            // Fail-safe: Keep browser open if we are determining state?
            // Nay, if unknown, likely fail.
             // Check cookies just in case
            const cookies = await page.cookies();
            const serviceToken = cookies.find(c => c.name === 'serviceToken');

            if (serviceToken) {
                // We are logged in!
                const userIdCookie = cookies.find(c => c.name === 'userId');
                await browser.close();
                this.sessions.delete(username);
                 return {
                    status: 'ok',
                    userId: userIdCookie?.value || 'unknown',
                    serviceToken: serviceToken.value,
                    ssecurity: 'get_from_location_if_missed' // Puppeteer flow usually gets full cookies
                };
            }

            // If here, we might be stuck or failed.
            await browser.close();
            this.sessions.delete(username);
            throw new Error('Login failed or unknown state. Check credentials.');

        } catch (e) {
            console.error('[BROWSER-AUTH] Error:', e);
            if (browser) await browser.close();
            this.sessions.delete(username);
            throw e;
        }
    }

    async submitTwoFACode(username, code) {
        const session = this.sessions.get(username);
        if (!session) throw new Error('No active login session for this user.');

        const { browser, page } = session;
        console.log(`[BROWSER-AUTH] Submitting code for ${username}...`);

        try {
            // Locate Code Input
            // Field usually name="ticket" or placeholder="Enter code"
            // We'll try common selectors
            const inputSelector = 'input[type="text"]'; // Risky?
            // Specific Xiaomi code input usually has name="vcode" or similar

            await page.waitForSelector('input');

            // Often there's only one input on the 2FA page
            await page.type('input', code);
            await page.keyboard.press('Enter');

            // Wait for result
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });

            // Check for success JSON
            const content = await page.evaluate(() => document.body.innerText);
            const cleanJson = content.replace('&&&START&&&', '');

            let data = {};
            try { data = JSON.parse(cleanJson); } catch(e) {}

            if (data.ssecurity && data.userId) {
                // Success!
                // We also need the ServiceToken from the redirect URL (data.location)
                // The browser might not automatically follow the JSON redirect if it treats it as text.
                // We need to fetch the location.

                const locationRes = await page.goto(data.location, { waitUntil: 'networkidle2' });

                const cookies = await page.cookies();
                const serviceToken = cookies.find(c => c.name === 'serviceToken');

                await browser.close();
                this.sessions.delete(username);

                return {
                    status: 'ok',
                    userId: data.userId,
                    ssecurity: data.ssecurity,
                    serviceToken: serviceToken ? serviceToken.value : null
                };
            }

            throw new Error('2FA Failed or Valid Code returned unexpected response.');

        } catch (e) {
            console.error('[BROWSER-AUTH] 2FA Submit Error:', e);
            // Don't close browser immediately? User might want to retry code.
            // But for now, we close to clean up.
            await browser.close();
            this.sessions.delete(username);
            throw e;
        }
    }
}

module.exports = new XiaomiBrowserService();
