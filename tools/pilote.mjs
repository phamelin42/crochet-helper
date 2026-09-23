// Gardes et journal de coût des workflows du pilote. Tourne avant l'agent :
// s'il n'y a rien à faire, l'agent n'est pas appelé et ne coûte rien.
//
//   node tools/pilote.mjs garde-rapport .pilote/umami.json
//   node tools/pilote.mjs garde-hebdo   .pilote/umami.json automation/avancement.md
//   node tools/pilote.mjs garde-lot     prompts/README.md automation/avancement.md "<branches>"
//   node tools/pilote.mjs cout <workflow> <execution_file|-> [raison]
//
// Les gardes écrivent `agir=true|false` et `raison=…` dans $GITHUB_OUTPUT et
// ne font jamais échouer le job. `garde-rapport` écrit elle-même un rapport de
// deux lignes quand elle saute l'agent : la série de `reports/` reste continue.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Sous ce nombre de visites (sessions), aucune conclusion de comportement. */
export const PLANCHER_VISITES = 100;
/** Fiches déjà en attente au-delà desquelles le point hebdo n'en ajoute pas. */
export const FICHES_EN_ATTENTE_MAX = 3;

const LIGNE_ENTONNOIR_VIDE =
  'Entonnoir vide malgré des pages vues : aucune action mesurée, ou mesure des événements cassée.';

function lireJson(chemin) {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch {
    return null;
  }
}

function sessions(fenetre) {
  return fenetre?.stats?.sessions ?? 0;
}

/** `jj/mm/aaaa` depuis `aaaa-mm-jj`. */
function dateFr(iso) {
  const [a, m, j] = String(iso).split('-');
  return `${j}/${m}/${a}`;
}

/**
 * Rapport quotidien. Sans données ou sous le plancher sur les 8 derniers jours
 * (la veille et les 7 jours d'avant), l'analyse d'un agent n'apprendrait rien :
 * on écrit le constat nous-mêmes.
 */
export function gardeRapport(umami) {
  if (!umami) return { agir: false, raison: 'umami.json illisible', rapport: null };
  const fin = umami.fin;
  const titre = `# Rapport du ${dateFr(fin)}\n\n`;
  if (!umami.ok) {
    return {
      agir: false,
      raison: 'pas de données',
      rapport: `${titre}Pas de données : ${umami.erreur}\n`,
    };
  }
  const visites = sessions(umami.periode) + sessions(umami.reference);
  if (visites >= PLANCHER_VISITES) return { agir: true, raison: `${visites} visites sur 8 jours` };

  const p = umami.periode;
  const evenements = Object.values(p.evenements).reduce((a, b) => a + b, 0);
  let corps =
    `${p.stats.visiteurs} visiteuses, ${p.stats.pages_vues} pages vues, ` +
    `${evenements} événements. ${visites} visites sur 8 jours, sous le seuil de ` +
    `${PLANCHER_VISITES} : pas d'analyse (docs/pilote-automatique.md).\n`;
  if (evenements === 0 && p.stats.pages_vues > 0) corps += `\n${LIGNE_ENTONNOIR_VIDE}\n`;
  return { agir: false, raison: `${visites} visites sur 8 jours`, rapport: titre + corps };
}

/** Numéros des fiches « À faire » d'`automation/avancement.md`. */
export function fichesAFaire(avancement) {
  return [...avancement.matchAll(/^\|\s*(\d{2}) — [^|]*\|\s*À faire\s*\|/gm)].map((m) => m[1]);
}

/** Point hebdomadaire : rien à faire sans données, ou si le trafic est faible et la file pleine. */
export function gardeHebdo(umami, avancement) {
  if (!umami?.ok) return { agir: false, raison: 'pas de données' };
  const visites = sessions(umami.periode);
  const enAttente = fichesAFaire(avancement).length;
  if (visites < PLANCHER_VISITES && enAttente >= FICHES_EN_ATTENTE_MAX) {
    return {
      agir: false,
      raison: `${visites} visites en 7 jours et ${enAttente} fiches déjà en attente`,
    };
  }
  return { agir: true, raison: `${visites} visites, ${enAttente} fiches en attente` };
}

