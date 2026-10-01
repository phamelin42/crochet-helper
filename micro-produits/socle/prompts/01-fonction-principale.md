# Fiche 01 — La fonction principale

**Étape servie : activation.** Sans elle, la visite venue de « @@REQUETE@@ »
repart sans rien.

## Ce qu'il faut livrer

Remplacer l'emplacement `features/outil/components/outil-demarrage.ts` par la
fonction principale : @@FONCTION@@.

Exports attendus : @@EXPORTS@@.

## Exigences

- Tout dans le navigateur : saisie, calcul, génération du document. Les
  fonctions de calcul et de mise en forme vivent dans `features/outil/data/`,
  pures et testées sans Angular.
- Le travail en cours est enregistré au fil de la saisie (`KvStoreService`) et
  retrouvé à la visite suivante (`donnees_reprises`).
- Événements : `outil_commence` à la première saisie, `outil_termine` quand le
  résultat est complet, `export_fait` avec `format` à chaque export. Aucune
  saisie dans les propriétés.
- Formulaire en Signal Forms, étiquettes visibles, erreurs annoncées,
  utilisable au doigt (cibles de 48 px) et à 320 px de large.
- PDF : impression du navigateur sur une mise en page dédiée (`print.css`)
  avant toute bibliothèque ; une bibliothèque se charge par `import()` et se
  justifie dans la PR. iCal : texte généré à la main (RFC 5545), testé.
- La page d'accueil reste pré-rendue avec son `<h1>` et un texte d'au moins
  300 mots utile à la requête (comment ça marche, questions fréquentes) : c'est
  lui qui se référence.

## Fichiers à lire

`CLAUDE.md`, `produit.json`, `src/app/features/outil/**`,
`src/app/core/storage/kv-store.service.ts`,
`src/app/core/analytics/evenements.ts`, `src/styles/base.css`.

## Vérification

- Tests unitaires des fonctions de `data/`, chaque format d'export et chaque
  variante énumérée ci-dessus parcourus en boucle.
- Un test e2e : saisir, recharger, retrouver la saisie ; exporter.
- `npm run verify:ci` vert.
