const express = require('express');

module.exports = ({
    getSettings,
    saveSettings,
    resetSettings,
    reconnectTuya,
    reconnectMeross,
    reconnectXiaomi,
    xiaomiAuth,
    setEnv, // Helper to set process.env
    miHome, // Needed for 2FA injection
    setCloudConnected // Helper to set global state
}) => {
    const router = express.Router();

    // Validation Middleware
    const validateRequest = require('../middleware/validateRequest');
    const settingsValidator = require('../validators/settings');

    // GET Settings
    router.get('/', (req, res) => {
        try {
            res.json(getSettings());
        } catch(e) {
            res.status(500).json({ error: e.message });
        }
    });

    // POST Settings (Main Update)
    router.post('/', settingsValidator, validateRequest, async (req, res) => {
        try {
            const appSettings = getSettings();
            const { app, tuya, xiaomi, meross, lighting, cropSteering } = req.body;
            const envChanges = {};

            // APP & UI Config
            if (app) Object.assign(appSettings.app, app);

            // TUYA CONFIG
            if (tuya) {
                Object.assign(appSettings.tuya, tuya);
                if (tuya.accessKey) {
                    setEnv('TUYA_ACCESS_KEY', tuya.accessKey);
                    envChanges['TUYA_ACCESS_KEY'] = true;
                }
                if (tuya.secretKey) {
                    setEnv('TUYA_SECRET_KEY', tuya.secretKey);
                    envChanges['TUYA_SECRET_KEY'] = true;
                }
            }

            // XIAOMI CONFIG
            let need2FA = false;
            let authContext = null;
            if (xiaomi) {
                // Detect password change -> trigger Re-Auth
                const oldPass = appSettings.xiaomi?.password || process.env.XIAOMI_CLOUD_PASSWORD;
                if (xiaomi.password && xiaomi.password !== oldPass && !xiaomi.password.includes('***')) {
                    console.log('[SETTINGS] Password changed for Xiaomi. Attempting login...');
                    try {
                        const result = await xiaomiAuth.login(xiaomi.username || appSettings.xiaomi.username, xiaomi.password);
                        if (result.status === '2fa_required') {
                            need2FA = true;
                            authContext = { transactionId: result.transactionId, username: xiaomi.username };
                        } else if (result.status === 'ok') {
                            // Save tokens
                            setEnv('XIAOMI_USER_ID', result.userId);
                            setEnv('XIAOMI_SERVICE_TOKEN', result.serviceToken);
                            setEnv('XIAOMI_SSECURITY', result.ssecurity);
                        }
                    } catch (e) {
                        console.warn('[SETTINGS] Xiaomi Auto-Login failed:', e.message);
                    }
                }
                Object.assign(appSettings.xiaomi, xiaomi);
            }

            // MEROSS CONFIG
            if (meross) {
                if (!appSettings.meross) appSettings.meross = {};
                if (meross.email) {
                    appSettings.meross.email = meross.email;
                    setEnv('MEROSS_EMAIL', meross.email);
                }
                if (meross.password) {
                    appSettings.meross.password = meross.password;
                    setEnv('MEROSS_PASSWORD', meross.password);
                }
            }

            // LIGHTING & CROP STEERING
            if (lighting) Object.assign(appSettings.lighting, lighting);
            if (cropSteering) Object.assign(appSettings.cropSteering, cropSteering);

            // Persist
            await saveSettings();

            // Handle Review/Auth Response
            if (need2FA) {
                return res.json({
                    success: false,
                    require2FA: true,
                    context: authContext,
                    message: 'Se requiere verificación 2FA'
                });
            }

            // Trigger Reconnects
            console.log('[SETTINGS] Reiniciando conexiones...');
            if ((envChanges['TUYA_ACCESS_KEY'] || envChanges['TUYA_SECRET_KEY']) && reconnectTuya) {
                await reconnectTuya();
            }
            if (meross && reconnectMeross) reconnectMeross();
            // Xiaomi reconnect usually manual or auto-scheduled

            res.json({ success: true, settings: appSettings, message: 'Configuración guardada.' });
        } catch (error) {
            console.error('[SETTINGS] Error saving:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Verify 2FA
    router.post('/verify-2fa', async (req, res) => {
        try {
            const { code, context } = req.body;
            const appSettings = getSettings();
            const password = appSettings.xiaomi?.password || process.env.XIAOMI_CLOUD_PASSWORD;

            const authResult = await xiaomiAuth.verify2FA(code, context, password);

            // Access Global MiHome via injected dependency
            if (miHome && miHome.miCloudProtocol) {
                miHome.miCloudProtocol.userId = authResult.userId;
                miHome.miCloudProtocol.serviceToken = authResult.serviceToken;
                miHome.miCloudProtocol.ssecurity = authResult.ssecurity;
            }

            if (setCloudConnected) setCloudConnected(true);

            if (reconnectXiaomi) await reconnectXiaomi();

            res.json({ success: true, message: 'Autenticación completada' });
        } catch (error) {
            res.status(401).json({ error: 'Fallo 2FA: ' + error.message });
        }
    });

    // Reset
    router.post('/reset', async (req, res) => {
        try {
            await resetSettings();
            res.json({ success: true, message: 'Configuración restaurada' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
