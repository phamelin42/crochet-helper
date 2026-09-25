# Fil — lecteur de patterns crochet & tricot

> Ce fichier fait autorité pour toute intervention sur ce dépôt. La première
> section décrit **ce projet** ; la seconde rappelle les conventions Angular
> générales. En cas de désaccord, la première gagne.

## Ce que fait le produit

On colle un tutoriel de crochet ou de tricot en texte. L'application le découpe
en étapes, affiche **une seule instruction à la fois en très grand**, compte les
rangs et les répétitions, chronomètre la session et explique les abréviations au
survol. C'est un outil qu'on regarde à un mètre de distance, crochet en main.

## Objectif et entonnoir

Public : des personnes de 50 à 70 ans, souvent sur tablette, qui suivent un
patron chez elles. L'objectif n'est pas la visite mais **l'habitude** : revenir
au prochain ouvrage. Chaque fiche nomme, sous son titre, l'étape qu'elle sert —
acquisition, activation, rétention ou revenu — et une fiche qui n'en sert
aucune n'a pas sa place dans la table d'ordre.

## Contraintes non négociables

1. **Aucun back-end.** Tout se passe dans le navigateur : parsing, état,
   persistance (IndexedDB pour les projets, `localStorage` pour le seul
   pointeur du projet actif), lecture d'image (`FileReader`). Le build produit
   des fichiers statiques (`outputMode: 'static'`). N'introduis ni serveur, ni
   appel réseau, ni clé d'API sans en discuter — ce serait un changement
   d'architecture, pas une fonctionnalité. Seule exception, discutée et bornée :
   la mesure d'audience (`docs/adr-001-mesure-audience.md`).
2. **Tout est pré-rendu.** Chaque route existe en HTML complet dans
   `dist/fil-patterns/browser`. Une page dont le contenu n'apparaît qu'après
   exécution du JavaScript est un bug de référencement. Le code qui touche au
   DOM, à `localStorage`, à IndexedDB ou à `navigator` doit être gardé par
   `isPlatformBrowser` ou `afterNextRender`.
3. **La langue vient de l'URL.** Anglais à la racine (`/`, `/glossary`),
   français sous `/fr` (`/fr`, `/fr/glossaire`). Jamais d'un état stocké : c'est
   ce qui rend les deux versions indexables. Voir `core/i18n/route-paths.json`.
4. **Le texte de l'utilisateur n'est jamais du HTML.** Il est rendu en segments
   (`@for`), pas via `innerHTML` ni `bypassSecurityTrust*`.
5. **Aucune valeur brute de style.** Couleur, espacement, rayon, ombre, typo :
   uniquement des `var(--…)` définis dans `src/styles/tokens.css`. Ni
   `styles:` de composant ni attribut `style="…"` : les classes vont dans
   `src/styles/lecteur.css` (mise en page) ou `hanami.css` (design system).
   Contrôlé par `tools/check-styles.mjs` au build.

## Architecture

