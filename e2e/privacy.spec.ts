import { expect, test } from '@playwright/test';

/**
 * Fiche 40 : la page de confidentialité est dans le HTML pré-rendu (ce que lit
 * le Play Store, sans JavaScript), reliée du pied de page, et dans le sitemap.
 * L'audit axe en dérive de `route-paths.json` (`a11y.spec.ts`).
 */

const PAGES = [
  { locale: 'en', path: '/privacy', title: 'Privacy', storage: 'IndexedDB', footer: 'Privacy' },
  {
    locale: 'fr',
    path: '/fr/confidentialite',
    title: 'Confidentialité',
    storage: 'IndexedDB',
    footer: 'Confidentialité',
  },
] as const;

for (const { locale, path, title, storage, footer } of PAGES) {
  test(`le HTML brut de ${path} nomme le stockage et la mesure d’audience`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    expect(html).toContain(`<h1>${title}</h1>`);
    expect(html).toContain(storage);
    expect(html).toContain('Umami');
    expect(html).toContain('index, follow');
  });

  test(`le pied de page (${locale}) mène à ${path}`, async ({ page }) => {
    await page.goto(locale === 'fr' ? '/fr' : '/');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.locator('fil-site-footer').getByRole('link', { name: footer }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  });

  test(`${path} est dans le sitemap`, async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain(`${path}</loc>`);
  });
}
