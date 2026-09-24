# Accessibilité — audit WCAG 2.1 AA

État au 22 septembre 2026. Public cible : on lit l'application à un mètre,
crochet en main, souvent en zoomant beaucoup — l'accessibilité n'est pas une
case à cocher ici, c'est la fonctionnalité principale.

## Ce qui est vérifié automatiquement

`npm run test:a11y` construit le build de production, le sert en statique
(`e2e/static-server.mjs`, un serveur de fichiers minimal réservé au test —
rien de comparable à un back-end applicatif) et fait passer
[axe-core](https://github.com/dequelabs/axe-core) sur six gabarits de page,
dans les deux états de `tokens.css` (normal et `data-dim="true"`) :

- le lecteur (`/`)
- le glossaire (`/glossary`)
- une page d'abréviation, `sc` en échantillon (`/glossary/:slug`, gabarit
  partagé par plus de cent pages)
- « Bien formater son patron » (`/format-your-pattern`)
- le convertisseur US ↔ UK (`/us-uk-converter`)
- « Mes projets » (`/my-projects`)

Le test échoue sur toute violation de gravité `serious` ou `critical`
(`e2e/a11y.spec.ts`). Il couvre les six pages **dans les deux langues**, dans
les deux thèmes, plus le lecteur **avec un patron chargé** (son état principal),
et vérifie le reflow à 320 px sur les douze pages : 38 passages, zéro
violation. Il tourne dans la CI (job « Lint · format · tests · build »), ce qui
empêche les régressions.

### Écart avec `CLAUDE.md` : pas de bascule de thème

