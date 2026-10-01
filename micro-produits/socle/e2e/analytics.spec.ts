import { expect, test } from '@playwright/test';

test('aucun test ne contacte le collecteur (localhost n’est pas un hôte mesuré)', async ({
  page,
}) => {
  const appels: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost')) appels.push(r.url());
  });
  await page.goto('/');
  await page.locator('app-root[data-ready]').waitFor();
  await page.getByRole('button', { name: 'Commencer' }).click();
  expect(appels).toEqual([]);
});
