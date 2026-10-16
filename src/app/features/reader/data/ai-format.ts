import { InjectionToken } from '@angular/core';

/** Point d'entrée complet du Worker de mise en forme (ADR-003). Vide = la case n'apparaît pas. */
export const AI_FORMAT_URL = 'https://fil-ia.hamelinphilippe1.workers.dev/mise-en-forme';
/** Formulaire « plus d'utilisations ». Vide = la dernière phrase du message disparaît. */
export const AI_INTEREST_URL = 'https://tally.so/r/jeDWZ4';

/** Injectables pour les remplacer en test, sans toucher aux constantes. */
export const AI_FORMAT_URL_TOKEN = new InjectionToken<string>('fil.aiFormatUrl', {
  providedIn: 'root',
  factory: () => AI_FORMAT_URL,
});
export const AI_INTEREST_URL_TOKEN = new InjectionToken<string>('fil.aiInterestUrl', {
  providedIn: 'root',
  factory: () => AI_INTEREST_URL,
});
