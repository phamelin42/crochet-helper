import { Locale } from '../../../core/i18n/locale';

/** Patron d'exemple anglais : la forme la plus courante des patrons trouvés en
 *  ligne, et elle démontre la détection des sections (matériel, pièces)
 *  autant que celle des rangs. Sur `/fr`, l'exemple est écrit en français
 *  (`DEMO_PATTERN_FR`) : un exemple en anglais y déroutait (audit I-9). */
export const DEMO_PATTERN = `Tiny Tree

You will need:

  medium weight yarn in green, brown, and yellow
  G-6 Crochet Hook (4 mm)
  2 - 6mm safety eyes
  fiberfill
  yarn needle
  black embroidery floss
  embroidery needle

Instructions:

Begin each piece with a magic ring

Tree

make 1 with green yarn

Round 1: in magic ring, 6 sc (6)
Round 2: inc in each st around (12)
Round 3: [sc, inc] x 6 (18)
Round 4: [2 sc, inc] x 6 (24)
Rounds 5-8: sc in each st around (24)
Round 9: [2 sc, dec] x 6 (18)
Round 10: [sc, dec] x 6 (12)
Attach safety eyes between rounds 6 and 7, four stitches apart. Stuff firmly.
Round 11: dec x 6 (6)
Fasten off and close the remaining hole with the yarn needle.

Trunk

make 1 with brown yarn

Round 1: in magic ring, 6 sc (6)
Round 2: sc in each st around (6)
Rounds 3-5: sc in each st around (6)
Fasten off, leaving a long tail for sewing.

Star

make 1 with yellow yarn

Round 1: in magic ring, 10 sc (10)
Round 2: [sl st, ch 3, sl st in next st] x 5
Fasten off. Sew the star to the top of the tree, then sew the trunk to the base.`;


/** L'exemple de la page française : matériel, deux pièces, un conseil, une finition. */
export const DEMO_PATTERN_FR = `Petit sapin

Matériel :

- fil de poids moyen vert, marron et jaune
- crochet de 4 mm
- ouate de rembourrage
- aiguille à laine

Instructions :

Commencez chaque pièce par un cercle magique

Sapin

Rang 1 : 6 ms dans un cercle magique (6)
Rang 2 : 2 ms dans chaque maille (12)
Rang 3 : [1 ms, 2 ms dans la maille suivante] x 6 (18)
Rangs 4 à 7 : 1 ms dans chaque maille (18)
Astuce : placez un marqueur au début du rang pour ne pas perdre le compte.
Rang 8 : [1 ms, 1 dim] x 6 (12)
Rembourrez fermement.
Rang 9 : 1 dim x 6 (6)
Arrêtez le fil et fermez l'ouverture avec l'aiguille à laine.

Tronc

Rang 1 : 6 ms dans un cercle magique (6)
Rangs 2 à 5 : 1 ms dans chaque maille (6)
Arrêtez le fil en laissant un long brin pour coudre. Cousez le tronc à la base du sapin.`;

export const DEMO_PATTERNS: Readonly<Record<Locale, string>> = {
  en: DEMO_PATTERN,
  fr: DEMO_PATTERN_FR,
};
