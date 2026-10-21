const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e', timeout: 30000, fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5180', viewport: { width: 1440, height: 1000 },
    channel: 'chrome', trace: 'retain-on-failure' },
  webServer: { command: `${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run dev -- --host 127.0.0.1 --port 5180 --strictPort`,
    url: 'http://127.0.0.1:5180', reuseExistingServer: false }
});
