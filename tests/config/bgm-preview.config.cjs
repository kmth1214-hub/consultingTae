const { defineConfig } = require('@playwright/test');

// Run against a separately started Vite preview on 4180. Playwright's Windows
// webServer teardown can leave the child Vite process alive after tests finish.
module.exports = defineConfig({
  testDir: '../e2e', timeout: 30000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4180', viewport: { width: 1440, height: 900 }, channel: 'chrome' },
});
