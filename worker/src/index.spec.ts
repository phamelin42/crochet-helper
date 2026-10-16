import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { Deps, Env, Kv, ReponseClaude, traiter } from './index';
import { budgetAtteint, cleDepense, cleJour, cleMois, dateUtc, empreinte } from './quota';

const ORIGINE = 'https://patternreader.com';
const TEXTE = 'Rang 1 : 6 ms dans un cercle magique (6)\nRang 2 : 2 ms dans chaque maille (12)';
const DATE = new Date('2026-10-17T10:00:00Z');

const ENV: Env = {
  QUOTAS: undefined as unknown as KVNamespace,
  ANTHROPIC_API_KEY: 'cle',
  SEL_QUOTA: 'sel',
  MODELE: 'claude-haiku-5-5',
  EFFORT: 'low',
  PRIX_ENTREE_MTOK_USD: '0.10',
  PRIX_SORTIE_MTOK_USD: '0.50',
  BUDGET_MOIS_USD: '7',
  QUOTA_JOUR: '3',
  ORIGINES: ORIGINE,
  MAX_CARACTERES: '60000',
};

const BONNE: ReponseClaude = {
  stopReason: 'end_turn',
  texte: TEXTE,
  usage: { input_tokens: 1000, output_tokens: 1000 },
};

function kvEnMemoire(): Kv & { donnees: Map<string, string>; ecritures: number } {
  const donnees = new Map<string, string>();
  const kv = {
    donnees,
    ecritures: 0,
    get: async (cle: string) => donnees.get(cle) ?? null,
    put: async (cle: string, valeur: string) => {
      kv.ecritures++;
      donnees.set(cle, valeur);
    },
  };
  return kv;
}

function monter(reponse: ReponseClaude | Error = BONNE) {
  const kv = kvEnMemoire();
  const claude = vi.fn(async () => {
    if (reponse instanceof Error) throw reponse;
    return reponse;
  });
  const deps: Deps = { kv, claude, maintenant: () => DATE };
  return { kv, claude, deps };
}

function requete(
  corps: unknown,
  options: { origine?: string | null; methode?: string; chemin?: string } = {},
) {
  const entetes: Record<string, string> = { 'CF-Connecting-IP': '203.0.113.7' };
  const origine = options.origine === undefined ? ORIGINE : options.origine;
  if (origine !== null) entetes['Origin'] = origine;
  const methode = options.methode ?? 'POST';
  return new Request(`https://fil-ia.example${options.chemin ?? '/mise-en-forme'}`, {
    method: methode,
    headers: entetes,
    body:
      methode === 'POST' ? (typeof corps === 'string' ? corps : JSON.stringify(corps)) : undefined,
  });
}

const valide = { texte: TEXTE, langue: 'fr' };

afterEach(() => vi.restoreAllMocks());

