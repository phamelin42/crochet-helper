# 21 — Mesurer le retour et la profondeur de lecture

**Étape d'entonnoir servie : rétention.**

## Pourquoi

Le critère qui décide de tout le plan — la part des visiteuses qui reviennent
— n'est pas mesuré. Umami identifie une visite par une empreinte qui ne
traverse pas les jours, et `session_resumed` / `project_resumed` ne comptent
que celles qui retrouvent un projet. On le mesure côté navigateur, sans
cookie ni identifiant : une date de première visite en `localStorage`, et un
événement qui ne transmet qu'une **tranche d'ancienneté**.

La profondeur manque aussi : `step_advanced` compte des clics, pas des
lectrices qui vont loin dans un patron.

## Décisions déjà prises

- **Tranche et palier dans le nom de l'événement, pas dans une propriété.**
  `tools/umami.mjs` lit les comptes par nom (`metrics?type=event`), forme
  relevée et figée dans `tools/fixtures/umami-v3.json`. Les propriétés
  d'événement passent par une autre API, jamais relevée sur l'instance, que
  l'agent ne peut pas découvrir (pas de réseau). Des noms distincts se lisent
  sans rien deviner.
- **La source d'un patron existe déjà** : propriété `origine`
  (`saisie|pdf|exemple|lien`) de `pattern_parsed`. Ne pas la renommer ni en
  créer une deuxième.

## Fichiers à lire

- `src/app/core/analytics/analytics.service.ts` et `.spec.ts`
- `src/app/core/storage/local-storage.service.ts` — seul accès à `localStorage`
- `src/app/features/reader/state/reader-store.ts` — `move`, `goTo` (`grep -n`)
- `tools/umami.mjs`, `tools/umami.test.mjs`, `tools/evenements.test.mjs`,
  `tools/fixtures/umami-v3.json`
- `.claude/skills/rapport-quotidien/SKILL.md`, « Retour et profondeur » —
  lecture seule : il consomme déjà les clés du § 5
- `e2e/analytics.spec.ts` — le modèle de test de bout en bout

## Contrat

1. `src/app/core/analytics/visit-age.ts`, fonction pure :

   ```ts
   export type VisitBucket = '1d' | '2_7d' | '8_30d' | '31d';
   export function visitBucket(firstVisitDay: string, today: string): VisitBucket | null;
   ```

   Dates civiles `AAAA-MM-JJ` (heure locale du navigateur). `null` le jour de
   la première visite (ce n'est pas un retour). Écart de 1 jour → `1d`, 2 à 7 →
   `2_7d`, 8 à 30 → `8_30d`, au-delà → `31d`. Date invalide ou future → `null`.

2. Dans `AnalyticsService`, au démarrage dans le navigateur (le
   `afterNextRender` du constructeur, pas le chargement du traceur, qui n'a
   lieu que sur `patternreader.com` et jamais en test) :
   lire `fil.firstVisit` et `fil.lastVisitDay` via `LocalStorageService`,
   écrire la date du jour si absente, et émettre **au plus une fois par jour**
   `returning_visit_1d`, `returning_visit_2_7d`, `returning_visit_8_30d` ou
   `returning_visit_31d`. Rien d'autre n'est stocké ni transmis.

   **Conformité** : la règle du consentement (art. 82 de la loi Informatique et
   libertés, directive ePrivacy) vise aussi `localStorage`, pas seulement les
   cookies. On reste dans l'exemption CNIL de la mesure d'audience :
   finalité strictement statistique, aucun recoupement, première partie, et
   **durée de vie de 13 mois au plus** — au-delà, `fil.firstVisit` est
   réécrite à la date du jour (la tranche `31d` couvre déjà ce cas).

3. Profondeur : dans `ReaderStore`, quand la position absolue dans le patron
   (étapes de toutes les pièces) atteint pour la première fois 5, 20 ou 50 dans
   le projet courant, émettre `reading_depth_5`, `reading_depth_20` ou
   `reading_depth_50`. Un projet repris au-delà d'un palier ne le réémet pas.

4. Les sept événements entrent dans `AnalyticsEvent` **et** `EVENEMENTS`
   (`tools/evenements.test.mjs` échoue sinon).

5. `tools/umami.mjs` : chaque fenêtre expose, sans changer les clés existantes,

   ```json
   "retour": { "par_tranche": { "1d": 0, "2_7d": 0, "8_30d": 0, "31d": 0 },
               "part_des_visiteurs": 0.12 },
   "profondeur": { "5": 0, "20": 0, "50": 0, "part_des_decoupages_5": 0.4 }
   ```

   `part_des_visiteurs` = somme des retours / visiteurs ; `part_des_decoupages_5`
   = `reading_depth_5` / `pattern_parsed`. `null` quand le dénominateur vaut 0.
   Mettre à jour le test de forme figée (`umami.test.mjs`) : ajouter les
   clés, ne pas assouplir le test.

## Tests

- `visitBucket` : **toutes** les bornes (0, 1, 2, 7, 8, 30, 31 jours, date
  future, chaîne invalide), en boucle.
- Service : pas de second `returning_visit_*` le même jour ; une date de plus
  de 13 mois est remplacée par celle du jour ; aucun cookie
  (`document.cookie` inchangé) ; seules les deux clés `fil.firstVisit` et
  `fil.lastVisitDay` sont écrites.
- Store : les trois paliers, une seule fois chacun ; reprise au-delà d'un palier.
- e2e (`e2e/analytics.spec.ts`) : avancer de 5 étapes émet `reading_depth_5` ;
  une première visite puis une visite simulée le lendemain (`localStorage`
  prérempli par `addInitScript`) émet `returning_visit_1d`.

## Critères d'acceptation

- `npm run verify` vert, bundle initial sous l'avertissement d'`angular.json`
  (marge ~0,6 kB au 23/09 : `visit-age.ts` doit rester minuscule, ou être
  chargé par `import()` avec le traceur).
- `docs/adr-001-mesure-audience.md` : deux lignes sur ce qui est stocké en local
  et pourquoi ce n'est pas un identifiant (une date, jamais transmise).
- Le skill `rapport-quotidien` lit déjà `retour` et `profondeur` quand elles
  existent : les clés et leur forme doivent être exactement celles du § 5.

## Hors périmètre

Tout identifiant de visiteuse, cookie, empreinte, envoi de la date elle-même ;
le bandeau de consentement ; la mesure multi-appareils ; tout changement du
rapport hebdomadaire.
