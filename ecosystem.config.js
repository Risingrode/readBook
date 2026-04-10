module.exports = {
  apps: [
    {
      name: 'reader-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 7732,
        HOSTNAME: '0.0.0.0'
      }
    }
  ]
};