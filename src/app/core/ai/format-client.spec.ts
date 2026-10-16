import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatWithAi } from './format-client';

function reponse(corps: unknown, status = 200): Response {
  return new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), { status });
}

describe('formatWithAi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rend le texte et le nombre de mises en forme restantes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ texte: 'Rang 1', restant: 2 })));
    expect(await formatWithAi('https://w.test/m', 'x', 'fr')).toEqual({
      ok: true,
      texte: 'Rang 1',
      restant: 2,
    });
  });

  it.each(['quota-jour', 'budget-mois', 'echec', 'trop-long'] as const)(
    'transmet la raison de refus « %s »',
    async (raison) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ raison }, 429)));
      expect(await formatWithAi('https://w.test/m', 'x', 'en')).toEqual({ ok: false, raison });
    },
  );

  it('envoie le texte et la langue en JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reponse({ texte: 'a', restant: 0 }));
    vi.stubGlobal('fetch', fetchMock);
    await formatWithAi('https://w.test/m', 'Rang 1', 'fr');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ texte: 'Rang 1', langue: 'fr' });
  });

  const indisponibles: [string, () => Promise<Response>][] = [
    ['délai dépassé', () => Promise.reject(new DOMException('timeout', 'TimeoutError'))],
    ['réseau coupé', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['JSON invalide', async () => reponse('pas du json')],
    [
      'texte de 200 001 caractères',
      async () => reponse({ texte: 'a'.repeat(200_001), restant: 1 }),
    ],
    ['restant non entier', async () => reponse({ texte: 'a', restant: 1.5 })],
    ['restant absent', async () => reponse({ texte: 'a' })],
    ['statut inconnu', async () => reponse({ raison: 'surprise' }, 500)],
    ['corps nul', async () => reponse('null')],
  ];
  it.each(indisponibles)('%s → indisponible, sans exception', async (_nom, simule) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(simule));
    expect(await formatWithAi('https://w.test/m', 'x', 'fr')).toEqual({
      ok: false,
      raison: 'indisponible',
    });
  });
});
