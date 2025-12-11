const crypto = require('crypto');
const fetch = require('node-fetch');
const querystring = require('querystring');

// Helper for random string
function generateRandomString(length) {
    return crypto.randomBytes(Math.ceil(length/2)).toString('hex').slice(0, length);
}

class XiaomiAuthenticator {
  constructor() {
    this.agentId = generateRandomString(13).toUpperCase();
    this.userAgent = `Android-7.1.1-1.0.0-ONEPLUS A3010-136-${this.agentId} APP/xiaomi.smarthome APPV/62830`;
    this.clientId = generateRandomString(6).toUpperCase();
  }

  _parseJson(str) {
    if (str.indexOf('&&&START&&&') === 0) {
      str = str.replace('&&&START&&&', '');
    }
    try {
        return JSON.parse(str);
    } catch(e) {
        return { error: 'Invalid JSON', raw: str };
    }
  }

  async loginStep1() {
    const res = await fetch('https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio&_json=true');
    const content = await res.text();
    const data = this._parseJson(content);
    if (!data._sign) throw new Error('Login step 1 failed (no sign)');
    return data._sign;
  }

  async loginStep2(username, password, sign, extraCookies = '') {
    const formData = querystring.stringify({
      hash: crypto.createHash('md5').update(password).digest('hex').toUpperCase(),
      _json: 'true',
      sid: 'xiaomiio',
      callback: 'https://sts.api.io.mi.com/sts',
      qs: '%3Fsid%3Dxiaomiio%26_json%3Dtrue',
      _sign: sign,
      user: username,
    });

    const res = await fetch('https://account.xiaomi.com/pass/serviceLoginAuth2', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `sdkVersion=accountsdk-18.8.15; deviceId=${this.clientId}; ${extraCookies}`
      },
    });

    const content = await res.text();
    const json = this._parseJson(content);

    // CAPTURE COOKIES
    const receivedCookies = res.headers.raw()['set-cookie'] || [];
    const sessionCookie = receivedCookies.map(c => c.split(';')[0]).join('; ');

    // ANALISIS DE RESPUESTA 2FA
    if (json.code === 70016 || json.notificationUrl || json.code === 87001) {
        return {
            need2FA: true,
            notificationUrl: json.notificationUrl,
            qs: json.qs,
            sign: sign,
            username: username,
            cookie: sessionCookie // Save Session
        };
    }

    if (!json.ssecurity || !json.userId || !json.location) {
        throw new Error(`Login step 2 failed: ${JSON.stringify(json)}`);
    }

    return {
        success: true,
        ssecurity: json.ssecurity,
        userId: json.userId,
        location: json.location
    };
  }

  async login(username, password) {
    const sign = await this.loginStep1();
    const step2 = await this.loginStep2(username, password, sign);

    if (step2.need2FA) {
        console.log('[AUTH] Activando envío de código 2FA (Email/SMS)...');
        console.log('[AUTH] URL de solicitud (Trigger):', step2.notificationUrl);

        try {
            // Experimental: Try POSTing to the URL to trigger action (some flows behave this way)
            // Or if it's a GET, we might need to parse the page to find the real trigger.
            // For now, let's try a GET with 'Accept: application/json' just in case,
            // or assume we need to hit a specific API endpoint derived from the notification URL.

            // 1. Fetch the trigger page to get cookies and session state freshened
            console.log('[AUTH] Fetching trigger page (GET) ->', step2.notificationUrl);
            const notifRes = await fetch(step2.notificationUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Cookie': `sdkVersion=accountsdk-18.8.15; deviceId=${this.clientId}; ${step2.cookie}`,
                    'Referer': 'https://account.xiaomi.com/pass/serviceLogin' // Critical for some flows
                }
            });
            const notifText = await notifRes.text();
            console.log('[AUTH] Trigger Page Status:', notifRes.status);

            // 2. Explicitly attempt to FIRE the code sending event
            // Often just visiting the URL is not enough; we need to POST to 'serviceLoginAuth2' with specific params
            if (notifText.includes('serviceLoginAuth2') || notifRes.status === 200) {
                  console.log('[AUTH] Attempting explicit trigger POST (Auto-detect mode)...');
                  const triggerUrl = 'https://account.xiaomi.com/pass/serviceLoginAuth2';

                  // Common params for sending code
                  const baseParams = {
                      _json: 'true',
                      sid: 'xiaomiio',
                      _sign: step2.sign,
                      user: step2.username,
                      qs: step2.qs || '%3Fsid%3Dxiaomiio%26_json%3Dtrue',
                      action: 'send'
                  };

                  // Try SMS first, then Email
                  const typesToTry = ['phone', 'email'];

                  for (const type of typesToTry) {
                      console.log(`[AUTH] Trying to trigger code via: ${type}`);
                      try {
                          const body = querystring.stringify({ ...baseParams, type });
                          const postRes = await fetch(triggerUrl, {
                              method: 'POST',
                              body: body,
                              headers: {
                                'User-Agent': this.userAgent,
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Cookie': `sdkVersion=accountsdk-18.8.15; deviceId=${this.clientId}; ${step2.cookie}`,
                                'Referer': step2.notificationUrl, // Referrer must match the flow
                                'Origin': 'https://account.xiaomi.com'
                              }
                          });
                          const postText = await postRes.text();
                          console.log(`[AUTH] Trigger ${type} Response:`, postText);

                          // If successful code 0, stop
                          if (postText.includes('"code":0')) break;
                      } catch(e) {
                          console.error(`[AUTH] Failed trigger ${type}:`, e.message);
                      }
                  }
            }

        } catch (e) {
            console.error('[AUTH] Error solicitando envío de código:', e.message);
        }

        return {
            status: '2fa_required',
            context: {
                ...step2, // Includes 'cookie'
                type: 'email'
            }
        };
    }

    if (step2.success) {
        const tokens = await this.loginStep3(step2);
        return { status: 'ok', ...tokens };
    }
  }

  async verify2FA(code, context, password) {
    console.log('[DEBUG-AUTH] verify2FA start. Code:', code, 'User:', context.username);

    const formData = querystring.stringify({
      _json: 'true',
      sid: 'xiaomiio',
      _sign: context.sign,
      user: context.username,
      hash: crypto.createHash('md5').update(password).digest('hex').toUpperCase(),
      ticket: code,
      vcode: code,
      qs: context.qs || '%3Fsid%3Dxiaomiio%26_json%3Dtrue',
      callback: 'https://sts.api.io.mi.com/sts',
      trust_device: 'true',
      trust: 'true',
    });

    // PASS COOKIES TO VERIFY REQUEST
    const res = await fetch('https://account.xiaomi.com/pass/serviceLoginAuth2', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `sdkVersion=accountsdk-18.8.15; deviceId=${this.clientId}; ${context.cookie || ''}`
      },
    });

    const content = await res.text();
    console.log('[DEBUG-AUTH] Response Body:', content);

    const json = this._parseJson(content);

    if (json.code === 70016 || json.code === 87001) {
         throw new Error(`Code Invalid/Expired (Res: ${JSON.stringify(json)})`);
    }

    if (json.code === 0 && json.location) {
         // Good
    } else if (!json.ssecurity || !json.userId || !json.location) {
        throw new Error(`2FA Verification failed: ${JSON.stringify(json)}`);
    }

     return this.loginStep3({
        ssecurity: json.ssecurity,
        userId: json.userId,
        location: json.location
     });
  }

  async loginStep3(step2Data) {
      const { location, ssecurity, userId } = step2Data;
      const res = await fetch(location);

      const cookies = res.headers.raw()['set-cookie'] || [];
      let serviceToken;
      cookies.forEach(c => {
          if (c.includes('serviceToken=')) {
              serviceToken = c.split(';')[0].split('=')[1];
          }
      });

      if (!serviceToken) throw new Error('Login step 3 failed (no serviceToken)');

      return {
          userId,
          serviceToken,
          ssecurity,
          status: 'ok'
      };
  }
}

module.exports = new XiaomiAuthenticator();
