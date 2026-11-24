/**
 * PKCE (RFC 7636) pour la connexion Ravelry : la doc de Ravelry l'exige sur
 * chaque demande d'autorisation, avec `code_challenge_method=S256`.
 * Fonctions pures : le hasard et le hachage viennent de `core/platform`.
 */

/** Base64 « url-safe » sans remplissage (RFC 7636, annexe A). */
export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 32 octets aléatoires donnent 43 caractères, le minimum de la RFC. */
export const VERIFIER_BYTES = 32;

/** `code_verifier` : 43 à 128 caractères de `[A-Za-z0-9-._~]`. */
export const verifierFrom = (random: Uint8Array): string => base64Url(random);

/** `code_challenge` S256 : `base64url(sha256(verifier))`. */
export const challengeFrom = (sha256OfVerifier: Uint8Array): string => base64Url(sha256OfVerifier);
