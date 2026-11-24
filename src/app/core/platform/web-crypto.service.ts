import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject } from '@angular/core';

/**
 * Hasard cryptographique et empreinte SHA-256 du navigateur (`crypto`). Seul
 * point de contact : sert au PKCE de la connexion Ravelry. Hors navigateur,
 * `null` : jamais un hasard de repli faible.
 */
@Service()
export class WebCrypto {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly crypto = inject(DOCUMENT).defaultView?.crypto ?? null;

  /** `n` octets aléatoires, ou `null` si le navigateur n'a pas de générateur sûr. */
  randomBytes(n: number): Uint8Array | null {
    if (!this.isBrowser || !this.crypto?.getRandomValues) return null;
    return this.crypto.getRandomValues(new Uint8Array(n));
  }

  /** SHA-256 d'un texte (ASCII), ou `null` si `crypto.subtle` manque (contexte non sécurisé). */
  async sha256(text: string): Promise<Uint8Array | null> {
    if (!this.isBrowser || !this.crypto?.subtle) return null;
    const hash = await this.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return new Uint8Array(hash);
  }
}
