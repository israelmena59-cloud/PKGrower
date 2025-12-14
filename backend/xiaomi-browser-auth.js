/**
 * Xiaomi Browser-Based Authentication using Puppeteer
 * Handles OAuth login with 2FA support
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const firestore = require('./firestore');

// Active browser sessions (keyed by sessionId)
const activeSessions = new Map();

class XiaomiBrowserAuth {
    constructor() {
        this.isHeadless = process.env.NODE_ENV === 'production' || process.env.PUPPETEER_HEADLESS === 'true';
    }

    /**
     * Start a new authentication session
     * @param {string} username - Xiaomi account email
     * @param {string} password - Account password
     * @returns {Promise<{sessionId: string, status: string}>}
     */
    async startLogin(username, password) {
        const sessionId = `xiaomi_${Date.now()}`;
        console.log(`[XIAOMI-BROWSER] Starting login session: ${sessionId}`);

        try {
            // Launch browser
            const browser = await puppeteer.launch({
                headless: this.isHeadless ? 'new' : false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--window-size=1920,1080'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Store session
            activeSessions.set(sessionId, {
                browser,
                page,
                status: 'starting',
                username,
                password,
                createdAt: new Date()
            });

            // Navigate to Mi Home login
            console.log('[XIAOMI-BROWSER] Navigating to login page...');
            await page.goto('https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio&_json=true', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for and fill login form
            await this._fillLoginForm(sessionId, username, password);

            return { sessionId, status: 'processing' };

        } catch (error) {
            console.error('[XIAOMI-BROWSER] Start login error:', error.message);
            await this._cleanupSession(sessionId);
            throw error;
        }
    }

    async _fillLoginForm(sessionId, username, password) {
        const session = activeSessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        const { page } = session;

        try {
            // Try to find login form
            console.log('[XIAOMI-BROWSER] Looking for login form...');

            // Wait for form to appear (Mi account page)
            await page.waitForSelector('input[name="user"]', { timeout: 10000 }).catch(() => {});

            // Check if we need username input
            const usernameInput = await page.$('input[name="user"]');
            if (usernameInput) {
                console.log('[XIAOMI-BROWSER] Entering username...');
                await page.type('input[name="user"]', username, { delay: 50 });
                await page.waitForTimeout(500);
            }

            // Enter password
            const passwordInput = await page.$('input[name="password"]');
            if (passwordInput) {
                console.log('[XIAOMI-BROWSER] Entering password...');
                await page.type('input[name="password"]', password, { delay: 50 });
                await page.waitForTimeout(500);
            }

            // Click login button
            const loginButton = await page.$('input[type="submit"], button[type="submit"], .btn-login');
            if (loginButton) {
                console.log('[XIAOMI-BROWSER] Clicking login button...');
                await loginButton.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
            }

            // Check result
            await this._checkLoginResult(sessionId);

        } catch (error) {
            console.error('[XIAOMI-BROWSER] Fill form error:', error.message);
            session.status = 'error';
            session.error = error.message;
        }
    }

    async _checkLoginResult(sessionId) {
        const session = activeSessions.get(sessionId);
        if (!session) return;

        const { page } = session;
        const url = page.url();
        const content = await page.content();

        console.log('[XIAOMI-BROWSER] Current URL:', url);

        // Check for 2FA requirement
        if (url.includes('pass2fa') || content.includes('verification code') ||
            content.includes('验证码') || content.includes('two-step') ||
            content.includes('2fa') || content.includes('notify')) {

            console.log('[XIAOMI-BROWSER] 2FA required!');
            session.status = '2fa_required';
            session.message = 'Please check your Xiaomi app or email for verification code';

            // Try to trigger code sending
            await this._trigger2FACode(sessionId);
            return;
        }

        // Check for successful login (redirect to sts.api.io.mi.com)
        if (url.includes('sts.api.io.mi.com') || url.includes('home.mi.com')) {
            console.log('[XIAOMI-BROWSER] Login successful! Extracting tokens...');
            await this._extractTokens(sessionId);
            return;
        }

        // Check for error
        if (content.includes('error') || content.includes('incorrect') || content.includes('wrong')) {
            session.status = 'error';
            session.error = 'Invalid credentials';
            return;
        }

        // Still processing
        session.status = 'processing';
    }

    async _trigger2FACode(sessionId) {
        const session = activeSessions.get(sessionId);
        if (!session) return;

        const { page } = session;

        try {
            // Look for "send code" button and click it
            const sendButtons = await page.$$('button, a, input[type="submit"]');
            for (const btn of sendButtons) {
                const text = await btn.evaluate(el => el.textContent || el.value || '');
                if (text.includes('send') || text.includes('发送') || text.includes('get code') || text.includes('获取')) {
                    console.log('[XIAOMI-BROWSER] Found send code button, clicking...');
                    await btn.click();
                    await page.waitForTimeout(2000);
                    break;
                }
            }

            session.status = '2fa_required';
        } catch (error) {
            console.error('[XIAOMI-BROWSER] Trigger 2FA error:', error.message);
        }
    }

    /**
     * Submit 2FA verification code
     * @param {string} sessionId
     * @param {string} code - 6-digit verification code
     */
    async submit2FA(sessionId, code) {
        const session = activeSessions.get(sessionId);
        if (!session) throw new Error('Session not found or expired');

        const { page } = session;
        console.log(`[XIAOMI-BROWSER] Submitting 2FA code: ${code}`);

        try {
            // Find code input field
            const codeInput = await page.$('input[name="code"], input[name="ticket"], input[type="tel"], input[placeholder*="code"], input[placeholder*="验证码"]');
            if (codeInput) {
                // Clear and type code
                await codeInput.click({ clickCount: 3 });
                await page.keyboard.press('Backspace');
                await page.type(codeInput, code, { delay: 100 });
                await page.waitForTimeout(500);
            } else {
                // Try typing directly (some interfaces auto-focus)
                await page.keyboard.type(code, { delay: 100 });
            }

            // Look for submit button
            const submitButton = await page.$('button[type="submit"], input[type="submit"], .btn-submit, .verify-btn');
            if (submitButton) {
                console.log('[XIAOMI-BROWSER] Clicking verify button...');
                await submitButton.click();
            }

            // Wait for navigation
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

            // Check result
            const url = page.url();
            console.log('[XIAOMI-BROWSER] Post-2FA URL:', url);

            if (url.includes('sts.api.io.mi.com') || url.includes('home.mi.com')) {
                await this._extractTokens(sessionId);
                return { success: true, status: 'authenticated' };
            }

            // Check for errors
            const content = await page.content();
            if (content.includes('error') || content.includes('invalid') || content.includes('expired')) {
                session.status = 'error';
                session.error = 'Invalid or expired verification code';
                return { success: false, status: 'error', error: session.error };
            }

            // Still on 2FA page - code might be wrong
            session.status = '2fa_required';
            return { success: false, status: '2fa_required', message: 'Please try a different code' };

        } catch (error) {
            console.error('[XIAOMI-BROWSER] Submit 2FA error:', error.message);
            session.status = 'error';
            session.error = error.message;
            throw error;
        }
    }

    async _extractTokens(sessionId) {
        const session = activeSessions.get(sessionId);
        if (!session) return;

        const { page } = session;
        console.log('[XIAOMI-BROWSER] Extracting tokens...');

        try {
            // Get cookies
            const cookies = await page.cookies();
            console.log('[XIAOMI-BROWSER] Got cookies:', cookies.map(c => c.name).join(', '));

            // Extract important tokens
            const tokenData = {
                userId: null,
                serviceToken: null,
                ssecurity: null,
                deviceId: null,
                timestamp: new Date().toISOString()
            };

            cookies.forEach(cookie => {
                if (cookie.name === 'userId') tokenData.userId = cookie.value;
                if (cookie.name === 'serviceToken') tokenData.serviceToken = cookie.value;
                if (cookie.name === 'ssecurity') tokenData.ssecurity = cookie.value;
                if (cookie.name === 'deviceId') tokenData.deviceId = cookie.value;
            });

            // Also try to extract from page localStorage/sessionStorage
            const storageData = await page.evaluate(() => {
                try {
                    return {
                        local: JSON.stringify(localStorage),
                        session: JSON.stringify(sessionStorage)
                    };
                } catch { return {}; }
            });
            console.log('[XIAOMI-BROWSER] Storage data captured');

            if (tokenData.userId && tokenData.serviceToken) {
                console.log('[XIAOMI-BROWSER] Auth successful! Saving tokens...');

                // Save to Firestore settings
                const currentSettings = await firestore.getSettings() || {};
                await firestore.saveSettings({
                    ...currentSettings,
                    xiaomi: {
                        ...currentSettings.xiaomi,
                        userId: tokenData.userId,
                        serviceToken: tokenData.serviceToken,
                        ssecurity: tokenData.ssecurity,
                        capturedAt: tokenData.timestamp,
                        username: session.username
                    }
                });

                session.status = 'authenticated';
                session.tokens = tokenData;

                // Cleanup browser
                await this._cleanupSession(sessionId);

                return tokenData;
            } else {
                session.status = 'error';
                session.error = 'Failed to extract tokens';
            }

        } catch (error) {
            console.error('[XIAOMI-BROWSER] Extract tokens error:', error.message);
            session.status = 'error';
            session.error = error.message;
        }
    }

    /**
     * Get status of a login session
     * @param {string} sessionId
     */
    getSessionStatus(sessionId) {
        const session = activeSessions.get(sessionId);
        if (!session) {
            return { status: 'not_found', message: 'Session expired or not found' };
        }

        return {
            status: session.status,
            message: session.message || null,
            error: session.error || null,
            tokens: session.tokens || null,
            createdAt: session.createdAt
        };
    }

    async _cleanupSession(sessionId) {
        const session = activeSessions.get(sessionId);
        if (session && session.browser) {
            try {
                await session.browser.close();
                console.log(`[XIAOMI-BROWSER] Session ${sessionId} closed`);
            } catch (e) {
                console.error('[XIAOMI-BROWSER] Cleanup error:', e.message);
            }
        }
        activeSessions.delete(sessionId);
    }

    /**
     * Cleanup old sessions
     */
    cleanupOldSessions() {
        const maxAge = 10 * 60 * 1000; // 10 minutes
        const now = Date.now();

        for (const [id, session] of activeSessions) {
            if (now - session.createdAt.getTime() > maxAge) {
                this._cleanupSession(id);
            }
        }
    }
}

// Start cleanup interval
const authService = new XiaomiBrowserAuth();
setInterval(() => authService.cleanupOldSessions(), 60000);

module.exports = authService;
