import { InjectionToken, Service, inject } from '@angular/core';

/**
 * Valeur posée à la compilation (`define` d'`angular.json`) : vide en production,
 * l'adresse du Worker pour le seul build des tests de bout en bout. Sans
 * `define` (tests unitaires, `ng serve`), l'identifiant n'existe pas : vide.
 */
declare const FIL_RAVELRY_URL: string | undefined;

/**
 * Interrupteur de la recherche Ravelry (ADR-004) : la base des routes
 * `/ravelry/…` du Worker. **Vide tant que Phil n'a pas tranché** (licence de
 * l'API) : aucune page n'est alors liée et l'adresse directe affiche « bientôt
 * disponible ». Pour activer : une PR qui renseigne cette constante.
 */
export const RAVELRY_URL = typeof FIL_RAVELRY_URL === 'string' ? FIL_RAVELRY_URL : '';

/** Remplaçable en test, sans toucher à la constante. */
export const RAVELRY_URL_TOKEN = new InjectionToken<string>('fil.ravelryUrl', {
  providedIn: 'root',
  factory: () => RAVELRY_URL,
});

/** La recherche est-elle ouverte ? Lue par l'en-tête, le pied, l'écran de fin et les pages. */
@Service()
export class RavelryAccess {
  readonly baseUrl = inject(RAVELRY_URL_TOKEN);
  readonly enabled = this.baseUrl !== '';
}
