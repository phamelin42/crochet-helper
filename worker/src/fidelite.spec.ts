import { describe, expect, it } from 'vitest';
import { fidele } from './fidelite';

const ENTREE = 'Rang 1 : 6 ms dans un cercle magique (6)\nRang 2 : 2 ms dans chaque maille (12)';

describe('fidele', () => {
  it('accepte un texte identique', () => {
    expect(fidele(ENTREE, ENTREE)).toBe(true);
  });

  it('refuse un nombre de mailles modifié (6 ms devenu 7 ms)', () => {
    expect(fidele(ENTREE, ENTREE.replace('6 ms', '7 ms'))).toBe(false);
  });

  it('refuse un rang ajouté avec un nouveau numéro', () => {
    expect(fidele(ENTREE, `${ENTREE}\nRang 3 : 1 ms, 1 aug (18)`)).toBe(false);
  });

  it('accepte une numérotation nue devenue libellé de rang', () => {
    const brut = '1. 6 ms dans un cercle magique\n2. 2 ms dans chaque maille';
    const forme = 'Rang 1 : 6 ms dans un cercle magique\nRang 2 : 2 ms dans chaque maille';
    expect(fidele(brut, forme)).toBe(true);
  });

  it('refuse une sortie à 39 % de la longueur, accepte à 41 %', () => {
    const entree = 'a'.repeat(100);
    expect(fidele(entree, 'a'.repeat(39))).toBe(false);
    expect(fidele(entree, 'a'.repeat(41))).toBe(true);
  });

  it('refuse une sortie vide', () => {
    expect(fidele(ENTREE, '')).toBe(false);
    expect(fidele(ENTREE, '   \n')).toBe(false);
  });
});
