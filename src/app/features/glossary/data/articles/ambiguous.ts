import { TermArticles } from './types';

/**
 * Abréviations ambiguës ou décalées entre conventions, enrichies pour sortir
 * du gabarit (fiche SEO du 2026-10-04) : les hauteurs britanniques (`htr`,
 * `dtr`, `trtr`), les lettres qui changent de sens selon la technique ou le
 * patron (`ss`, `dbr`, `bo`), l'espace et le bouquet (`sp`, `cl`), le montage
 * du tricot (`co`). Chacune a sa FAQ, reprise mot pour mot en `FAQPage`.
 */
export const AMBIGUOUS: TermArticles = {
  htr: {
    fr: {
      how: [
        'htr est le nom britannique de la demi-bride : le point qu’un patron américain appelle half double crochet (hdc) et un patron français demi-bride (db). Elle se place entre le double crochet britannique, la plus basse des mailles de travail, et le treble britannique.',
        'Faites un jeté, piquez dans la maille, faites un jeté et ramenez une boucle : il y a trois boucles sur le crochet. Faites un dernier jeté et écoulez les trois boucles d’un coup. C’est cette seule dernière écoulée qui en fait une demi-maille.',
        'Elle donne un tissu plus ferme que la bride et monte plus vite que la maille serrée, d’où sa place dans les couvertures, les bonnets et les gilets.',
      ],
      inPattern:
        'Dans « Row 2: ch 2, htr in each st across, turn (18) », « ch 2 » est la chaînette de tour qui monte le crochet à la hauteur d’une demi-bride. « htr in each st across » veut dire une demi-bride dans chaque maille du rang précédent, jusqu’au bout. « turn » demande de tourner l’ouvrage avant le rang suivant, et « (18) » donne le nombre de mailles à obtenir en fin de rang. Les notes du patron disent si la chaînette compte comme une maille ; le nombre entre parenthèses permet de vérifier.',
      usUk: 'htr n’existe qu’en notation britannique. Un patron américain écrit le même point « hdc », un patron français « db » ou « demi-bride ». Si vous rencontrez htr, tout le patron est en notation britannique : son « dc » est une maille serrée et son « tr » une bride. Le convertisseur US ↔ UK réécrit tout le patron dans l’autre convention.',
      mistakes: [
        'Lire le reste du patron en notation américaine. Dès qu’un htr apparaît, les dc et tr du même patron sont britanniques ; les travailler à l’américaine rend l’ouvrage plus haut et plus large que prévu.',
        'Écouler deux boucles, puis encore deux. C’est une bride ; pour une demi-bride, le dernier jeté traverse les trois boucles ensemble.',
      ],
      tip: 'Si un patron ne dit pas sa convention, cherchez htr ou trtr : ils n’existent qu’en notation britannique. Une seule occurrence suffit à trancher pour tout le patron.',
      faq: [
        {
          q: 'htr, c’est la même chose que hdc ?',
          a: 'Oui. htr (britannique) et hdc (américain) désignent la même demi-bride, travaillée de la même façon ; seul le nom change avec la convention.',
        },
        {
          q: 'Combien de mailles en l’air pour commencer un rang de htr ?',
          a: 'En général 2, la hauteur de la maille. Certains patrons les comptent comme première maille du rang, d’autres non : les notes ou le nombre entre parenthèses le disent.',
        },
      ],
    },
    en: {
      how: [
        'htr is the British name for the half treble: the stitch an American pattern calls half double crochet (hdc) and a French pattern calls demi-bride (db). It sits between the British double crochet, the shortest working stitch, and the British treble.',
        'Yarn over, insert the hook into the stitch, yarn over and pull up a loop: there are three loops on the hook. Yarn over once more and pull through all three loops at once. That single last pull is what makes it a half stitch.',
        'It gives a fabric that is firmer than trebles and grows faster than double crochets, which is why it is common in blankets, hats and cardigans.',
      ],
      inPattern:
        'In “Row 2: ch 2, htr in each st across, turn (18)”, “ch 2” is the turning chain that lifts the hook to the height of a half treble. “htr in each st across” means one half treble in every stitch of the previous row, to the end. “turn” means you turn the work before the next row, and “(18)” is the stitch count you should have at the end of the row. Whether the turning chain counts as a stitch is set by the pattern’s notes; the count in brackets lets you check.',
      usUk: 'htr only exists in British notation. An American pattern writes the same stitch “hdc”, and a French pattern “db” or “demi-bride”. If you meet htr, the whole pattern is in British terms: its “dc” is an American single crochet and its “tr” an American double crochet. The US ↔ UK converter rewrites the whole pattern in the other convention.',
      mistakes: [
        'Reading the rest of the pattern in American terms. Once you have seen htr, every dc and tr in the same pattern is British; working them as American stitches makes the piece taller and wider than intended.',
        'Pulling through two loops, then two again. That is a treble; for a half treble, the last yarn over goes through all three loops together.',
      ],
      tip: 'If a pattern doesn’t say which convention it uses, look for htr or trtr: they only exist in British notation. One occurrence is enough to settle the question for the whole pattern.',
      faq: [
        {
          q: 'Is htr the same as hdc?',
          a: 'Yes. htr (UK half treble) and hdc (US half double crochet) are the same stitch, worked the same way; only the name changes with the convention.',
        },
        {
          q: 'How many chains does a row of htr start with?',
          a: 'Usually 2, the height of the stitch. Some patterns count them as the first stitch of the row, others don’t: the notes or the stitch count in brackets tell you which.',
        },
      ],
    },
  },
  dtr: {
    fr: {
      how: [
        'dtr veut dire double treble. Dans un patron américain, c’est une maille haute à trois jetés avant de piquer, celle qu’un patron français appelle triple bride. Dans un patron britannique, les mêmes lettres désignent une maille plus basse : voir la partie américain ou britannique plus bas.',
        'dtr américain : faites trois jetés, piquez dans la maille, faites un jeté et ramenez une boucle : cinq boucles sur le crochet. Puis faites un jeté et écoulez deux boucles, quatre fois de suite, jusqu’à n’en garder qu’une.',
        'Parce qu’elle est haute, elle sert aux ajours, aux bordures de dentelle et aux rangs qui doivent monter vite, plutôt qu’aux tissus serrés.',
      ],
      inPattern:
        'Dans « Row 5: ch 5 (counts as dtr), dtr in each st across, turn (20) », les cinq mailles en l’air montent le crochet à la hauteur de la maille et comptent comme première maille, comme le disent les parenthèses. Vous faites ensuite un dtr dans chaque maille restante, tournez, et devez compter 20 mailles, chaînette comprise. Si vous en comptez 19, vous avez sans doute oublié la dernière, le haut de la chaînette du rang précédent.',
      usUk: 'C’est là que les deux conventions divergent. Le dtr américain a trois jetés ; un patron britannique écrit cette maille « trtr », triple treble. Le « dtr » britannique n’a que deux jetés : c’est la maille que les Américains appellent tr. Donc dtr américain = trtr britannique = triple bride, et dtr britannique = tr américain = double bride. Cherchez htr ou trtr dans le patron pour savoir lequel vous avez.',
      mistakes: [
        'Travailler un dtr britannique comme un américain. Chaque maille gagne un jeté de hauteur, et l’ouvrage dépasse largement la taille annoncée.',
        'Écouler trois boucles d’un coup. Dans la famille des brides, chaque écoulée ne traverse que deux boucles ; comptez-les : quatre pour un dtr américain.',
      ],
      tip: 'Retenez les jetés sur le crochet avec l’index avant de piquer : trois tours lâches glissent facilement. Comptez « un, deux, trois » à voix haute pour les premières mailles.',
      faq: [
        {
          q: 'dtr, c’est américain ou britannique ?',
          a: 'Les deux conventions l’emploient, pour deux mailles différentes. Dans un patron américain, dtr a trois jetés ; dans un patron britannique, deux. Si le patron emploie aussi sc ou hdc, il est américain ; s’il emploie htr ou trtr, il est britannique.',
        },
        {
          q: 'Comment dit-on dtr en français ?',
          a: 'Triple bride dans un patron américain, double bride dans un patron britannique.',
        },
      ],
    },
    en: {
      how: [
        'dtr stands for double treble. In an American pattern it is a tall stitch with three yarn overs before the hook goes in, the stitch a French pattern calls triple bride. In a British pattern the same letters mean a shorter stitch: see the US or UK section below.',
        'American dtr: yarn over three times, insert the hook into the stitch, yarn over and pull up a loop: five loops on the hook. Then yarn over and pull through two loops, four times in a row, until one loop remains.',
        'Because it is tall, it is used for openwork, lace edgings and rows that need to grow quickly, rather than for dense fabric.',
      ],
      inPattern:
        'In “Row 5: ch 5 (counts as dtr), dtr in each st across, turn (20)”, the five chains lift the hook to the height of a double treble and count as the first stitch, as the brackets say. You then work one dtr in each remaining stitch, turn, and should have 20 stitches, the turning chain included. If you count 19, you probably skipped the last stitch, which is the top of the previous row’s turning chain.',
      usUk: 'This is where the two conventions disagree. An American dtr has three yarn overs; a British pattern writes that stitch “trtr”, triple treble. A British “dtr” has only two yarn overs, the stitch Americans call treble (tr). So dtr (US) equals trtr (UK), triple bride in French, and dtr (UK) equals tr (US), double bride in French. Look for htr or trtr in the pattern to know which one you have.',
      mistakes: [
        'Working a British dtr as an American one. Each stitch comes out one yarn over taller, and the piece grows well beyond the size announced.',
        'Pulling through three loops at once. Each pass of a treble-family stitch goes through two loops only; count the passes: four for an American dtr.',
      ],
      tip: 'Hold the yarn overs on the hook with your index finger before inserting it: three loose wraps slip off easily. Count “one, two, three” aloud for the first few stitches.',
      faq: [
        {
          q: 'Is dtr American or British?',
          a: 'Both conventions use it, for different stitches. In an American pattern dtr has three yarn overs; in a British one it has two. If the pattern also uses sc or hdc, it is American; if it uses htr or trtr, it is British.',
        },
        {
          q: 'What is dtr in French?',
          a: 'Triple bride in an American pattern, double bride in a British one.',
        },
      ],
    },
  },
  trtr: {
    fr: {
      how: [
        'trtr est le triple treble britannique : une maille haute à trois jetés avant de piquer. Un patron américain écrit le même point « dtr », un patron français « triple bride ».',
        'Faites trois jetés, piquez dans la maille, faites un jeté et ramenez une boucle : cinq boucles sur le crochet. Faites un jeté et écoulez deux boucles, quatre fois, jusqu’à n’en garder qu’une.',
        'C’est une maille d’ajours et de bordures : quelques rangs suffisent à gagner beaucoup de hauteur avec peu de fil.',
      ],
      inPattern:
        '« Row 5: ch 5 (counts as trtr), trtr in each st across, turn (20) » commence par cinq mailles en l’air, qui atteignent la hauteur de la maille et comptent comme la première, comme le disent les parenthèses. Puis un trtr va dans chaque maille jusqu’au bout du rang ; vous tournez l’ouvrage et devez compter 20 mailles, chaînette comprise.',
      usUk: 'trtr n’existe qu’en notation britannique : sa présence dit que tout le patron est britannique. Son dc est une maille serrée, son tr une bride, son dtr une double bride. Le nom américain du trtr est dtr. Le convertisseur US ↔ UK réécrit le patron dans l’une ou l’autre convention.',
      mistakes: [
        'Lire les autres mailles du patron en notation américaine parce qu’elles semblent familières. Dans un patron britannique, chaque maille se décale d’un cran.',
        'Laisser glisser les jetés avant de piquer. La maille sort plus basse et le rang irrégulier.',
      ],
      tip: 'Les mailles hautes penchent si la chaînette de tour est trop serrée. Faites-la lâche, ou ajoutez une maille en l’air si votre première maille paraît toujours plus courte que les autres.',
      faq: [
        {
          q: 'trtr, c’est la même chose que dtr ?',
          a: 'trtr (britannique) est la même maille que dtr (américain) : trois jetés. Mais le dtr britannique est une maille plus basse, à deux jetés.',
        },
        {
          q: 'Combien de mailles en l’air pour commencer un rang de trtr ?',
          a: 'En général 5, comme dans l’exemple. Le patron dit si elles comptent comme une maille.',
        },
      ],
    },
    en: {
      how: [
        'trtr is the British triple treble: a tall stitch with three yarn overs before the hook goes in. An American pattern writes the same stitch “dtr”, and a French pattern “triple bride”.',
        'Yarn over three times, insert the hook into the stitch, yarn over and pull up a loop: five loops on the hook. Yarn over and pull through two loops, four times, until one loop remains.',
        'It is a stitch for openwork and edgings: a few rows of it make a lot of height with little yarn.',
      ],
      inPattern:
        '“Row 5: ch 5 (counts as trtr), trtr in each st across, turn (20)” starts with five chains that reach the height of the stitch and count as the first one, as the brackets say. Then one trtr goes into each stitch to the end of the row; you turn the work and should have 20 stitches, the turning chain included.',
      usUk: 'trtr only exists in British notation, so its presence tells you the whole pattern is British: its dc is an American sc, its tr an American dc, and its dtr an American tr. The American name of trtr is dtr. The US ↔ UK converter rewrites the pattern in one convention or the other.',
      mistakes: [
        'Reading the other stitches of the pattern in American terms because they look familiar. In a British pattern, every stitch shifts by one step.',
        'Letting the wraps slip off the hook before inserting it. The stitch comes out shorter and the row uneven.',
      ],
      tip: 'Tall stitches lean if the turning chain is too tight. Chain loosely, or make one chain more than the pattern says if your first stitch always looks shorter than the others.',
      faq: [
        {
          q: 'Is trtr the same as dtr?',
          a: 'trtr (UK) is the same stitch as dtr (US): three yarn overs. But a British dtr is a shorter stitch, with two.',
        },
        {
          q: 'How many chains does a row of trtr start with?',
          a: 'Usually 5, as in the example. The pattern says whether they count as a stitch.',
        },
      ],
    },
  },
  ss: {
    fr: {
      how: [
        'Dans un patron de crochet britannique, ss veut dire slip stitch : la maille coulée, qu’un patron américain écrit « sl st » et un patron français « mc ». Elle n’ajoute presque pas de hauteur : elle ferme un tour, déplace le crochet sans monter, ou termine un bord.',
        'Piquez dans la maille, faites un jeté, et ramenez la boucle à travers la maille et la boucle du crochet en un seul mouvement.',
        'En tricot, les mêmes lettres peuvent vouloir dire autre chose : certains patrons écrivent « ss » pour le jersey (stocking stitch, plus souvent « st st »), d’autres pour une maille glissée d’une aiguille à l’autre sans être tricotée. La liste des abréviations du patron tranche.',
      ],
      inPattern:
        '« Last rnd: ss in each st around, fasten off and weave in ends. » veut dire une maille coulée dans chaque maille du dernier tour, ce qui donne un bord net et plat. Ensuite, on coupe le fil, on le tire à travers la dernière boucle pour arrêter, et on rentre les fils dans l’ouvrage.',
      usUk: 'La maille est la même dans les deux conventions ; seule l’abréviation change : ss dans beaucoup de patrons britanniques, sl st dans les américains. Elle ne fait pas partie des mailles dont la hauteur change entre US et UK : rien à convertir. Voir ss reste un indice que le patron est peut-être britannique, et que ses dc et tr le sont aussi.',
      mistakes: [
        'Serrer les mailles coulées. Le tour suivant doit piquer dedans : gardez une tension plus lâche, ou prenez un crochet d’une taille au-dessus pour ce tour.',
        'Lire ss dans un patron de tricot comme une maille coulée. Vérifiez d’abord la liste des abréviations du patron.',
      ],
      tip: 'Pour fermer un tour en ss, piquez dans le haut de la première maille du tour, pas dans la chaînette d’à côté : la couture reste droite d’un tour à l’autre.',
      faq: [
        {
          q: 'ss, c’est la même chose que sl st ?',
          a: 'Au crochet, oui : ss (britannique) et sl st (américain) sont la même maille coulée, mc en français.',
        },
        {
          q: 'Que veut dire ss en tricot ?',
          a: 'Le plus souvent le jersey, parfois une maille glissée. La liste des abréviations du patron le dit.',
        },
      ],
    },
    en: {
      how: [
        'In a British crochet pattern, ss means slip stitch: the stitch an American pattern writes “sl st” and a French pattern “mc” or “maille coulée”. It adds almost no height: it joins a round, moves the hook along without building, or finishes an edge.',
        'Insert the hook into the stitch, yarn over, and pull the loop through the stitch and through the loop on the hook in a single movement.',
        'In knitting, the same two letters can mean something else: some patterns write “ss” for stocking stitch (more often “st st”), others for a slipped stitch, moved from one needle to the other without being knitted. The pattern’s list of abbreviations settles it.',
      ],
      inPattern:
        '“Last rnd: ss in each st around, fasten off and weave in ends.” means one slip stitch in every stitch of the last round, which gives a neat, flat edge. Then you cut the yarn, pull it through the last loop to fasten off, and weave the tails into the work.',
      usUk: 'The stitch is identical in both conventions; only the abbreviation changes: ss in many British patterns, sl st in American ones. It is not one of the stitches whose height shifts between US and UK, so there is nothing to convert. Seeing ss is still a hint that the pattern may be British, and that its dc and tr are British too.',
      mistakes: [
        'Working slip stitches too tight. The next round has to go into them: keep a looser tension, or use a hook one size up for this round.',
        'Reading ss in a knitting pattern as a crochet slip stitch. Check the pattern’s list of abbreviations first.',
      ],
      tip: 'To join a round with ss, put the hook into the top of the first stitch of the round, not into the turning chain beside it: the seam stays straight from one round to the next.',
      faq: [
        {
          q: 'Is ss the same as sl st?',
          a: 'In crochet, yes: ss (British) and sl st (American) are the same slip stitch, mc in French.',
        },
        {
          q: 'What does ss mean in knitting?',
          a: 'Usually stocking stitch, sometimes a slipped stitch. The pattern’s list of abbreviations tells you which.',
        },
      ],
    },
  },
  sp: {
    fr: {
      how: [
        'sp veut dire space, espace : le vide sous une chaînette, ou entre des mailles du rang précédent, dans lequel on travaille au lieu de piquer dans une maille. Un espace fait de mailles en l’air s’écrit souvent ch-sp, ou ch-2 sp pour un arceau de deux mailles en l’air.',
        'Pour travailler dans un espace, piquez sous la chaînette, dans le trou, et non dans une de ses mailles. Plusieurs mailles peuvent aller dans le même espace : elles se rangent côte à côte par-dessus la chaînette.',
      ],
      inPattern:
        'Dans « Rnd 3: sl st in next ch-sp, ch 3, 2 dc in same sp, ch 2, 3 dc in next sp. », on fait d’abord une maille coulée dans l’arceau suivant, pour y amener le crochet sans monter. « ch 3 » compte comme première bride ; « 2 dc in same sp » en ajoute deux dans le même espace, soit un groupe de trois. « ch 2 » forme l’espace suivant, et « 3 dc in next sp » remplit le prochain. C’est ainsi que se construit un granny square.',
      usUk: 'sp veut dire espace dans les deux conventions et ne change pas. Les mailles qu’on y travaille, si : le dc américain est une bride, qu’un patron britannique écrit tr. Les patrons français disent « arceau » pour un espace de mailles en l’air, ou « espace » plus généralement.',
      mistakes: [
        'Piquer dans une maille de la chaînette au lieu de dessous. Le groupe se décentre et le tour vrille : piquez dans le trou.',
        'Sauter un espace quand plusieurs se ressemblent. Comptez les espaces du tour précédent avant de commencer : les répétitions du patron en dépendent.',
      ],
      tip: 'Posez un marqueur dans le premier espace du tour. À la dernière répétition, vous savez où vous arrêter.',
      faq: [
        {
          q: 'Quelle différence entre sp et ch-sp ?',
          a: 'ch-sp est un espace fait de mailles en l’air, un arceau ; sp désigne n’importe quel espace. Beaucoup de patrons emploient l’un pour l’autre une fois l’arceau formé.',
        },
        {
          q: 'Faut-il piquer dans l’espace ou dans la chaînette ?',
          a: 'Dans l’espace, sous la chaînette, sauf si le patron dit « in the ch » ou « in each ch ».',
        },
      ],
    },
    en: {
      how: [
        'sp means space: the gap under a chain, or between stitches of the previous row, into which you work instead of into a stitch. A space made of chains is often written ch-sp, or ch-2 sp for a space of two chains.',
        'To work into a space, insert the hook under the chain, into the hole, and not into one of the chain’s stitches. Several stitches can go into the same space: they sit side by side over the chain.',
      ],
      inPattern:
        'In “Rnd 3: sl st in next ch-sp, ch 3, 2 dc in same sp, ch 2, 3 dc in next sp.”, you first slip stitch into the next chain space, to bring the hook there without adding height. “ch 3” counts as the first double crochet; “2 dc in same sp” adds two more in that same space, making a group of three. “ch 2” makes the next space, and “3 dc in next sp” fills the following one. This is how a granny square is built.',
      usUk: 'sp means space in both conventions and doesn’t change. The stitches worked into it do: an American dc is a British tr. French patterns say “arceau” for a chain space, or “espace” more generally.',
      mistakes: [
        'Working into a chain stitch instead of under it. The group sits off-centre and the round twists: go into the hole.',
        'Skipping a space when several look alike. Count the spaces of the previous round before starting: the repeats of the pattern depend on it.',
      ],
      tip: 'Put a marker in the first space of the round. On the last repeat, you know where to stop.',
      faq: [
        {
          q: 'What is the difference between sp and ch-sp?',
          a: 'ch-sp is a space made by chains; sp is any space. Many patterns use one for the other once the chains are made.',
        },
        {
          q: 'Do I work into the space or into the chain?',
          a: 'Into the space, under the chain, unless the pattern says “in the ch” or “in each ch”.',
        },
      ],
    },
  },
  dbr: {
    fr: {
      how: [
        'dbr est une abréviation française à deux sens, selon qui a écrit le patron. Beaucoup de patrons français emploient « dbr » pour la demi-bride, le half double crochet américain (hdc). D’autres écrivent « Dbr » pour la double bride, le treble américain (tr). Les deux mailles diffèrent d’un cran entier de hauteur.',
        'La légende du patron tranche : elle liste toutes les abréviations employées. Sans légende, regardez la chaînette de tour : 2 mailles en l’air vont avec une demi-bride, 4 avec une double bride. Cherchez aussi l’autre abréviation : un patron qui écrit « db » pour la demi-bride emploie « dbr » pour autre chose.',
      ],
      inPattern:
        '« Rang 3 : 2 ml, 1 dbr dans chaque maille, tourner (20) » veut dire : rang 3, 2 mailles en l’air, 1 dbr dans chaque maille, tourner, 20 mailles. Les deux mailles en l’air désignent une demi-bride ; avec une double bride, le rang commencerait par 4 mailles en l’air.',
      usUk: 'La demi-bride s’écrit hdc dans un patron américain et htr dans un britannique. La double bride s’écrit tr dans un patron américain et dtr dans un britannique. Une fois la maille identifiée, le convertisseur US ↔ UK donne son nom dans chaque convention.',
      mistakes: [
        'Choisir un sens sans vérifier la légende. Une double bride à la place d’une demi-bride rend chaque rang presque deux fois plus haut.',
        'Confondre « db » et « dbr » quand les deux apparaissent : dans ce patron, ce sont deux mailles différentes.',
      ],
      tip: 'Une fois que vous savez ce que veut dire dbr dans ce patron, notez-le en haut de votre copie : la prochaine fois que vous l’ouvrirez, la question ne reviendra pas.',
      faq: [
        {
          q: 'dbr, c’est une demi-bride ou une double bride ?',
          a: 'Cela dépend du patron. Le plus souvent une demi-bride ; quand le patron écrit « Dbr » avec une majuscule, ou emploie « db » ailleurs, c’est une double bride. La légende décide.',
        },
        {
          q: 'Comment dit-on dbr en anglais ?',
          a: 'hdc (US) ou htr (UK) pour une demi-bride ; tr (US) ou dtr (UK) pour une double bride.',
        },
      ],
    },
    en: {
      how: [
        'dbr is a French abbreviation with two meanings, depending on who wrote the pattern. Many French patterns use “dbr” for demi-bride, the American half double crochet (hdc). Others write “Dbr” for double bride, the American treble (tr). The two stitches differ by a whole step in height.',
        'The pattern’s key settles it: it lists every abbreviation used. If there is no key, look at the turning chain: 2 chains go with a demi-bride, 4 with a double bride. Look also for the other abbreviation: a pattern that writes “db” for demi-bride uses “dbr” for something else.',
      ],
      inPattern:
        '“Rang 3 : 2 ml, 1 dbr dans chaque maille, tourner (20)” means: row 3, 2 chains, 1 dbr in each stitch, turn, 20 stitches. The two chains point to a demi-bride, the half double crochet; with a double bride, the row would start with 4 chains.',
      usUk: 'A demi-bride is hdc in an American pattern and htr in a British one. A double bride is tr in an American pattern and dtr in a British one. Once you know which stitch dbr is, the US ↔ UK converter gives its name in each convention.',
      mistakes: [
        'Choosing a meaning without checking the key. A double bride instead of a demi-bride makes each row almost twice as tall.',
        'Mixing up “db” and “dbr” when both appear: in that pattern, they are two different stitches.',
      ],
      tip: 'Once you know what dbr means in this pattern, write it at the top of your copy: the next time you open it, the question won’t come back.',
      faq: [
        {
          q: 'Is dbr a demi-bride or a double bride?',
          a: 'It depends on the pattern. Most often a demi-bride; when the pattern writes “Dbr” with a capital, or uses “db” elsewhere, it is a double bride. The key decides.',
        },
        {
          q: 'What is dbr in English?',
          a: 'hdc (US) or htr (UK) for a demi-bride; tr (US) or dtr (UK) for a double bride.',
        },
      ],
    },
  },
  cl: {
    fr: {
      how: [
        'cl veut dire cluster, le bouquet : plusieurs mailles commencées au même endroit et fermées ensemble en haut, de sorte qu’elles forment une seule maille en haut et un éventail à la base. Le plus courant est le bouquet de 3 brides, que les patrons définissent en général dans leurs points spéciaux.',
        'Pour un bouquet de 3 brides : faites un jeté, piquez dans la maille, faites un jeté et ramenez une boucle, faites un jeté et écoulez deux boucles. C’est une bride inachevée, deux boucles sur le crochet. Recommencez deux fois dans la même maille : quatre boucles sur le crochet. Faites un jeté et écoulez les quatre.',
      ],
      inPattern:
        '« Rnd 3: ch 3, *cl in next st, ch 2; rep from * around, join (24) » commence par trois mailles en l’air. Puis la partie entre l’astérisque et le point-virgule se répète : un bouquet dans la maille suivante, deux mailles en l’air. « rep from * around » veut dire répéter jusqu’au bout du tour, et « join » fermer le tour par une maille coulée dans le haut des premières mailles en l’air. Le 24 compte les mailles et les mailles en l’air du tour : vérifiez ce que compte votre patron.',
      usUk: 'Le bouquet garde son nom, mais les mailles qui le composent changent : un bouquet de 3 dc dans un patron américain est un bouquet de 3 tr dans un britannique. Les patrons français disent « bouquet », ou décrivent des brides écoulées ensemble.',
      mistakes: [
        'Terminer chaque maille avant de commencer la suivante. Chacune reste inachevée, ses deux dernières boucles sur le crochet, jusqu’à l’écoulée finale de toutes les boucles.',
        'Confondre bouquet et pop-corn (pc). Le pop-corn termine chaque maille puis les replie en relief ; le bouquet les ferme d’une seule écoulée.',
      ],
      tip: 'Lisez les points spéciaux avant de commencer : certains patrons font leur bouquet avec 2 mailles, d’autres avec 4, et certains le répartissent sur plusieurs mailles au lieu d’une.',
      faq: [
        {
          q: 'Combien de mailles dans un bouquet ?',
          a: 'En général trois, mais chaque patron définit le sien : lisez ses points spéciaux.',
        },
        {
          q: 'Quelle différence entre cl et pc ?',
          a: 'Le bouquet ferme plusieurs mailles inachevées en une seule ; le pop-corn termine plusieurs mailles et les replie en relief.',
        },
      ],
    },
    en: {
      how: [
        'cl means cluster: several stitches started in the same place and closed together at the top, so that they form a single stitch at the top and a fan at the base. The most common is the 3-dc cluster, which patterns usually define in their special stitches.',
        'For a 3-dc cluster: yarn over, insert the hook into the stitch, yarn over and pull up a loop, yarn over and pull through two loops. That is one unfinished double crochet, with two loops on the hook. Repeat twice more in the same stitch: four loops on the hook. Yarn over and pull through all four.',
      ],
      inPattern:
        '“Rnd 3: ch 3, *cl in next st, ch 2; rep from * around, join (24)” starts with three chains. Then the part between the asterisk and the semicolon repeats: one cluster in the next stitch, two chains. “rep from * around” means repeat to the end of the round, and “join” means close the round with a slip stitch into the top of the first chains. The 24 counts the stitches and chains of the round: check what your pattern counts.',
      usUk: 'The cluster keeps its name, but the stitches it is made of change: a cluster of 3 dc in an American pattern is a cluster of 3 tr in a British one. French patterns call it “bouquet”, or describe it as brides écoulées ensemble.',
      mistakes: [
        'Finishing each stitch before starting the next. Each one stays unfinished, its last two loops on the hook, until the final pull through all the loops.',
        'Confusing cluster and popcorn (pc). A popcorn finishes each stitch and then folds them into a bump; a cluster closes them in a single pull.',
      ],
      tip: 'Read the special stitches section before starting: some patterns make their cluster with 2 stitches, some with 4, and some spread it over several stitches instead of one.',
      faq: [
        {
          q: 'How many stitches are there in a cluster?',
          a: 'Usually three, but each pattern defines its own: read its special stitches section.',
        },
        {
          q: 'What is the difference between cl and pc?',
          a: 'A cluster closes several unfinished stitches into one; a popcorn finishes several stitches and folds them into a bump.',
        },
      ],
    },
  },
  co: {
    fr: {
      how: [
        'co veut dire cast on : monter les mailles, c’est-à-dire poser les premières mailles sur l’aiguille, avant le premier rang. Tout ouvrage tricoté commence ainsi, et le montage forme le bord du bas.',
        'Le montage à l’italienne, à queue longue, est le plus courant : laissez une queue d’environ trois fois la largeur de l’ouvrage, faites un nœud coulant sur l’aiguille, et, la queue sur le pouce et le fil de travail sur l’index, prenez une boucle de chaque pour former chaque nouvelle maille.',
        'Les patrons nomment la méthode quand elle compte : un montage tricoté (cable cast-on) pour un bord ferme, un montage provisoire quand les mailles seront reprises plus tard.',
      ],
      inPattern:
        '« CO 40 sts. Work in k1, p1 rib for 6 rows. » veut dire : montez 40 mailles, puis tricotez des côtes une maille endroit, une maille envers, en alternance, pendant six rangs. Comptez vos mailles après le montage : quarante, ni plus ni moins, sinon les côtes ne s’aligneront pas.',
      usUk: 'CO veut dire cast on dans les patrons américains comme britanniques. Les patrons français écrivent « monter les mailles », souvent « monter 40 m. ». Le crochet n’emploie pas ces lettres : un ouvrage au crochet commence par une chaînette (ch).',
      mistakes: [
        'Monter trop serré. Le bord ne s’étire pas et fronce : montez sur deux aiguilles tenues ensemble, ou sur une aiguille d’une taille au-dessus.',
        'Manquer de fil avec le montage à queue longue. Laissez plus que vous ne pensez, environ 2,5 cm de queue par maille pour un fil moyen.',
      ],
      tip: 'Posez un marqueur toutes les 10 ou 20 mailles pendant le montage : compter quarante mailles par groupes de dix est plus rapide et plus sûr que d’un seul trait.',
      faq: [
        {
          q: 'Le montage compte-t-il comme un rang ?',
          a: 'En général non : le premier rang est celui qu’on tricote après le montage. Certains patrons le comptent ; leur numérotation des rangs le dit.',
        },
        {
          q: 'Quel montage choisir ?',
          a: 'Celui que nomme le patron. Sinon, le montage à l’italienne convient à la plupart des ouvrages.',
        },
      ],
    },
    en: {
      how: [
        'co means cast on: putting the first stitches on the needle, before the first row. Every knitted piece starts with it, and the cast-on forms the bottom edge of the work.',
        'The long-tail cast-on is the most common: leave a tail about three times the width of the piece, make a slip knot on the needle, and with the tail over your thumb and the working yarn over your index finger, take one loop from each to form each new stitch.',
        'Patterns name the method when it matters: a cable cast-on for a firm edge, a provisional cast-on when the stitches will be picked up again later.',
      ],
      inPattern:
        '“CO 40 sts. Work in k1, p1 rib for 6 rows.” means: cast on 40 stitches, then work a rib of one knit stitch and one purl stitch, alternating, for six rows. Count your stitches after casting on: forty, no more and no fewer, or the rib will not line up.',
      usUk: 'CO means cast on in both American and British patterns. French patterns write “monter les mailles”, often “monter 40 m.”. Crochet doesn’t use these letters: a crochet piece starts with a chain (ch).',
      mistakes: [
        'Casting on too tightly. The edge doesn’t stretch and puckers: cast on over two needles held together, or with a needle one size up.',
        'Running out of tail with the long-tail method. Leave more than you think, about 2.5 cm of tail per stitch for a medium-weight yarn.',
      ],
      tip: 'Put a marker every 10 or 20 stitches while casting on: counting forty stitches in groups of ten is quicker and safer than counting them in one go.',
      faq: [
        {
          q: 'Does the cast-on count as a row?',
          a: 'Usually not: the first row is the one you knit after casting on. Some patterns do count it; their row numbering tells you.',
        },
        {
          q: 'Which cast-on should I use?',
          a: 'The one the pattern names. Otherwise, the long-tail cast-on suits most pieces.',
        },
      ],
    },
  },
  bo: {
    fr: {
      how: [
        'bo veut dire bind off : rabattre les mailles, c’est-à-dire fermer les mailles à la fin de l’ouvrage pour qu’elles ne se défassent pas. Les patrons britanniques disent cast off, dans le même sens.',
        'Tricotez deux mailles. Avec l’aiguille gauche, passez la première par-dessus la seconde et hors de l’aiguille : une maille est rabattue. Tricotez une maille de plus et recommencez, jusqu’à ce qu’il n’en reste qu’une. Coupez le fil et passez-le dans cette dernière maille.',
        'Au crochet, les mêmes lettres ne veulent pas dire cela : certains patrons de crochet emploient « bo » pour un point bouillon ou popcorn (bobble). La technique du patron dit lequel.',
      ],
      inPattern:
        '« Row 30: BO all sts loosely, leaving a long tail. » veut dire rabattre toutes les mailles au rang 30 sans serrer le fil, et garder une longue queue pour coudre les pièces ensuite. « loosely » compte : un rabattage serré rétrécit le haut de l’ouvrage.',
      usUk: 'Les patrons américains écrivent bind off (BO), les britanniques cast off. Les patrons français disent « rabattre les mailles ». Le geste est le même.',
      mistakes: [
        'Rabattre trop serré, surtout sur un col ou un poignet en côtes. Prenez une aiguille d’une ou deux tailles au-dessus pour le rang de rabattage.',
        'Rabattre des côtes tout à l’endroit. Sauf indication contraire, rabattez en suivant le point : les mailles endroit à l’endroit, les mailles envers à l’envers.',
      ],
      tip: 'Laissez une queue d’au moins 20 cm quand le patron en demande une longue : elle sert à la couture, et une queue trop courte ne se rallonge pas.',
      faq: [
        {
          q: 'bind off et cast off, c’est pareil ?',
          a: 'Oui : bind off est le terme américain, cast off le britannique. Les deux veulent dire rabattre les mailles.',
        },
        {
          q: 'bo peut-il vouloir dire bobble ?',
          a: 'Dans certains patrons de crochet, oui. Dans un patron de tricot, BO est le rabattage.',
        },
      ],
    },
    en: {
      how: [
        'bo means bind off: closing the stitches at the end of the work so that they don’t unravel. British patterns say cast off, with the same meaning.',
        'Knit two stitches. With the left needle, lift the first one over the second and off the needle: one stitch is bound off. Knit one more stitch and repeat, until one stitch remains. Cut the yarn and pull it through that last stitch.',
        'In crochet, the same letters don’t mean this: some crochet patterns use “bo” for a bobble. The craft of the pattern tells you which.',
      ],
      inPattern:
        '“Row 30: BO all sts loosely, leaving a long tail.” means bind off every stitch on row 30 without pulling the yarn tight, and keep a long tail to sew the pieces together afterwards. “loosely” matters: a tight bind-off narrows the top of the piece.',
      usUk: 'American patterns write bind off (BO), British ones cast off. French patterns say “rabattre les mailles”. The gesture is the same.',
      mistakes: [
        'Binding off too tightly, especially on a ribbed collar or cuff. Use a needle one or two sizes up for the bind-off row.',
        'Binding off a rib all in knit. Unless the pattern says otherwise, bind off in pattern: knit the knit stitches, purl the purl stitches.',
      ],
      tip: 'Leave a tail of at least 20 cm when the pattern asks for a long one: it is used for the seam, and a short tail cannot be lengthened.',
      faq: [
        {
          q: 'Is bind off the same as cast off?',
          a: 'Yes: bind off is the American term, cast off the British one.',
        },
        {
          q: 'Can bo mean bobble?',
          a: 'In some crochet patterns, yes. In a knitting pattern, BO is the bind-off.',
        },
      ],
    },
  },
};
