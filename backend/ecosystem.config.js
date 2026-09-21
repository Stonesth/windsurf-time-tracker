module.exports = {
  apps: [
    {
      name: 'time-tracker-api',
      script: 'dist/server.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
