import { TermArticles } from './types';

/** Cinq abréviations de tricot : `k2tog`, `ssk`, `m1`, `tbl` et `magic-loop`. */
export const KNITTING: TermArticles = {
  k2tog: {
    en: {
      how: [
        'K2tog stands for “knit two together”. It is a decrease: two stitches become one, so the row is one stitch shorter afterwards. It is the most common way to shape a hat crown, a sleeve or a shawl edge.',
        'Hold the yarn at the back, as for any knit stitch. Instead of going into one stitch, put the right needle into the next two stitches on the left needle at once, from left to right, through the front of both, as if to knit.',
        'Wrap the yarn round the right needle and pull the loop through both stitches, then let the two old stitches slip off the left needle. One new stitch sits on the right needle.',
        'A k2tog leans to the right: the stitch on top lies over the one beside it, pointing towards the right. When a pattern wants a decrease that leans the other way, it asks for an ssk. The two are worked as a pair, so that the shaping looks even on both sides.',
      ],
      inPattern:
        'Take the row “Row 5: k2, *k2tog, k3; rep from * to end.” “Row 5” is the fifth row. “k2” means knit two stitches, plainly. The asterisk opens a group: “k2tog” is the decrease, then “k3” knits three stitches. “rep from * to end” asks you to start the group again, over and over, until the end of the row. Each pass uses five stitches of the row below and makes four, so your count falls by one per group.',
      usUk: 'Identical. American and British knitting patterns both write k2tog, and it means the same movement. Only crochet changes between the two conventions, not this abbreviation. French patterns write something like “2 m. ens. à l’endroit”.',
      mistakes: [
        'Knitting only one of the two stitches. You then keep the same number of stitches, and the row does not narrow. Look at the needle after the stitch: the left needle should have lost two stitches, the right one gained one.',
        'Working it through the back instead of the front. That is another decrease, and it leans the other way. If the slant looks wrong, check the pattern for “k2tog tbl”.',
        'Pulling the yarn too tight. The two stitches are thick together and the needle goes in with difficulty; keep the stitches near the tip and work with a relaxed hand.',
      ],
      tip: 'Count your stitches at the end of each decrease row and write the number down. A row with k2tog has a total in brackets at its end, and checking it takes five seconds. If your fabric feels too tight at the decreases, see the knitting needle sizes page of this site: a needle one size up often helps.',
    },
    fr: {
      how: [
        'K2tog vient de « knit two together » : tricoter deux mailles ensemble. C’est une diminution : deux mailles n’en font plus qu’une, et le rang compte une maille de moins ensuite. C’est la façon la plus courante de façonner le dessus d’un bonnet, une manche ou le bord d’un châle.',
        'Tenez le fil derrière l’ouvrage, comme pour toute maille endroit. Au lieu d’entrer dans une seule maille, piquez l’aiguille droite dans les deux mailles suivantes de l’aiguille gauche à la fois, de gauche à droite, par l’avant des deux, comme pour les tricoter.',
        'Passez le fil autour de l’aiguille droite et ramenez la boucle à travers les deux mailles, puis laissez glisser les deux anciennes mailles hors de l’aiguille gauche. Une seule nouvelle maille reste sur l’aiguille droite.',
        'Un k2tog penche vers la droite : la maille du dessus recouvre sa voisine, en pointant vers la droite. Quand un patron veut une diminution qui penche de l’autre côté, il demande un ssk. Les deux se travaillent en paire, pour que le façonnage paraisse régulier des deux côtés.',
      ],
      inPattern:
        'Lisons le rang « Row 5: k2, *k2tog, k3; rep from * to end. » « Row 5 » désigne le cinquième rang. « k2 » veut dire tricoter deux mailles endroit, simplement. L’astérisque ouvre un groupe : « k2tog » est la diminution, puis « k3 » tricote trois mailles. « rep from * to end » demande de recommencer le groupe, encore et encore, jusqu’à la fin du rang. Chaque passage consomme cinq mailles du rang précédent et en fabrique quatre : le total baisse donc d’une maille par groupe.',
      usUk: 'Identique. Les patrons de tricot américains et britanniques écrivent tous k2tog, pour le même geste. Seul le crochet change d’une convention à l’autre, pas cette abréviation. Les patrons français écrivent plutôt « 2 m. ens. à l’endroit ».',
      mistakes: [
        'Ne tricoter qu’une seule des deux mailles. Le nombre de mailles reste le même et le rang ne se rétrécit pas. Regardez l’aiguille après la maille : l’aiguille gauche doit avoir perdu deux mailles, la droite en avoir gagné une.',
        'La travailler par l’arrière au lieu de l’avant. C’est une autre diminution, qui penche de l’autre côté. Si l’inclinaison paraît mauvaise, cherchez « k2tog tbl » dans le patron.',
        'Serrer trop le fil. Les deux mailles sont épaisses ensemble et l’aiguille entre mal : gardez les mailles près de la pointe et travaillez la main détendue.',
      ],
      tip: 'Comptez vos mailles à la fin de chaque rang de diminutions et notez le total. Un rang à k2tog se termine par un total entre parenthèses, et le vérifier prend cinq secondes. Si l’ouvrage est trop serré aux diminutions, consultez la page des tailles d’aiguilles à tricoter de ce site : une aiguille d’une taille au-dessus aide souvent.',
    },
  },
  ssk: {
    en: {
      how: [
        'Ssk stands for “slip, slip, knit”. Like k2tog, it is a decrease that turns two stitches into one, but it leans to the left. Used together, the two give symmetrical shaping.',
        'Slip the first stitch from the left needle to the right needle, as if to knit: put the right needle into it from left to right, and let it slide off without working it. Do the same with the second stitch, one at a time.',
        'Both stitches are now on the right needle. Put the tip of the left needle into the fronts of those two stitches, from left to right, so that they sit on the left needle again, turned. Then knit them together through the back, with the right needle.',
        'The turn is the whole point of the gesture. Slipping the stitches as if to knit twists them slightly, and knitting them together through the back untwists them. The result is a neat decrease that leans to the left.',
      ],
      inPattern:
        'Take the row “Row 7: k1, ssk, knit to last 3 sts, k2tog, k1.” “Row 7” is the seventh row. “k1” knits the first stitch. “ssk” is the left-leaning decrease, at the start of the row. “knit to last 3 sts” means to knit plainly until three stitches remain on the left needle. “k2tog” is the right-leaning decrease, at the end, and “k1” knits the last stitch. This row loses two stitches, one on each side, which is why the pattern uses both decreases: the shaping stays symmetrical.',
      usUk: 'Identical. American and British patterns both write ssk, with the same movement. A few patterns use a variant such as “skp” or “sl1, k1, psso” for a similar left-leaning decrease. Read the pattern’s notes if the abbreviation is defined there.',
      mistakes: [
        'Slipping the stitches as if to purl. The decrease then leans the same way as a k2tog, or the stitches come out twisted. Slip both as if to knit.',
        'Knitting the two stitches through the front once they are back on the left needle. They stay twisted and the decrease looks crossed. Go in through the back, as the gesture asks.',
        'Forgetting that the slipped stitches are still counted. Before the knit, you have two stitches to work; after it, one.',
      ],
      tip: 'Look at the decrease on the next row: a good ssk leans to the left and matches the k2tog on the other side. If your ssk looks loose, slip the stitches a little tighter, or work the first one closer to the needle tip. See also “k2tog”, its right-leaning twin.',
    },
    fr: {
      how: [
        'Ssk vient de « slip, slip, knit » : glisser, glisser, tricoter. Comme le k2tog, c’est une diminution qui transforme deux mailles en une seule, mais elle penche vers la gauche. Utilisées ensemble, les deux donnent un façonnage symétrique.',
        'Glissez la première maille de l’aiguille gauche sur l’aiguille droite, comme pour la tricoter : piquez l’aiguille droite dedans, de gauche à droite, et laissez-la glisser sans la travailler. Faites de même avec la deuxième maille, une par une.',
        'Les deux mailles sont maintenant sur l’aiguille droite. Introduisez la pointe de l’aiguille gauche dans l’avant de ces deux mailles, de gauche à droite, pour les remettre sur l’aiguille gauche, retournées. Tricotez-les ensuite ensemble par l’arrière, avec l’aiguille droite.',
        'Ce retournement est le cœur du geste. Glisser les mailles comme pour les tricoter les tord un peu, et les tricoter ensemble par l’arrière les détord. On obtient une diminution nette qui penche vers la gauche.',
      ],
      inPattern:
        'Lisons le rang « Row 7: k1, ssk, knit to last 3 sts, k2tog, k1. » « Row 7 » désigne le septième rang. « k1 » tricote la première maille. « ssk » est la diminution penchée à gauche, au début du rang. « knit to last 3 sts » veut dire tricoter à l’endroit jusqu’à ce qu’il reste trois mailles sur l’aiguille gauche. « k2tog » est la diminution penchée à droite, à la fin, et « k1 » tricote la dernière maille. Ce rang perd deux mailles, une de chaque côté, et c’est pourquoi le patron emploie les deux diminutions : le façonnage reste symétrique.',
      usUk: 'Identique. Les patrons américains et britanniques écrivent tous ssk, pour le même geste. Quelques patrons emploient une variante comme « skp » ou « sl1, k1, psso » pour une diminution penchée à gauche voisine. Lisez les notes du patron si l’abréviation y est définie.',
      mistakes: [
        'Glisser les mailles comme pour les tricoter à l’envers. La diminution penche alors du même côté qu’un k2tog, ou les mailles sortent tordues. Glissez les deux comme pour les tricoter à l’endroit.',
        'Tricoter les deux mailles par l’avant une fois remises sur l’aiguille gauche. Elles restent tordues et la diminution paraît croisée. Entrez par l’arrière, comme le geste le demande.',
        'Oublier que les mailles glissées comptent toujours. Avant le geste, vous avez deux mailles à travailler ; après, une seule.',
      ],
      tip: 'Regardez la diminution au rang suivant : un bon ssk penche vers la gauche et répond au k2tog de l’autre côté. Si votre ssk paraît lâche, glissez les mailles un peu plus serrées, ou travaillez la première près de la pointe de l’aiguille. Voyez aussi « k2tog », son jumeau penché à droite.',
    },
  },
  m1: {
    en: {
      how: [
        'M1 stands for “make one stitch”. It is an increase: it adds one stitch to the row without a hole, by making a new stitch from the thread that runs between two stitches. It is used to widen a sleeve, a sock or the body of a sweater.',
        'Work up to the place the pattern shows. Between the stitch on the right needle and the next stitch on the left needle, a thread runs across from one to the other. Slip the tip of the left needle under that thread, from front to back, so that it sits on the left needle like a stitch.',
        'Now knit that loop through the back: put the right needle into its back side, from right to left, wrap the yarn and pull the new loop through. Knitting through the back twists the strand, and that twist is what closes the hole.',
        'Some patterns tell the increases apart by their slant and write them m1l and m1r. If yours does, it defines them in its notes: follow those notes.',
      ],
      inPattern:
        'Take the row “Row 3: k1, m1, knit to last st, m1, k1.” “Row 3” is the third row. “k1” knits the first stitch. “m1” makes a new stitch from the thread after it. “knit to last st” means to knit plainly until one stitch remains on the left needle. “m1” makes a second new stitch, and “k1” knits the last. This row gains two stitches, one near each edge, so the work widens evenly. If the row below had twenty stitches, this one has twenty-two.',
      usUk: 'Identical. American and British patterns both write m1, and mean the same increase. Only crochet differs between the two, not this abbreviation. French patterns usually write “1 augmentation intercalaire”.',
      mistakes: [
        'Knitting the new loop through the front. The strand is not twisted, and a small hole appears. If you want a hole on purpose, as in lace, the pattern asks for a yarn over (yo), not an m1.',
        'Picking up the stitch below instead of the thread between the stitches. You then pull on the fabric, and the increase is crooked. Look for the thread that links the two needles.',
        'Forgetting that m1 adds a stitch to the total. Add it to your count at once, or the row will seem to be off.',
      ],
      tip: 'Mark the place of each increase with a small marker, or by writing the new total on a sticky note. Increases at the same two places on every increase row line up and make a clean seam. If the increase pulls, work it with a slightly looser hand; see the knitting needle sizes page of this site if the fabric feels tight.',
    },
    fr: {
      how: [
        'M1 vient de « make one stitch » : faire une maille. C’est une augmentation : elle ajoute une maille au rang sans trou, en fabriquant une nouvelle maille avec le fil qui court entre deux mailles. On s’en sert pour élargir une manche, une chaussette ou le corps d’un pull.',
        'Tricotez jusqu’à l’endroit indiqué par le patron. Entre la maille de l’aiguille droite et la maille suivante de l’aiguille gauche, un fil passe de l’une à l’autre. Glissez la pointe de l’aiguille gauche sous ce fil, d’avant en arrière, pour qu’il repose sur l’aiguille gauche comme une maille.',
        'Tricotez maintenant cette boucle par l’arrière : piquez l’aiguille droite dans son côté arrière, de droite à gauche, passez le fil et ramenez la nouvelle boucle. Tricoter par l’arrière tord le brin, et cette torsion ferme le trou.',
        'Certains patrons distinguent les augmentations selon leur inclinaison et écrivent m1l et m1r. Si le vôtre le fait, il les définit dans ses notes : suivez ces notes.',
      ],
      inPattern:
        'Lisons le rang « Row 3: k1, m1, knit to last st, m1, k1. » « Row 3 » désigne le troisième rang. « k1 » tricote la première maille. « m1 » fait une nouvelle maille avec le fil qui suit. « knit to last st » veut dire tricoter à l’endroit jusqu’à ce qu’il reste une maille sur l’aiguille gauche. « m1 » fait une deuxième nouvelle maille, et « k1 » tricote la dernière. Ce rang gagne deux mailles, une près de chaque bord, et l’ouvrage s’élargit donc régulièrement. Si le rang précédent comptait vingt mailles, celui-ci en compte vingt-deux.',
      usUk: 'Identique. Les patrons américains et britanniques écrivent tous m1, pour la même augmentation. Seul le crochet change d’une convention à l’autre, pas cette abréviation. Les patrons français écrivent plutôt « 1 augmentation intercalaire ».',
      mistakes: [
        'Tricoter la nouvelle boucle par l’avant. Le brin n’est pas tordu et un petit trou apparaît. Si vous voulez un trou exprès, comme dans la dentelle, le patron demande un jeté (yo), pas un m1.',
        'Relever la maille du rang inférieur au lieu du fil entre les mailles. Vous tirez alors sur l’ouvrage et l’augmentation sort de travers. Cherchez le fil qui relie les deux aiguilles.',
        'Oublier que m1 ajoute une maille au total. Ajoutez-la tout de suite à votre compte, sinon le rang semblera faux.',
      ],
      tip: 'Repérez la place de chaque augmentation avec un petit marqueur, ou notez le nouveau total sur un papillon. Des augmentations aux deux mêmes endroits à chaque rang d’augmentation s’alignent et forment une couture nette. Si l’augmentation tire, travaillez-la la main un peu plus lâche ; voyez la page des tailles d’aiguilles à tricoter de ce site si l’ouvrage paraît serré.',
    },
  },
  tbl: {
    en: {
      how: [
        'Tbl stands for “through the back loop”. In knitting, it asks you to work a stitch by going into its back leg instead of the front one. The stitch comes out twisted, which gives a firmer and more defined line of knitting.',
        'For a knit stitch, written “k1 tbl”, put the right needle into the stitch from right to left, behind the left needle, so that it enters the back leg of the stitch. Wrap the yarn as usual and pull the loop through.',
        'For a purl stitch, written “p1 tbl”, the idea is the same: go in through the back leg of the stitch, and work the purl as you normally would.',
        'The twist is wanted, and it is the reason the pattern asks for it. It is used in twisted rib, and wherever the pattern wants a stitch to stand out as a crisp line. A stitch that was put on the needle the wrong way round is also set right by working it tbl.',
      ],
      inPattern:
        'Take the row “Row 3: *k1 tbl, p1; rep from * to end.” “Row 3” is the third row. The asterisk opens a group of two instructions. “k1 tbl” knits one stitch through the back loop. “p1” purls one stitch, plainly. “rep from * to end” asks you to start the group again until the end of the row. The result is a twisted rib: the knit columns are narrow and crisp, and they stand out against the purl columns between them.',
      usUk: 'Identical. American and British patterns both write tbl, with the same movement. Do not mix it up with crochet, where the back loop is written “blo”: in crochet the loop is one of the two at the top of the stitch, not a leg of a knitted stitch.',
      mistakes: [
        'Going in through the front. The stitch is then ordinary, and the twisted rib turns into a plain one. After a few rows the columns look softer than the pattern’s picture.',
        'Twisting every stitch of the row when the pattern asked for only some. Tbl applies to the stitch that comes just before it, not to the whole row. Read the instruction up to its comma.',
        'Working the stitch tbl, then finding it hard to enter on the next row. The twisted stitch is tighter. Keep a relaxed hand, and keep the stitches near the needle tips.',
      ],
      tip: 'Say the instruction aloud: “knit, back leg”. Then look at the stitch before you enter it. The leg that sits farther from you is the back one. A mark at the start of the row keeps the rhythm of the rib, and the knitting needle sizes page of this site helps if twisted stitches feel tight.',
    },
    fr: {
      how: [
        'Tbl vient de « through the back loop » : par le brin arrière. Au tricot, il demande de travailler une maille en piquant dans son brin arrière au lieu du brin avant. La maille sort tordue, ce qui donne une ligne de tricot plus ferme et mieux dessinée.',
        'Pour une maille endroit, écrite « k1 tbl », piquez l’aiguille droite dans la maille de droite à gauche, derrière l’aiguille gauche, de façon à entrer dans le brin arrière. Passez le fil comme d’habitude et ramenez la boucle.',
        'Pour une maille envers, écrite « p1 tbl », l’idée est la même : entrez par le brin arrière de la maille, et travaillez l’envers comme à l’ordinaire.',
        'La torsion est voulue, et c’est pour cela que le patron la demande. On l’emploie dans les côtes torsadées, et partout où le patron veut qu’une maille ressorte en ligne nette. Une maille posée à l’envers sur l’aiguille est aussi remise en place en la travaillant tbl.',
      ],
      inPattern:
        'Lisons le rang « Row 3: *k1 tbl, p1; rep from * to end. » « Row 3 » désigne le troisième rang. L’astérisque ouvre un groupe de deux instructions. « k1 tbl » tricote une maille à l’endroit par le brin arrière. « p1 » tricote une maille à l’envers, simplement. « rep from * to end » demande de recommencer le groupe jusqu’à la fin du rang. Le résultat est une côte torsadée : les colonnes à l’endroit sont étroites et nettes, et elles ressortent entre les colonnes à l’envers.',
      usUk: 'Identique. Les patrons américains et britanniques écrivent tous tbl, pour le même geste. Ne le confondez pas avec le crochet, où le brin arrière s’écrit « blo » : au crochet, il s’agit de l’une des deux boucles du haut de la maille, pas d’un brin de maille tricotée.',
      mistakes: [
        'Entrer par l’avant. La maille est alors ordinaire, et la côte torsadée devient une côte simple. Au bout de quelques rangs, les colonnes paraissent plus molles que sur l’image du patron.',
        'Tordre toutes les mailles du rang alors que le patron n’en demandait que certaines. Tbl s’applique à la maille qui le précède, pas au rang entier. Lisez l’instruction jusqu’à sa virgule.',
        'Travailler la maille tbl, puis avoir du mal à y entrer au rang suivant. La maille tordue est plus serrée. Gardez la main détendue et les mailles près de la pointe des aiguilles.',
      ],
      tip: 'Dites l’instruction à voix haute : « endroit, brin arrière ». Regardez ensuite la maille avant d’y entrer. Le brin le plus éloigné de vous est l’arrière. Un repère au début du rang garde le rythme de la côte, et la page des tailles d’aiguilles à tricoter de ce site aide si les mailles tordues paraissent serrées.',
    },
  },
  'magic-loop': {
    en: {
      how: [
        'Magic loop is a way of knitting in the round, for a hat crown, a sleeve or a sock, on one long circular needle instead of a set of short double-pointed needles. It is a technique, not a stitch. Do not confuse it with the magic ring of crochet, which is a different way to start a round.',
        'You need a circular needle with a long cable, often 80 cm or more. Cast on all the stitches, then slide them onto the cable and divide them into two equal halves.',
        'Pull the cable out in a loop between the two halves, so that half the stitches rest on each needle tip. The working yarn comes from the back stitch. Knit the stitches of the front needle, pushing them along as you go.',
        'When the front half is done, slide the stitches along and turn the work. Pull the other tip out and knit the second half. One round is both halves, and you can repeat it as long as the pattern asks. The work forms a tube, and the cable loops stay out of the way.',
      ],
      inPattern:
        'Take the instruction “Rnd 1: with the magic loop method, k all sts (24)”. “Rnd 1” is the first round, since in the round there are no rows to turn. “with the magic loop method” tells you to hold the stitches on a long circular needle, in two halves. “k all sts” means to knit every stitch. The number in brackets, 24, is the total you should have: twelve on each half. If a half has more or fewer than twelve, count again before you go on.',
      usUk: 'Identical. The method has the same name and the same movement in American and British patterns. Only the needle size can change, because some British patterns still give it in old sizes. See the knitting needle sizes page of this site to match them.',
      mistakes: [
        'Leaving the cable loose at the join between halves. A gap, called a ladder, appears in the fabric. After the first stitch of each half, pull the yarn a little tighter.',
        'Twisting the cast-on before knitting in the round. The tube is then twisted for good. Check that all the stitches face the same way before you begin.',
        'Losing the start of the round. With the stitches in two halves, it is easy to forget which half is first. Put a marker on the first stitch.',
      ],
      tip: 'Put a marker at the start of the round and count the rounds on the reader’s round counter. After each pull of the cable, check the yarn comes from the stitch on the back needle. If the cable is too short, stitches stretch and the loop is hard to pull out.',
    },
    fr: {
      how: [
        'Le magic loop est une façon de tricoter en rond, pour le dessus d’un bonnet, une manche ou une chaussette, sur une seule longue aiguille circulaire, à la place d’un jeu de petites aiguilles double pointe. C’est une technique, pas une maille. Ne la confondez pas avec le cercle magique du crochet, qui est une autre façon de commencer un tour.',
        'Il faut une aiguille circulaire à câble long, souvent de 80 cm ou plus. Montez toutes les mailles, puis faites-les glisser sur le câble et partagez-les en deux moitiés égales.',
        'Tirez le câble en boucle entre les deux moitiés, pour que la moitié des mailles repose sur chaque pointe d’aiguille. Le fil de travail sort de la maille arrière. Tricotez les mailles de l’aiguille avant, en les poussant au fur et à mesure.',
        'Quand la moitié avant est faite, faites glisser les mailles et retournez l’ouvrage. Tirez l’autre pointe et tricotez la seconde moitié. Un tour, ce sont les deux moitiés, et vous le répétez autant que le patron le demande. L’ouvrage forme un tube, et les boucles du câble restent à l’écart.',
      ],
      inPattern:
        'Lisons l’instruction « Rnd 1: with the magic loop method, k all sts (24) ». « Rnd 1 » désigne le premier tour, car en rond il n’y a pas de rangs à retourner. « with the magic loop method » demande de tenir les mailles sur une longue aiguille circulaire, en deux moitiés. « k all sts » veut dire tricoter toutes les mailles à l’endroit. Le nombre entre parenthèses, 24, est le total attendu : douze sur chaque moitié. Si une moitié en compte plus ou moins de douze, recomptez avant de continuer.',
      usUk: 'Identique. La méthode porte le même nom et suit le même geste dans les patrons américains et britanniques. Seule la taille d’aiguille peut changer, car certains patrons britanniques la donnent encore dans les anciennes tailles. Voyez la page des tailles d’aiguilles à tricoter de ce site pour les faire correspondre.',
      mistakes: [
        'Laisser le câble lâche à la jonction des deux moitiés. Un jour, appelé échelle, apparaît dans l’ouvrage. Après la première maille de chaque moitié, tirez un peu plus le fil.',
        'Tordre le montage avant de tricoter en rond. Le tube reste alors tordu pour de bon. Vérifiez que toutes les mailles regardent du même côté avant de commencer.',
        'Perdre le début du tour. Avec les mailles en deux moitiés, on oublie vite laquelle commence. Posez un marqueur sur la première maille.',
      ],
      tip: 'Posez un marqueur au début du tour et comptez les tours avec le compteur de rangs du lecteur. Après chaque passage du câble, vérifiez que le fil sort de la maille de l’aiguille arrière. Si le câble est trop court, les mailles s’étirent et la boucle est difficile à tirer.',
    },
  },
};
