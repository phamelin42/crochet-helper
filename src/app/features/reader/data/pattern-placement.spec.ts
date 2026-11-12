import { describe, expect, it } from 'vitest';
import { CORPUS } from './fixtures/corpus';
import { parsePattern } from './pattern-parser';
import type { Pattern, PatternStep } from './pattern.model';

/**
 * Où va chaque ligne : le découpage d'un patron se juge sur la place des
 * conseils, des photos et des finitions, pas seulement sur le nombre d'étapes.
 */
function load(prefix: string): Pattern {
  const fixture = CORPUS.find((f) => f.name.startsWith(prefix));
  if (!fixture) throw new Error(`fixture ${prefix} introuvable`);
  return parsePattern(fixture.raw);
}

const stepsOf = (pattern: Pattern, piece: number): readonly PatternStep[] =>
  pattern.pieces[piece].steps;
const labels = (pattern: Pattern, piece: number): string[] =>
  stepsOf(pattern, piece).map((s) => s.label);

describe('placement : 06 ours en PDF (EN)', () => {
  const p = load('06');

  it('range les sections hors étapes', () => {
    expect(p.title).toBe('Little Bear Amigurumi');
    expect(p.materials).toHaveLength(4);
    expect(p.notes).toContain('The pieces are worked in a spiral, without joining.');
    expect(p.pieces.map((x) => x.name)).toEqual(['Head', 'Ear (make 2)']);
  });

  it('garde la photo de présentation au patron et met celle sous « Head » sur le premier rang', () => {
    expect(p.images).toEqual([1]);
    expect(stepsOf(p, 0)[0].images).toEqual([2]);
  });

  it('place la photo sous « Ear » sur son premier rang, pas sur la fin de la tête', () => {
    expect(stepsOf(p, 1)[0].images).toEqual([3]);
    expect(stepsOf(p, 0).at(-1)?.images).toBeUndefined();
  });

  it('garde un conseil chiffré, et un conseil sans mot d’annonce entre deux rangs', () => {
    expect(labels(p, 0)).toEqual(['Rnd 1', 'Rnd 2', 'Rnd 3', 'Rnd 4–8', 'Rnd 9', '']);
    expect(stepsOf(p, 0)[1].tip).toBe(
      'Tip: place a stitch marker every 10 rounds so you do not lose count.',
    );
    expect(stepsOf(p, 0)[3].tip).toBe('Make sure the stitches stay tight.');
  });

  it('fait des finitions une étape à faire, avec la photo de fin', () => {
    const finish = stepsOf(p, 0).at(-1)!;
    expect(finish.body).toBe('Fasten off. Stuff the head firmly.');
    expect(finish.tip).toBeUndefined();
    const ear = stepsOf(p, 1);
    expect(ear).toHaveLength(4);
    expect(ear[0].notes).toEqual(['Note: do not stuff the ears.']);
    expect(ear[3].label).toBe('');
    expect(ear[3].body).toBe(
      'Fasten off, leaving a long tail. Sew the ears to the head between rounds 4 and 6.',
    );
    expect(ear[3].images).toEqual([4]);
  });
});

describe('placement : 07 petit lapin en PDF (FR)', () => {
  const p = load('07');

  it('lit « Tours 3 à 6 » comme un groupe de quatre tours', () => {
    expect(labels(p, 0)).toEqual(['Tour 1', 'Tour 2', 'Tour 3–6', '']);
    expect(stepsOf(p, 0)[2].reps).toBe(4);
  });

  it('garde le conseil chiffré (« tous les 10 tours ») sur le tour qu’il suit', () => {
    expect(stepsOf(p, 0)[1].tip).toBe(
      'Astuce : placez un marqueur tous les 10 tours pour ne pas perdre le compte.',
    );
  });

  it('met la photo entre deux pièces sur le premier tour de la pièce suivante', () => {
    expect(stepsOf(p, 0).at(-1)?.images).toBeUndefined();
    expect(stepsOf(p, 1)[0].images).toEqual([1]);
  });

  it('note en tête de pièce et finitions en étapes', () => {
    expect(stepsOf(p, 1)[0].notes).toEqual(['Remarque : ne pas rembourrer les oreilles.']);
    expect(stepsOf(p, 0).at(-1)).toMatchObject({
      label: '',
      body: 'Arrêter le fil et rembourrer le corps.',
    });
    expect(stepsOf(p, 1).at(-1)).toMatchObject({
      label: '',
      body: 'Arrêter le fil. Coudre les oreilles entre les rangs 6 et 7.',
      images: [2],
    });
    expect(p.notes).toContain('10 ms et 11 tours = 5 cm');
  });
});

