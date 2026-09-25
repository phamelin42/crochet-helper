// Seul point de contact avec l'API d'Umami. Les workflows du pilote
// (rapport quotidien, point hebdomadaire) le lancent avec les secrets, puis
// l'agent lit le JSON imprimé, sans réseau ni secret.
//
//   node tools/umami.mjs quotidien [AAAA-MM-JJ]   # défaut : hier, heure de Paris
//   node tools/umami.mjs hebdo     [AAAA-MM-JJ]   # défaut : semaine finie hier
//   node tools/umami.mjs forme                    # structure des réponses brutes, sans valeurs
//
// La forme du JSON est fixe : mêmes clés, dans le même ordre, que l'API
// réponde ou non. Sans secrets, API injoignable ou réponse aberrante : `ok`
// vaut false, `erreur` dit pourquoi, et le code de sortie reste 0 — un
// rapport qui dit « pas de données » vaut mieux qu'un job rouge.
//
// Quand Umami change de version majeure, c'est ce fichier seul qu'on corrige
// (voir `lireStats` et `TYPES_PAGE`).
import { pathToFileURL } from 'node:url';

export const FUSEAU = 'Europe/Paris';
const DELAI_MS = 15_000;
/** Une réponse d'agrégats tient en quelques kilo-octets ; au-delà, on refuse. */
const TAILLE_MAX = 1_000_000;
const JOUR_MS = 86_400_000;

/**
 * Événements instrumentés (`AnalyticsEvent`, core/analytics). Toujours
 * présents dans la sortie, à 0 s'ils n'ont pas eu lieu : une fonctionnalité
 * qui cesse d'être utilisée doit se voir comme un 0, pas comme une clé absente.
 */
export const EVENEMENTS = [
  'pattern_pasted',
  'pdf_imported',
  'pdf_failed',
  'pattern_parsed',
  'step_advanced',
  'glossary_hover',
  'session_resumed',
  'term_tried',
  'conversion_run',
  'project_created',
  'project_resumed',
  'backup_exported',
  'backup_imported',
  'returning_visit_1d',
  'returning_visit_2_7d',
  'returning_visit_8_30d',
  'returning_visit_31d',
  'reading_depth_5',
  'reading_depth_20',
  'reading_depth_50',
  'waitlist_shown',
  'waitlist_clicked',
];

/** Sept noms distincts : la tranche ou le palier vit dans le nom, pas dans une propriété. */
const RETOUR_TRANCHES = ['1d', '2_7d', '8_30d', '31d'];
const PROFONDEUR_PALIERS = [5, 20, 50];

/** Umami 2 nomme « url » ce qu'Umami 3 nomme « path ». */
const TYPES_PAGE = ['path', 'url'];

// ---------------------------------------------------------------- dates

function decalageParis(instant) {
  const nom = new Intl.DateTimeFormat('en-US', { timeZone: FUSEAU, timeZoneName: 'longOffset' })
    .formatToParts(new Date(instant))
    .find((p) => p.type === 'timeZoneName').value; // « GMT+02:00 »
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(nom);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60_000;
}

/** Instant UTC de minuit, heure de Paris, pour la date civile donnée. */
export function minuitParis(date) {
  const [a, mo, j] = date.split('-').map(Number);
  const naif = Date.UTC(a, mo - 1, j);
  const essai = naif - decalageParis(naif);
  return naif - decalageParis(essai);
}

/** Date civile à Paris (AAAA-MM-JJ) de l'instant donné. */
export function dateParis(instant) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU }).format(new Date(instant));
}

export function decaler(date, jours) {
  const [a, mo, j] = date.split('-').map(Number);
  return new Date(Date.UTC(a, mo - 1, j) + jours * JOUR_MS).toISOString().slice(0, 10);
}

/** Fenêtre de `jours` jours civils finissant le `dernier` inclus. */
export function fenetre(dernier, jours) {
  const debut = decaler(dernier, -(jours - 1));
  return {
    debut,
    fin: dernier,
    jours,
    startAt: minuitParis(debut),
    endAt: minuitParis(decaler(dernier, 1)) - 1,
  };
}

/**
 * Fenêtres comparées. La référence précède toujours la période sans la
 * chevaucher : comparer hier à une moyenne qui contient hier atténue
 * précisément l'écart qu'on cherche à voir.
 */
export function fenetres(mode, dernier) {
  if (mode === 'quotidien') {
    return { periode: fenetre(dernier, 1), reference: fenetre(decaler(dernier, -1), 7) };
  }
  return {
    periode: fenetre(dernier, 7),
    reference: fenetre(decaler(dernier, -7), 7),
    mois: fenetre(dernier, 28),
  };
}

// ---------------------------------------------------------------- API

