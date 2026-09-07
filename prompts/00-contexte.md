# Contexte projet — à lire avant toute fiche

Tu interviens sur **Fil**, une application web qui aide à suivre un patron de
crochet ou de tricot. On y colle le texte d'un tutoriel ; l'application le
découpe en étapes et en affiche **une seule à la fois, en très grand**, avec un
compteur de rangs, un compteur de répétitions, un chronomètre et un glossaire
des abréviations. On la regarde à un mètre, les mains prises.

## Pile

Angular 22 (standalone, **signaux**, **zoneless**), TypeScript strict, CSS
natif, Vitest, ESLint + Prettier. Pré-rendu statique de toutes les routes.

## Les cinq règles du dépôt

1. **Aucun back-end.** Tout tourne dans le navigateur. N'ajoute ni serveur, ni
   appel réseau, ni clé d'API. Si une tâche semble en exiger un, arrête-toi et
   dis-le au lieu d'improviser.
2. **Tout est pré-rendu.** Le contenu doit exister dans le HTML avant exécution
   du JavaScript. Tout accès à `document`, `window`, `localStorage`,
   `navigator` ou `FileReader` doit être gardé par `isPlatformBrowser(...)` ou
   placé dans `afterNextRender(...)`. Un accès non gardé fait échouer le build.
3. **La langue vient de l'URL** (`/lecteur` en français, `/en/reader` en
   anglais), portée par `data.locale` de la route. Jamais d'un état stocké.
4. **Le texte saisi par l'utilisateur n'est jamais interprété comme du HTML** :
   ni `innerHTML`, ni `bypassSecurityTrust*`. On le rend en segments avec `@for`.
5. **Aucune valeur de style en dur.** Couleurs, espacements, rayons, ombres,
   typographie : uniquement des `var(--…)` de `src/styles/tokens.css`.

## Conventions de code

- Composants sans `changeDetection` explicite (OnPush est le défaut en v22) et
  sans `standalone: true` (défaut aussi).
- `@Service()` pour les services singleton, `inject()` pour les dépendances.
- `input()`, `output()`, `model()`, `computed()` — pas de décorateurs
  `@Input`/`@Output`/`@HostListener` ; les liaisons d'hôte vont dans `host: {}`.
- Flux natifs `@if` / `@for` / `@switch`.
- **Avant d'écrire un composant d'interface, vérifie s'il existe déjà dans
  `src/app/shared/ui/`** : `Button` (directive `filButton` sur `<button>` ou
  `<a>`), `InputField` (`filInput`), `Icon`, `Tile`, `Progress`, `Checkbox`,
  `Segmented`, `Dialog`, `Disclosure`, `TooltipHost`. S'il manque, ajoute-le
  **là**, jamais dans une fonctionnalité.
- Dépendances autorisées : `features` → `shared` → `core`. Pas l'inverse.
- Commentaires et libellés en français ; les identifiants en anglais.
  Un commentaire explique **pourquoi**, jamais **quoi**.

## Carte du dépôt

```
src/styles/tokens.css        jetons (couleur, typo, espacement, ombres)
src/styles/nocturne.css      classes du design system
src/styles/lecteur.css       mise en page de l'application
src/app/core/i18n/           langue, dictionnaires, chemins traduits
src/app/core/seo/            SeoService (titre, canonique, hreflang, JSON-LD)
src/app/core/storage/        LocalStorageService (sûr côté serveur)
src/app/core/theme/          mode assombri
src/app/core/platform/       WakeLockService
src/app/shared/ui/           composants réutilisables
src/app/features/reader/     data/ (parseur, glossaire) · state/ · components/ · pages/
src/app/features/home/       accueil
src/app/features/glossary/   page glossaire
tools/generate-sitemap.mjs   sitemap déduit des pages pré-rendues
```

## Vérification — obligatoire

```bash
npm run verify   # lint + format + tests + build avec pré-rendu
```

**Une tâche n'est terminée que si cette commande est verte.** Si elle échoue,
corrige et relance ; ne rends pas la main sur un échec, et ne désactive jamais
une règle de lint pour la faire passer — corrige la cause.

## Livraison

Des commits découpés par intention, message en français à l'impératif
(« Ajouter… », « Corriger… »). Pas de reformatage massif de fichiers que la
tâche ne touche pas.