describe('placement : 08 bonnet, rangs groupés (FR)', () => {
  const p = load('08');

  it('lit chaque groupe « Rangs 5 à 8 » avec sa durée', () => {
    expect(labels(p, 0)).toEqual(['Rang 1', 'Rang 2–4', 'Rang 5–8', 'Rang 9–12', 'Rang 13', '']);
    expect(stepsOf(p, 0).map((s) => s.reps)).toEqual([0, 3, 4, 4, 0, 0]);
  });

  it('place note de tête, conseil chiffré et conseil entre deux rangs', () => {
    const steps = stepsOf(p, 0);
    expect(steps[0].notes).toEqual([
      'Commencer par une chaînette de 60 mailles en l’air. Fermer en rond.',
    ]);
    expect(steps[1].tip).toBe(
      'Astuce : placez un marqueur tous les 10 rangs pour suivre votre travail.',
    );
    expect(steps[2].tip).toBe('Ne serrez pas trop les mailles, le bonnet doit rester souple.');
    expect(p.notes).toContain('Taille : 3 à 6 mois');
  });

  it('garde la finition en étape et la pièce sans rang (pompon)', () => {
    expect(stepsOf(p, 0).at(-1)).toMatchObject({
      label: '',
      body: 'Arrêter le fil. Rentrer les fils avec l’aiguille à laine.',
    });
    expect(p.pieces.map((x) => x.name)).toEqual(['Bonnet', 'Pompon']);
    expect(stepsOf(p, 1).map((s) => s.body)).toEqual([
      'Enrouler le fil 50 fois autour de trois doigts. Nouer au milieu et couper les boucles.',
      'Fixer le pompon au sommet du bonnet.',
    ]);
  });
});

describe('placement : 09 sous-dessus de verre (EN)', () => {
  const p = load('09');

  it('range matériel en ligne, niveau et échantillon hors des étapes', () => {
    expect(p.materials).toEqual(['4 mm hook, 50 g worsted cotton, tapestry needle']);
    expect(p.notes).toContain('Skill level: Beginner');
    expect(p.notes).toContain('10 dc and 5 rounds = 10 cm');
  });

  it('garde la pièce décrite en phrases, sa finition et son conseil', () => {
    expect(p.pieces.map((x) => x.name)).toEqual(['Coaster', 'Leaf Decoration']);
    expect(labels(p, 0)).toEqual(['Round 1', 'Round 2', 'Round 3', '']);
    expect(stepsOf(p, 0).at(-1)?.body).toBe('Fasten off and weave in the ends.');
    const leaf = stepsOf(p, 1);
    expect(leaf).toHaveLength(2);
    expect(leaf[0].body).toMatch(/^Make a chain of 12 stitches/);
    expect(leaf[1].body).toBe(
      'Fasten off and leave a tail. Sew the leaf to the edge of the coaster.',
    );
    expect(leaf[1].tip).toBe('Tip: use a contrasting colour for the leaf so that it stands out.');
  });
});

describe('placement : 10 doudou en phrases (FR)', () => {
  const p = load('10');

  it('n’efface aucune pièce décrite en phrases', () => {
    expect(p.pieces.map((x) => x.name)).toEqual(['Corps', 'Oreilles', 'Assemblage']);
    expect(labels(p, 0)).toEqual(['Rang 1', 'Rang 2', 'Rang 3–6', '']);
    expect(stepsOf(p, 0).at(-1)?.body).toBe('Arrêter le fil.');
    expect(stepsOf(p, 1)).toHaveLength(1);
    expect(stepsOf(p, 1)[0].body).toMatch(/^Faire 2 oreilles/);
  });

  it('range « N’oubliez pas » en conseil de l’étape qu’il suit', () => {
    const steps = stepsOf(p, 2);
    expect(steps.map((s) => s.body)).toEqual([
      'Coudre les oreilles sur le dessus de la tête.',
      'Broder le museau avec du fil rose.',
    ]);
    expect(steps[1].tip).toBe('N’oubliez pas de rentrer tous les fils.');
  });
});