function nombre(v) {
  const n = typeof v === 'object' && v !== null ? v.value : v;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** `null` quand le dénominateur vaut 0 : un taux ne se calcule pas sur rien. */
function ratio(a, b, chiffres) {
  return b > 0 ? Number((a / b).toFixed(chiffres)) : null;
}

/** Umami 2 : `{ pageviews: { value, prev } }` ; Umami 3 : `{ pageviews: 12 }`. */
export function lireStats(brut) {
  if (typeof brut !== 'object' || brut === null) throw new Error('statistiques illisibles');
  const pagesVues = nombre(brut.pageviews);
  const visiteurs = nombre(brut.visitors);
  const sessions = nombre(brut.visits);
  const rebonds = nombre(brut.bounces);
  const dureeTotale = nombre(brut.totaltime);
  return {
    visiteurs,
    sessions,
    pages_vues: pagesVues,
    sessions_par_visiteur: ratio(sessions, visiteurs, 2),
    taux_rebond: ratio(rebonds, sessions, 3),
    duree_moyenne_session_s: ratio(dureeTotale, sessions, 0),
  };
}

function lireMetriques(brut) {
  if (!Array.isArray(brut)) throw new Error('métriques illisibles');
  return brut
    .filter((l) => l && typeof l.x === 'string')
    .map((l) => ({ nom: l.x, nombre: nombre(l.y) }));
}

function client({ url, jeton, site, fetch }) {
  const base = `${url.replace(/\/+$/, '')}/api/websites/${encodeURIComponent(site)}`;
  return async function lire(chemin, params) {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const rep = await fetch(`${base}/${chemin}?${qs}`, {
      headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(DELAI_MS),
    });
    const texte = await rep.text();
    if (!rep.ok) {
      const e = new Error(`${chemin} : HTTP ${rep.status}`);
      e.statut = rep.status;
      throw e;
    }
    if (texte.length > TAILLE_MAX) throw new Error(`${chemin} : réponse trop grande`);
    try {
      return JSON.parse(texte);
    } catch {
      throw new Error(`${chemin} : réponse non JSON`);
    }
  };
}

async function lireFenetre(lire, f, detail) {
  const temps = { startAt: f.startAt, endAt: f.endAt };
  const stats = lireStats(await lire('stats', temps));
  const evenementsBruts = lireMetriques(await lire('metrics', { ...temps, type: 'event' }));
  const evenements = Object.fromEntries(EVENEMENTS.map((e) => [e, 0]));
  for (const { nom, nombre: n } of evenementsBruts) if (nom in evenements) evenements[nom] = n;

  const retours = RETOUR_TRANCHES.map((t) => evenements[`returning_visit_${t}`]);
  const retour = {
    par_tranche: Object.fromEntries(RETOUR_TRANCHES.map((t, i) => [t, retours[i]])),
    part_des_visiteurs: ratio(
      retours.reduce((a, b) => a + b, 0),
      stats.visiteurs,
      2,
    ),
  };
  const profondeur = {
    ...Object.fromEntries(PROFONDEUR_PALIERS.map((p) => [p, evenements[`reading_depth_${p}`]])),
    part_des_decoupages_5: ratio(evenements.reading_depth_5, evenements.pattern_parsed, 2),
  };

  const sortie = {
    debut: f.debut,
    fin: f.fin,
    jours: f.jours,
    stats,
    moyenne_journaliere: {
      visiteurs: Number((stats.visiteurs / f.jours).toFixed(1)),
      sessions: Number((stats.sessions / f.jours).toFixed(1)),
      pages_vues: Number((stats.pages_vues / f.jours).toFixed(1)),
    },
    evenements,
    retour,
    profondeur,
    entonnoir: entonnoir(stats, evenements),
    pages: null,
    provenances: null,
  };
  if (detail) {
    sortie.pages = await lirePages(lire, temps);
    sortie.provenances = lireMetriques(
      await lire('metrics', { ...temps, type: 'referrer', limit: 5 }),
    ).slice(0, 5);
  }
  return sortie;
}

async function lirePages(lire, temps) {
  let derniere;
  for (const type of TYPES_PAGE) {
    try {
      return lireMetriques(await lire('metrics', { ...temps, type, limit: 5 })).slice(0, 5);
    } catch (e) {
      if (e.statut !== 400) throw e;
      derniere = e;
    }
  }
  throw derniere;
}

/**
 * Crans de l'entonnoir, en occurrences d'événements (Umami ne dit pas combien
 * de personnes distinctes ont déclenché un événement). Les taux sont donc
 * des ordres de grandeur, pas des parts de visiteurs.
 */
export function entonnoir(stats, ev) {
  const crans = [
    { cran: 'arrivee', nombre: stats.visiteurs },
    { cran: 'patron_fourni', nombre: ev.pattern_pasted + ev.pdf_imported },
    { cran: 'decoupage_reussi', nombre: ev.pattern_parsed },
    { cran: 'etape_franchie', nombre: ev.step_advanced },
  ];
  return crans.map((c, i) => ({
    ...c,
    taux_depuis_precedent:
      i === 0 || crans[i - 1].nombre === 0
        ? null
        : Number((c.nombre / crans[i - 1].nombre).toFixed(3)),
  }));
}

// ---------------------------------------------------------------- sortie

export async function collecter({ mode, date, env, fetch, maintenant = Date.now() }) {
  const dernier = date ?? decaler(dateParis(maintenant), -1);
  const f = fenetres(mode, dernier);
  const sortie = {
    ok: false,
    erreur: null,
    mode,
    /** Dernier jour couvert, même quand l'API ne répond pas. */
    fin: dernier,
    fuseau: FUSEAU,
    genere_le: new Date(maintenant).toISOString(),
    periode: null,
    reference: null,
    mois: null,
    limites: [
      'Les chiffres sont un plancher : une partie des bloqueurs écarte le traceur.',
      "Umami identifie une visite par une empreinte technique qui ne traverse pas fiablement les jours : aucun taux de retour n'est calculable.",
      "L'entonnoir compte des occurrences d'événements, pas des personnes.",
    ],
  };

  const { UMAMI_URL: url, UMAMI_TOKEN: jeton, UMAMI_WEBSITE_ID: site } = env;
  if (!url || !jeton || !site) {
    sortie.erreur = 'Secrets UMAMI_URL, UMAMI_TOKEN ou UMAMI_WEBSITE_ID absents.';
    return sortie;
  }
  try {
    const lire = client({ url, jeton, site, fetch });
    sortie.periode = await lireFenetre(lire, f.periode, true);
    sortie.reference = await lireFenetre(lire, f.reference, false);
    if (f.mois) sortie.mois = await lireFenetre(lire, f.mois, true);
    sortie.ok = true;
  } catch (e) {
    sortie.periode = sortie.reference = sortie.mois = null;
    sortie.erreur = `API Umami : ${decrire(e)}`.replaceAll(jeton, '***');
  }
  return sortie;
}

/**
 * `fetch` de Node ne dit que « fetch failed » : la cause utile (DNS, refus de
 * connexion, certificat, délai) est dans `cause`, parfois sur deux niveaux.
 */
export function decrire(e) {
  if (!(e instanceof Error)) return String(e);
  const causes = [];
  for (let c = e.cause, n = 0; c && n < 3; c = c.cause, n++) {
    causes.push([c.code, c.message].filter(Boolean).join(' '));
  }
  return causes.length ? `${e.message} (${causes.join(' ← ')})` : e.message;
}

/** Structure d'une valeur, sans aucune valeur : clés, types, longueurs. */
export function structure(v, profondeur = 0) {
  if (Array.isArray(v)) {
    return v.length ? [`${v.length} éléments`, structure(v[0], profondeur + 1)] : [];
  }
  if (v === null) return 'null';
  if (typeof v !== 'object' || profondeur > 3) return typeof v;
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, structure(x, profondeur + 1)]));
}

