import { defineConfig, devices } from '@playwright/test';

// Port réglable : deux copies de travail peuvent lancer l'audit en même temps.
const PORT = Number(process.env['E2E_PORT'] ?? 4310);
// Le build des tests de la recherche Ravelry (interrupteur renseigné) a son propre serveur.
const PORT_RAVELRY = PORT + 1;

/** Fiche 46 : sans préférence, un patron dessinable ouvre la question « étapes écrites ou diagramme ? », modale. */
const storageState = (port: number) => ({
  cookies: [],
  origins: [
    {
      origin: `http://localhost:${port}`,
      localStorage: [{ name: 'fil.defaultView', value: JSON.stringify('text') }],
    },
  ],
});

// Chromium déjà installé ailleurs (conteneur de relecture) : évite de télécharger celui de Playwright.
const launchOptions = { executablePath: process.env['PW_CHROMIUM'] || undefined };

/**
 * Config Playwright dédiée à l'audit d'accessibilité (`npm run test:a11y`).
 * Elle sert le build de production statique — pas `ng serve` — pour tester
 * ce qui est réellement livré, pré-rendu compris.
 *
 * Le projet `ravelry` sert un second build, identique mais avec l'interrupteur de
 * la recherche Ravelry renseigné (`ng build -c production,ravelry-e2e`, reconstruit
 * à chaque lancement) : la production, elle, le livre éteint (ADR-004).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      testIgnore: /recherche-ravelry\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${PORT}`,
        storageState: storageState(PORT),
        launchOptions,
      },
    },
    {
      name: 'ravelry',
      testMatch: /recherche-ravelry\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${PORT_RAVELRY}`,
        storageState: storageState(PORT_RAVELRY),
        launchOptions,
      },
    },
  ],
  webServer: [
    {
      command: `node e2e/static-server.mjs ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
    },
    {
      command: `npm run build:ravelry-e2e && node e2e/static-server.mjs ${PORT_RAVELRY} dist-ravelry`,
      url: `http://localhost:${PORT_RAVELRY}`,
      // Jamais réutilisé : un build périmé ferait tester l'ancien code.
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
