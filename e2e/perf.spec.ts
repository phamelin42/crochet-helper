import { expect, test } from '@playwright/test';

/**
 * Garde-fou des Core Web Vitals. La fiche 09 a ramené le CLS de 0,338 (0,713
 * en français) à zéro : sans ce test, la prochaine fiche pourrait le ramener
 * sans que personne ne le voie, comme c'est arrivé jusqu'ici. Les seuils sont
 * ceux de la fiche, avec la marge mesurée dans `docs/performance.md`.
 *
 * Profil : mobile bridé (4G lente, processeur ÷4), le même que le rapport.
 */
const PAGES = ['/', '/glossary', '/fr/glossaire/ms'] as const;
const CLS_MAX = 0.05;
const LCP_MAX_MS = 2000;

for (const path of PAGES) {
  test(`${path} — CLS et LCP sous les seuils sur mobile bridé`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    // Le navigateur de test n'expose pas l'API « garder l'écran allumé », alors
    // que les mobiles visés, si : sans ce faux support, le bouton n'apparaît
    // jamais après l'hydratation et le décalage qu'il provoque échappe au test.
    await page.addInitScript(() => {
      if (!('wakeLock' in navigator)) {
        Object.defineProperty(navigator, 'wakeLock', {
          value: { request: () => Promise.reject(new Error('test')) },
          configurable: true,
        });
      }
    });

    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number; __lcp: number };
      w.__cls = 0;
      w.__lcp = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          hadRecentInput?: boolean;
          value: number;
        })[]) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        w.__lcp = entries[entries.length - 1].startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });

    await page.goto(path, { waitUntil: 'load' });
    // Laisse passer l'hydratation : c'est elle qui décalait la mise en page.
    await page.waitForTimeout(4000);

    const { cls, lcp } = await page.evaluate(() => {
      const w = window as unknown as { __cls: number; __lcp: number };
      return { cls: w.__cls, lcp: w.__lcp };
    });
    await context.close();

    expect(cls, `CLS de ${path}`).toBeLessThanOrEqual(CLS_MAX);
    expect(lcp, `LCP de ${path}`).toBeLessThanOrEqual(LCP_MAX_MS);
  });
}
