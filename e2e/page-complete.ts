import type { BrowserContext, Page } from '@playwright/test';

/**
 * Le lecteur s'ouvre en mode page pleine (fiche 38) : en-tête, partage,
 * compteurs et panneau du patron sont masqués. Les tests qui agissent sur
 * ces éléments partent de la page complète, comme une lectrice qui a quitté
 * le mode : à appeler avant `goto`.
 */
export async function pageComplete(target: Page | BrowserContext): Promise<void> {
  await target.addInitScript(() => localStorage.setItem('fil.focus', 'false'));
}
