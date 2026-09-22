import { defineConfig, devices } from '@playwright/test';

const PORT = 4310;

/**
 * Config Playwright dédiée à l'audit d'accessibilité (`npm run test:a11y`).
 * Elle sert le build de production statique — pas `ng serve` — pour tester
 * ce qui est réellement livré, pré-rendu compris.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node e2e/static-server.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  },
});
