// Seul point de contact avec l'API d'Umami. Le workflow du rapport mensuel le
// lance avec les secrets ; l'agent ne lit que le JSON imprimé, sans réseau ni
// secret.
//
//   node tools/umami.mjs mensuel [AAAA-MM]   # défaut : le mois civil précédent
//
// La forme du JSON est fixe. Sans secrets ou API injoignable : `ok` vaut
// false, `erreur` dit pourquoi, et le code de sortie reste 0 — un rapport qui
// dit « pas de données » vaut mieux qu'un job rouge.
import { pathToFileURL } from 'node:url';
import { evaluerTunnel } from './tunnel.mjs';

const DELAI_MS = 15_000;
const TAILLE_MAX = 1_000_000;

/** Miroir de `EVENEMENTS` (libs/core/src/analytics/evenements.ts), vérifié par evenements.test.mjs. */
export const EVENEMENTS = [
  'outil_commence',
  'outil_termine',
  'export_fait',
  'donnees_reprises',
  'offre_vue',
  'offre_cliquee',
  'installation_proposee',
  'app_installee',
  'retour_1j',
  'retour_2_7j',
  'retour_8_30j',
  'retour_31j',
];

/** Mois civil précédent celui de `maintenant`, au format AAAA-MM. */
export function moisPrecedent(maintenant) {
  const d = new Date(maintenant);
  const prec = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return prec.toISOString().slice(0, 7);
}

/** Bornes d'un mois civil, en UTC (l'écart d'une heure avec Paris est négligeable sur un mois). */
export function bornesMois(mois) {
  const [a, m] = mois.split('-').map(Number);
  const debut = Date.UTC(a, m - 1, 1);
  const fin = Date.UTC(a, m, 1) - 1;
  const jours = Math.round((fin + 1 - debut) / 86_400_000);
  return {
    mois,
    debut: new Date(debut).toISOString().slice(0, 10),
    startAt: debut,
    endAt: fin,
    jours,
  };
}

function nombre(v) {
  const n = typeof v === 'object' && v !== null ? v.value : v;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Umami 2 : `{ pageviews: { value } }` ; Umami 3 : `{ pageviews: 12 }`. */
export function lireStats(brut) {
  if (typeof brut !== 'object' || brut === null) throw new Error('statistiques illisibles');
  const sessions = nombre(brut.visits);
  return {
    visiteurs: nombre(brut.visitors),
    sessions,
    pages_vues: nombre(brut.pageviews),
    taux_rebond: sessions > 0 ? Number((nombre(brut.bounces) / sessions).toFixed(3)) : null,
  };
}

export function lireMetriques(brut) {
  if (!Array.isArray(brut)) throw new Error('métriques illisibles');
  return brut
    .filter((l) => l && typeof l.x === 'string')
    .map((l) => ({ nom: l.x, nombre: nombre(l.y) }));
}

function client({ url, jeton, site, fetch }) {
  const base = `${url.replace(/\/+$/, '')}/api/websites/${encodeURIComponent(site)}`;
  return async (chemin, params) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const rep = await fetch(`${base}/${chemin}?${qs}`, {
      headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(DELAI_MS),
    });
    const texte = await rep.text();
    if (!rep.ok)
      throw Object.assign(new Error(`${chemin} : HTTP ${rep.status}`), { statut: rep.status });
    if (texte.length > TAILLE_MAX) throw new Error(`${chemin} : réponse trop grande`);
    return JSON.parse(texte);
  };
}

async function lirePages(lire, temps) {
  for (const type of ['path', 'url']) {
    try {
      return lireMetriques(await lire('metrics', { ...temps, type, limit: 10 })).slice(0, 10);
    } catch (e) {
      if (e.statut !== 400) throw e;
    }
  }
  return null;
}

async function lireMois(lire, bornes, detail) {
  const temps = { startAt: bornes.startAt, endAt: bornes.endAt };
  const stats = lireStats(await lire('stats', temps));
  const evenements = Object.fromEntries(EVENEMENTS.map((e) => [e, 0]));
  for (const { nom, nombre: n } of lireMetriques(
    await lire('metrics', { ...temps, type: 'event' }),
  )) {
    if (nom in evenements) evenements[nom] = n;
  }
  const sortie = {
    ...bornes,
    stats,
    evenements,
    tunnel: evaluerTunnel(stats.visiteurs, evenements),
    pages: null,
    provenances: null,
  };
  if (detail) {
    sortie.pages = await lirePages(lire, temps);
    sortie.provenances = lireMetriques(
      await lire('metrics', { ...temps, type: 'referrer', limit: 10 }),
    ).slice(0, 10);
  }
  return sortie;
}

export async function collecter({ mois, env, fetch }) {
  const sortie = {
    ok: false,
    erreur: null,
    mois,
    periode: null,
    reference: null,
    limites: [
      'Les chiffres sont un plancher : une partie des bloqueurs écarte le traceur.',
      "Le tunnel compte des occurrences d'événements, pas des personnes.",
    ],
  };
  const { UMAMI_URL: url, UMAMI_TOKEN: jeton, UMAMI_WEBSITE_ID: site } = env;
  if (!url || !jeton || !site) {
    sortie.erreur = 'Secrets UMAMI_URL, UMAMI_TOKEN ou UMAMI_WEBSITE_ID absents.';
    return sortie;
  }
  try {
    const lire = client({ url, jeton, site, fetch });
    const [a, m] = mois.split('-').map(Number);
    const precedent = new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 7);
    sortie.periode = await lireMois(lire, bornesMois(mois), true);
    sortie.reference = await lireMois(lire, bornesMois(precedent), false);
    sortie.ok = true;
  } catch (e) {
    sortie.periode = sortie.reference = null;
    sortie.erreur = `API Umami : ${e instanceof Error ? e.message : String(e)}`.replaceAll(
      jeton,
      '***',
    );
  }
  return sortie;
}

async function principal() {
  const [mode, mois = moisPrecedent(Date.now())] = process.argv.slice(2);
  if (mode !== 'mensuel' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)) {
    console.log(
      JSON.stringify({ ok: false, erreur: 'Usage : node tools/umami.mjs mensuel [AAAA-MM]' }),
    );
    return;
  }
  const sortie = await collecter({ mois, env: process.env, fetch: globalThis.fetch });
  console.log(JSON.stringify(sortie, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await principal();
