# 46 — À l'import : « en étapes écrites ou en diagramme ? », choix retenu

**Étape d'entonnoir servie : activation (la lectrice choisit, dès le premier
patron, la façon de suivre qui lui parle).**

## Pourquoi

Phil : « quand un utilisateur va importer un PDF, on va lui proposer :
est-ce que tu veux découper ça par étapes et afficher le texte, ou l'afficher
sous forme de diagramme ? Son choix peut être retenu par défaut, et on pourra
le modifier à chaque fois. » La fiche 45 fournit les deux affichages et le
choix par projet ; il manque la question au bon moment et la préférence.

## Objectif

Après un import (texte collé, PDF, diagramme ouvert), une question courte
« Comment voulez-vous suivre ce patron ? — Étapes écrites / Diagramme »,
avec « Retenir mon choix ». Retenu, la question ne revient plus ; la
préférence se change dans Réglages ; l'affichage se change à tout moment
dans le lecteur (fiche 45).

## Fichiers à lire

- `src/app/core/platform/display-prefs.service.ts` — où vivent les
  préférences d'affichage (`fil.textSize`, `fil.dim`) : la nouvelle s'y ajoute
- `grep -n "load(\|importPdf\|openFromChart\|view" src/app/features/reader/state/reader-store.ts`
- `src/app/features/reader/components/pattern-import.ts`
- `src/app/features/settings/settings-page.ts` — page Réglages
- `src/app/features/reader/data/text-to-chart.ts` (fiche 44) — `drawable`
- `src/app/shared/ui/` : `Dialog`, `Checkbox`, `Segmented`, `Button`
- `CLAUDE.md`, « Pièges » : « Charger un autre patron ouvre un autre
  projet » ; un événement émis depuis un `effect` arrive après le clic

Si la fiche 45 n'est pas fusionnée (`Project.view`), s'arrêter et le dire.

## À faire

1. **Préférence** dans `DisplayPrefsService` : `defaultView: 'ask' | 'text'
| 'chart'` (`fil.defaultView`, `ask` par défaut), lue et écrite par
   `LocalStorageService`, gardée par la plateforme comme les autres.
2. **Question** : `components/view-choice-dialog.ts`, `Dialog` avec deux gros
   boutons (illustration SVG statique de `public/illustrations/` pour chacun
   si elle existe, sinon texte seul) et une `Checkbox` « Retenir mon choix ».
   Elle s'ouvre **après** que le nouveau projet est créé, quand
   `defaultView` vaut `ask` **et** que le patron a au moins une étape
   dessinable ; sinon l'affichage texte s'applique sans question.
   Fermer sans choisir = texte, sans rien retenir.
3. **Application** : le choix fixe `Project.view` du nouveau projet. Avec une
   préférence `chart` et un patron sans étape dessinable : texte, et une
   phrase dit pourquoi (une fois, sous l'étape).
4. **Réglages** : un `Segmented` « Affichage d'un nouveau patron : Demander /
   Étapes écrites / Diagramme ».
5. Un diagramme ouvert par « Ouvrir un diagramme » est déjà relu en tours :
   la question s'y pose aussi, rien de particulier.

## Mesure

- `view_chosen` (propriétés `view` et `remembered`, `yes` / `no`), émis dans
  le gestionnaire du clic, pas dans un effet ;

déclaré dans `AnalyticsEvent`, `EVENEMENTS` **et** `privacy-events.ts`.

## Tests

- Pour **chaque** origine d'import (`saisie`, `pdf`, `diagramme`, `exemple`)
  et **chaque** valeur de `defaultView` (deux boucles) : la question apparaît
  ou non, et `Project.view` vaut ce qu'on attend, relu après écriture
  (`vi.waitFor` + `ProjectStoreService.list()`).
- « Retenir » coché → `fil.defaultView` écrit ; non coché → inchangé.
- Patron sans étape dessinable : jamais de question, affichage texte.
- e2e : coller un patron → question → Diagramme + Retenir → coller un autre
  patron → pas de question, affichage diagramme ; Réglages → Demander →
  la question revient. axe sur la question ouverte.

## Critères d'acceptation

- `npm run verify:ci` vert ; la question n'est pas dans le bundle initial.
- Le projet actif n'est jamais modifié par la question : elle ne porte que
  sur le projet qui vient d'être créé.
- Français soigné (espaces insécables avant `?` et `:`).

## Hors périmètre

Changer d'affichage par pièce (c'est par projet), proposer le diagramme pour
un patron de tricot, la grille de couleurs (fiche 47).
