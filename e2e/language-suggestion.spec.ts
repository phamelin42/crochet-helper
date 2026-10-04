import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * La langue vient de l'URL (CLAUDE.md, règle 3) : un navigateur en français
 * n'est jamais redirigé, il se voit proposer la même page en français.
 */
test.beforeEach(({ page }) => pageComplete(page));
test.use({ reducedMotion: 'reduce' });

test.describe('navigateur en français', () => {
  test.use({ locale: 'fr-FR' });

  test('une page anglaise reste anglaise et propose sa version française', async ({ page }) => {
    await page.goto('/glossary');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await expect(page).toHaveURL(/\/glossary$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const banner = page.locator('.lang-suggest');
    await expect(banner).toBeVisible();
    const audit = await new AxeBuilder({ page })
      .include('.lang-suggest')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(audit.violations).toEqual([]);

    await banner.getByRole('link', { name: 'Passer en français' }).click();
    await expect(page).toHaveURL(/\/fr\/glossaire$/);
    await expect(page.locator('.lang-suggest')).toHaveCount(0);
  });

  test('« Rester en anglais » : le bandeau ne revient pas au rechargement', async ({ page }) => {
    await page.goto('/');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Rester en anglais' }).click();
    await expect(page.locator('.lang-suggest')).toHaveCount(0);

    await page.reload();
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await expect(page.locator('.lang-suggest')).toHaveCount(0);
  });
});

test('navigateur en anglais sur une page anglaise : rien à proposer', async ({ page }) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  // Le bandeau se charge après le premier affichage : on lui en laisse le temps.
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.lang-suggest')).toHaveCount(0);
});
