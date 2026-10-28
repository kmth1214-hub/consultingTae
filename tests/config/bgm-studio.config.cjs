const { defineConfig } = require('@playwright/test');

// Run against a separately started Vite dev server on 4181.
module.exports = defineConfig({
  testDir: '../studio-e2e', timeout: 30000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4181', viewport: { width: 1440, height: 900 }, channel: 'chrome' },
});
