import { defineConfig, devices } from '@playwright/test'

// Dedicated ports so a running `npm run dev` is never reused.
const backendPort = 3100
const frontendPort = 5273

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: [
    {
      command: 'npm exec -w backend -- tsx src/server.ts',
      url: `http://127.0.0.1:${backendPort}/api/owner`,
      env: { PORT: String(backendPort) },
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -w frontend -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      url: `http://127.0.0.1:${frontendPort}`,
      env: { API_URL: `http://127.0.0.1:${backendPort}` },
      reuseExistingServer: false,
    },
  ],
})
