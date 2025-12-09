const xiaomiAuth = require('./xiaomi-auth');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const querystring = require('querystring');

// Correctly load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testLogin() {
    const user = process.env.XIAOMI_CLOUD_USERNAME;
    const pass = process.env.XIAOMI_CLOUD_PASSWORD;

    console.log(`[DEBUG] Attempting login for: ${user}`);

    if (!user || !pass) {
        console.error('❌ Missing XIAOMI_CLOUD_USERNAME or XIAOMI_CLOUD_PASSWORD in .env');
        rl.close();
        return;
    }

    try {
        const result = await xiaomiAuth.login(user, pass);

        if (result.status === 'ok') {
            console.log('✅ Login Successful immediately (No 2FA needed)!');
            console.log('UserId:', result.userId);
            console.log('ServiceToken:', result.serviceToken ? 'OBTAINED' : 'MISSING');
            rl.close();
        } else if (result.status === '2fa_required') {
            console.log('⚠️  2FA Required!');
            console.log('Context:', result.context);

            // AUTO-TRIGGER LOGIC
            try {
                 console.log('[DEBUG] Attempting to auto-trigger email code...');

                 const triggerUrl = 'https://account.xiaomi.com/pass/serviceLoginAuth2';
                 const triggerBody = querystring.stringify({
                    _json: 'true',
                    sid: 'xiaomiio',
                    _sign: result.context.sign,
                    user: result.context.username,
                    qs: result.context.qs || '%3Fsid%3Dxiaomiio%26_json%3Dtrue',
                    type: 'email', // Assuming email based on username
                    action: 'send'
                 });

                 const triggerRes = await fetch(triggerUrl, {
                    method: 'POST',
                    body: triggerBody,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': `sdkVersion=accountsdk-18.8.15; deviceId=${xiaomiAuth.clientId}; ${result.context.cookie}`
                    }
                 });
                 const triggerText = await triggerRes.text();
                 console.log('[DEBUG] Trigger Response:', triggerText);

            } catch(e) { console.error('Auto-trigger failed:', e.message); }

            rl.question('Enter the code you received (SMS/Email): ', async (code) => {
                try {
                    const verifyRes = await xiaomiAuth.verify2FA(code, result.context, pass);
                    console.log('✅ 2FA Verification Successful!');
                    console.log('UserId:', verifyRes.userId);
                    console.log('ServiceToken:', verifyRes.serviceToken ? 'OBTAINED' : 'MISSING');
                } catch(e) {
                    console.error('❌ Verification Failed:', e.message);
                }
                rl.close();
            });
        }
    } catch(e) {
        console.error('❌ Login Error:', e);
        rl.close();
    }
}

testLogin();
