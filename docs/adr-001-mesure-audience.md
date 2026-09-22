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

## État actuel : en service

Umami tourne sur le VPS OVH `vps-63ef947c` (celui du serveur de jeu, déjà
payé), en conteneurs : Umami + PostgreSQL 16 derrière Caddy, qui porte le TLS.
Le collecteur répond sur `https://analytics.patternreader.com` ; seuls les
ports 80 et 443 sont exposés, la base n'est joignable que depuis le réseau
Docker. Le script d'installation et la sauvegarde quotidienne vivent dans
`~/umami` sur le VPS.

`ANALYTICS_ORIGIN` et `ANALYTICS_SITE_ID` sont renseignés dans
`analytics.config.ts`, et cette origine figure dans `script-src` et
`connect-src` des deux hébergeurs. Deux contrôles automatiques tiennent
l'ensemble cohérent :

- `tools/check-csp.mjs` échoue si l'origine manque à l'une des deux directives,
  ou si les CSP de `vercel.json` et `netlify.toml` divergent ;
- un test unitaire échoue si l'origine est renseignée sans identifiant de site
  (ou l'inverse), ou si elle porte une barre finale — le service concatène
  `/script.js`.

Vider `ANALYTICS_ORIGIN` reste le moyen de tout éteindre : le service
redevient inerte, aucun script n'est chargé, et les contrôles ci-dessus
s'effacent d'eux-mêmes.

Deux limites assumées : le tracker est servi depuis un sous-domaine du site,
donc une partie des bloqueurs de publicité l'écarte — les chiffres sont un
plancher, pas un compte exact. Et le collecteur partage la machine du serveur
de jeu ; ses conteneurs sont plafonnés (512 Mo pour Umami, 384 Mo pour
PostgreSQL) pour que la mesure ne puisse pas l'étrangler.

## Ce qu'il faudrait pour en changer

Changer de collecteur (autre domaine, autre outil compatible avec l'API
`umami.track`) se fait en trois gestes, sans toucher au reste du code :

1. Déployer le nouveau collecteur et y déclarer le site.
2. Mettre à jour `ANALYTICS_ORIGIN` et `ANALYTICS_SITE_ID` dans
   `analytics.config.ts`.
3. Reporter l'origine dans `script-src` et `connect-src`, à l'identique dans
   `vercel.json` et `netlify.toml`.

Le service, les événements et leurs points d'instrumentation restent en place.