describe('POST /mise-en-forme : chaque statut du contrat', () => {
  const cas: {
    nom: string;
    statut: number;
    raison?: string;
    /** Diagnostic d'un refus 422 : la nature du défaut, jamais le texte. */
    detail?: string;
    preparer?: (m: ReturnType<typeof monter>) => void;
    reponse?: ReponseClaude | Error;
    corps: unknown;
  }[] = [
    { nom: 'réussite', statut: 200, corps: valide },
    { nom: 'JSON invalide', statut: 400, raison: 'requete', corps: '{pas du json' },
    { nom: 'langue inconnue', statut: 400, raison: 'requete', corps: { ...valide, langue: 'de' } },
    { nom: 'texte vide', statut: 400, raison: 'requete', corps: { ...valide, texte: '  ' } },
    {
      nom: 'texte trop long',
      statut: 413,
      raison: 'trop-long',
      corps: { ...valide, texte: 'a'.repeat(60001) },
    },
    {
      nom: 'quota du jour',
      statut: 429,
      raison: 'quota-jour',
      corps: valide,
      preparer: async (m) => {
        const empr = await empreinte('sel', '2026-10-17', '203.0.113.7');
        m.kv.donnees.set(cleJour('2026-10-17', empr), '3');
      },
    },
    {
      nom: 'budget du mois',
      statut: 429,
      raison: 'budget-mois',
      corps: valide,
      preparer: (m) => m.kv.donnees.set(cleMois('2026-10-17'), String(7_000_000)),
    },
    {
      nom: 'fidélité : nombre inventé',
      statut: 422,
      raison: 'echec',
      detail: 'nombres:13',
      corps: valide,
      reponse: { ...BONNE, texte: TEXTE.replace('(12)', '(13)') },
    },
    {
      nom: 'génération tronquée (max_tokens)',
      statut: 422,
      raison: 'echec',
      detail: 'arret:max_tokens',
      corps: valide,
      reponse: { ...BONNE, stopReason: 'max_tokens' },
    },
    {
      nom: 'refus du modèle',
      statut: 422,
      raison: 'echec',
      detail: 'arret:refusal',
      corps: valide,
      reponse: { ...BONNE, stopReason: 'refusal', texte: '' },
    },
    {
      nom: 'erreur de l’API Claude sans statut',
      statut: 503,
      raison: 'indisponible',
      detail: 'claude-inconnu',
      corps: valide,
      reponse: new Error('connexion coupée'),
    },
    ...(
      [
        ['clé refusée (401)', 401, 'invalid x-api-key', 'cle'],
        ['clé sans droit (403)', 403, 'forbidden', 'cle'],
        [
          'crédit épuisé (400)',
          400,
          '400 {"error":{"message":"Your credit balance is too low to access the Anthropic API."}}',
          'credits',
        ],
        ['limite de débit (429)', 429, 'rate limited', 'limite'],
        ['API surchargée (529)', 529, 'overloaded', 'surcharge'],
        ['API indisponible (503)', 503, 'unavailable', 'surcharge'],
        ['autre statut (500)', 500, 'boom', 'claude-500'],
      ] as const
    ).map(([nom, statut, message, detail]) => ({
      nom: `erreur de l’API Claude : ${nom}`,
      statut: 503,
      raison: 'indisponible',
      detail,
      corps: valide,
      reponse: Object.assign(new Error(message), { status: statut }),
    })),
  ];

  for (const c of cas) {
    it(`${c.nom} → ${c.statut}`, async () => {
      const m = monter(c.reponse);
      await c.preparer?.(m);
      const reponse = await traiter(requete(c.corps), ENV, m.deps);
      expect(reponse.status).toBe(c.statut);
      const corps = (await reponse.json()) as Record<string, unknown>;
      if (c.raison) {
        expect(corps['raison']).toBe(c.raison);
        if (c.detail) expect(corps['detail']).toBe(c.detail);
      } else {
        expect(corps['texte']).toBe(TEXTE);
        expect(corps['restant']).toBe(2);
      }
    });
  }

  it('refuse le texte trop long sans appeler Claude ni écrire dans KV', async () => {
    const m = monter();
    await traiter(requete({ ...valide, texte: 'a'.repeat(60001) }), ENV, m.deps);
    expect(m.claude).not.toHaveBeenCalled();
    expect(m.kv.ecritures).toBe(0);
  });

  it('refuse une origine absente d’ORIGINES sans appeler Claude', async () => {
    for (const origine of ['https://autre.example', null]) {
      const m = monter();
      const reponse = await traiter(requete(valide, { origine }), ENV, m.deps);
      expect(reponse.status).toBe(403);
      expect(m.claude).not.toHaveBeenCalled();
    }
  });

  it('répond au pré-vol CORS avec la seule origine reçue', async () => {
    const m = monter();
    const reponse = await traiter(requete(null, { methode: 'OPTIONS' }), ENV, m.deps);
    expect(reponse.status).toBe(204);
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE);
  });

  it('répond 404 à une autre route ou une autre méthode', async () => {
    const m = monter();
    expect((await traiter(requete(valide, { chemin: '/autre' }), ENV, m.deps)).status).toBe(404);
    const get = new Request('https://fil-ia.example/mise-en-forme', {
      headers: { Origin: ORIGINE },
    });
    expect((await traiter(get, ENV, m.deps)).status).toBe(404);
  });
});

