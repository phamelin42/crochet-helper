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
});
