# 44 — Du texte aux tours : lire un patron écrit comme un diagramme

**Étape d'entonnoir servie : activation. Fiche de données : aucune interface,
elle prépare l'affichage diagramme (fiche 45).**

## Pourquoi

Phil veut trois passages entre les deux formes d'un patron : diagramme → texte
(fait : composeur de la fiche 36, lecture automatique de la branche
`claude/diagram-image-recognition-g2b062`), texte → diagramme, et image →
grille de couleurs (fiches 47-48). Le texte → diagramme manque : un patron
collé ou importé en PDF n'est aujourd'hui qu'une suite d'étapes écrites.
Avant de dessiner quoi que ce soit, il faut savoir **quelles étapes se
traduisent en mailles**, une à une, et lesquelles ne le peuvent pas.

## Objectif

Une fonction pure qui transforme une étape du lecteur en `Round` (le modèle
du composeur, `chart-composer.ts`), ou dit franchement `null` quand l'étape
n'est pas dessinable (« Tour 5 : bourrer la tête »). Aller-retour exact avec
`renderRound` : un tour écrit par le composeur se relit à l'identique.

## Fichiers à lire

- `src/app/features/reader/data/chart-composer.ts` — `Round`, `Group`,
  `Token`, `renderRound`, `stitchCount` : le modèle de sortie
- `src/app/features/reader/data/chart-symbols.ts` — les symboles et leurs
  abréviations `us`, `uk`, `fr` ; la seule table d'abréviations à employer
- `src/app/features/reader/data/pattern.model.ts` — `PatternStep`,
  `PatternPiece`
- `grep -n "ROW\|repeat\|count" src/app/features/reader/data/pattern-parser.ts`
  — la syntaxe que le parseur sait découper (répétitions `*…*`, `x N`,
  comptes `(18)`) ; ne pas lire le fichier en entier
- `CLAUDE.md`, « Pièges » : énumérations parcourues en boucle ; un test ne
  fige jamais un comportement douteux

Si `chart-composer.ts` n'a pas `into` sur `Round`, ou si la branche de la
lecture automatique n'est pas fusionnée, **s'arrêter et le dire**.

## À faire

1. **`src/app/features/reader/data/text-to-chart.ts`**, pur, sans Angular :

   ```ts
   export function stepToRound(step: PatternStep, kind: Round['kind']): Round | null;
   export interface PieceChart {
     readonly kind: Round['kind']; // déduit des libellés : « Tour/Rnd » → round, « Rang/Row » → row
     readonly rounds: readonly (Round | null)[]; // un par étape, dans l'ordre ; null = non dessinable
     readonly drawable: number; // nombre d'étapes non nulles
   }
   export function pieceToChart(piece: PatternPiece): PieceChart;
   ```

2. **Ce qui est lu** (dans les trois conventions, par la table de
   `chart-symbols.ts`, insensible à la casse) :
   - jetons comptés : « 6 ms », « 6 sc », « sc », « 2 dc inc » ;
   - répétitions : `*…* x N`, `(…) x N`, « répéter N fois » / « N times » ;
   - « dans chaque maille » / « in each st (around|across) » suivi d'un
     compte `(N)` : N jetons de la maille nommée ;
   - début du premier tour : « dans un cercle magique » / « in a magic ring »
     → `into: 'magic-ring'` ; « dans la 2e ml » / « in 2nd ch from hook » →
     `into: 'chain'`.
3. **Ce qui donne `null`** : tout mot qui n'est ni une abréviation connue, ni
   un nombre, ni l'une des formules ci-dessus (consigne libre, couleur,
   « bourrer », « fermer ») ; une étape sans libellé de rang ; un tour dont
   le `stitchCount` contredit le compte `(N)` écrit (mieux vaut ne pas
   dessiner que dessiner faux).
4. **Bornes** : 200 tours par pièce, 400 mailles par tour au plus ; au-delà,
   `null` pour l'étape, jamais d'exception.

## Mesure

Aucun événement : rien n'est montré à la lectrice dans cette fiche.

## Tests

`text-to-chart.spec.ts` :

- **Aller-retour** : pour **chaque** symbole de `CHART_SYMBOLS` et **chaque**
  convention US, UK, FR (deux boucles), `renderRound` d'un tour d'un jeton,
  puis `parsePattern`, puis `stepToRound` rend le tour d'origine. Idem pour
  un tour à répétition et pour un premier tour `into` cercle magique et
  chaînette.
- Formules « dans chaque maille (24) » / « in each st around (24) » : 24
  jetons.
- `null` sur une table d'étapes non dessinables (au moins six, FR et EN).
- `null` quand le compte écrit contredit le compte calculé.
- Le patron d'exemple (`DEMO_PATTERN`) : le test **affiche** (pas d'assertion
  figée) le nombre d'étapes dessinables par pièce ; noter le chiffre dans la PR.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé (le module n'est importé
  par aucun composant dans cette fiche).
- Aucune nouvelle table d'abréviations : tout passe par `chart-symbols.ts`.

## Hors périmètre

L'affichage (fiche 45), le tricot, les patrons en paragraphes sans libellés
de rang, deviner une maille absente de `chart-symbols.ts`, corriger le texte
de la lectrice.
