// Lecture de la Search Console pour le rapport mensuel : requêtes et pages,
// clics, impressions, CTR et position moyenne. Compte de service Google
// (rôle « lecture seule » ajouté à la propriété), jamais de compte personnel.
//
//   node tools/search-console.mjs mensuel [AAAA-MM]
//
// Secrets : GSC_SERVICE_ACCOUNT (JSON de la clé), GSC_PROPRIETE
// (« sc-domain:exemple.fr »). Même contrat que umami.mjs : JSON de forme
// fixe, `ok: false` plutôt qu'un job rouge.
import { createSign } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { bornesMois, moisPrecedent } from './umami.mjs';

const PORTEE = 'https://www.googleapis.com/auth/webmasters.readonly';
const DELAI_MS = 15_000;
const LIGNES = 25;

function base64url(texte) {
  return Buffer.from(texte).toString('base64url');
}

/** Jeton signé (RS256) échangé contre un jeton d'accès OAuth. Pur, testable. */
export function assertion(compte, maintenantS) {
  const entete = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const charge = base64url(
    JSON.stringify({
      iss: compte.client_email,
      scope: PORTEE,
      aud: compte.token_uri ?? 'https://oauth2.googleapis.com/token',
      iat: maintenantS,
      exp: maintenantS + 3600,
    }),
  );
  const signature = createSign('RSA-SHA256')
    .update(`${entete}.${charge}`)
    .sign(compte.private_key, 'base64url');
  return `${entete}.${charge}.${signature}`;
}

/** Lignes de l'API → forme stable, valeurs arrondies. */
export function lireLignes(brut) {
  const lignes = Array.isArray(brut?.rows) ? brut.rows : [];
  return lignes
    .filter((l) => Array.isArray(l.keys) && typeof l.keys[0] === 'string')
    .map((l) => ({
      cle: l.keys[0],
      clics: Number(l.clicks) || 0,
      impressions: Number(l.impressions) || 0,
      ctr: Number((Number(l.ctr) || 0).toFixed(3)),
      position: Number((Number(l.position) || 0).toFixed(1)),
    }));
}

async function jetonAcces(compte, fetch) {
  const rep = await fetch(compte.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion(compte, Math.floor(Date.now() / 1000)),
    }),
    signal: AbortSignal.timeout(DELAI_MS),
  });
  if (!rep.ok) throw new Error(`jeton : HTTP ${rep.status}`);
  return (await rep.json()).access_token;
}

export async function collecter({ mois, env, fetch }) {
  const sortie = { ok: false, erreur: null, mois, totaux: null, requetes: null, pages: null };
  if (!env.GSC_SERVICE_ACCOUNT || !env.GSC_PROPRIETE) {
    sortie.erreur = 'Secrets GSC_SERVICE_ACCOUNT ou GSC_PROPRIETE absents.';
    return sortie;
  }
  try {
    const compte = JSON.parse(env.GSC_SERVICE_ACCOUNT);
    const jeton = await jetonAcces(compte, fetch);
    const { debut, endAt } = bornesMois(mois);
    const fin = new Date(endAt).toISOString().slice(0, 10);
    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(env.GSC_PROPRIETE)}/searchAnalytics/query`;
    const lire = async (dimensions) => {
      const rep = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: debut, endDate: fin, dimensions, rowLimit: LIGNES }),
        signal: AbortSignal.timeout(DELAI_MS),
      });
      if (!rep.ok) throw new Error(`searchAnalytics : HTTP ${rep.status}`);
      return rep.json();
    };
    const totaux = lireLignes({
      rows: ((await lire([])).rows ?? []).map((r) => ({ ...r, keys: ['total'] })),
    });
    sortie.totaux = totaux[0] ?? { cle: 'total', clics: 0, impressions: 0, ctr: 0, position: 0 };
    sortie.requetes = lireLignes(await lire(['query']));
    sortie.pages = lireLignes(await lire(['page']));
    sortie.ok = true;
  } catch (e) {
    sortie.erreur = `Search Console : ${e instanceof Error ? e.message : String(e)}`;
  }
  return sortie;
}

async function principal() {
  const [mode, mois = moisPrecedent(Date.now())] = process.argv.slice(2);
  if (mode !== 'mensuel' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)) {
    console.log(
      JSON.stringify({
        ok: false,
        erreur: 'Usage : node tools/search-console.mjs mensuel [AAAA-MM]',
      }),
    );
    return;
  }
  console.log(
    JSON.stringify(await collecter({ mois, env: process.env, fetch: globalThis.fetch }), null, 2),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await principal();
