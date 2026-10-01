# Micro-produits — dix PWA en dix semaines

Un micro-produit web par semaine, chacun visant 200 à 500 € par mois. C'est
l'addition qui fait le revenu. L'acquisition est quasi gratuite : chaque
produit répond à une requête que les gens tapent déjà.

Workspace Angular unique : deux bibliothèques partagées (`@mp/core`,
`@mp/ui`), une application par produit, un schematic qui crée un produit en
une commande. Seuls le module métier et le contenu éditorial sont propres à
chaque produit (`docs/adr-002-architecture.md`).

Ce dossier vit pour l'instant dans le dépôt de Pattern Reader, sans rien
partager avec Fil : il a ses propres dépendances, son build et son workflow
(`.github/workflows/micro-produits.yml` à la racine du dépôt).

- Règles et architecture : [`CLAUDE.md`](CLAUDE.md)
- Rôle de l'agent et rapport mensuel : [`AGENTS.md`](AGENTS.md)
- Contribuer : [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Contenu unique par produit : [`docs/contenu-unique.md`](docs/contenu-unique.md)
- Tunnel de conversion : [`docs/tunnel.md`](docs/tunnel.md)
- Mise en ligne : [`docs/lancement.md`](docs/lancement.md)

## Créer le produit de la semaine

```sh
cd micro-produits
npm install
npm run nouveau-produit -- garde-alternee
npm run icones -- garde-alternee
npm run verify:ci
```

Puis les deux fiches créées dans `prompts/<slug>/` : le module métier, et le
contenu éditorial.

## Décisions

- **Umami plutôt que Google Analytics 4** : sans cookie, donc sans bandeau ni
  visites perdues sur un refus (`docs/adr-001-mesure-audience.md`). La Search
  Console complète.
- **Gratuit d'abord** : l'intérêt pour une offre complète se mesure ; le
  paiement ne se construit, après ADR, que pour un produit qui a du trafic.
- **Empaquetage natif en option**, seulement sur trafic réel : TWA comme
  Pattern Reader (`docs/play-store.md` du dépôt), Capacitor si une API native
  manque.

## Calendrier

| Semaine | Produit                      | Requête visée                               | État |
| ------- | ---------------------------- | ------------------------------------------- | ---- |
| 1       | Devis Artisan                | modèle devis plombier auto-entrepreneur     | créé |
| 2       | Planning Garde Alternée      | calendrier garde alternée à imprimer        |      |
| 3       | Inventaire Collection        | application inventaire collection           |      |
| 4       | Prix Fait Main               | calculer prix de vente création fait main   |      |
| 5       | Contrat Location Saisonnière | modèle contrat location saisonnière gratuit |      |
| 6       | Road Trip Van                | itinéraire van aménagé France               |      |
| 7       | Recette à l'Échelle          | convertir recette 6 personnes en 10         |      |
| 8       | Carnet d'Entretien           | carnet entretien voiture en ligne           |      |
| 9       | Planning Révisions           | planning révision bac à imprimer            |      |
| 10      | Volume Aquarium              | calcul volume aquarium litres               |      |

Les domaines de `produits.json` sont provisoires : à vérifier et à acheter
avant chaque lancement.