/**
 * Mode `forme` : pour chaque appel que fait le script, le statut HTTP et la
 * structure de la réponse brute. Sert à voir d'un coup d'œil ce qu'une
 * nouvelle version d'Umami a changé, sans exposer un seul chiffre.
 */
export async function forme({ env, fetch, maintenant = Date.now() }) {
  const { UMAMI_URL: url, UMAMI_TOKEN: jeton, UMAMI_WEBSITE_ID: site } = env;
  if (!url || !jeton || !site) return { ok: false, erreur: 'Secrets absents.' };
  const f = fenetre(decaler(dateParis(maintenant), -1), 1);
  const temps = { startAt: f.startAt, endAt: f.endAt };
  const lire = client({ url, jeton, site, fetch });
  const appels = {
    stats: ['stats', temps],
    'metrics?type=event': ['metrics', { ...temps, type: 'event' }],
    'metrics?type=path': ['metrics', { ...temps, type: 'path', limit: 5 }],
    'metrics?type=url': ['metrics', { ...temps, type: 'url', limit: 5 }],
    'metrics?type=referrer': ['metrics', { ...temps, type: 'referrer', limit: 5 }],
  };
  const sortie = { ok: true, jour: f.debut, reponses: {} };
  for (const [nom, [chemin, params]] of Object.entries(appels)) {
    try {
      sortie.reponses[nom] = structure(await lire(chemin, params));
    } catch (e) {
      sortie.reponses[nom] = `erreur : ${decrire(e)}`.replaceAll(jeton, '***');
    }
  }
  return sortie;
}

async function principal() {
  const [mode = 'quotidien', date] = process.argv.slice(2);
  let sortie;
  if (mode === 'forme') {
    sortie = await forme({ env: process.env, fetch: globalThis.fetch });
  } else if (
    !['quotidien', 'hebdo'].includes(mode) ||
    (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
  ) {
    sortie = {
      ok: false,
      erreur: 'Usage : node tools/umami.mjs quotidien|hebdo [AAAA-MM-JJ] | forme',
    };
  } else {
    sortie = await collecter({ mode, date, env: process.env, fetch: globalThis.fetch });
  }
  process.stdout.write(`${JSON.stringify(sortie, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal().catch((e) => {
    process.stdout.write(`${JSON.stringify({ ok: false, erreur: String(e) })}\n`);
  });
}