`CLAUDE.md` documente un service `core/theme` et un thème « assombri »
activable. Ce service n'existe pas dans le code : seul le sélecteur CSS
`:root[data-dim='true']` subsiste dans `tokens.css`, sans aucun bouton ni
service pour le poser. Le test d'audit pose l'attribut lui-même
(`page.addInitScript`) pour auditer les deux jeux de jetons de couleur que
`data-dim` fait varier, en attendant qu'un vrai bouton existe. Écart
seulement signalé ici — l'ajouter est hors périmètre de cette fiche
(fonctionnalité neuve, pas correction d'accessibilité).

## Violations trouvées et corrigées

| Violation axe                                                                       | Page(s)                                                                        | Correction                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label` (critique) : entrée de fichier sans nom accessible                          | Mes projets — import de sauvegarde                                             | `aria-label` posé sur l'`<input type="file">` caché (`projects-page.ts`)                                                                                                                                        |
| `scrollable-region-focusable` (sérieux) : zone défilante non atteignable au clavier | Bien formater son patron, convertisseur — `<pre>` du bloc de consigne/résultat | `tabindex="0"` sur les deux `<pre>` (`format-page.ts`, `converter-page.ts`)                                                                                                                                     |
| `color-contrast` (sérieux) : `.tile h6` et `.tile .big .sub` sous le seuil AA       | Lecteur — les trois tuiles de compteurs                                        | Nouveau jeton `--color-text-label` dans `tokens.css`, calculé pour rester ≥ 4.5:1 sur `--color-surface` dans les deux thèmes ; `lecteur.css` l'utilise à la place du `color-mix(… 52%…)` / `(… 45%…)` d'origine |

Le calcul du contraste est en commentaire dans `tokens.css`, à côté du
jeton : ≈4.71:1 en thème normal, ≈4.60:1 en thème assombri (le pire des
deux). L'ancien mélange à 52 % tombait à 4.48:1 côté assombri.

## Vérifié à la main

- **Parcours clavier complet** (page rechargée, aucun clic préalable) : le
  premier `Tab` atteint le lien d'évitement, puis la marque, les cinq liens
  de navigation, le bouton « garder l'écran allumé », le lien de langue, le
  panneau d'import, puis le contenu du lecteur dans l'ordre visuel. Ordre
  logique, aucun piège, focus toujours visible (`:focus-visible` global dans
  `hanami.css`).
- **Lien d'évitement** : premier `Tab` → focus sur `.skip-link` → `Entrée` →
  focus sur `<main id="main" tabindex="-1">`. Vérifié par script Playwright.
- **Infobulle du glossaire** (`GlossaryText`) : chaque abréviation est un
  `<span tabindex="0" role="button" aria-label="terme : définition">`,
  atteignable au clavier (focus), au survol et au tactile (l'écouteur
  `click` couvre le tap). Le contenu est annoncé directement par
  `aria-label` au moment du focus, sans dépendre de l'infobulle flottante
  (`TooltipHost`, `role="status" aria-live="polite"`) qui ne sert que
  l'affichage visuel.
- **Annonce du changement d'étape** : seul `.step-body` porte
  `aria-live="polite"`, et son contenu ne change qu'au changement d'étape
  (`store.move` / `store.advance`), jamais à chaque frappe ni à chaque
  incrément de répétition — ces compteurs vivent dans des tuiles sans
  `aria-live`.
- **Boîtes de dialogue** (`Dialog`, utilisées pour renommer/supprimer un
  projet et confirmer un import par lien) : piège de focus et retour du
  focus au bouton ouvrant, vérifiés sur la boîte « Renommer » — les deux
  fonctionnent nativement via `<dialog>.showModal()` / `.close()`, sans code
  applicatif à ce sujet.
- **Reflow à 320 px** (méthodologie WCAG 1.4.10, équivalent 400 % de zoom
  sur une fenêtre de 1280 px) sur les six pages : aucun défilement
  horizontal de la page. Un débordement a été trouvé et corrigé — voir
  ci-dessous.
- **`prefers-reduced-motion`** : déjà respecté globalement (`tokens.css`),
  vérifié par mesure de `transition-duration` avec l'émulation Playwright.
- **Boîte de zoom d'un diagramme** (`*.zoomview`, `.dialog.zoom` dans
  `lecteur.css`) : n'est utilisée par aucun composant — la fonctionnalité de
  diagramme a été retirée avant cette fiche (voir le commentaire dans
  `.import-body`, `lecteur.css`). Rien à auditer ; le CSS mort n'est pas
  supprimé ici, hors périmètre (pas une correction d'accessibilité).
- **Figcaption, `.hint` et le texte des boutons désactivés** : vérifiés au
  calcul. `.hint` et `figcaption` restent au-dessus de 4.5:1 dans leurs
  contextes actuels (≈4.8:1 sur `--color-surface`, ≈5.2:1 sur
  `--color-bg`) ; `figcaption` n'est utilisé par aucun gabarit actuel — pas
  de correction nécessaire. Le texte des boutons désactivés (`.btn:disabled`,
  `opacity: 0.45`) descend sous 4.5:1, ce qui est conforme : les commandes
  désactivées sont explicitement exemptées du critère 1.4.3.

## Défaut trouvé et corrigé hors axe

Le tableau du glossaire (`.glossary-table`, quatre colonnes de texte) faisait
déborder la page entière à 320 px de large plutôt que de défiler seul — axe
ne détecte pas le reflow. `glossary-page.ts` l'enveloppe maintenant dans
`.glossary-table-scroll` (`overflow-x: auto`) : le tableau peut défiler
individuellement, ce que WCAG 1.4.10 autorise explicitement pour les tableaux
de données, sans plus jamais élargir la page.

## Ce qui reste

- **Thème assombri sans interface** (voir plus haut) : nécessite d'écrire le
  service et le bouton, hors périmètre d'une fiche d'audit.
- **CSS mort du diagramme retiré** (`.figpanel`, `.zoomview`, `.dialog.zoom`)
  : sans impact sur l'accessibilité puisqu'inutilisé, mais à nettoyer un jour
  pour ne pas induire en erreur un futur audit.
- **Pas de test automatisé pour le parcours clavier ni l'annonce du
  changement d'étape** (le reflow, lui, est désormais testé) : ces points sont hors de portée
  d'axe (qui n'exécute pas d'interaction) et ont été vérifiés à la main avec
  des scripts Playwright ponctuels, non conservés dans le dépôt. Les
  formaliser en tests (`e2e/`) donnerait une garantie contre la régression ;
  ce n'était pas demandé par la fiche, qui ne prescrivait qu'axe en continu
  et l'audit manuel une fois.
