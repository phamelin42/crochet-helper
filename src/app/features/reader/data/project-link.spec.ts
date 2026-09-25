import { describe, expect, it } from 'vitest';
import { DEMO_PATTERN } from './demo-pattern';
import { decodeProject, encodeProject, SharedProgress } from './project-link';

const PROGRESS: SharedProgress = {
  source: DEMO_PATTERN,
  name: 'Petit sapin',
  pieceIndex: 1,
  stepIndex: 2,
  done: { '0:0': true, '0:1': true },
  reps: { '1:2': 3 },
};

describe('project-link', () => {
  it('retrouve la progression après un aller-retour', async () => {
    const encoded = await encodeProject(PROGRESS);
    const decoded = await decodeProject(encoded);

    expect(decoded).toEqual(PROGRESS);
  });

  it("renvoie null pour n'importe quelle entrée invalide, sans lever d'exception", async () => {
    await expect(decodeProject("n'importe quoi")).resolves.toBeNull();
    await expect(decodeProject('')).resolves.toBeNull();
    await expect(decodeProject('1!!!not-base64!!!')).resolves.toBeNull();
  });

  it('refuse un fragment démesuré', async () => {
    await expect(decodeProject('0' + 'A'.repeat(20_000))).resolves.toBeNull();
  });

  it("refuse une version inconnue, une fois décompressé jusqu'au JSON", async () => {
    const encoded = await encodeProject(PROGRESS);
    const decoded = await decodeProject(encoded);
    expect(decoded).not.toBeNull();

    const { encodePattern } = await import('./pattern-link');
    const wrongVersion = await encodePattern(
      JSON.stringify({ ...PROGRESS, version: 999, done: {}, reps: {} }),
    );
    await expect(decodeProject(wrongVersion)).resolves.toBeNull();
  });

  it('refuse un champ de type inattendu', async () => {
    const { encodePattern } = await import('./pattern-link');
    const badField = await encodePattern(
      JSON.stringify({ ...PROGRESS, version: 1, pieceIndex: 'un' }),
    );
    await expect(decodeProject(badField)).resolves.toBeNull();
  });

  it('ramène les index hors des bornes du patron dans ses limites plutôt que de refuser', async () => {
    const { encodePattern } = await import('./pattern-link');
    const outOfBounds = await encodePattern(
      JSON.stringify({
        version: 1,
        source: DEMO_PATTERN,
        name: 'Petit sapin',
        pieceIndex: 999,
        stepIndex: -5,
        done: {},
        reps: {},
      }),
    );

    const decoded = await decodeProject(outOfBounds);

    expect(decoded).not.toBeNull();
    expect(decoded!.pieceIndex).toBeGreaterThanOrEqual(0);
    expect(decoded!.stepIndex).toBeGreaterThanOrEqual(0);
  });
});
