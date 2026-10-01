import { defineConfig, devices } from '@playwright/test';
import { appsConstruites } from './e2e/apps';

/**
 * Sert le build de production statique de chaque application, pas
 * `ng serve` : on teste ce qui est livré, pré-rendu compris. `npx playwright
 * test` sert le dernier `dist/`, pas le code du moment — passer par
 * `npm run test:e2e`, qui construit.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
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
  webServer: appsConstruites().map((app) => ({
    command: `node e2e/static-server.mjs ${app.dist} ${app.port}`,
    url: `http://localhost:${app.port}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  })),
});
