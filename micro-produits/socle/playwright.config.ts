import { defineConfig, devices } from '@playwright/test';

const PORT = 4310;

/**
 * Sert le build de production statique, pas `ng serve` : on teste ce qui est
 * livré, pré-rendu compris. Attention : `npx playwright test` sert le dernier
 * `dist/`, pas le code du moment — passer par `npm run test:e2e`, qui construit.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Transitions à 0,01 ms (tokens.css) : axe lit les couleurs au repos.
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: process.env['PW_CHROMIUM'] || undefined },
      },
    },
  ],
  webServer: {
    command: `node e2e/static-server.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  },
});
