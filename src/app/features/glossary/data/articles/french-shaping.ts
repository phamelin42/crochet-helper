import { TermArticles } from './types';

/** Les formes des patrons français : `aug`, `dim`, et le cercle magique (`cercle-magique` en français, `magic-ring` en anglais). */
export const FRENCH_SHAPING: TermArticles = {
  aug: {
    fr: {
      how: [
        'Une augmentation, notée « aug », ajoute une maille au tour. Au crochet, la forme la plus courante consiste à travailler deux mailles dans la même maille du tour du dessous, et c’est ce que l’abréviation veut dire, sauf indication contraire.',
        'Faites la maille que le patron emploie, en général une maille serrée, dans la maille suivante, comme d’habitude. N’avancez pas. Piquez le crochet une seconde fois dans la même maille et faites une deuxième maille. Deux mailles reposent maintenant sur une seule.',
        'Les deux mailles sont côte à côte et partagent le même pied. Passez ensuite à la maille suivante du tour du dessous. Une augmentation ajoute exactement une maille au total, car une maille a été remplacée par deux.',
        'Au tricot, « aug » est moins précis, car plusieurs méthodes ajoutent une maille : tricoter dans le devant et le derrière d’une maille, ou relever le fil entre deux mailles. Un patron de tricot nomme d’ordinaire la méthode dans ses notes ; suivez celle-là.',
      ],
      inPattern:
        'Prenons le tour « Tour 3 : *1 ms, 1 aug* 6 fois (18) ». « Tour 3 » désigne le troisième tour. Les astérisques encadrent un groupe à répéter. « 1 ms » est une maille serrée dans la maille suivante. « 1 aug » est une augmentation dans la maille d’après : deux mailles serrées dans la même maille. « 6 fois » dit combien de fois travailler le groupe. Chaque groupe utilise deux mailles du tour du dessous et en donne trois. Le nombre entre parenthèses annonce 18 : le tour précédent en compte 12, six groupes ajoutent six mailles, on arrive donc à 18.',
      usUk: 'Le geste est identique, l’abréviation change. « Aug » est l’abréviation française ; les patrons américains et britanniques écrivent « inc », pour increase. Donc aug en français équivaut à inc dans les deux conventions. La maille employée à l’intérieur, elle, change de nom : une augmentation en maille serrée se lit « sc » chez les Américains et « dc » chez les Britanniques.',
      mistakes: [
        'Mettre la seconde maille dans la maille suivante au lieu de la même. On n’a alors pas augmenté, et le total ne change pas. Les deux mailles doivent partager le même pied.',
        'Mettre toutes les augmentations au même endroit. Si le patron demande de les espacer, l’ouvrage forme un angle bombé ; dans un disque plat, il devient un hexagone. Respectez la position de chaque augmentation.',
        'Oublier qu’une augmentation est une seule abréviation mais deux mailles. En comptant le tour, comptez les deux mailles. Un tour qui doit en avoir 18 semblerait n’en avoir que 12.',
      ],
      tip: 'Les augmentations se cachent dans le tour, car les deux mailles ressemblent à deux mailles ordinaires. Repérez la première maille du tour avec un marqueur, et comparez le total au nombre entre parenthèses chaque fois que vous y revenez. Si vous êtes à une maille près, regardez la dernière augmentation faite.',
    },
    en: {
      how: [
        'An increase, written “aug” in a French pattern, adds one stitch to the round. In crochet the most common form is two stitches worked into the same stitch of the round below, and that is what the abbreviation means unless the pattern says otherwise.',
        'Work the stitch the pattern uses, usually a single crochet, into the next stitch as normal. Do not move on. Insert the hook into the very same stitch again and work a second stitch. You now have two stitches standing on one.',
        'The two stitches sit side by side and share a foot. Then continue to the next stitch of the round below. An increase adds exactly one stitch to the total, because one stitch was replaced by two.',
        'In knitting, “aug” is less precise, because there are several ways to add a stitch: knitting into the front and back of a stitch, or lifting the yarn between two stitches. A knitting pattern usually names the method in its notes; follow that one.',
      ],
      inPattern:
        'Take the French round “Tour 3 : *1 ms, 1 aug* 6 fois (18)”. “Tour 3” means the third round. The asterisks enclose a group to repeat. “1 ms” is a single crochet in the next stitch. “1 aug” is an increase in the stitch after it: two single crochets in the same stitch. “6 fois” says how many times to work the group. Each group uses two stitches of the round below and gives three. The bracket says 18: the previous round had 12, six groups add six stitches, so you end with 18.',
      usUk: 'The gesture is identical, only the abbreviation changes. “Aug” is the French one; American and British patterns write “inc”, for increase. So aug (French) equals inc in both conventions. The stitch used inside it does change its name: an increase in single crochet reads “sc” in an American pattern and “dc” in a British one.',
      mistakes: [
        'Putting the second stitch in the next stitch instead of the same one. Then you have not increased, and the total does not change. The two stitches must share a foot.',
        'Putting all the increases in the same place. If the pattern says to space them out, the fabric will bulge as a corner; with a pattern that makes a flat circle, the disc turns into a hexagon. Follow the position of each increase.',
        'Forgetting that an increase is one abbreviation but two stitches. When you count the round, count both stitches. A round that should have 18 will otherwise seem to have 12.',
      ],
      tip: 'Increases hide in a round because the two stitches look like two ordinary ones. Mark the first stitch of the round with a marker, and count the total against the bracket every time you come back to it. If you are off by one, look at the last increase you made.',
    },
  },
  dim: {
    fr: {
      how: [
        'Une diminution, notée « dim », prend deux mailles du tour du dessous et en fait une seule. Elle retire une maille du total. Au crochet, elle se travaille comme une maille laissée ouverte, puis refermée avec la suivante.',
        'Pour une diminution en maille serrée, piquez le crochet dans la maille suivante, faites un jeté et tirez une boucle. Il y a deux boucles sur le crochet. Ne terminez pas la maille.',
        'Piquez le crochet dans la maille d’après, faites un jeté et tirez encore une boucle. Il y a maintenant trois boucles sur le crochet. Faites un jeté et passez à travers les trois boucles d’un seul coup. Il reste une boucle, et les deux mailles n’en font plus qu’une.',
        'Au tricot, « dim » est le plus souvent deux mailles tricotées ensemble, en passant l’aiguille dans deux mailles à la fois. Un patron peut demander une diminution penchée à l’autre bout du rang, qui est une autre technique avec un autre nom : lisez les notes.',
      ],
      inPattern:
        'Prenons le tour « Tour 8 : *4 ms, 1 dim* 6 fois (30) ». « Tour 8 » désigne le huitième tour. Les astérisques encadrent un groupe à répéter. « 4 ms » veut dire une maille serrée dans chacune des quatre mailles suivantes. « 1 dim » est une diminution sur les deux mailles d’après. « 6 fois » dit combien de fois travailler le groupe. Chaque groupe utilise six mailles du tour du dessous et en donne cinq. Le nombre entre parenthèses annonce 30 : le tour précédent en compte 36, six groupes retirent six mailles, on arrive donc à 30.',
      usUk: 'Le geste est identique, l’abréviation change. « Dim » est l’abréviation française ; les patrons américains et britanniques écrivent « dec », pour decrease. Donc dim en français équivaut à dec dans les deux conventions. La maille employée à l’intérieur change de nom : une diminution en maille serrée se lit « sc2tog » chez les Américains et « dc2tog » chez les Britanniques.',
      mistakes: [
        'Ne passer qu’à travers deux des trois boucles. On obtient alors une maille qui n’est ni une diminution ni une maille bien posée, et le compte des boucles est faux. Vérifiez qu’il y a trois boucles avant le dernier passage.',
        'Travailler la diminution dans une maille et dans l’espace à côté. Une diminution doit traverser deux vraies mailles, sinon elle laisse un trou. Cherchez le « V » de chaque maille avant de piquer.',
        'Perdre le compte des répétitions. Le nombre entre parenthèses donne le total, mais seulement à la fin. Avec « 6 fois » écrit, faites un trait sur papier après chaque groupe pour ne jamais vous arrêter à cinq.',
      ],
      tip: 'Les diminutions resserrent le tour, et les mailles deviennent difficiles à voir à mesure que la pièce se ferme. Arrêtez-vous à chaque groupe pour un coup d’œil : quatre mailles, puis une dim. Posez un marqueur au début du tour et remontez-le chaque fois que vous y revenez.',
    },
    en: {
      how: [
        'A decrease, written “dim” in a French pattern, takes two stitches of the round below and turns them into one. It removes one stitch from the total. In crochet it is worked as a stitch that is left open, then closed with the next.',
        'For a single crochet decrease, insert the hook into the next stitch, yarn over and pull up a loop. Two loops are on the hook. Do not finish the stitch.',
        'Insert the hook into the following stitch, yarn over and pull up a loop again. Three loops are on the hook. Yarn over and pull through all three loops at once. One loop is left, and the two stitches are now one.',
        'In knitting, “dim” is usually a knit two together, worked by inserting the needle through two stitches at once. A pattern may ask for a slanted decrease at the other end of a row, which is another stitch with another name, so check the notes.',
      ],
      inPattern:
        'Take the French round “Tour 8 : *4 ms, 1 dim* 6 fois (30)”. “Tour 8” means the eighth round. The asterisks enclose a group to repeat. “4 ms” is a single crochet in each of the next four stitches. “1 dim” is a decrease over the next two stitches. “6 fois” says how many times to work the group. Each group uses six stitches of the round below and gives five. The bracket says 30: the previous round had 36, six groups remove six stitches, so you end with 30.',
      usUk: 'The gesture is identical, only the abbreviation changes. “Dim” is the French one; American and British patterns write “dec”, for decrease. So dim (French) equals dec in both conventions. The stitch inside it does change its name: a single crochet decrease reads “sc2tog” in an American pattern and “dc2tog” in a British one.',
      mistakes: [
        'Pulling through only two of the three loops. You then have made a stitch that is neither a decrease nor a stitch that sits properly, and the count on the hook is wrong. Check that there are three loops before the last pull.',
        'Working the decrease into one stitch and the space beside it. A decrease must go through two real stitches, otherwise it leaves a hole. Look for the “V” of each stitch before you insert.',
        'Losing count of the repeats. The bracket tells you the total, but only at the end. With “6 fois” written out, put a mark on paper after each group so that you never stop after five.',
      ],
      tip: 'Decreases pull the round in, so the stitches become harder to see as the piece closes. Stop at every group and take a quick look: four stitches, then one dim. Put a marker at the start of the round and move it up each time you return to it.',
    },
  },
  'cercle-magique': {
    fr: {
      how: [
        'Le cercle magique, que les patrons anglais abrègent en « mr » ou écrivent « magic ring », est un anneau de départ dont on peut resserrer le centre. Il évite le petit trou qu’une chaînette fermée laisse au milieu d’un disque, ce qui compte pour les jouets et les bonnets.',
        'Enroulez le fil une fois autour de deux doigts, de façon à former un anneau, la queue du fil pendant vers vous. Passez le crochet dans l’anneau, attrapez le fil de travail, celui qui vient de la pelote, et ramenez-le à travers l’anneau. Faites une maille en l’air pour verrouiller la boucle.',
        'Travaillez ensuite les mailles du premier tour, en général des mailles serrées, en passant le crochet dans l’anneau et en enfermant la queue du fil sous vos mailles. Comptez-les au fur et à mesure : le patron donne leur nombre.',
        'Quand toutes les mailles sont faites, tirez sur la queue du fil pour resserrer l’anneau. Un des deux brins coulisse et referme le centre, l’autre reste en place. Terminez en tirant jusqu’à ce que le trou disparaisse, puis fixez la queue.',
      ],
      inPattern:
        'Prenons le tour « Tour 1 : 6 ms dans un cercle magique (6) ». « Tour 1 » désigne le premier tour. « 6 ms » veut dire six mailles serrées. « dans un cercle magique » signifie qu’on les travaille dans l’anneau de départ, et non dans des mailles d’un tour précédent, puisqu’il n’y en a pas encore. Le nombre entre parenthèses annonce 6 : les six mailles serrées, qui serviront de base au tour suivant. Une fois ces six mailles faites, on tire la queue du fil pour resserrer le cercle.',
      usUk: 'Le geste est identique, le nom change. Les patrons français écrivent « cercle magique » ; les patrons américains écrivent « magic ring », ou l’abrègent en « mr », et les patrons britanniques parlent souvent de « magic circle ». Les trois désignent le même anneau ajustable. Les mailles qu’on y travaille, elles, changent de nom d’une convention à l’autre : une maille serrée s’écrit « sc » chez les Américains et « dc » chez les Britanniques.',
      mistakes: [
        'Tirer le mauvais brin pour fermer l’anneau. Si rien ne bouge, c’est que vous tirez la queue de fil pendante et non le brin qui coulisse. Tirez chaque brin tour à tour : celui qui resserre le centre est le bon.',
        'Laisser une queue trop courte. Une queue de moins de dix centimètres environ glisse hors de l’ouvrage quand on la tire. Gardez une queue assez longue pour la tenir en main et la rentrer ensuite.',
        'Lâcher l’anneau pendant qu’on travaille les mailles. Il s’ouvre et les mailles glissent. Pincez-le entre le pouce et l’index jusqu’à la dernière maille du tour, puis comptez avant de tirer.',
      ],
      tip: 'Le cercle magique se défait si on le lâche. Après avoir tiré la queue, faites un point de nœud ou une maille coulée pour la fixer, et posez un marqueur dans la première maille du tour suivant. Vérifiez le compte avant de fermer : six mailles, ni plus ni moins.',
    },
  },
  // La page anglaise du cercle magique est `magic-ring` : `/glossary/cercle-magique`
  // y redirige, comme `/fr/glossaire/magic-ring` vers `cercle-magique`.
  'magic-ring': {
    en: {
      how: [
        'The magic ring, written “cercle magique” in a French pattern and “mr” or “magic ring” in an English one, is a starting ring whose centre can be pulled tight. It avoids the small hole that a closed chain leaves in the middle of a disc, which matters for toys and hats.',
        'Wrap the yarn once around two fingers to form a ring, with the yarn tail hanging towards you. Put the hook through the ring, catch the working yarn, the one that comes from the ball, and pull it through the ring. Make one chain to lock the loop.',
        'Then work the stitches of the first round, usually single crochets, by putting the hook through the ring and enclosing the yarn tail under your stitches. Count them as you go: the pattern gives their number.',
        'When all the stitches are made, pull the yarn tail to tighten the ring. One of the two strands slides and closes the centre, the other stays in place. Pull until the hole disappears, and then secure the tail.',
      ],
      inPattern:
        'Take the round “Rnd 1: 6 sc in a magic ring (6)”. “Rnd 1” means the first round. “6 sc” means six single crochets. “in a magic ring” means you work them into the starting ring, and not into stitches of a previous round, since there are none yet. The number in brackets says 6: the six single crochets, which will be the base of the next round. Once these six are made, you pull the yarn tail to tighten the ring. A French pattern writes the same round “Tour 1 : 6 ms dans un cercle magique (6)”.',
      usUk: 'The gesture is identical, only the name changes. French patterns write “cercle magique”; American patterns write “magic ring”, or shorten it to “mr”, and British patterns often say “magic circle”. All three mean the same adjustable ring. The stitches worked into it do change name between conventions: a single crochet is “sc” in an American pattern and “dc” in a British one.',
      mistakes: [
        'Pulling the wrong strand to close the ring. If nothing moves, you are pulling the hanging tail instead of the strand that slides. Pull each strand in turn: the one that tightens the centre is the right one.',
        'Leaving a tail that is too short. A tail of less than about ten centimetres slips out of the work when pulled. Keep a tail long enough to hold in your hand and weave in afterwards.',
        'Letting go of the ring while you work the stitches. It opens and the stitches slip. Pinch it between thumb and forefinger until the last stitch of the round, then count before you pull.',
      ],
      tip: 'A magic ring comes undone if you let go of it. After pulling the tail, secure it with a knot or a slip stitch, and put a marker in the first stitch of the next round. Check your count before closing: six stitches, no more and no fewer.',
    },
  },
};
