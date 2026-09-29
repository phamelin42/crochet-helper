import { TermArticles } from './types';

/** Ce qui change le nombre de mailles : `st`, `inc`, `dec`, `sk`. */
export const COUNTING: TermArticles = {
  st: {
    en: {
      how: [
        'A stitch, written “st” (plural “sts”), is one unit of the fabric: one knot of yarn that you made with the hook. Every pattern counts in stitches, so recognising one on the row is the first skill to learn.',
        'In crochet, look at the top edge of the row you have just finished. Each stitch shows a small “V” lying on its side, made of two strands. When a pattern says “in next st”, it means the next “V” along the row, and you push the hook under both strands of it.',
        'The loop that is currently on your hook is not a stitch yet. It becomes one only when you have finished the movement and started the next stitch. Never count it.',
        'A pattern may also name a chain as a stitch: in “ch 3 (counts as dc)” the three chains stand in for one stitch. Unless the pattern says so, a turning chain is not counted, and the number in brackets at the end of the row is the total of stitches you should have.',
      ],
      inPattern:
        'Take the row “Rnd 5: sc in each st around (24)”. “Rnd 5” is the fifth round. “sc in each st around” means one single crochet in every stitch of the previous round, all the way round. Here “st” refers to the stitches of the round below, not to the ones you are making. The bracket says 24: the previous round had 24 stitches, you made one new stitch in each of them, so you end with 24. No increase and no decrease in this round, so the number does not change.',
      usUk: 'Identical. “St” means stitch in American and British patterns alike, and so does “sts” for the plural. The names of individual stitches shift between conventions, sc becoming dc and dc becoming tr, but the word stitch itself does not.',
      mistakes: [
        'Working into the wrong part of the previous row. If the fabric looks gapped, or the edge grows wider, check that the hook goes under both strands of the “V” and not into the space between two stitches.',
        'Missing the last stitch of a row. The last stitch is often the top of the turning chain from the row below, which is easy to overlook. If your total is one short each time, look at the end of the row.',
        'Counting the loop on the hook, or the turning chain. Both change the total by one. Compare your count with the bracket after every row, not only at the end of the section.',
      ],
      tip: 'A stitch count is only useful if it is done at the same moment each time. Count once the row is finished, before you turn, and write the number in the margin of your pattern. When a mistake shows up ten rows later, you will know exactly which row to go back to.',
    },
    fr: {
      how: [
        'Une maille, notée « st » (pluriel « sts ») dans un patron anglais, est une unité de l’ouvrage : un nœud de fil que vous avez fait avec le crochet. Tous les patrons comptent en mailles, et savoir en reconnaître une sur le rang est la première compétence à acquérir.',
        'Au crochet, regardez le bord supérieur du rang que vous venez de finir. Chaque maille y montre un petit « V » couché, fait de deux brins. Quand le patron dit « in next st », il s’agit du « V » suivant sur le rang, et l’on passe le crochet sous ses deux brins.',
        'La boucle qui se trouve sur le crochet n’est pas encore une maille. Elle le devient quand le geste est terminé et que vous commencez la suivante. Ne la comptez jamais.',
        'Un patron peut aussi compter une maille en l’air comme une maille : dans « ch 3 (counts as dc) », les trois mailles en l’air tiennent lieu d’une maille. Sauf mention contraire, la montée ne se compte pas, et le nombre entre parenthèses en fin de rang donne le total de mailles attendu.',
      ],
      inPattern:
        'Lisons le tour anglais « Rnd 5: sc in each st around (24) ». « Rnd 5 » désigne le cinquième tour. « sc in each st around » veut dire une maille serrée dans chaque maille du tour précédent, tout autour. Ici, « st » désigne les mailles du tour du dessous, pas celles que vous êtes en train de faire. Le nombre entre parenthèses annonce 24 : le tour précédent compte 24 mailles, vous en faites une nouvelle dans chacune, donc vous restez à 24. Ce tour n’a ni augmentation ni diminution, le nombre ne change pas.',
      usUk: 'Identique. « St » veut dire maille dans les patrons américains comme dans les patrons britanniques, et « sts » est le pluriel. Les noms des mailles particulières se décalent d’une convention à l’autre, sc devenant dc et dc devenant tr, mais le mot maille lui-même ne change pas.',
      mistakes: [
        'Piquer dans la mauvaise partie du rang précédent. Si l’ouvrage a des trous ou si le bord s’élargit, vérifiez que le crochet passe sous les deux brins du « V » et non dans l’espace entre deux mailles.',
        'Oublier la dernière maille d’un rang. Elle correspond souvent au sommet de la montée du rang du dessous, facile à manquer. Si votre total est chaque fois trop court d’une maille, regardez la fin du rang.',
        'Compter la boucle du crochet ou la montée. Les deux changent le total d’une unité. Comparez votre compte au nombre entre parenthèses après chaque rang, pas seulement à la fin de la section.',
      ],
      tip: 'Un compte de mailles n’est utile que s’il se fait au même moment à chaque fois. Comptez une fois le rang fini, avant de tourner, et notez le nombre en marge de votre patron. Quand une erreur apparaît dix rangs plus tard, vous saurez exactement à quel rang revenir.',
    },
  },
  inc: {
    en: {
      how: [
        'An increase, written “inc”, adds one stitch to the row. In crochet the most common form is two stitches worked into the same stitch of the row below, and that is what the abbreviation means unless the pattern says otherwise.',
        'Work the stitch the pattern uses, usually a single crochet, into the next stitch as normal. Do not move on. Insert the hook into the very same stitch again and work a second stitch. You now have two stitches standing on one.',
        'The two stitches sit side by side and share a foot. Then continue to the next stitch of the row below. An increase adds exactly one stitch to the total, because one stitch was replaced by two.',
        'In knitting, “inc” is less precise, because there are several ways to add a stitch: knitting into the front and back of a stitch, or lifting the yarn between two stitches. A knitting pattern usually names the method in its notes; follow that one.',
      ],
      inPattern:
        'Take the row “Rnd 2: inc in each st around (12)”. “Rnd 2” is the second round. “inc in each st around” means an increase in every stitch of the previous round, all the way round. In crochet, that is two single crochets in each stitch. The bracket says 12: the first round had 6 stitches, each is replaced by two, so you end with 12. This is the most common start of a round toy, where the flat disc doubles in size before the increases are spaced out.',
      usUk: 'Identical. “Inc” means increase in American and British patterns alike. What changes is the name of the stitch you increase with: a US “inc” in single crochet is written with “sc”, while a British pattern would name that stitch “dc”. The gesture itself is the same, so the abbreviation does not need converting.',
      mistakes: [
        'Putting the second stitch in the next stitch instead of the same one. Then you have not increased, and the total does not change. The two stitches must share a foot.',
        'Putting all the increases in the same place. If the pattern says to space them out, the fabric will bulge as a corner; with a pattern that makes a flat circle, the disc turns into a hexagon. Follow the position of each increase.',
        'Forgetting that an increase is one abbreviation but two stitches. When you count the round, count both stitches. A round that should have 12 will otherwise seem to have 6.',
      ],
      tip: 'Increases hide in a round because the two stitches look like two ordinary ones. Mark the first stitch of the round with a marker, and count the total against the bracket every time you come back to it. If you are off by one, look at the last increase you made.',
    },
    fr: {
      how: [
        'Une augmentation, notée « inc » dans un patron anglais, ajoute une maille au rang. Au crochet, la forme la plus courante consiste à travailler deux mailles dans la même maille du rang du dessous, et c’est ce que l’abréviation veut dire, sauf indication contraire.',
        'Faites la maille que le patron emploie, en général une maille serrée, dans la maille suivante, comme d’habitude. N’avancez pas. Piquez le crochet une seconde fois dans la même maille et faites une deuxième maille. Deux mailles reposent maintenant sur une seule.',
        'Les deux mailles sont côte à côte et partagent le même pied. Passez ensuite à la maille suivante du rang du dessous. Une augmentation ajoute exactement une maille au total, car une maille a été remplacée par deux.',
        'Au tricot, « inc » est moins précis, car plusieurs méthodes ajoutent une maille : tricoter dans le devant et le derrière d’une maille, ou relever le fil entre deux mailles. Un patron de tricot nomme d’ordinaire la méthode dans ses notes ; suivez celle-là.',
      ],
      inPattern:
        'Lisons le tour anglais « Rnd 2: inc in each st around (12) ». « Rnd 2 » désigne le deuxième tour. « inc in each st around » veut dire une augmentation dans chaque maille du tour précédent, tout autour. Au crochet, cela donne deux mailles serrées dans chaque maille. Le nombre entre parenthèses annonce 12 : le premier tour compte 6 mailles, chacune est remplacée par deux, on arrive donc à 12. C’est le début classique d’un jouet rond, où le disque plat double de taille avant que les augmentations ne soient espacées.',
      usUk: 'Identique. « Inc » veut dire augmentation dans les patrons américains comme dans les patrons britanniques. Ce qui change, c’est le nom de la maille avec laquelle on augmente : une augmentation américaine en maille serrée s’écrit avec « sc », alors qu’un patron britannique nommerait cette maille « dc ». Le geste est le même, l’abréviation n’a donc pas besoin d’être convertie.',
      mistakes: [
        'Mettre la seconde maille dans la maille suivante au lieu de la même. On n’a alors pas augmenté, et le total ne change pas. Les deux mailles doivent partager le même pied.',
        'Mettre toutes les augmentations au même endroit. Si le patron demande de les espacer, l’ouvrage forme un angle bombé ; dans un disque plat, il devient un hexagone. Respectez la position de chaque augmentation.',
        'Oublier qu’une augmentation est une seule abréviation mais deux mailles. En comptant le tour, comptez les deux mailles. Un tour qui doit en avoir 12 semblerait n’en avoir que 6.',
      ],
      tip: 'Les augmentations se cachent dans le tour, car les deux mailles ressemblent à deux mailles ordinaires. Repérez la première maille du tour avec un marqueur, et comparez le total au nombre entre parenthèses chaque fois que vous y revenez. Si vous êtes à une maille près, regardez la dernière augmentation faite.',
    },
  },
  dec: {
    en: {
      how: [
        'A decrease, written “dec”, takes two stitches of the row below and turns them into one. It removes one stitch from the total. In crochet it is worked as a stitch that is left open, then closed with the next.',
        'For a single crochet decrease, insert the hook into the next stitch, yarn over and pull up a loop. Two loops are on the hook. Do not finish the stitch.',
        'Insert the hook into the following stitch, yarn over and pull up a loop again. Three loops are on the hook. Yarn over and pull through all three loops at once. One loop is left, and the two stitches are now one.',
        'In knitting, “dec” is usually a knit two together, worked by inserting the needle through two stitches at once. A pattern may ask for a slanted decrease at the other end of a row, which is another stitch with another name, so check the notes.',
      ],
      inPattern:
        'Take the row “Rnd 9: *sc in next 3 sts, dec* 6 times (24)”. “Rnd 9” is the ninth round. The asterisks enclose a group to repeat. “sc in next 3 sts” is a single crochet in each of the next three stitches. “dec” is a single crochet decrease over the next two stitches. “6 times” says how many times to work the group. Each group uses five stitches of the round below and gives four. The bracket says 24: the previous round had 30, six groups remove six stitches, so you end with 24.',
      usUk: 'Identical. “Dec” means decrease in American and British patterns alike. As with the increase, the name of the stitch inside it changes: a US single crochet decrease is written “sc2tog”, and a British pattern would write “dc2tog”. The gesture and the count are the same.',
      mistakes: [
        'Pulling through only two of the three loops. You then have made a stitch that is neither a decrease nor a stitch that sits properly, and the count on the hook is wrong. Check that there are three loops before the last pull.',
        'Working the decrease into one stitch and the space beside it. A decrease must go through two real stitches, otherwise it leaves a hole. Look for the “V” of each stitch before you insert.',
        'Losing count of the repeats. The bracket tells you the total, but only at the end. With “6 times” written out, put a mark on paper after each group so that you never stop after five.',
      ],
      tip: 'Decreases pull the round in, so the stitches become harder to see as the piece closes. Stop every group and take a quick look: there should be three stitches, then one dec. Put a marker at the start of the round and move it up each time you return to it.',
    },
    fr: {
      how: [
        'Une diminution, notée « dec » dans un patron anglais, prend deux mailles du rang du dessous et en fait une seule. Elle retire une maille du total. Au crochet, elle se travaille comme une maille laissée ouverte, puis refermée avec la suivante.',
        'Pour une diminution en maille serrée, piquez le crochet dans la maille suivante, faites un jeté et tirez une boucle. Il y a deux boucles sur le crochet. Ne terminez pas la maille.',
        'Piquez le crochet dans la maille d’après, faites un jeté et tirez encore une boucle. Il y a maintenant trois boucles sur le crochet. Faites un jeté et passez à travers les trois boucles d’un seul coup. Il reste une boucle, et les deux mailles n’en font plus qu’une.',
        'Au tricot, « dec » est le plus souvent deux mailles tricotées ensemble, en passant l’aiguille dans deux mailles à la fois. Un patron peut demander une diminution penchée à l’autre bout du rang, qui est une autre technique avec un autre nom : lisez les notes.',
      ],
      inPattern:
        'Lisons le tour anglais « Rnd 9: *sc in next 3 sts, dec* 6 times (24) ». « Rnd 9 » désigne le neuvième tour. Les astérisques encadrent un groupe à répéter. « sc in next 3 sts » veut dire une maille serrée dans chacune des trois mailles suivantes. « dec » est une diminution en maille serrée sur les deux mailles suivantes. « 6 times » dit combien de fois travailler le groupe. Chaque groupe utilise cinq mailles du tour du dessous et en donne quatre. Le nombre entre parenthèses annonce 24 : le tour précédent en compte 30, six groupes retirent six mailles, on arrive donc à 24.',
      usUk: 'Identique. « Dec » veut dire diminution dans les patrons américains comme dans les patrons britanniques. Comme pour l’augmentation, le nom de la maille qui y entre change : une diminution américaine en maille serrée s’écrit « sc2tog », alors qu’un patron britannique écrirait « dc2tog ». Le geste et le compte sont les mêmes.',
      mistakes: [
        'Ne passer qu’à travers deux des trois boucles. On obtient alors une maille qui n’est ni une diminution ni une maille bien posée, et le compte des boucles est faux. Vérifiez qu’il y a trois boucles avant le dernier passage.',
        'Travailler la diminution dans une maille et dans l’espace à côté. Une diminution doit traverser deux vraies mailles, sinon elle laisse un trou. Cherchez le « V » de chaque maille avant de piquer.',
        'Perdre le compte des répétitions. Le nombre entre parenthèses donne le total, mais seulement à la fin. Avec « 6 times » écrit, faites un trait sur papier après chaque groupe pour ne jamais vous arrêter à cinq.',
      ],
      tip: 'Les diminutions resserrent le tour, et les mailles deviennent difficiles à voir à mesure que la pièce se ferme. Arrêtez-vous à chaque groupe pour un coup d’œil : trois mailles, puis une dec. Posez un marqueur au début du tour et remontez-le chaque fois que vous y revenez.',
    },
  },
  sk: {
    en: {
      how: [
        'To skip, written “sk”, is to pass over a stitch of the row below without working into it. The stitch stays where it is, and you go straight to the next one. Nothing is made on the skipped stitch.',
        'Look at the row below and find the stitch the pattern wants you to skip. Do not insert the hook there. Insert it into the stitch that follows, and work the stitch the pattern names.',
        'A pattern may say “sk 2 sts”, and then you pass over two stitches. The number after “sk” always counts stitches of the row below, not stitches of the row you are making.',
        'Skipped stitches usually go together with chains. The chain made just before, such as “ch 1”, bridges the gap and makes a small space in the fabric. That space is what makes lace, mesh and shell patterns. Without the chain, the fabric would just close up.',
      ],
      inPattern:
        'Take the row “Row 2: ch 3, sk first st, dc in each st across, turn”. “Row 2” is the second row. “ch 3” is the turning chain, three chains that lift the hook to the height of a double crochet. “sk first st” means you skip the first stitch of the row below, the one at the foot of the chain, because the chain stands in for it. “dc in each st across” means one double crochet in every following stitch until the end of the row. “turn” means flip the work. This row has no number in brackets, so count your stitches against the row before it.',
      usUk: 'Identical. “Sk” means skip in American patterns, and British patterns use the same abbreviation, sometimes written “miss” in full words, as in “miss 2 sts”. The gesture is the same. Only the stitch names change between conventions, and here “dc” would be “tr” in a British pattern.',
      mistakes: [
        'Skipping the wrong number of stitches. If the pattern says “sk 2”, working into the first and skipping only one leaves the row a stitch too long, and the fabric slowly bends.',
        'Forgetting to skip at the start of a row when the turning chain counts as a stitch. You then work a stitch into the foot of the chain as well, and the row has one stitch too many. Compare the total with the row before.',
        'Skipping a stitch of the row you are making instead of the row below. The skipped stitch is always in the previous row. If your work has no gap, you have probably skipped in the wrong row.',
      ],
      tip: 'A skipped stitch leaves no trace, so it is easy to forget in a long row. Say it aloud as you go, “work, chain, skip”, and keep a finger on the skipped stitch until the hook has gone into the next one. If your rhythm breaks, back up and re-read the group.',
    },
    fr: {
      how: [
        'Sauter, noté « sk » dans un patron anglais, c’est passer par-dessus une maille du rang du dessous sans y piquer. La maille reste où elle est, et l’on va directement à la suivante. Rien n’est fait sur la maille sautée.',
        'Regardez le rang du dessous et repérez la maille que le patron veut que vous sautiez. Ne piquez pas le crochet à cet endroit. Piquez-le dans la maille d’après, et faites la maille que le patron indique.',
        'Un patron peut dire « sk 2 sts », et l’on passe alors par-dessus deux mailles. Le nombre après « sk » compte toujours des mailles du rang du dessous, pas des mailles du rang que vous faites.',
        'Les mailles sautées vont d’ordinaire avec des mailles en l’air. La maille en l’air faite juste avant, comme « ch 1 », fait le pont au-dessus du vide et crée un petit espace dans l’ouvrage. C’est cet espace qui fait la dentelle, le filet et les coquilles. Sans elle, l’ouvrage se refermerait.',
      ],
      inPattern:
        'Lisons le rang anglais « Row 2: ch 3, sk first st, dc in each st across, turn ». « Row 2 » est le deuxième rang. « ch 3 » désigne les mailles en l’air de montée, trois mailles qui amènent le crochet à la hauteur d’une bride. « sk first st » veut dire qu’on saute la première maille du rang du dessous, celle qui se trouve au pied de la montée, car la montée la remplace. « dc in each st across » veut dire une bride dans chacune des mailles suivantes jusqu’à la fin du rang. « turn » signifie qu’on retourne l’ouvrage. Ce rang n’a pas de nombre entre parenthèses : comparez donc votre compte à celui du rang d’avant.',
      usUk: 'Identique. « Sk » veut dire sauter dans les patrons américains, et les patrons britanniques emploient la même abréviation, parfois écrite en toutes lettres « miss », comme dans « miss 2 sts ». Le geste est le même. Seuls les noms de mailles changent d’une convention à l’autre, et ici « dc » serait « tr » dans un patron britannique.',
      mistakes: [
        'Sauter le mauvais nombre de mailles. Si le patron dit « sk 2 », piquer dans la première et n’en sauter qu’une laisse le rang trop long d’une maille, et l’ouvrage se courbe peu à peu.',
        'Oublier de sauter en début de rang quand la montée compte pour une maille. On pique alors aussi dans le pied de la montée, et le rang a une maille de trop. Comparez le total à celui du rang d’avant.',
        'Sauter une maille du rang qu’on fait au lieu de celle du rang du dessous. La maille sautée est toujours dans le rang précédent. Si votre ouvrage n’a pas d’espace, vous avez sans doute sauté dans le mauvais rang.',
      ],
      tip: 'Une maille sautée ne laisse aucune trace, et on l’oublie facilement dans un long rang. Dites-le à voix haute au fil du travail, « maille, chaînette, saut », et gardez un doigt sur la maille sautée jusqu’à ce que le crochet soit entré dans la suivante. Si votre rythme se casse, revenez en arrière et relisez le groupe.',
    },
  },
};
