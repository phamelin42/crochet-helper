import { describe, expect, it } from 'vitest';
import { renderPattern } from './chart-composer';
import {
  MAX_COMPONENTS,
  Pixels,
  TEMPLATE_SIZE,
  TemplateSource,
  recognize,
  toGroups,
} from './chart-recognition';

/** Feuille blanche, sur laquelle on dessine à l'encre noire. */
function sheet(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const ink = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (Math.round(y) * width + Math.round(x)) * 4;
    data[i] = data[i + 1] = data[i + 2] = 0;
  };
  const pixels: Pixels = { data, width, height };
  return {
    pixels,
    /** Trait vertical : la maille serrée de ce jeu d'essai. */
    bar(cx: number, cy: number, h: number, w = Math.max(2, h / 8)) {
      for (let y = cy - h / 2; y <= cy + h / 2; y++) {
        for (let x = cx - w / 2; x <= cx + w / 2; x++) ink(x, y);
      }
    },
    /** Anneau : la maille en l'air de ce jeu d'essai. */
    ring(cx: number, cy: number, r: number, t = Math.max(2, r / 4)) {
      for (let y = cy - r - 1; y <= cy + r + 1; y++) {
        for (let x = cx - r - 1; x <= cx + r + 1; x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r && d >= r - t) ink(x, y);
        }
      }
    },
    square(x0: number, y0: number, side: number) {
      for (let y = y0; y < y0 + side; y++) for (let x = x0; x < x0 + side; x++) ink(x, y);
    },
  };
}

function templates(): TemplateSource[] {
  const c = TEMPLATE_SIZE / 2;
  const sc = sheet(TEMPLATE_SIZE, TEMPLATE_SIZE);
  sc.bar(c, c, 90, 12);
  const ch = sheet(TEMPLATE_SIZE, TEMPLATE_SIZE);
  ch.ring(c, c, 40, 10);
  return [
    { id: 'sc', pixels: sc.pixels },
    { id: 'ch', pixels: ch.pixels },
  ];
}

const ids = (round: { groups: readonly { tokens: readonly { symbol: string }[] }[] }) =>
  round.groups.flatMap((g) => g.tokens.map((t) => t.symbol));

describe('toGroups', () => {
  it('écrit un motif répété comme sur un patron', () => {
    const tour = ['sc', 'sc-inc', 'sc', 'sc-inc', 'sc', 'sc-inc'];
    expect(toGroups(tour)).toEqual([
      {
        tokens: [
          { symbol: 'sc', count: 1 },
          { symbol: 'sc-inc', count: 1 },
        ],
        repeat: 3,
      },
    ]);
  });

  it('garde la plus petite période, avec ses mailles groupées', () => {
    const tour = ['sc', 'sc', 'dc-inc', 'sc', 'sc', 'dc-inc'];
    expect(toGroups(tour)).toEqual([
      {
        tokens: [
          { symbol: 'sc', count: 2 },
          { symbol: 'dc-inc', count: 1 },
        ],
        repeat: 2,
      },
    ]);
  });

  it('une seule maille répétée reste un compte, pas une répétition', () => {
    expect(toGroups(['sc', 'sc', 'sc', 'sc', 'sc', 'sc'])).toEqual([
      { tokens: [{ symbol: 'sc', count: 6 }], repeat: 1 },
    ]);
  });

  it('un tour sans motif est écrit maille par maille', () => {
    expect(toGroups(['sc', 'dc', 'sc', 'sc'])).toEqual([
      {
        tokens: [
          { symbol: 'sc', count: 1 },
          { symbol: 'dc', count: 1 },
          { symbol: 'sc', count: 2 },
        ],
        repeat: 1,
      },
    ]);
  });

  it('rien à écrire pour un tour vide', () => {
    expect(toGroups([])).toEqual([]);
  });
});

describe('recognize', () => {
  it('lit des rangs à plat, du bas vers le haut et de gauche à droite', () => {
    const page = sheet(260, 160);
    // Rang 1 (en bas) : quatre mailles en l'air ; rang 2 : quatre mailles serrées.
    for (let i = 0; i < 4; i++) page.ring(40 + i * 55, 120, 12, 3);
    for (let i = 0; i < 4; i++) page.bar(40 + i * 55, 45, 30, 4);

    const result = recognize(page.pixels, templates());

    expect(result.rounds.map((r) => r.kind)).toEqual(['row', 'row']);
    expect(result.rounds.map(ids)).toEqual([['ch'], ['sc']]);
    expect(renderPattern(result.rounds, 'US')).toBe('Row 1: 4 ch (4)\nRow 2: 4 sc (4)');
    expect(result.symbols).toBe(8);
  });

  it('lit des tours, du centre vers l’extérieur', () => {
    const page = sheet(300, 300);
    const c = 150;
    const around = (n: number, radius: number, draw: (x: number, y: number) => void) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        draw(c + radius * Math.sin(a), c - radius * Math.cos(a));
      }
    };
    around(6, 45, (x, y) => page.ring(x, y, 11, 3));
    around(12, 110, (x, y) => page.ring(x, y, 11, 3));

    const result = recognize(page.pixels, templates());

    expect(result.rounds.map((r) => r.kind)).toEqual(['round', 'round']);
    expect(renderPattern(result.rounds, 'US')).toBe('Rnd 1: 6 ch (6)\nRnd 2: 12 ch (12)');
  });

  it('une page blanche ne donne rien, sans erreur', () => {
    expect(recognize(sheet(100, 100).pixels, templates())).toEqual({
      rounds: [],
      symbols: 0,
      uncertain: 0,
    });
  });

  it('une image trop bruitée pour être un diagramme ne donne rien plutôt que de bloquer', () => {
    const side = 6 * Math.ceil(Math.sqrt(MAX_COMPONENTS + 50));
    const page = sheet(side, side);
    for (let y = 0; y < side; y += 6) for (let x = 0; x < side; x += 6) page.square(x, y, 4);

    expect(recognize(page.pixels, templates()).rounds).toEqual([]);
  });

  it('sans gabarit, rien n’est lu', () => {
    const page = sheet(100, 100);
    page.bar(50, 50, 30);
    expect(recognize(page.pixels, []).rounds).toEqual([]);
  });
});
