import { defineConfig } from "@playwright/test";

const PORT = 8790;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses a locally installed Chromium when PLAYWRIGHT_CHROMIUM_PATH is set (e.g. in CI images).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
    acceptDownloads: true,
  },
  webServer: {
    // Fresh database per run; AI deliberately unconfigured so the manual path is what's tested.
    command: `vite build && rm -f data/e2e.db* && DATABASE_PATH=./data/e2e.db PORT=${PORT} NODE_ENV=production ANTHROPIC_API_KEY= tsx server/main.ts`,
    url: `http://localhost:${PORT}/api/session`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