/** Numéros de la table « Ordre d'exécution », dans l'ordre. */
export function ordreDesFiches(readme) {
  const debut = readme.indexOf("## Ordre d'exécution");
  const section = debut >= 0 ? readme.slice(debut) : '';
  return [...section.matchAll(/^\|\s*(\d{2})\s*\|/gm)].map((m) => m[1]);
}

/** Lot suivant : la première fiche de l'ordre, « À faire », sans branche ouverte. */
export function gardeLot(readme, avancement, branches) {
  const aFaire = new Set(fichesAFaire(avancement));
  const ouvertes = new Set(
    branches
      .split(/\s+/)
      .map((b) => /(?:^|\/)(\d{2})-[a-z0-9-]+$/.exec(b)?.[1])
      .filter(Boolean),
  );
  const fiche = ordreDesFiches(readme).find((n) => aFaire.has(n) && !ouvertes.has(n));
  return fiche
    ? { agir: true, raison: `fiche ${fiche}` }
    : { agir: false, raison: 'aucune fiche « À faire » sans branche ouverte' };
}

/**
 * Ligne du journal `automation/couts.md`. Le fichier d'exécution de
 * claude-code-action est un tableau de messages ; le dernier `result` porte
 * `num_turns` et `total_cost_usd` (coût indicatif, l'abonnement ne le facture
 * pas à l'unité).
 */
export function ligneCout({ date, workflow, execution, raison }) {
  const resultat = Array.isArray(execution)
    ? execution.findLast((m) => m?.type === 'result')
    : null;
  if (!resultat) return `| ${date} | ${workflow} | agent sauté | — | ${raison ?? '—'} |`;
  const cout = Number.isFinite(resultat.total_cost_usd)
    ? `${resultat.total_cost_usd.toFixed(2)} $`
    : '—';
  return `| ${date} | ${workflow} | ${resultat.num_turns ?? '—'} tours | ${cout} | ${raison ?? '—'} |`;
}

function sortir({ agir, raison }) {
  const lignes = `agir=${agir}\nraison=${raison.replace(/\n/g, ' ')}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lignes);
  process.stdout.write(lignes);
}

function principal() {
  const [commande, ...args] = process.argv.slice(2);
  if (commande === 'garde-rapport') {
    const umami = lireJson(args[0]);
    const g = gardeRapport(umami);
    if (!g.agir && g.rapport && umami?.fin) {
      mkdirSync('reports', { recursive: true });
      writeFileSync(`reports/${umami.fin}.md`, g.rapport);
    }
    return sortir(g);
  }
  if (commande === 'garde-hebdo') {
    const avancement = existsSync(args[1]) ? readFileSync(args[1], 'utf8') : '';
    return sortir(gardeHebdo(lireJson(args[0]), avancement));
  }
  if (commande === 'garde-lot') {
    return sortir(
      gardeLot(readFileSync(args[0], 'utf8'), readFileSync(args[1], 'utf8'), args[2] ?? ''),
    );
  }
  if (commande === 'cout') {
    const [workflow, fichier, raison] = args;
    const execution = fichier && fichier !== '-' ? lireJson(fichier) : null;
    const date = new Date().toISOString().slice(0, 10);
    process.stdout.write(`${ligneCout({ date, workflow, execution, raison })}\n`);
    return;
  }
  process.stdout.write('Usage : voir l’en-tête de tools/pilote.mjs\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    principal();
  } catch (e) {
    // Une garde qui plante ne doit pas bloquer le pilote : on laisse l'agent juger.
    sortir({ agir: true, raison: `garde en erreur : ${e instanceof Error ? e.message : e}` });
  }
}
