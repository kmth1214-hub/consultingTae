const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/studio-e2e', timeout: 30000, fullyParallel: false, workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4181', viewport: { width: 1440, height: 900 },
    channel: 'chrome', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: `node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4181 --strictPort`,
    url: 'http://127.0.0.1:4181', reuseExistingServer: false, timeout: 60000 }
});
