import { InjectionToken } from '@angular/core';

/**
 * Valeurs posées à la compilation (`define` d'`angular.json`), comme
 * `FIL_RAVELRY_URL`. Sans `define` (tests unitaires, `ng serve`) : vides.
 */
declare const FIL_RAVELRY_CLIENT_ID: string | undefined;
declare const FIL_RAVELRY_ACCES: string | undefined;

/**
 * Identifiant public de l'application OAuth de Fil chez Ravelry (fiche 62).
 * Public par construction (il part dans l'adresse d'autorisation) : le secret,
 * lui, n'existe que dans le Worker. Vide tant que Phil n'a pas enregistré
 * l'application ; la connexion est alors indisponible.
 */
export const RAVELRY_CLIENT_ID =
  typeof FIL_RAVELRY_CLIENT_ID === 'string' ? FIL_RAVELRY_CLIENT_ID : '';

/**
 * `compte` : recherche et fiche réservées aux lectrices connectées à leur compte
 * Ravelry (licence de l'API, ADR-004). `ouvert` : seulement si Ravelry l'accepte
 * par écrit ; la connexion ne sert alors qu'à la galerie. Tout ce qui n'est pas
 * `ouvert` vaut `compte`.
 */
export type RavelryMode = 'ouvert' | 'compte';
export const RAVELRY_ACCES: RavelryMode =
  typeof FIL_RAVELRY_ACCES === 'string' && FIL_RAVELRY_ACCES === 'ouvert' ? 'ouvert' : 'compte';

/** Remplaçables en test, sans toucher aux constantes. */
export const RAVELRY_CLIENT_ID_TOKEN = new InjectionToken<string>('fil.ravelryClientId', {
  providedIn: 'root',
  factory: () => RAVELRY_CLIENT_ID,
});
export const RAVELRY_MODE_TOKEN = new InjectionToken<RavelryMode>('fil.ravelryMode', {
  providedIn: 'root',
  factory: () => RAVELRY_ACCES,
});

/** Adresse de retour unique, indépendante de la langue (liste blanche du Worker). */
export const RAVELRY_CALLBACK_PATH = '/ravelry-callback';
