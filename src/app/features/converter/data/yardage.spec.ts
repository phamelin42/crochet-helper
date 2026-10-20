import { describe, expect, it } from 'vitest';
import { YARN_WEIGHTS } from './yarn-weights';
import { YARDAGE_ESTIMATES, categoriesFor, estimateYardage } from './yardage';

describe('YARDAGE_ESTIMATES', () => {
  it('donne à chaque ligne une source, des bornes ordonnées et un poids de fil connu', () => {
    for (const e of YARDAGE_ESTIMATES) {
      const label = `${e.project} / catégorie ${e.category}`;
      expect(e.source.trim(), label).not.toBe('');
      expect(e.minYards, label).toBeGreaterThan(0);
      expect(e.minYards, label).toBeLessThanOrEqual(e.maxYards);
      expect(
        YARN_WEIGHTS.some((w) => w.category === e.category),
        label,
      ).toBe(true);
    }
  });

  it('ne répète aucune combinaison', () => {
    const keys = YARDAGE_ESTIMATES.map((e) => `${e.project}/${e.category}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('demande plus de fil quand le fil est plus fin, pour chaque ouvrage', () => {
    for (const e of YARDAGE_ESTIMATES) {
      const finer = YARDAGE_ESTIMATES.find(
        (o) => o.project === e.project && o.category === e.category - 1,
      );
      if (finer) {
        expect(finer.minYards, `${e.project} ${e.category}`).toBeGreaterThanOrEqual(e.minYards);
      }
    }
  });
});

describe('estimateYardage', () => {
  it('convertit les yards en mètres et arrondit les pelotes au supérieur', () => {
    // bonnet en catégorie 4 : 150 à 250 yards = 137 à 229 m
    expect(estimateYardage('hat', 4, 100)).toEqual({
      minMetres: 137,
      maxMetres: 229,
      minSkeins: 2,
      maxSkeins: 3,
    });
  });

  it('répond pour chaque ligne de la table', () => {
    for (const e of YARDAGE_ESTIMATES) {
      const result = estimateYardage(e.project, e.category, 150);
      expect(result, `${e.project} ${e.category}`).not.toBeNull();
      expect(result!.minSkeins).toBeLessThanOrEqual(result!.maxSkeins);
    }
  });

  it('renvoie null pour une combinaison sans source', () => {
    expect(estimateYardage('afghan', 5, 100)).toBeNull();
    expect(estimateYardage('socks', 6, 100)).toBeNull();
    expect(estimateYardage('hat', 42, 100)).toBeNull();
  });

  it('renvoie null, sans exception, pour un métrage de pelote invalide', () => {
    for (const bad of [0, -100, NaN, Infinity]) {
      expect(estimateYardage('hat', 4, bad)).toBeNull();
    }
  });

  it('liste les catégories disponibles par ouvrage', () => {
    expect(categoriesFor('afghan')).not.toContain(5);
    expect(categoriesFor('hat')).toHaveLength(7);
  });
});
