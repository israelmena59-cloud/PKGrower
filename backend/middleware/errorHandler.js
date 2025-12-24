const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    // Log the error
    logger.error(err.message || 'Internal Server Error', {
        path: req.path,
        method: req.method,
        statusCode,
        stack: err.stack
    });

    res.status(statusCode).json({
        success: false,
        error: isProduction && statusCode === 500 ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
        ...(isProduction ? {} : { stack: err.stack })
    });
};

module.exports = errorHandler;
