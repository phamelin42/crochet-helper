# 10 — Mesurer l'usage réel

## Pourquoi

Personne ne sait combien de gens utilisent Fil, ni si elles reviennent. Toutes
les décisions produit à venir — quelles pages créer, quelle langue mettre en
avant, faut-il un import PDF — sont aujourd'hui prises à l'aveugle. C'est la
première tâche du plan parce que toutes les autres en dépendent.

## Écart assumé à la règle 1

Cette fiche **introduit une requête réseau sortante**, ce que `00-contexte.md`
interdit sans discussion. La discussion a eu lieu : c'est une exception, bornée
par trois règles absolues.

1. Aucun contenu de patron, aucun texte saisi, aucun nom de fichier ne sort du
   navigateur. Uniquement des noms d'événements et des compteurs.
2. Aucun cookie, aucun identifiant persistant, donc aucun bandeau de consentement.
3. Le point de collecte est **une seule origine**, définie par une constante, et
   remplaçable sans toucher au reste du code.

Choix par défaut : **Umami auto-hébergé** sur le VPS OVH déjà payé. Si l'origine
n'est pas encore disponible, implémente quand même tout, avec la constante
pointant vers une valeur vide : le service devient un no-op silencieux et la
tâche est livrable.

## Objectif

Un service de mesure, cinq événements instrumentés, une CSP mise à jour, et la
garantie testée que rien ne part au pré-rendu.

## Fichiers à lire

- `src/app/core/storage/local-storage.service.ts` — le modèle d'un service sûr côté serveur
- `src/app/core/platform/wake-lock.service.ts` — le modèle d'un service qui touche au navigateur
- `src/app/features/reader/state/reader-store.ts` — d'où partiront la plupart des événements
- `src/app/features/reader/components/pattern-import.ts`
- `src/app/features/reader/components/glossary-text.ts`
- `vercel.json` et `netlify.toml` — la CSP actuelle
- `tools/check-csp.mjs`

## À faire

1. Écrire `docs/adr-001-mesure-audience.md` : le problème, l'écart à la règle 1,
   les trois garde-fous ci-dessus, l'option retenue et ce qu'il faudrait pour en
   changer. Court — une page.

2. Créer `src/app/core/analytics/analytics.config.ts` :

   ```ts
   /** Origine du collecteur. Vide = mesure désactivée (le service devient inerte). */
   export const ANALYTICS_ORIGIN = '';
   export const ANALYTICS_SITE_ID = '';
   ```

3. Créer `src/app/core/analytics/analytics.service.ts`, `@Service()` :

   ```ts
   track(event: AnalyticsEvent, props?: Record<string, string | number>): void
   ```

   - `AnalyticsEvent` est une **union de littéraux**, pas `string` : les cinq
     noms ci-dessous et rien d'autre. Une faute de frappe doit casser le build.
   - Ne fait rien si `isPlatformBrowser` est faux, ou si `ANALYTICS_ORIGIN` est vide.
   - Charge le script de mesure dans `afterNextRender`, jamais à l'import.
   - N'échoue jamais bruyamment : une erreur réseau est avalée.

4. Instrumenter exactement cinq événements :

   | Événement         | Où                                         | Propriétés                                             |
   | ----------------- | ------------------------------------------ | ------------------------------------------------------ |
   | `pattern_pasted`  | à la saisie dans le lecteur                | `length` (nombre de caractères, arrondi à la centaine) |
   | `pattern_parsed`  | après `parsePattern`                       | `steps`, `pieces`                                      |
   | `step_advanced`   | changement d'étape                         | aucune                                                 |
   | `glossary_hover`  | ouverture d'une infobulle                  | aucune                                                 |
   | `session_resumed` | reprise d'un patron existant au chargement | aucune                                                 |

   `session_resumed` est le plus important : c'est le seul qui mesure le retour.

5. Ajouter l'origine à `script-src` et `connect-src` dans `vercel.json` **et**
   `netlify.toml`. Étendre `tools/check-csp.mjs` pour qu'il échoue si les deux
   fichiers divergent — ils sont déjà identiques aujourd'hui et doivent le rester.

## Critères d'acceptation

- `npm run verify` vert.
- Un test Vitest prouve que `track()` n'émet rien quand `isPlatformBrowser` est faux.
- Un test prouve qu'aucune propriété d'événement ne contient de texte de patron.
- Avec `ANALYTICS_ORIGIN` vide, aucune requête réseau n'est émise et aucune
  erreur n'apparaît en console.
- `check-csp.mjs` passe et refuse une divergence entre les deux fichiers d'hébergeur.
- Aucun cookie n'est posé. Vérifié dans l'onglet Application du navigateur.

## Hors périmètre

Tableau de bord, A/B testing, identification des visiteuses, entonnoirs,
enregistrement de session. On compte cinq choses, c'est tout.
