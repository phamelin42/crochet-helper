# Fil — lecteur de patterns crochet & tricot

> Ce fichier fait autorité pour toute intervention sur ce dépôt. La première
> section décrit **ce projet** ; la seconde rappelle les conventions Angular
> générales. En cas de désaccord, la première gagne.

## Ce que fait le produit

On colle un tutoriel de crochet ou de tricot en texte. L'application le découpe
en étapes, affiche **une seule instruction à la fois en très grand**, compte les
rangs et les répétitions, chronomètre la session et explique les abréviations au
survol. C'est un outil qu'on regarde à un mètre de distance, crochet en main.

## Contraintes non négociables

1. **Aucun back-end.** Tout se passe dans le navigateur : parsing, état,
   persistance (`localStorage`), lecture d'image (`FileReader`). Le build produit
   des fichiers statiques (`outputMode: 'static'`). N'introduis ni serveur, ni
   appel réseau, ni clé d'API sans en discuter — ce serait un changement
   d'architecture, pas une fonctionnalité.
2. **Tout est pré-rendu.** Chaque route existe en HTML complet dans
   `dist/fil-patterns/browser`. Une page dont le contenu n'apparaît qu'après
   exécution du JavaScript est un bug de référencement. Le code qui touche au
   DOM, à `localStorage` ou à `navigator` doit être gardé par
   `isPlatformBrowser` ou `afterNextRender`.
3. **La langue vient de l'URL.** `/` et `/lecteur` en français, `/en` et
   `/en/reader` en anglais. Jamais d'un état stocké : c'est ce qui rend les deux
   versions indexables. Voir `core/i18n/route-paths.ts`.
4. **Le texte de l'utilisateur n'est jamais du HTML.** Il est rendu en segments
   (`@for`), pas via `innerHTML` ni `bypassSecurityTrust*`.
5. **Aucune valeur brute de style.** Couleur, espacement, rayon, ombre, typo :
   uniquement des `var(--…)` définis dans `src/styles/tokens.css`.

## Architecture

```
src/styles/          tokens.css (jetons) · nocturne.css (classes du DS) · lecteur.css (mise en page)
src/app/core/        i18n · seo · storage · theme · platform — services transverses, sans UI
src/app/shared/ui/   composants et directives réutilisables, sans logique métier
src/app/shared/layout, pipes, directives
src/app/features/<nom>/
     data/           modèles et fonctions pures (parseur, glossaire) — testables sans Angular
     state/          magasin de signaux
     components/     composants de la fonctionnalité
     pages/          composants routés, portent le SEO de la page
tools/               scripts de build (génération du sitemap)
prompts/             fiches de tâche autoportantes pour déléguer du travail
```

Règles de dépendance : `features` → `shared` → `core`. Jamais l'inverse, et pas
de dépendance croisée entre deux `features` (sauf `data/`, qui est du domaine
partagé et peut être importé).

## Le design system avant tout composant

Le style vient du projet Claude Design « Lecteur de patterns » (système
_Nocturne_). Les classes (`.btn`, `.input`, `.card`, `.seg`, `.tile`, `.dialog`,
`.hr`…) vivent en CSS global dans `src/styles/nocturne.css`, et les composants de
`shared/ui` ne font que les habiller en Angular.

**Avant d'écrire un composant, cherche s'il existe déjà dans `shared/ui`.** S'il
manque, ajoute-le là plutôt que d'écrire du style local. Un composant de
fonctionnalité qui définit ses propres couleurs ou ses propres boutons est à
refuser en relecture.

Existant : `Button` (directive sur `<button>`/`<a>`), `InputField`, `Icon`,
`Tile`, `Progress`, `Checkbox`, `Segmented`, `Dialog`, `Disclosure`,
`TooltipHost` + `TooltipService`.

## Vérification

`npm run verify` = lint + format + tests + build avec pré-rendu. **Une tâche
n'est pas terminée tant que cette commande n'est pas verte.** Les tests unitaires
tournent sous Vitest (`npm test`).

Commits découpés par intention, message en français, à l'impératif.

---

## Conventions Angular générales

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection
