import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:8011",
    browserName: "chromium",
    channel: "chromium",
    headless: true,
  },
  webServer: {
    command: "python -m uvicorn src.api_server:app --host 127.0.0.1 --port 8011",
    url: "http://127.0.0.1:8011/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
