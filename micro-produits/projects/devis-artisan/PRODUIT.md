# Devis Artisan

Semaine 1 du programme. Contexte commun : `CLAUDE.md` à la racine du
workspace. Ce fichier ne contient que ce qui est propre à ce produit.

- **Requête visée** : « modèle devis plombier auto-entrepreneur »
- **Domaine** : `devis-artisan.fr` (provisoire tant qu'il n'est pas acheté)
- **Public** : artisans et auto-entrepreneurs du bâtiment (plombiers, électriciens, peintres), souvent sur téléphone entre deux chantiers
- **Promesse** : Un devis conforme, avec votre logo et les mentions obligatoires, prêt en PDF en cinq minutes.
- **Module métier** : formulaire de devis (client, lignes, TVA ou franchise en base, conditions), logo chargé localement, mentions obligatoires selon le statut, aperçu fidèle
- **Exports** : PDF, impression
- **Offre envisagée** (pas construite) : devis illimités, numérotation suivie et relances (après validation d'un back-end, ADR à écrire)

## Ce qui est propre à ce produit

| Chemin            | Rôle                                                         |
| ----------------- | ------------------------------------------------------------ |
| `produit.json`    | configuration : nom, domaine, thème, logo, offre, mesure     |
| `contenu.json`    | contenu éditorial, rédigé pour ce produit seul               |
| `src/app/metier/` | le module métier                                             |
| `public/logo.svg` | logo, d'où `npm run icones -- devis-artisan` tire les icônes |

Le reste (coquille, pages légales, mesure, SEO, stockage, PWA) vient de
`@mp/core` et `@mp/ui` : on ne le duplique pas ici.

## Fiches

- `prompts/devis-artisan/01-module-metier.md`
- `prompts/devis-artisan/02-contenu-editorial.md`
