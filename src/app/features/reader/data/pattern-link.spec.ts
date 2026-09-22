import { describe, expect, it } from 'vitest';
import { DEMO_PATTERN } from './demo-pattern';
import { decodePattern, encodePattern } from './pattern-link';

describe('pattern-link', () => {
  it('retrouve le patron de démonstration après un aller-retour', async () => {
    const encoded = await encodePattern(DEMO_PATTERN);
    const decoded = await decodePattern(encoded);

    expect(decoded).toBe(DEMO_PATTERN);
  });

  it('retrouve un texte accentué après un aller-retour', async () => {
    const source = 'Rang 1 : 6 mailles serrées dans un cercle magique, répéter';
    const encoded = await encodePattern(source);

    expect(await decodePattern(encoded)).toBe(source);
  });

  it("renvoie null pour n'importe quelle entrée invalide, sans lever d'exception", async () => {
    await expect(decodePattern("n'importe quoi")).resolves.toBeNull();
    await expect(decodePattern('')).resolves.toBeNull();
    await expect(decodePattern('1!!!not-base64!!!')).resolves.toBeNull();
  });

  it('refuse une bombe de décompression sans tout décompresser', async () => {
    // 5 Mo d'espaces tiennent en quelques kilo-octets une fois compressés.
    const bomb = await encodePattern(' '.repeat(5_000_000));
    expect(bomb.length).toBeLessThan(16_000);

    await expect(decodePattern(bomb)).resolves.toBeNull();
  });

  it('refuse un fragment démesuré', async () => {
    await expect(decodePattern('0' + 'A'.repeat(20_000))).resolves.toBeNull();
  });
});
