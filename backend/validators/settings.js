const { body } = require('express-validator');

const settingsValidator = [
    // APP Validation
    body('app').optional().isObject().withMessage('App config must be an object'),
    body('app.appName').optional().isString(),
    body('app.refreshInterval').optional().isInt({ min: 1 }),

    // TUYA Validation
    body('tuya').optional().isObject(),
    body('tuya.accessKey').optional().isString(),
    body('tuya.secretKey').optional().isString(),

    // XIAOMI Validation
    body('xiaomi').optional().isObject(),
    body('xiaomi.username').optional().isString(),
    // Allow empty string for password if not changing
    body('xiaomi.password').optional().isString(),

    // MEROSS Validation
    body('meross').optional().isObject(),
    body('meross.email').optional().isEmail().withMessage('Meross email must be valid'),
    body('meross.password').optional().isString(),

    // Lighting & Crop Steering
    body('lighting').optional().isObject(),
    body('cropSteering').optional().isObject(),
];

module.exports = settingsValidator;
