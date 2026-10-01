# Contenu éditorial unique par produit

Règle non négociable (`CLAUDE.md`). L'acquisition repose entièrement sur le
référencement : dix sites qui partagent leur structure ne posent aucun
problème, dix sites aux textes génériques quasi identiques sont traités comme
du contenu dupliqué à grande échelle.

## Ce qui est rédigé pour chaque produit

| Texte                               | Où                                     |
| ----------------------------------- | -------------------------------------- |
| Meta description de l'accueil       | `produits.json` → `description`        |
| Titre et chapo de l'accueil         | `contenu.json` → `accueil`             |
| Explications (comment ça marche)    | `contenu.json` → `accueil.explication` |
| Exemples concrets                   | `contenu.json` → `accueil.exemples`    |
| Page d'aide, sa description, sa FAQ | `contenu.json` → `aide`                |
| Présentation de l'offre complète    | `contenu.json` → `offre`               |

Le schematic pré-remplit le titre (la requête visée) et le chapo (la
promesse), propres au produit ; tout le reste porte « À RÉDIGER » et une
consigne.

## Ce qui est partagé, et pourquoi c'est sans risque

- Les libellés d'interface courts (« Installer l'application »,
  « Questions fréquentes », « Être prévenu ») : moins de huit mots, ce n'est
  pas du contenu.
- Les mentions légales et la page de confidentialité : identiques par nature,
  elles sont `noindex` et hors sitemap.
- Le pied de page ne contient que des liens, aucune phrase.

## Garde-fous

- **Au build** (`tools/check-contenu.mjs`, dans `npm run build`) : échec si
  deux produits partagent une phrase de huit mots ou plus (casse, accents et
  ponctuation ignorés), ou si plus de 10 % de leurs suites de cinq mots sont
  communes. Les textes « À RÉDIGER » ne sont pas comparés.
- **Au lancement** (`npm run lancement -- <slug>`) : plus aucun « À RÉDIGER »,
  au moins 300 mots sur l'accueil, au moins quatre questions fréquentes.
- **En relecture** : un texte visible est toujours relu par Phil (`AGENTS.md`).

## Écrire

- Pour le public du produit (`PRODUIT.md`), avec ses mots à lui et ceux de la
  requête visée.
- Des exemples chiffrés, tirés du métier, plutôt que des généralités.
- Un point juridique ou fiscal se vérifie à la source officielle
  (service-public.fr, legifrance.gouv.fr), citée dans la PR.
- Jamais de texte d'un autre produit comme point de départ, même pour le
  reformuler.
