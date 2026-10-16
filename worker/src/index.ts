import Anthropic from '@anthropic-ai/sdk';
import { consigne, Langue } from './consigne';
import { fidele } from './fidelite';
import {
  budgetAtteint,
  cleDepense,
  cleJour,
  cleMois,
  coutMicro,
  dateUtc,
  empreinte,
  TTL_JOUR,
  TTL_MOIS,
} from './quota';

export interface Env {
  QUOTAS: KVNamespace;
  ANTHROPIC_API_KEY: string;
  SEL_QUOTA: string;
  MODELE: string;
  EFFORT: string;
  PRIX_ENTREE_MTOK_USD: string;
  PRIX_SORTIE_MTOK_USD: string;
  BUDGET_MOIS_USD: string;
  QUOTA_JOUR: string;
  ORIGINES: string;
  MAX_CARACTERES: string;
}

export interface Kv {
  get(cle: string): Promise<string | null>;
  put(cle: string, valeur: string, options: { expirationTtl: number }): Promise<void>;
}

export interface ReponseClaude {
  stopReason: string | null;
  texte: string;
  usage: { input_tokens: number; output_tokens: number };
}

export interface DemandeClaude {
  modele: string;
  effort: string;
  consigne: string;
  texte: string;
}

export interface Deps {
  kv: Kv;
  claude: (demande: DemandeClaude) => Promise<ReponseClaude>;
  maintenant: () => Date;
}

type Raison = 'requete' | 'trop-long' | 'quota-jour' | 'budget-mois' | 'echec' | 'indisponible';

const STATUT: Record<Raison, number> = {
  requete: 400,
  'trop-long': 413,
  'quota-jour': 429,
  'budget-mois': 429,
  echec: 422,
  indisponible: 503,
};

function json(corps: unknown, statut: number, entetes: Record<string, string>): Response {
  return Response.json(corps, { status: statut, headers: entetes });
}

function refus(raison: Raison, entetes: Record<string, string>): Response {
  return json({ raison }, STATUT[raison], entetes);
}

async function entier(kv: Kv, cle: string): Promise<number> {
  return Number((await kv.get(cle)) ?? 0) || 0;
}

async function ajouter(kv: Kv, cle: string, quantite: number, ttl: number): Promise<void> {
  await kv.put(cle, String((await entier(kv, cle)) + quantite), { expirationTtl: ttl });
}

/** Un `max_tokens` ou un refus ne donnent pas un patron complet. */
function termine(reponse: ReponseClaude): boolean {
  return reponse.stopReason === 'end_turn';
}

export async function traiter(requete: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(requete.url);
  if (url.pathname !== '/mise-en-forme') return new Response(null, { status: 404 });
  if (requete.method !== 'POST' && requete.method !== 'OPTIONS') {
    return new Response(null, { status: 404 });
  }

  const origine = requete.headers.get('Origin');
  const autorisees = env.ORIGINES.split(',').map((o) => o.trim());
  if (origine === null || !autorisees.includes(origine)) {
    return new Response(null, { status: 403 });
  }
  const entetes = { 'Access-Control-Allow-Origin': origine, Vary: 'Origin' };

  if (requete.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...entetes,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const max = Number(env.MAX_CARACTERES);
  // Quatre octets par caractère au plus, plus l'enveloppe JSON : au-delà, inutile de lire.
  const taille = Number(requete.headers.get('Content-Length') ?? 0);
  if (taille > max * 4 + 1000) return refus('trop-long', entetes);

  let corps: unknown;
  try {
    corps = await requete.json();
  } catch {
    return refus('requete', entetes);
  }
  const { texte, langue } = (corps ?? {}) as { texte?: unknown; langue?: unknown };
  if (langue !== 'fr' && langue !== 'en') return refus('requete', entetes);
  if (typeof texte !== 'string' || texte.trim() === '') return refus('requete', entetes);
  if (texte.length > max) return refus('trop-long', entetes);

  const date = dateUtc(deps.maintenant());
  const ip = requete.headers.get('CF-Connecting-IP') ?? '';
  const cleP = cleJour(date, await empreinte(env.SEL_QUOTA, date, ip));
  const quotaJour = Number(env.QUOTA_JOUR);

  const faites = await entier(deps.kv, cleP);
  if (faites >= quotaJour) return refus('quota-jour', entetes);

  const budget = Number(env.BUDGET_MOIS_USD);
  const mois = await entier(deps.kv, cleMois(date));
  const depenseJour = await entier(deps.kv, cleDepense(date));
  if (budgetAtteint(mois, depenseJour, budget)) return refus('budget-mois', entetes);

  let reponse: ReponseClaude;
  try {
    reponse = await deps.claude({
      modele: env.MODELE,
      effort: env.EFFORT,
      consigne: consigne(langue as Langue),
      texte,
    });
  } catch {
    return refus('indisponible', entetes);
  }

  const cout = coutMicro(
    reponse.usage,
    Number(env.PRIX_ENTREE_MTOK_USD),
    Number(env.PRIX_SORTIE_MTOK_USD),
  );
  await ajouter(deps.kv, cleMois(date), cout, TTL_MOIS);
  await ajouter(deps.kv, cleDepense(date), cout, TTL_JOUR);

  if (!termine(reponse) || !fidele(texte, reponse.texte)) return refus('echec', entetes);

  await deps.kv.put(cleP, String(faites + 1), { expirationTtl: TTL_JOUR });
  return json({ texte: reponse.texte, restant: Math.max(0, quotaJour - faites - 1) }, 200, entetes);
}

async function appelerClaude(env: Env, demande: DemandeClaude): Promise<ReponseClaude> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const message = await client.messages
    .stream({
      model: demande.modele,
      max_tokens: 32000,
      system: demande.consigne,
      messages: [{ role: 'user', content: demande.texte }],
      output_config: { effort: demande.effort as 'low' | 'medium' | 'high' },
    })
    .finalMessage();
  return {
    stopReason: message.stop_reason,
    texte: message.content.map((b) => (b.type === 'text' ? b.text : '')).join(''),
    usage: message.usage,
  };
}

export default {
  async fetch(requete: Request, env: Env): Promise<Response> {
    try {
      return await traiter(requete, env, {
        kv: env.QUOTAS,
        claude: (demande) => appelerClaude(env, demande),
        maintenant: () => new Date(),
      });
    } catch {
      return Response.json({ raison: 'indisponible' }, { status: 503 });
    }
  },
};