describe('placement : 11 écharpe au tricot (EN)', () => {
  const p = load('11');

  it('garde endroit/envers, note de tête et conseil chiffré', () => {
    expect(labels(p, 0)).toEqual(['Row 1', 'Row 2', 'Row 3–100', '']);
    expect(stepsOf(p, 0)[0]).toMatchObject({ side: 'rs', notes: ['Cast on 30 stitches.'] });
    expect(stepsOf(p, 0)[1].side).toBe('ws');
    expect(stepsOf(p, 0)[2].reps).toBe(98);
    expect(stepsOf(p, 0)[2].tip).toBe(
      'Hint: count your garter ridges instead of rows, one ridge is 2 rows.',
    );
    expect(p.notes).toContain('Slip the first stitch of every row for a neat edge.');
  });

  it('fait du rabattage une étape, et de la frange une pièce de deux étapes', () => {
    expect(stepsOf(p, 0).at(-1)).toMatchObject({
      label: '',
      body: 'Bind off all stitches loosely. Weave in the ends.',
    });
    expect(p.pieces[1].name).toBe('Fringe');
    expect(stepsOf(p, 1)).toHaveLength(2);
  });
});

describe('placement : 12 snood en PDF (FR)', () => {
  const p = load('12');

  it('garde la photo de présentation au patron, celle sous « Snood » sur le premier rang', () => {
    expect(p.title).toBe('Snood en point mousse');
    expect(p.images).toEqual([1]);
    expect(stepsOf(p, 0)[0]).toMatchObject({
      label: 'Rang 1',
      side: 'rs',
      images: [2],
      notes: ['Monter 60 mailles.'],
    });
  });

  it('range le conseil et fait de la photo citée (« voir photo 3 ») celle de la finition', () => {
    expect(labels(p, 0)).toEqual(['Rang 1', 'Rang 2', 'Rang 3–40', '']);
    expect(stepsOf(p, 0)[2].tip).toMatch(/^Attention : ne tendez pas trop le fil/);
    const finish = stepsOf(p, 0).at(-1)!;
    expect(finish.body).toMatch(/^Rabattre toutes les mailles\./);
    expect(finish.images).toEqual([3, 4]);
  });
});

describe('placement : patrons publiés (01 à 05)', () => {
  it('02 : la remarque entre crochets est le conseil du tour qu’elle suit, la fin est une étape', () => {
    const p = load('02');
    const steps = stepsOf(p, 0);
    expect(steps[0].notes).toEqual(['Start with green.']);
    expect(steps[3].tip).toMatch(/^This is just the way I create dc circles/);
    expect(steps.at(-1)).toMatchObject({ label: '', body: 'Stitch to tan.' });
    expect(p.notes).toContain('Inspired by Sunflower Bag from Crochet 365 Knit Too');
  });

  it('03 : l’assemblage de la dernière pièce est une étape', () => {
    const p = load('03');
    expect(p.pieces.map((x) => x.name)).toEqual(['Stem', 'Hat', 'Leaf and Vine']);
    const last = stepsOf(p, 2).at(-1)!;
    expect(last.label).toBe('');
    expect(last.body).toMatch(/^Now sew the leaf and vine to your stem/);
  });

  it('04 : « You can switch color » reste le conseil d’un rang, « Beware » celui du dernier', () => {
    const p = load('04');
    expect(stepsOf(p, 0)).toHaveLength(10);
    expect(stepsOf(p, 0)[4].tip).toBe('You can switch color if you want');
    expect(stepsOf(p, 0).at(-1)?.tip).toMatch(/^Beware, after round 19/);
  });

  it('05 : aucune pièce ni assemblage n’est avalé', () => {
    const p = load('05');
    expect(p.pieces.map((x) => x.name)).toEqual([
      'Mushroom Stem',
      'Mushroom Cap',
      'Mushroom Spots - for Toadstool (leave out for Brown Mushroom)',
      'Assembly',
    ]);
    expect(stepsOf(p, 1).at(-1)).toMatchObject({ label: '', body: 'FO and weave in ends' });
    // Chaque ligne de la pièce sans rang est lisible dans ses étapes.
    const spots = stepsOf(p, 2)
      .map((s) => s.body)
      .join(' ');
    for (const line of [
      'in white: small - sc4 in mr, slst in 1st sc, FO',
      'medium - sc6 in mr, slst in 1st sc, FO',
      'large - hdc6 in mr, slst in 1st hdc, FO',
      'make 2 of each size and sew onto the cap.',
    ]) {
      expect(spots).toContain(line);
    }
    expect(stepsOf(p, 3)[0].body).toMatch(/^thread the chain through the cap/);
  });
});
