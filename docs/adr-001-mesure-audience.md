# ADR 001 — Mesurer l'usage réel

## Problème

Personne ne sait combien de personnes utilisent Fil, ni si elles reviennent.
Les décisions produit à venir (quelles pages créer, quelle langue mettre en
avant, faut-il un import PDF) sont prises à l'aveugle.

## Écart à la règle « aucun back-end »

`docs/architecture.md` pose qu'aucune requête réseau ne quitte le navigateur.
Mesurer l'usage l'exige forcément. L'écart est borné par trois garde-fous,
vérifiés par du code, pas seulement documentés :

1. Aucun contenu de patron, aucun texte saisi, aucun nom de fichier ne sort du
   navigateur — seulement des noms d'événements et des compteurs numériques
   (`AnalyticsService.track`, `src/app/core/analytics/analytics.service.ts`).
2. Aucun cookie, aucun identifiant persistant, donc aucun bandeau de
   consentement.
3. Le point de collecte est une seule origine, définie par une constante
   (`ANALYTICS_ORIGIN` dans `analytics.config.ts`), remplaçable sans toucher
   au reste du code.

## Option retenue

Umami auto-hébergé, sur le VPS OVH déjà payé — pas de nouveau coût, pas de
revente de données à un tiers, l'outil sait rester dans les trois garde-fous
ci-dessus sans configuration supplémentaire.

## État actuel : constante vide

Le nom de domaine du collecteur n'est pas encore choisi (voir la fiche `11 —
Marque et domaine`, bloquée). `ANALYTICS_ORIGIN` et `ANALYTICS_SITE_ID`
valent donc `''` : `AnalyticsService` devient un no-op silencieux — aucun
script n'est chargé, aucune requête n'est émise, `track()` ne fait rien. Le
service, les événements et leurs points d'instrumentation sont écrits et
testés dès maintenant, pour n'avoir qu'à renseigner l'origine plus tard.

Cette même raison empêche d'ajouter l'origine à `script-src` et
`connect-src` dans `vercel.json` et `netlify.toml` : une chaîne vide n'est
pas une source CSP valide. `tools/check-csp.mjs` garantit en attendant que
les deux fichiers restent identiques entre eux.

## Ce qu'il faudrait pour en changer

1. Choisir le domaine du collecteur (fiche 11) et y déployer Umami.
2. Renseigner `ANALYTICS_ORIGIN` et `ANALYTICS_SITE_ID` dans
   `analytics.config.ts`.
3. Ajouter cette origine à `script-src` et `connect-src` dans `vercel.json`
   et `netlify.toml`, à l'identique dans les deux fichiers.

Aucun autre changement de code n'est nécessaire : le service et les
événements sont déjà en place.