describe('quota par personne', () => {
  it('refuse la 4ᵉ mise en forme du jour, après trois réussites', async () => {
    const m = monter();
    const statuts: number[] = [];
    for (let i = 0; i < 4; i++) statuts.push((await traiter(requete(valide), ENV, m.deps)).status);
    expect(statuts).toEqual([200, 200, 200, 429]);
    expect(m.claude).toHaveBeenCalledTimes(3);
  });

  it('un échec (422) ne consomme pas le quota mais compte dans la dépense', async () => {
    const m = monter({ ...BONNE, texte: TEXTE.replace('(12)', '(13)') });
    const reponse = await traiter(requete(valide), ENV, m.deps);
    expect(reponse.status).toBe(422);
    const empr = await empreinte('sel', '2026-10-17', '203.0.113.7');
    expect(m.kv.donnees.has(cleJour('2026-10-17', empr))).toBe(false);
    // 1000 × 0,10 + 1000 × 0,50 micro-dollars
    expect(m.kv.donnees.get(cleDepense('2026-10-17'))).toBe('600');
    expect(m.kv.donnees.get(cleMois('2026-10-17'))).toBe('600');
  });

  it('donne deux empreintes différentes pour deux dates', async () => {
    const a = await empreinte('sel', '2026-10-17', '203.0.113.7');
    const b = await empreinte('sel', '2026-10-18', '203.0.113.7');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('calcule la date en UTC', () => {
    expect(dateUtc(new Date('2026-10-17T23:59:59Z'))).toBe('2026-10-17');
  });
});

describe('budget', () => {
  it('appelle Claude à 6,999 $ du mois', async () => {
    const m = monter();
    m.kv.donnees.set(cleMois('2026-10-17'), '6999000');
    expect((await traiter(requete(valide), ENV, m.deps)).status).toBe(200);
    expect(m.claude).toHaveBeenCalledTimes(1);
  });

  it('refuse sans appeler Claude à 7 $ du mois', async () => {
    const m = monter();
    m.kv.donnees.set(cleMois('2026-10-17'), '7000000');
    expect((await traiter(requete(valide), ENV, m.deps)).status).toBe(429);
    expect(m.claude).not.toHaveBeenCalled();
  });

  it('plafonne la journée à un dixième du budget', () => {
    expect(budgetAtteint(0, 699_999, 7)).toBe(false);
    expect(budgetAtteint(0, 700_000, 7)).toBe(true);
  });
});

describe('confidentialité', () => {
  it('ne journalise jamais le texte envoyé', async () => {
    const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((n) =>
      vi.spyOn(console, n).mockImplementation(() => undefined),
    );
    for (const m of [monter(), monter({ ...BONNE, texte: 'x' }), monter(new Error(TEXTE))]) {
      await traiter(requete(valide), ENV, m.deps);
    }
    for (const espion of espions) {
      expect(JSON.stringify(espion.mock.calls)).not.toContain('cercle magique');
    }
  });
});

describe('Worker qui plante (entrée par défaut)', () => {
  const kvQuiCasse = {
    get: async () => {
      throw new Error('KV indisponible');
    },
    put: async () => undefined,
  } as unknown as KVNamespace;
  const env = { ...ENV, QUOTAS: kvQuiCasse };

  it('répond 503 « worker », avec les en-têtes CORS pour que le navigateur lise la réponse', async () => {
    const reponse = await worker.fetch(requete(valide), env);
    expect(reponse.status).toBe(503);
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE);
    expect(await reponse.json()).toEqual({ raison: 'indisponible', detail: 'worker' });
  });

  it('une origine non autorisée reste refusée (403), sans en-tête CORS', async () => {
    const reponse = await worker.fetch(requete(valide, { origine: 'https://autre.example' }), env);
    expect(reponse.status).toBe(403);
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
