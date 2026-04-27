import { defineConfig } from "@playwright/test";

const playwrightPort = Number.parseInt(process.env.PLAYWRIGHT_PORT || "8011", 10);
const baseURL = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chromium",
    headless: true,
  },
  webServer: {
    command: `python -m uvicorn src.api_server:app --host 127.0.0.1 --port ${playwrightPort}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
