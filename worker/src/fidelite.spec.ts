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
    expect(controler('a'.repeat(100), 'a'.repeat(30))).toBe('trop-court:30%,nombres-gardes:0%');
    expect(controler('a'.repeat(100), 'a'.repeat(5))).toBe('trop-court:5%');
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

/** Une notice qui répète le même patron en quatre langues : mêmes nombres, mots différents. */
const LANGUES = [
  'Taille : 33 x 43 cm. Matériel : 18 fleurs, 14 petites fleurs, crochet 3 mm, aiguille 2,5 mm, 136 mailles.',
  'Size: 33 x 43 cm. Material: 18 flowers, 14 small flowers, hook 3 mm, needle 2.5 mm, 136 stitches.',
  'Größe: 33 x 43 cm. Material: 18 Blüten, 14 kleine Blüten, Nadel 3 mm, Nadel 2,5 mm, 136 Maschen.',
  'Maat: 33 x 43 cm. Materiaal: 18 bloemen, 14 kleine bloemen, haaknaald 3 mm, naald 2,5 mm, 136 steken.',
];

describe('controler : plusieurs langues, étapes numérotées', () => {
  it('accepte une seule langue gardée sur quatre : réponse courte, tous les nombres présents', () => {
    const notice = LANGUES.join('\n');
    expect(LANGUES[0].length / notice.length).toBeLessThan(0.4);
    for (const gardee of LANGUES) expect(controler(notice, gardee)).toBeNull();
  });

  it('refuse un résumé aussi court qui a perdu des nombres', () => {
    const notice = LANGUES.join('\n');
    expect(controler(notice, 'Taille : 33 x 43 cm. Matériel : 18 fleurs.')).toMatch(
      /^trop-court:\d+%,nombres-gardes:\d+%$/,
    );
  });

  it('refuse une réponse sous 10 % même si elle garde tous les nombres', () => {
    const notice = `${LANGUES.join('\n')}\n${'x'.repeat(2000)}`;
    expect(controler(notice, LANGUES[0])).toMatch(/^trop-court:\d+%$/);
  });

  it('ignore les numéros des libellés d’étape, en anglais et en français', () => {
    const brut = 'Chain 30. Then work 5 rows of mesh.';
    expect(controler(brut, 'Step 1: Chain 30.\nStep 2: Then work 5 rows of mesh.')).toBeNull();
    expect(controler(brut, 'Étape 1 : Chain 30.\nÉtape 2 : Then work 5 rows of mesh.')).toBeNull();
    expect(controler(brut, 'step 1) Chain 30.\nStep 2. Then work 5 rows of mesh.')).toBeNull();
  });

  it('refuse un nombre inventé même sous un libellé d’étape', () => {
    expect(
      controler('Chain 30. Then work 5 rows.', 'Step 1: Chain 31.\nStep 2: Then work 5 rows.'),
    ).toBe('nombres:31');
  });

  it('un « Step 9 » au milieu d’une ligne n’est pas un libellé : son numéro est refusé', () => {
    expect(controler('Chain 30. Then work 5 rows.', 'Chain 30. Go to Step 9: work 5 rows.')).toBe(
      'nombres:9',
    );
  });
});
