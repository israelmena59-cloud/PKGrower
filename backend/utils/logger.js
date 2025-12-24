const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      severity: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },

  error: (message, error = null) => {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      error: error ? { message: error.message, stack: error.stack } : undefined
    }));
  },

  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({
      severity: 'WARNING',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },

  debug: (message, meta = {}) => {
    // Debug logs only in development or if explicitly enabled
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_LOGS === 'true') {
      console.log(JSON.stringify({
        severity: 'DEBUG',
        message,
        timestamp: new Date().toISOString(),
        ...meta
      }));
    }
  }
};

module.exports = logger;
