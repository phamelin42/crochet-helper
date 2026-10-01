# Micro-produits — dix PWA en dix semaines

Un micro-produit web par semaine, chacun visant 200 à 500 € par mois. C'est
l'addition qui fait le revenu, pas le succès d'un seul. L'acquisition est
quasi gratuite : chaque produit répond à une requête que les gens tapent
déjà, et le référencement naturel est le canal principal.

Ce dossier ne fait pas partie de Fil (Pattern Reader) : il n'entre ni dans
son build ni dans son bundle. Il contient :

| Chemin                            | Rôle                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `produits.json`                   | les dix produits : requête visée, public, promesse, fonction, exports, couleurs |
| `socle/`                          | le dépôt modèle, avec la même stack et les mêmes garde-fous que Pattern Reader  |
| `outils/nouveau-produit.mjs`      | crée le dépôt d'un produit à partir du socle et de sa ligne de la table         |
| `outils/nouveau-produit.test.mjs` | génère les dix produits et vérifie chacun (lancé par `npm run test:tools`)      |

## Décisions prises le 1er octobre 2026

1. **Un socle, pas dix dépôts d'un coup.** Chaque semaine, on génère le
   dépôt du produit de la semaine. Une règle qui vaut pour tous se corrige
   dans `socle/`, puis se reporte à la main dans les dépôts déjà créés.
2. **Umami plutôt que Google Analytics 4.** L'instance de Pattern Reader
   compte un site par produit. Elle n'utilise aucun cookie, donc aucun bandeau
   de consentement et aucune visite perdue sur un refus. La Search Console
   complète pour les requêtes et les positions. Détails :
   `socle/docs/adr-001-mesure-audience.md`.
3. **Gratuit d'abord.** Chaque produit sort entièrement gratuit et statique.
   L'intérêt pour une offre complète se mesure (`offre_vue`,
   `offre_cliquee`, avec un lien « être prévenu » par courriel). Le paiement
   ne se construit que pour un produit qui montre du trafic réel, après un
   ADR : une limite de type « 3 devis par mois » tenue dans le navigateur se
   contourne en vidant le stockage, et encaisser exige un serveur.
4. **Empaquetage natif en option.** Seulement pour un produit qui a du trafic.
   Le chemin éprouvé est celui de Pattern Reader (TWA pour le Play Store,
   `docs/play-store.md`) ; Capacitor seulement si une API native manque.

## Ce que chaque dépôt contient dès sa création

- `CLAUDE.md` : produit, contraintes, architecture, stack et commandes,
  conventions, pièges hérités de Pattern Reader.
- `AGENTS.md` : rôle de l'agent, ce qu'il fait sans validation (dépendances,
  correctifs, sitemap), ce qui attend Phil (produit, prix, contenu, mesure),
  ce qu'il ne touche pas, et le **format du rapport mensuel**.
- `CONTRIBUTING.md` : branches, commits en français à l'impératif, checklist
  de PR.
- `docs/tunnel.md` : les étapes du tunnel, les événements qui les mesurent,
  un seuil sain et un seuil d'alerte par cran (source unique :
  `tools/tunnel.mjs`).
- `docs/lancement.md` : domaine, Umami, Search Console, secrets, protection
  de branche. `npm run lancement` vérifie ce qui peut l'être.
- `prompts/01-fonction-principale.md` : première fiche, la fonction qui fait
  venir les visiteurs.
- PWA pré-rendue : manifeste, service worker, invite d'installation dans
  l'en-tête, stockage IndexedDB sûr, mentions légales et page de
  confidentialité, sitemap et `robots.txt` générés au build.
- CI : lint, format, tests, build, puis audit Playwright (axe WCAG AA, reflow
  à 320 px, contenu sans JavaScript, aucun appel au collecteur depuis les
  tests). Hook `pre-push` sur `verify:ci`.
- Entretien automatique : Dependabot, avec fusion automatique des versions
  mineures une fois la CI verte.
- Rapport mensuel : workflow le 4 du mois. Il lit Umami et la Search Console,
  l'agent rédige le rapport sans réseau, et un job séparé le publie sur la
  branche `rapports` puis ouvre une issue.

## Créer le produit de la semaine

Depuis la racine de ce dépôt (Node 24 ; Prettier vient de ses
`node_modules`) :

```sh
node micro-produits/outils/nouveau-produit.mjs devis-artisan ../devis-artisan
cd ../devis-artisan
git init -b main && npm install && npm run icones
npm run verify:ci
git add -A && git commit -m "Crée le socle de Devis Artisan"
```

Ensuite : créer le dépôt GitHub et pousser, suivre `docs/lancement.md`, puis
confier la fiche `prompts/01-fonction-principale.md`.

## Calendrier

| Semaine | Produit                      | Requête visée                               |
| ------- | ---------------------------- | ------------------------------------------- |
| 1       | Devis Artisan                | modèle devis plombier auto-entrepreneur     |
| 2       | Planning Garde Alternée      | calendrier garde alternée à imprimer        |
| 3       | Inventaire Collection        | application inventaire collection           |
| 4       | Prix Fait Main               | calculer prix de vente création fait main   |
| 5       | Contrat Location Saisonnière | modèle contrat location saisonnière gratuit |
| 6       | Road Trip Van                | itinéraire van aménagé France               |
| 7       | Recette à l'Échelle          | convertir recette 6 personnes en 10         |
| 8       | Carnet d'Entretien           | carnet entretien voiture en ligne           |
| 9       | Planning Révisions           | planning révision bac à imprimer            |
| 10      | Volume Aquarium              | calcul volume aquarium litres               |

Les domaines de `produits.json` sont provisoires : à vérifier et à acheter
avant le lancement de chaque produit.
