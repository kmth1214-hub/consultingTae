const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e', timeout: 30000, fullyParallel: false, workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4180', viewport: { width: 1440, height: 900 },
    channel: 'chrome', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'node scripts/preview-e2e.cjs',
    url: 'http://127.0.0.1:4180', reuseExistingServer: false, timeout: 60000 }
});
