import { expect, test } from '@playwright/test';

/**
 * Fiche 41 : ce que Google et Chrome lisent pour reconnaître l'application
 * Android comme propriétaire du site, et l'adresse que la TWA ouvre.
 */

test('/.well-known/assetlinks.json est servi en JSON et lie le paquet Android', async ({
  request,
}) => {
  const reponse = await request.get('/.well-known/assetlinks.json', { maxRedirects: 0 });
  expect(reponse.status()).toBe(200);
  expect(reponse.headers()['content-type']).toContain('application/json');
  const liens = (await reponse.json()) as {
    relation: string[];
    target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
  }[];
  expect(liens[0].relation).toContain('delegate_permission/common.handle_all_urls');
  expect(liens[0].target.namespace).toBe('android_app');
  expect(liens[0].target.package_name).toBe('com.patternreader.app');
  expect(Array.isArray(liens[0].target.sha256_cert_fingerprints)).toBe(true);
});

test('le manifeste déclare id, scope, icône maskable et captures étroites', async ({ request }) => {
  const manifeste = await (await request.get('/manifest.webmanifest')).json();
  expect(manifeste.id).toBe('/');
  expect(manifeste.scope).toBe('/');
  expect(manifeste.display).toBe('standalone');
  expect(manifeste.orientation).toBe('any');
  expect(manifeste.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  expect(manifeste.screenshots.length).toBeGreaterThan(0);
  for (const capture of manifeste.screenshots as { src: string; form_factor: string }[]) {
    expect(capture.form_factor).toBe('narrow');
    const image = await request.get(`/${capture.src}`);
    expect(image.status(), capture.src).toBe(200);
    expect(image.headers()['content-type']).toBe('image/png');
  }
});

for (const { page: chemin, h1 } of [
  { page: '/', h1: /crochet|knitting/i },
  { page: '/fr', h1: /crochet|tricot/i },
]) {
  test(`${chemin}?utm_source=play_store : lecteur normal, canonique sans paramètre`, async ({
    page,
  }) => {
    const reponse = await page.goto(`${chemin}?utm_source=play_store&utm_medium=app`);
    expect(reponse?.status()).toBe(200);
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(h1);
    // Aucun patron importé par les paramètres : le lecteur reste à l'accueil.
    await expect(page.locator('#pattern-source')).toHaveValue('');
    const canonique = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonique).not.toContain('utm_');
    expect(canonique).not.toContain('?');
  });
}
