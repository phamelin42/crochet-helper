import { describe, expect, it } from 'vitest';
import { base64Url, challengeFrom, verifierFrom } from './pkce';

describe('PKCE (RFC 7636)', () => {
  it('le challenge S256 du vecteur de l’annexe B de la RFC est celui de la RFC', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const hash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
    );
    expect(challengeFrom(hash)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('le verifier de 32 octets a 43 caractères, de l’alphabet autorisé, sans remplissage', () => {
    for (let i = 0; i < 200; i++) {
      const v = verifierFrom(crypto.getRandomValues(new Uint8Array(32)));
      expect(v).toHaveLength(43);
      expect(v).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
    }
  });

  it('base64Url utilise - et _ à la place de + et /, sans =', () => {
    expect(base64Url(new Uint8Array([251, 255, 254]))).toBe('-__-');
    expect(base64Url(new Uint8Array([1]))).toBe('AQ');
  });
});