```
src/styles/          tokens.css (jetons) · hanami.css (classes du DS) · lecteur.css (mise en page)
src/app/core/        i18n · seo · storage · platform · analytics — services transverses, sans UI
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

**Toute API navigateur passe par `core/platform` ou `core/storage`**
(`window`, `document`, `navigator`, `location`, `history`, presse-papiers,
stockage) : c'est ce qui rend le build empaquetable en application native et
testable sans navigateur. Code existant à migrer, sans urgence :
`pattern-import.ts`, `reader-page.ts`, `format-page.ts`, `projects-page.ts`.

## Le design system avant tout composant

Le style suit le système _Hanami_ 花見 : fond washi clair, encre violacée,
accents tirés des couleurs traditionnelles japonaises (sakura, kikyō, yamabuki,
wakaba, asagi, momiji). Maîtres mots : clarté, légèreté, joie, couleur. Les
classes (`.btn`, `.input`, `.card`, `.seg`, `.tile`, `.tag`, `.dialog`, `.hr`…)
vivent en CSS global dans `src/styles/hanami.css`, et les composants de
`shared/ui` ne font que les habiller en Angular.

Chaque accent a trois tons : `--color-<nom>` (vif, décor et remplissage, jamais
seul sous du texte), `-pale` (fond) et `-ink` (texte, ≥ 4,5:1). Le rose
`--color-primary` est réservé à l'action principale. Clair par défaut ; le
sombre est un choix explicite (`data-dim`), jamais `prefers-color-scheme`.

L'univers du fil se dit partout, sans peser sur le bundle : illustrations en
SVG statiques dans `public/illustrations/` (pelotes, crochet, aiguilles,
fleurs), fond de mailles de jersey (`--pattern-knit`), surpiqûre en pointillés
des surfaces, filets en point avant, barre de progression en fil retors.
L'image de partage (`public/og/`) et les icônes se régénèrent par
`node tools/generate-images.mjs` (hors build).

**Avant d'écrire un composant, cherche s'il existe déjà dans `shared/ui`.** S'il
manque, ajoute-le là plutôt que d'écrire du style local. Un composant de
fonctionnalité qui définit ses propres couleurs ou ses propres boutons est à
refuser en relecture.

Existant : `Button` (directive sur `<button>`/`<a>`), `InputField`, `Icon`,
`Tile`, `Checkbox`, `Segmented`, `Dialog`, `Disclosure`, `TooltipHost` +
`TooltipService`.

Vitrine à jour de chaque jeton et chaque composant sur `/design-system` (page
d'équipe, non indexée).

## Pièges déjà rencontrés en relecture

Chacun a été livré une fois puis corrigé. Vérifie-les avant de rendre une fiche.

- **Un test ne fige jamais un comportement douteux.** Deux fiches ont livré un
  test qui validait le bug (`dtr` laissé tel quel par le convertisseur,
  patron écrasé au rechargement). Un test décrit ce que la lectrice doit
  obtenir, pas ce que le code fait.
- **Données de la lectrice : aucune perte, même en cas d'échec.** Une écriture
  IndexedDB n'est réussie qu'au `complete` de la transaction (un quota dépassé
  déclenche `abort`). On n'efface jamais une ancienne copie sur la foi d'une
  écriture non confirmée. Plusieurs écritures liées = une seule transaction.
- **Toute entrée venant d'un tiers est bornée en taille avant traitement**
  (permalien, sauvegarde importée, PDF) : un lien de 6 Ko peut se décompresser
  en 5 Mo. Invalide ou trop grand → `null` / refus propre, jamais d'exception.
- **Charger un autre patron ouvre un autre projet**, jamais n'écrase le projet
  actif. Toute action destructive passe par une confirmation (`Dialog`).
- **Asynchrone et effets** : vider l'état _avant_ d'attendre une suppression,
  sinon un effet (chronomètre) réécrit ce qu'on vient d'effacer.
- **Une nouvelle page est reliée** (en-tête ou maillage interne) : une page
  orpheline n'est ni trouvée ni bien indexée. Une page `noIndex` ne va pas au
  sitemap (`tools/generate-sitemap.mjs` les exclut).
- **Français soigné** : article devant un nom de maille (« désigne _la_ maille
  serrée »), espaces insécables avant `: ; ? !` et dans « ».
- **Bundle initial : le budget fait foi dans `angular.json`** (`budgets`,
  type `initial` : avertissement puis erreur), pas un chiffre recopié ici.
  Angular (core, router, service worker) en occupe l'essentiel : la marge se
  compte en kilo-octets, à ne pas gaspiller. Code non nécessaire au
  premier affichage → `import()` ; textes propres à une page paresseuse → dans
  la page, pas dans `translations.ts` (qui est dans le bundle initial) ; CSS
  d'impression → `print.css`, chargée à part. `ng build --stats-json` dit ce qui pèse.
- **`NgOptimizedImage` coûte 5,5 ko au bundle initial** (mesuré) : pour un
  SVG, qui n'a ni `srcset` ni redimensionnement, une balise `<img>` native
  avec `width`, `height` et `fetchpriority` suffit. Cette règle l'emporte sur
  la convention Angular générale plus bas.
- **`@defer` coûte 5,6 ko au bundle initial** (mesuré, même placé dans une
  page paresseuse) : son moteur vit dans `@angular/core`, déjà dans le bundle
  initial. Pour sortir du code du premier affichage, `import()` suffit.
- **Service worker : ni `provideServiceWorker` ni `SwUpdate`** (~6 ko au
  bundle initial). `core/platform/update.service.ts` enregistre
  `ngsw-worker.js` et écoute `VERSION_READY` en natif.
- **La page suivante se précharge seule** (`core/platform/route-prefetch.ts`) :
  toute route de `app.routes.ts` est couverte (survol, focus, toucher, lien
  visible), rien à brancher pour une nouvelle page.
- **Cache HTTP `immutable` : seulement les fichiers à empreinte** (`vercel.json`,
  `netlify.toml`). `print.css`, `ngsw-worker.js` et `pdf.worker.min.mjs`
  gardent leur nom d'un build à l'autre et doivent être revalidés.
- **Un survol peut venir de la page, pas de la personne** : quand l'étape
  change sous un curseur immobile, le navigateur émet `pointerenter`.
  `TooltipService.isStationaryHover` l'écarte ; tout nouvel élément à
  infobulle doit passer par lui, sinon l'infobulle s'ouvre seule et la mesure
  compte un faux survol.
- **Une fiche qui énumère des formes ou des valeurs** (« deux à douze, FR et
  EN », « chaque forme du tableau ») : le test les parcourt **toutes** (boucle),
  pas un échantillon.
- **Un composant ajouté à `shared/ui/` entre dans la vitrine**
  (`/design-system`) : `tools/check-showcase.mjs` fait échouer le build sinon.
- **Une nouvelle famille de page entre d'elle-même dans l'audit** dès qu'elle
  est déclarée dans `route-paths.json` (`e2e/a11y.spec.ts` en dérive ses
  routes). Une route déclarée ailleurs échappe à l'audit : l'ajouter à la main.
- **Un garde-fou non branché ne garde rien.** Tout test ou contrôle créé pour
  empêcher une régression (axe, reflow, budget…) tourne dans la CI ou dans
  `npm run verify`, sinon il n'est jamais relancé.
- **Un événement de mesure se déclare deux fois** : dans `AnalyticsEvent`
  (`core/analytics`) et dans `EVENEMENTS` (`tools/umami.mjs`), sinon il est
  collecté mais n'apparaît dans aucun rapport. `tools/evenements.test.mjs` le
  vérifie.
- **Un événement émis depuis un `effect` arrive après le clic qui le provoque**,
  un tour de planificateur plus tard, là où un événement émis dans le
  gestionnaire part en synchrone. Un test e2e qui vide la file juste après
  `click()` le manque sur un runner chargé, et le retrouve ensuite dans le lot
  de l'assertion suivante : deux échecs intermittents pour un seul décalage. On
  accumule la file jusqu'à obtenir les noms attendus (`attendreNoms` dans
  `e2e/analytics.spec.ts`) plutôt que de la lire une fois.
- **`npx playwright test` sert le dernier build, pas le code du moment**
  (`e2e/static-server.mjs` sur `dist/`, plus `reuseExistingServer`). Debugger un
  échec e2e sans `ng build` préalable fait chercher un bug de test là où il n'y
  a qu'un `dist/` périmé : passer par `npm run test:a11y`, qui construit.
- **Workflow du pilote** (claude-code-action) lancé sur une branche : l'étape
  de l'agent est sautée, le fichier doit être identique à celui de `main`. Sur
  branche, on ne valide que les étapes d'avant l'agent ; l'agent se valide par
  `workflow_dispatch` sur `main` après merge. Pour comprendre une exécution,
  lire son résumé (données lues, forme des réponses d'Umami) avant de relancer.
- **Ce qui suit un agent ne tourne pas sur sa machine.** Dans un workflow du
  pilote, l'agent peut modifier tout fichier de son runner (scripts de
  `tools/`, `.git/config`, hooks) : une étape qui détient un jeton d'écriture
  vit dans un autre job, repart d'un checkout de `main` et ne lit l'artefact
  de l'agent que comme une donnée (noms validés, tailles bornées).
- **Service worker** : tout script qui réécrit un fichier de `dist/` après
  `ng build` doit passer **avant** la régénération de `ngsw.json` (`ngsw-config`
  dans `npm run build`), sinon le worker passe en mode dégradé et ne sert plus
  rien hors ligne. `tools/check-ngsw.mjs` le vérifie. Tester hors ligne en
  lisant `/ngsw/state` (« Driver state: NORMAL »), pas seulement le statut HTTP.
- **Impression** : vérifier sur un vrai PDF (Chromium `page.pdf`), pas sur
  `innerText`, qui renvoie aussi le texte des éléments masqués.

## Économie de tokens

Une exécution du pilote a un nombre d'échanges limité, et chaque fichier lu en
entier les consomme.

- Lire les fichiers **listés par la fiche**, et seulement eux ; le reste se
  trouve par `grep -n`.
- Avant d'ouvrir un fichier de plus de 300 lignes : `grep -n` pour viser la
  partie utile, puis lecture par plage.
- Jamais `glossary.ts` ni `translations.ts` en entier : `grep -n "<clé>"`.
- Tests ciblés pendant le travail (`npx ng test --no-watch --include='<glob>'`),
  **un seul** `npm run verify` à la fin.
- Noter dans la PR le nombre d'échanges consommés et ce qui les a coûtés.

- **Fusion automatique des PR du pilote.** Elle ne prend effet que si « Allow auto-merge » est coché, si le check « Lint · format · tests · build » est requis sur `main`, et si le job `publier` a `pull-requests: write`. Sinon `gh pr merge --auto` échoue : `tools/fusion-auto.sh` le note dans le résumé d'exécution (« fusion auto non activée ») sans faire échouer le workflow, et la PR attend en silence. Avec la protection « branche à jour » (`strict`), une PR restée derrière `main` ne fusionne pas non plus : la mettre à jour à la main.

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
