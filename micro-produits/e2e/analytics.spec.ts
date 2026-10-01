import { expect, test } from '@playwright/test';
import { appsConstruites } from './apps';

for (const app of appsConstruites()) {
  test(`${app.nom} — aucun test ne contacte le collecteur`, async ({ page }) => {
    const appels: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://localhost')) appels.push(r.url());
    });
    await page.goto(`http://localhost:${app.port}/`);
    await page.locator('mp-shell[data-ready]').waitFor();
    expect(appels).toEqual([]);
  });
}
