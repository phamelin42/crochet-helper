import { expect, test } from '@playwright/test';

/**
 * Liste des étapes (fiche 25) : retrouver son rang après une pause sans
 * cliquer trente fois sur « Next ». Un clic dans la liste saute directement
 * au rang choisi et ramène le focus sur l'étape.
 */
test('ouvrir la liste et cliquer une étape y saute directement, focus compris', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();

  await page.getByText('All steps', { exact: false }).click();
  const items = page.locator('.steps-item');
  const targetExcerpt = (await items.nth(4).locator('.steps-item-excerpt').innerText()).replace(
    '…',
    '',
  );

  await items.nth(4).click();

  await expect(page.locator('.step-body')).toContainText(targetExcerpt);
  await expect(page.locator('.step-body')).toBeFocused();
});
