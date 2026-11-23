import { InjectionToken } from '@angular/core';
import type {
  RavelryCraft,
  RavelryDetail,
  RavelryProjects,
  RavelryResult,
  RavelrySearch,
  RavelryTokens,
} from './ravelry.model';

/** `auth` : le jeton d'accès de la lectrice connectée (fiche 62), ou `null`. Jamais journalisé ni mis dans une adresse. */
export interface RavelryClient {
  search(
    base: string,
    demande: { q: string; craft: RavelryCraft; page: number },
    auth?: string | null,
  ): Promise<RavelryResult<RavelrySearch>>;
  pattern(base: string, id: number, auth?: string | null): Promise<RavelryResult<RavelryDetail>>;
  projects(
    base: string,
    id: number,
    page: number,
    auth: string,
  ): Promise<RavelryResult<RavelryProjects>>;
  exchangeCode(
    base: string,
    demande: { code: string; verifier: string; redirectUri: string },
  ): Promise<RavelryResult<RavelryTokens>>;
  refresh(base: string, refreshToken: string): Promise<RavelryResult<RavelryTokens>>;
}

/**
 * Client du Worker, chargé par `import()` au premier usage : le lecteur, seul au
 * premier affichage, n'en paie rien. Remplaçable en test.
 */
export const RAVELRY_CLIENT = new InjectionToken<RavelryClient>('RAVELRY_CLIENT', {
  factory: () => ({
    search: async (base, demande, auth) =>
      (await import('./ravelry-client')).searchPatterns(base, demande, auth),
    pattern: async (base, id, auth) =>
      (await import('./ravelry-client')).getPattern(base, id, auth),
    projects: async (base, id, page, auth) =>
      (await import('./ravelry-client')).getProjects(base, id, page, auth),
    exchangeCode: async (base, demande) =>
      (await import('./ravelry-client')).exchangeCode(base, demande),
    refresh: async (base, refreshToken) =>
      (await import('./ravelry-client')).refreshTokens(base, refreshToken),
  }),
});
