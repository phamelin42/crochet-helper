# Décisions d'architecture

Ce document explique **pourquoi** le projet est bâti ainsi. Le _comment_ est
dans `CLAUDE.md`.

## 1. Pas de back-end — et ce qu'il faudrait pour en vouloir un

Chaque fonctionnalité du produit tient dans le navigateur :

| Besoin                             | Réponse locale                           |
| ---------------------------------- | ---------------------------------------- |
| Découper un tutoriel               | `parsePattern`, fonction pure            |
| Garder le patron et la progression | `localStorage`                           |
| Afficher un diagramme              | `FileReader` → `data:` URL               |
| Traduire les abréviations          | table statique livrée avec l'application |
| Deux langues indexables            | deux arbres de routes pré-rendus         |
| Garder l'écran allumé              | `navigator.wakeLock`                     |

Un serveur ne deviendrait nécessaire que pour l'un de ces trois besoins :
reconnaissance automatique de diagrammes (clé d'API à protéger), comptes
synchronisés entre appareils, ou bibliothèque de patrons partagée. Aucun n'est
au programme. **L'absence de serveur n'est donc pas une contrainte subie, c'est
la conséquence du périmètre** — et elle donne gratuitement le coût
d'hébergement nul, le fonctionnement hors ligne et la confidentialité totale.

Conséquence assumée : rien n'est synchronisé entre appareils, et vider les
données du navigateur efface le patron. Le permalien de la fiche `prompts/06`
répond au premier point sans serveur.

## 2. Pré-rendu statique plutôt que rendu serveur

`outputMode: 'static'` : le build exécute l'application une fois par route et
écrit le HTML. Il n'y a pas de processus Node en production.

Le rendu serveur (`outputMode: 'server'`) n'apporterait rien : aucune page ne
dépend d'une donnée par requête. Il coûterait un serveur à faire tourner, donc
exactement ce que la décision 1 évite.

Ce que le pré-rendu impose en retour : tout code qui touche au DOM, à
`localStorage` ou à `navigator` doit être gardé — sinon le build échoue. C'est
une contrainte utile : elle force à séparer l'état du rendu.

## 3. La langue est une route, pas un réglage

Le design d'origine bascule FR/EN avec un bouton et retient le choix. C'est
juste pour l'utilisateur, et invisible pour un moteur de recherche : une seule
URL, un seul contenu indexé.

Ici, `/lecteur` et `/en/reader` sont deux pages distinctes, pré-rendues, avec
leur `canonical` et leurs `hreflang`. Les segments sont traduits
(`route-paths.ts`) parce qu'une URL dans la langue de la page se partage mieux
et pèse au classement. Le bouton de langue reste, mais c'est un lien.

Le coût : `I18nService` doit être alimenté par la route sur chaque page. Le
gain : deux fois plus de surface indexable, dans deux marchés distincts.

## 4. Le design system reste du CSS global

Les classes de _Nocturne_ (`.btn`, `.card`, `.input`, `.seg`, `.tile`…) vivent
en CSS global ; les composants de `shared/ui` ne font que les habiller.

L'alternative — réécrire chaque règle en style de composant — aurait dupliqué le
design system et fait diverger le produit de sa source. Le CSS global s'applique
aux gabarits des composants sans difficulté, et **une retouche du design se
reporte en modifiant un seul fichier**.

Règle qui en découle : un composant de fonctionnalité qui définit ses propres
couleurs ou son propre bouton est un défaut de conception, pas un raccourci.

## 5. `source` est la seule source de vérité

`ReaderStore` ne persiste que le **texte** du patron, jamais sa version
découpée. Le patron est reparsé au chargement.

Conséquence directe : améliorer le parseur (fiche `prompts/03`) améliore
rétroactivement tous les patrons déjà enregistrés, sans migration. Le coût — un
parsing au démarrage — est de l'ordre de la milliseconde.

## 6. Le texte de l'utilisateur ne devient jamais du HTML

Le design d'origine construit les définitions du glossaire par `innerHTML` sur
du texte collé. Ici, `annotate()` renvoie des **segments**, rendus par un `@for`.

C'est plus de code pour le même écran, et c'est la seule forme qui rend
structurellement impossible l'injection par un patron copié depuis un site
quelconque — plutôt que de dépendre d'un échappement correct à chaque appel.

## 7. Les compteurs sont indexés par position

`done` et `reps` sont des dictionnaires dont la clé est `"pièce:étape"`. On peut
donc revenir en arrière et retrouver ses compteurs, et un changement de patron
n'invalide pas silencieusement des valeurs devenues absurdes : elles cessent
simplement d'être atteintes.

## 8. Ce qui n'est pas encore décidé

- **Plusieurs patrons enregistrés.** Il faudra une liste, donc un écran de
  gestion, donc une navigation. À trancher avant d'y toucher.
- **Persistance du diagramme.** `localStorage` ne convient pas au-delà de 1,5 Mo
  (voir `prompts/01`).
- **Reconnaissance de diagrammes.** Le seul chantier qui remettrait la
  décision 1 en cause. À traiter comme un changement d'architecture.
