# Fil — lecteur de patterns crochet & tricot

Collez un tutoriel de crochet ou de tricot : **Fil le découpe en étapes et en
affiche une seule à la fois, en très grand**, compte vos rangs et vos
répétitions, chronomètre la session et traduit les abréviations au survol.

Pas de compte, pas de serveur, pas de réseau : le patron reste sur l'appareil.

|             |                                                                             |
| ----------- | --------------------------------------------------------------------------- |
| Framework   | Angular 22 — standalone, signaux, zoneless                                  |
| Rendu       | pré-rendu statique (SSG) de toutes les routes, en français et en anglais    |
| Hébergement | n'importe quel hébergeur de fichiers statiques (Netlify, Vercel, Pages)     |
| Tests       | Vitest                                                                      |
| Design      | système _Nocturne_, importé du projet Claude Design « Lecteur de patterns » |

## Démarrer

```bash
npm ci
npm start          # http://localhost:4200
```

Node 22.22.3+ ou 24.15+ est requis (contrainte de l'Angular CLI 22).

## Commandes

| Commande          | Effet                                                   |
| ----------------- | ------------------------------------------------------- |
| `npm start`       | serveur de développement                                |
| `npm test`        | tests unitaires (Vitest, en veille)                     |
| `npm run test:ci` | tests unitaires, une passe                              |
| `npm run lint`    | ESLint + règles Angular et accessibilité des gabarits   |
| `npm run format`  | Prettier                                                |
| `npm run build`   | build de production, pré-rendu et génération du sitemap |
| `npm run verify`  | **tout ce qui précède** — la porte d'entrée de toute PR |

Le build écrit dans `dist/fil-patterns/browser`, prêt à servir tel quel.

## Pourquoi il n'y a pas de back-end

Chaque fonctionnalité tient dans le navigateur :

| Fonctionnalité                         | Mécanisme                                         |
| -------------------------------------- | ------------------------------------------------- |
| Découpage du patron                    | fonction pure `parsePattern`, exécutée localement |
| Patron, progression, compteurs, chrono | `localStorage`                                    |
| Import d'un diagramme                  | `FileReader` → `data:` URL, jamais envoyée        |
| Glossaire                              | table statique livrée avec l'application          |
| Deux langues indexables                | deux arbres de routes pré-rendus                  |

Un serveur ne deviendrait nécessaire que pour de la reconnaissance automatique
de diagrammes (appel à une API de vision, donc une clé à protéger), ou pour des
comptes utilisateurs synchronisés entre appareils. Aucun des deux n'est au
programme.

## Référencement

- Pré-rendu de toutes les routes : le contenu est dans le HTML servi.
- URL traduites : `/lecteur` ↔ `/en/reader`, `/glossaire` ↔ `/en/glossary`.
- `canonical`, `hreflang` (dont `x-default`), Open Graph, JSON-LD par page.
- `sitemap.xml` généré à partir des pages réellement pré-rendues, `robots.txt`.
- La page **glossaire** est la principale porte d'entrée organique : son contenu
  est intégralement pré-rendu et balisé en `DefinedTermSet`.

## Déploiement

`netlify.toml` et `vercel.json` sont fournis (commande, dossier publié, en-têtes
de sécurité, cache des actifs versionnés). Pour un autre domaine, surcharger
`SITE_ORIGIN` (jeton d'injection dans `core/seo/site.ts`) et la variable
d'environnement du même nom au build, qui alimente le sitemap.

## Contribuer

`CLAUDE.md` décrit l'architecture et les règles du dépôt. `prompts/` contient
des fiches de tâche autoportantes, prêtes à être confiées à un agent.

## Licence

MIT — voir `LICENSE`.
