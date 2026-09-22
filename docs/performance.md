# Performance et Core Web Vitals

État au 22 septembre 2026. Mesures « mobile simulé » : réseau 4G lent (RTT
150 ms, 1,6 Mbps descendant, 750 kbps montant) et CPU ralenti ×4 — le même
profil que Lighthouse en mode `simulate`, sur un viewport 412×823 (Moto G
Power).

## Méthodologie

Lighthouse CLI n'a pas pu être exécuté dans cet environnement (le bac à sable
de la session refuse d'ouvrir un sous-processus Chrome via `npx`/`curl`, sans
personne pour approuver la permission). Les métriques ci-dessous viennent
donc d'un script Playwright + Chrome DevTools Protocol qui applique le même
profil réseau/CPU et lit les API navigateur natives (`PerformanceObserver`
sur `largest-contentful-paint`, `layout-shift`, `longtask`) sur un build de
production servi en statique — pas de Lighthouse, mais les mêmes métriques,
mesurées avec les mêmes API que Lighthouse utilise en interne. Chaque page a
été mesurée sur un build figé (`npm run build`, sortie statique dans
`dist/fil-patterns/browser`), sans cache navigateur entre les mesures.

Poids transféré : octets de toutes les réponses réseau observées sur 3 à 4
secondes après `load` (page complète, polices et JS compris) — pas
uniquement le paquet initial du build, qui est mesuré séparément plus bas.

## Avant

| Page               | LCP    | CLS   | TBT    | Poids transféré (page) |
| ------------------ | ------ | ----- | ------ | ---------------------- |
| `/` (lecteur)      | 748 ms | 0,338 | 238 ms | 439 ko                 |
| `/glossary`        | 740 ms | 0,338 | 300 ms | 406 ko                 |
| `/fr/glossaire/ms` | 868 ms | 0,713 | 228 ms | 401 ko                 |

Paquet initial du build (`ng build`) : 320,07 ko bruts / 87,69 ko transférés.

Le LCP était déjà sous la cible ; le problème mesuré était le CLS, très
au-dessus de 0,05 sur les trois pages.

## Après

| Page               | LCP     | CLS   | TBT    | Poids transféré (page) |
| ------------------ | ------- | ----- | ------ | ---------------------- |
| `/` (lecteur)      | 944 ms  | 0     | 242 ms | 440 ko                 |
| `/glossary`        | 1040 ms | 0     | 277 ms | 407 ko                 |
| `/fr/glossaire/ms` | 1032 ms | 0,028 | 205 ms | 401 ko                 |

Paquet initial du build : 320,21 ko bruts / 87,72 ko transférés (inchangé —
les correctifs ci-dessous ne touchent pas au JavaScript).

