// Tunnel de conversion : seule source des seuils, lue par le rapport mensuel
// (tools/umami.mjs) et recopiée en clair dans docs/tunnel.md —
// tools/tunnel.test.mjs vérifie que les deux disent la même chose.
//
// Les taux comptent des occurrences d'événements, pas des personnes (Umami ne
// relie pas un événement à un visiteur unique) : ce sont des ordres de
// grandeur. Seuils de départ, à recalibrer après le premier mois réel
// (décision de Phil, consignée dans docs/tunnel.md).

export const ETAPES = [
  {
    cle: 'activation',
    etape: 'Activation',
    numerateur: ['outil_commence'],
    denominateur: 'visiteurs',
    sain: 0.4,
    alerte: 0.2,
  },
  {
    cle: 'resultat',
    etape: 'Activation',
    numerateur: ['outil_termine'],
    denominateur: ['outil_commence'],
    sain: 0.5,
    alerte: 0.25,
  },
  {
    cle: 'export',
    etape: 'Activation',
    numerateur: ['export_fait'],
    denominateur: ['outil_termine'],
    sain: 0.6,
    alerte: 0.3,
  },
  {
    cle: 'retour',
    etape: 'Rétention',
    numerateur: ['retour_2_7j', 'retour_8_30j', 'retour_31j'],
    denominateur: 'visiteurs',
    sain: 0.15,
    alerte: 0.05,
  },
  {
    cle: 'installation',
    etape: 'Rétention',
    numerateur: ['app_installee'],
    denominateur: 'visiteurs',
    sain: 0.02,
    alerte: 0.005,
  },
  {
    cle: 'interet_offre',
    etape: 'Revenu',
    numerateur: ['offre_cliquee'],
    denominateur: ['offre_vue'],
    sain: 0.03,
    alerte: 0.01,
  },
];

/** Sous ce volume de visiteurs sur la période, aucun taux n'est jugé : trop peu pour conclure. */
export const VISITEURS_MIN = 200;

function somme(evenements, noms) {
  return noms.reduce((total, nom) => total + (evenements[nom] ?? 0), 0);
}

/**
 * Taux de chaque cran et verdict : `sain`, `a_surveiller`, `alerte`, ou
 * `insuffisant` (volume trop faible ou dénominateur nul).
 */
export function evaluerTunnel(visiteurs, evenements) {
  return ETAPES.map((e) => {
    const num = somme(evenements, e.numerateur);
    const den = e.denominateur === 'visiteurs' ? visiteurs : somme(evenements, e.denominateur);
    const taux = den > 0 ? Number((num / den).toFixed(3)) : null;
    let verdict = 'insuffisant';
    if (taux !== null && visiteurs >= VISITEURS_MIN) {
      verdict = taux >= e.sain ? 'sain' : taux < e.alerte ? 'alerte' : 'a_surveiller';
    }
    return { cle: e.cle, etape: e.etape, numerateur: num, denominateur: den, taux, verdict };
  });
}
