import { InjectionToken } from '@angular/core';
import type { RavelryCraft, RavelryDetail, RavelryResult, RavelrySearch } from './ravelry.model';

export interface RavelryClient {
  search(
    base: string,
    demande: { q: string; craft: RavelryCraft; page: number },
  ): Promise<RavelryResult<RavelrySearch>>;
  pattern(base: string, id: number): Promise<RavelryResult<RavelryDetail>>;
}

/**
 * Client du Worker, chargé par `import()` au premier usage : le lecteur, seul au
 * premier affichage, n'en paie rien. Remplaçable en test.
 */
export const RAVELRY_CLIENT = new InjectionToken<RavelryClient>('RAVELRY_CLIENT', {
  factory: () => ({
    search: async (base, demande) =>
      (await import('./ravelry-client')).searchPatterns(base, demande),
    pattern: async (base, id) => (await import('./ravelry-client')).getPattern(base, id),
  }),
});
