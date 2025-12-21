// PM2 Ecosystem Configuration for PKGrower Backend
// This file defines how PM2 should run and manage the application

module.exports = {
  apps: [{
    name: 'pkgrower-backend',
    script: 'index.js',
    cwd: '/home/${USER}/PKGrower/backend',

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Process management
    instances: 1,              // Single instance (e2-micro has limited resources)
    exec_mode: 'fork',         // Fork mode for single instance

    // Auto-restart configuration
    watch: false,              // Don't watch for file changes in production
    max_memory_restart: '800M', // Restart if memory exceeds 800MB (leaving buffer for OS)

    // Logging
    log_file: '/home/${USER}/PKGrower/backend/logs/combined.log',
    out_file: '/home/${USER}/PKGrower/backend/logs/out.log',
    error_file: '/home/${USER}/PKGrower/backend/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Restart behavior
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,       // Wait 5s before restarting

    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
