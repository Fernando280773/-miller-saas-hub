// PM2 process file — `next start` on port 3000 behind nginx.
module.exports = {
  apps: [
    {
      name: 'miller-saas-hub',
      cwd: '/var/www/miller-saas-hub',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '700M',
    },
  ],
};
