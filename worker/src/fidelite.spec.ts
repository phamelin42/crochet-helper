import { describe, expect, it } from 'vitest';
import { controler, fidele } from './fidelite';

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

describe('controler : pourquoi une réponse est refusée', () => {
  it('rend null pour une réponse fidèle', () => {
    expect(controler(ENTREE, ENTREE)).toBeNull();
  });

  it('dit « vide » pour une sortie vide', () => {
    expect(controler(ENTREE, '  ')).toBe('vide');
  });

  it('donne le pourcentage conservé quand la sortie est trop courte', () => {
    expect(controler('a'.repeat(100), 'a'.repeat(30))).toBe('trop-court:30%');
  });

  it('liste les nombres inventés, une fois chacun, cinq au plus', () => {
    const entree = 'Rang 1 : 6 ms (6)'.padEnd(200, ' ');
    const sortie = `${entree} 21 21 22 23 24 25 26 27`;
    expect(controler(entree, sortie)).toBe('nombres:21,22,23,24,25');
  });

  it('ne cite jamais le texte de la réponse', () => {
    const detail = controler('Rang 1 : 6 ms (6)', 'Rang 1 : sept mailles secrètes (7)') ?? '';
    expect(detail).toBe('nombres:7');
    expect(detail).not.toContain('secrètes');
  });
});
