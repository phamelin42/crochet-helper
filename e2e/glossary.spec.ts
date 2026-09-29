import { expect, test } from '@playwright/test';

/**
 * Glossaire lisible sur téléphone (fiche 33) : à 360 px, la liste complète ne
 * défile pas horizontalement, les filtres retirent les termes de l'autre
 * technique, et le HTML servi contient déjà toutes les entrées.
 */

const PAGES = [
  { path: '/glossary', tricot: 'Knitting', slug: '/glossary/sc', absent: 'sc', present: 'ms' },
  {
    path: '/fr/glossaire',
    tricot: 'tricot',
    slug: '/fr/glossaire/sc',
    absent: 'sc',
    present: 'ms',
  },
] as const;

for (const page of PAGES) {
  test(`${page.path} — 360 px — aucun défilement horizontal, liste complète`, async ({
    page: p,
  }) => {
    await p.setViewportSize({ width: 360, height: 800 });
    await p.goto(page.path);
    await p.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await expect(p.locator('.glossary-list')).toBeVisible();

    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await p.locator('tbody th[scope="row"]').count()).toBeGreaterThan(40);
  });

  test(`${page.path} — le filtre « ${page.tricot} » masque « ${page.absent} »`, async ({
    page: p,
  }) => {
    await p.goto(page.path);
    await p.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const sc = p.locator(`tbody a[href="${page.slug}"]`);
    await expect(sc).toBeVisible();

    await p.locator('.seg-opt', { hasText: new RegExp(`^\\s*${page.tricot}\\s*$`, 'i') }).click();
    await expect(sc).toHaveCount(0);
  });

  test(`${page.path} — le HTML brut contient « ${page.absent} » et « ${page.present} »`, async ({
    request,
  }) => {
    const html = await (await request.get(page.path)).text();
    expect(html).toContain(`<code>${page.absent}</code>`);
    expect(html).toContain(`<code>${page.present}</code>`);
  });
}
