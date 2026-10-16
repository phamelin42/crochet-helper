import { InjectionToken } from '@angular/core';

/** Pourquoi une mise en forme n'a pas eu lieu — les raisons que le Worker sait donner. */
export type AiRefusal = 'quota-jour' | 'budget-mois' | 'echec' | 'indisponible' | 'trop-long';

export type AiFormatResult =
  | { readonly ok: true; readonly texte: string; readonly restant: number }
  | { readonly ok: false; readonly raison: AiRefusal };

export type AiFormatClient = (
  url: string,
  texte: string,
  langue: 'fr' | 'en',
) => Promise<AiFormatResult>;

/**
 * Client du Worker, chargé par `import()` : seul un import avec la case cochée
 * s'en sert. Remplaçable en test.
 */
export const AI_FORMAT_CLIENT = new InjectionToken<AiFormatClient>('AI_FORMAT_CLIENT', {
  factory: () => async (url, texte, langue) =>
    (await import('./format-client')).formatWithAi(url, texte, langue),
});
