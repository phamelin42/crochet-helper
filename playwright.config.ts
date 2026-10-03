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
    // Fiche 46 : sans préférence, un patron dessinable ouvre la question
    // « étapes écrites ou diagramme ? », modale. Les tests qui ne parlent pas
    // d'elle partent d'un choix retenu ; `view-choice.spec.ts` repart de zéro.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${PORT}`,
          localStorage: [{ name: 'fil.defaultView', value: JSON.stringify('text') }],
        },
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chromium déjà installé ailleurs (conteneur de relecture) : évite de
        // télécharger celui de Playwright. Sans la variable, rien ne change.
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