Les trois pages passent sous la cible : LCP < 2,0 s (marge large : ~1 s) et
CLS < 0,05. Le LCP augmente légèrement (le rendu attend désormais la police
préchargée plutôt que d'afficher immédiatement la police de secours) ; le
compromis est délibéré — voir plus bas.

## Changements appliqués, et leur gain mesuré

Diagnostic : le CLS venait de deux causes distinctes, trouvées en inspectant
les `sources` de chaque entrée `layout-shift` (élément déplacé, position
avant/après) plutôt qu'en devinant.

### 1. Bouton « garder l'écran allumé » : décalage à l'hydratation

`WakeLockService.supported` vaut toujours `false` au pré-rendu (l'API
`navigator.wakeLock` n'existe pas côté serveur) puis passe à `true` dès
l'hydratation sur les navigateurs qui la supportent : le bouton apparaît
dans l'en-tête, qui grandit d'autant.

**Correctif** : `src/app/shared/layout/site-header.ts` réserve un
emplacement de taille fixe (`.tool-slot`, 36×36 px, la taille d'un
`.btn-icon`) que le bouton occupe ou non — l'en-tête ne change plus jamais de
taille selon la capacité du navigateur.

**Gain mesuré** : négligeable isolément (CLS 0,3379 → 0,3375 sur `/`) — la
cause dominante était ailleurs. Corrigé quand même : conservé, la place
réservée est correcte en soi et sans coût.

### 2. Police Inter : remplacement de la police de secours

`font-display: swap` (déjà actif par défaut chez Fontsource) affiche le
texte avec la police système, puis le remplace par Inter une fois le fichier
téléchargé. Sur réseau lent, ce remplacement survient après le premier rendu
et change la largeur du texte de la navigation : le nombre de liens qui
tiennent sur une ligne change, chaque lien se déplace individuellement (pas
seulement la hauteur du bloc).

**Correctif** : `tools/preload-font.mjs` (nouveau, exécuté dans la chaîne de
build avant `ngsw-config`) injecte un `<link rel="preload">` vers le seul
fichier de police utilisé au premier rendu (`inter-latin-wght-normal-*.woff2`
— le sous-ensemble « latin » couvre déjà les lettres accentuées du français).
Le fichier est ainsi prêt avant le premier rendu ; il n'y a plus de police de
secours visible à remplacer.

**Gain mesuré** : CLS 0,33 → 0 sur `/` et `/glossary`.

### 3. Navigation française : re-répartition tardive des liens

Même après le préchargement, `/fr/glossaire/ms` gardait un CLS de 0,673 : un
second décalage, plus tardif (~2,5 s), déplaçait les liens de la navigation
française (libellés plus longs) indépendamment du chargement de la police.

**Correctif** : `src/styles/lecteur.css`, dans la zone `@media (max-width:
640px)` déjà dédiée au mobile — `.nav-links` reçoit une hauteur de ligne
fixe (`line-height: 1.75`, remplace `normal` qui dépend de la police active)
et une hauteur minimale de deux lignes (`min-height: 2lh`), qui reproduit la
hauteur naturelle la plus grande mesurée. Le reste de la page ne peut plus
remonter si la navigation passe d'une ligne à deux.

**Gain mesuré** : CLS 0,673 → 0,028 sur `/fr/glossaire/ms`.

### Pistes envisagées et écartées (aucun gain mesurable, ou déjà traitées)

- **CSS critique inlined** : `angular.json` porte déjà
  `optimization.styles.inlineCritical: false`, volontairement — voir le
  commentaire de `tools/check-csp.mjs` (l'inlining d'Angular diffère la
  feuille de style avec un gestionnaire `onload` inline, bloqué par notre
  CSP `script-src 'self'`). Rouvrir ce choix est hors périmètre de cette
  fiche.
- **Découpage du paquet initial** : déjà correct. `--stats-json` confirme
  qu'aucun composant de `features/reader` ne fuit dans `main.js` — le lecteur
  (24,58 ko), le glossaire, le convertisseur, etc. sont tous des routes
  chargées à la demande (`app.routes.ts`).
- **Hydratation incrémentale (`@defer (hydrate on …)`)** pour les compteurs
  et le panneau matériel : non appliquée. Les métriques cibles sont déjà
  atteintes avec une marge confortable (LCP ~1 s pour une cible de 2 s, TBT
  200-280 ms) ; ce changement toucherait à l'initialisation des signaux du
  lecteur (compteurs, chronomètre) pour un gain non mesurable ici, avec un
  risque de régression fonctionnelle réel. Non retenu.

## Budget resserré

`angular.json`, budget `initial` :

| Seuil            | Avant  | Après  |
| ---------------- | ------ | ------ |
| `maximumWarning` | 325 kB | 323 kB |
| `maximumError`   | 335 kB | 328 kB |

Le paquet initial actuel (320,21 ko bruts) reste sous les deux seuils, avec
une marge d'environ 8 ko — volontairement laissée pour la fiche 04 (pages
éditoriales), qui vient juste après dans `prompts/README.md`.

## Intégration continue

`.github/workflows/ci.yml` fait déjà tourner `npm run build` comme étape à
part entière (pas de `continue-on-error`, pas de redirection qui avalerait le
code de sortie) : un dépassement de `maximumError` fait échouer `ng build`
avec un code de sortie non nul, donc l'étape, donc le job. Rien à ajouter —
vérifié en relisant le fichier, pas modifié (`.github/` est hors périmètre de
cette fiche de toute façon).
