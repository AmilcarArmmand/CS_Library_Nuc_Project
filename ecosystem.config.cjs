const path = require('path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'cs-library-web',
      cwd: root,
      script: 'dist/app.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: '8080',
      },
    },
  ],
};