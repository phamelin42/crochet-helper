import { TermArticles } from './types';

/** La bride et la demi-bride, dont les lettres changent de sens entre US et UK. */
export const DC_HDC: TermArticles = {
  dc: {
    en: {
      how: [
        'Double crochet, written “dc” in an American pattern, is about twice as tall as a single crochet. Start with a yarn over, before you touch the fabric. Then insert the hook into the stitch the pattern points to.',
        'Yarn over again and pull that loop back through the stitch. You now have three loops on the hook: the first yarn over, the loop you just pulled up, and the loop that was already there.',
        'Yarn over and pull through the first two loops on the hook. Two loops remain. Yarn over one more time and pull through these last two. One loop is left, and the stitch is done.',
        'At the start of a row, a double crochet is too tall to begin without help, so the pattern asks for a turning chain. It usually reads “ch 3 (counts as dc)”. The three chains stand in for the first stitch, and you then skip the stitch at the base and work your first real dc into the next one.',
      ],
      inPattern:
        'Read the row “Row 2: ch 3 (counts as dc), dc in each st across, turn (20)”. “Row 2” is the second row, worked back and forth. “ch 3 (counts as dc)” is the turning chain: three chains that take the place of the first double crochet. “dc in each st across” means one double crochet in every stitch until the end of the row; the last one usually goes into the top of the previous row’s turning chain, which is easy to miss. “turn” means flip the work before the next row. The bracket is your check: the chain is stitch number one, the nineteen dc are the rest, and you finish with 20.',
      usUk: 'This is the abbreviation where American and British patterns disagree the most. In a US pattern, dc is the double crochet described here. In a British pattern, “dc” is the shorter stitch that Americans call single crochet, and the stitch on this page is written “tr”. So dc (US) equals tr (UK). Before you start, find out which convention your pattern uses. The stitch counts and the height of the fabric depend on it.',
      mistakes: [
        'Reading a British pattern as an American one. If your work is half as tall as the picture, or comes out much too small, check for “htr” or “trtr” in the pattern. Those two only exist in British notation.',
        'Forgetting that the turning chain counts as a stitch. Then the row gains one stitch each time you turn. Count the stitches against the bracket at the end of every row.',
        'Skipping the yarn over before the hook enters the stitch. Without it the steps that follow make a single crochet, which sits lower than its neighbours. A double crochet always begins with a yarn over.',
      ],
      tip: 'A double crochet row is quick to work and slow to count, because the posts hide the tops. Count the “V” shapes along the top edge of the row instead, and put a stitch marker in the turning chain at each row start so you always know where the row begins.',
    },
    fr: {
      how: [
        'La bride, notée « dc » dans un patron américain, est environ deux fois plus haute qu’une maille serrée. Commencez par un jeté, avant de toucher l’ouvrage, puis piquez le crochet dans la maille que le patron indique.',
        'Faites un nouveau jeté et ramenez cette boucle à travers la maille. Vous avez maintenant trois boucles sur le crochet : le premier jeté, la boucle que vous venez de tirer et celle qui s’y trouvait déjà.',
        'Faites un jeté et passez-le à travers les deux premières boucles. Il en reste deux. Faites encore un jeté et passez à travers ces deux dernières. Il reste une boucle, et la bride est terminée.',
        'En début de rang, une bride est trop haute pour démarrer seule : le patron demande donc des mailles en l’air de montée. On lit souvent « ch 3 (counts as dc) ». Les trois mailles en l’air tiennent lieu de première bride, on saute la maille du pied et on travaille la première vraie bride dans la suivante.',
      ],
      inPattern:
        'Lisons le rang anglais « Row 2: ch 3 (counts as dc), dc in each st across, turn (20) ». « Row 2 » est le deuxième rang, travaillé en allers et retours. « ch 3 (counts as dc) » désigne les mailles en l’air de montée : trois mailles en l’air qui remplacent la première bride. « dc in each st across » veut dire une bride dans chaque maille jusqu’à la fin du rang ; la dernière se pique en général dans le sommet des mailles en l’air de montée du rang précédent, ce qu’on oublie facilement. « turn » signifie qu’on retourne l’ouvrage avant le rang suivant. Le nombre entre parenthèses sert de contrôle : la montée compte pour une maille, les dix-neuf brides font le reste, et l’on arrive à 20.',
      usUk: 'C’est l’abréviation sur laquelle les patrons américains et britanniques se contredisent le plus. Dans un patron américain, dc désigne la bride décrite ici. Dans un patron britannique, « dc » est la maille plus basse que les Américains appellent maille serrée, et la bride s’écrit « tr ». Donc dc en américain équivaut à tr en britannique. Avant de commencer, vérifiez la convention de votre patron : le nombre de mailles et la hauteur de l’ouvrage en dépendent.',
      mistakes: [
        'Lire un patron britannique comme un patron américain. Si votre ouvrage est deux fois moins haut que sur la photo, ou beaucoup trop petit, cherchez « htr » ou « trtr » dans le patron. Ces deux termes n’existent qu’en notation britannique.',
        'Oublier que les mailles en l’air de montée comptent pour une maille. Le rang gagne alors une maille à chaque retournement. Comparez votre compte au nombre entre parenthèses à la fin de chaque rang.',
        'Sauter le jeté avant d’entrer dans la maille. Sans lui, les gestes suivants donnent une maille serrée, plus basse que ses voisines. Une bride commence toujours par un jeté.',
      ],
      tip: 'Un rang de brides se travaille vite mais se compte lentement, car les hampes cachent le dessus des mailles. Comptez plutôt les « V » du bord supérieur, et posez un marqueur dans la montée au début de chaque rang pour savoir où le rang commence.',
    },
  },
  hdc: {
    en: {
      how: [
        'Half double crochet, written “hdc”, sits between single crochet and double crochet in height. Its trick is that it uses a single pull-through at the end, where the double crochet uses two.',
        'Start with a yarn over, before entering the fabric. Insert the hook into the stitch the pattern points to.',
        'Yarn over again and pull the yarn back through the stitch. You now have three loops on the hook: the first yarn over, the loop you just pulled up, and the one that was already there.',
        'Yarn over one last time and pull through all three loops at once. One loop is left, and the stitch is complete. Do not stop after two loops: that would be a different stitch. For a turning chain, patterns usually say “ch 2”, and unless they write “counts as hdc” you can treat it as a hinge that is not a stitch.',
      ],
      inPattern:
        'Take the row “Row 2: ch 2, hdc in each st across, turn (18)”. “Row 2” is the second row. “ch 2” is the turning chain: two chains that lift the hook to the height of the new row. Because the pattern does not say “counts as hdc”, they are not a stitch. “hdc in each st across” means one half double crochet in every stitch of the previous row, starting in the very first one. “turn” means flip the work. The bracket says the row must end with 18 stitches, and since the chain is not counted, those are 18 real hdc.',
      usUk: 'Half double crochet is the American name. A British pattern writes the same stitch “htr”, for half treble. So hdc (US) equals htr (UK). Unlike dc and tr, the letters hdc do not exist in British notation, which makes this one easier to spot: if you see “htr” in a pattern, it is British, and you should read any “dc” in it as single crochet.',
      mistakes: [
        'Pulling through only two loops instead of all three. The stitch then comes out shorter and looser, and the count on the hook is wrong. Check that you have exactly three loops before the last pull.',
        'Counting the turning chain as a stitch when the pattern says nothing. If the count in brackets is off by one at the end of the row, this is almost always the cause.',
        'Working through the front strand only. Half double crochet leaves a small horizontal bar below the top; if it looks lumpy, you probably put the hook under only one strand of the “V”.',
      ],
      tip: 'Half double crochet has a tell-tale horizontal bar just under the top “V”. You can count those bars from a distance, and you can find the stitch you are working into without touching the fabric. Move a marker every ten stitches.',
    },
    fr: {
      how: [
        'La demi-bride, notée « hdc » dans un patron américain, se situe entre la maille serrée et la bride pour la hauteur. Son astuce est de n’avoir qu’un seul passage final, là où la bride en compte deux.',
        'Commencez par un jeté, avant d’entrer dans l’ouvrage. Piquez le crochet dans la maille que le patron indique.',
        'Faites un nouveau jeté et ramenez le fil à travers la maille. Vous avez alors trois boucles sur le crochet : le premier jeté, la boucle que vous venez de tirer et celle qui s’y trouvait déjà.',
        'Faites un dernier jeté et passez-le à travers les trois boucles d’un seul coup. Il reste une boucle : la demi-bride est terminée. Ne vous arrêtez pas à deux boucles, ce serait une autre maille. Pour la montée, les patrons disent en général « ch 2 » ; sans la mention « counts as hdc », ces deux mailles en l’air servent de charnière et ne comptent pas.',
      ],
      inPattern:
        'Lisons le rang anglais « Row 2: ch 2, hdc in each st across, turn (18) ». « Row 2 » est le deuxième rang. « ch 2 » désigne les mailles en l’air de montée : deux mailles en l’air qui amènent le crochet à la hauteur du nouveau rang. Comme le patron n’écrit pas « counts as hdc », elles ne comptent pas comme une maille. « hdc in each st across » veut dire une demi-bride dans chaque maille du rang précédent, à commencer par la toute première. « turn » signifie qu’on retourne l’ouvrage. Le nombre entre parenthèses annonce 18 mailles en fin de rang, et comme la montée ne compte pas, ce sont 18 vraies demi-brides.',
      usUk: 'La demi-bride est le nom des patrons américains, où elle s’écrit « hdc ». Un patron britannique écrit la même maille « htr », pour half treble. Donc hdc en américain équivaut à htr en britannique. Contrairement à dc et tr, les lettres hdc n’existent pas en notation britannique, ce qui rend cette maille plus facile à repérer : si vous voyez « htr » dans un patron, il est britannique, et son « dc » se lit maille serrée.',
      mistakes: [
        'Ne passer qu’à travers deux boucles au lieu de trois. La maille est alors plus basse et plus lâche, et le compte des boucles est faux. Vérifiez qu’il y a bien trois boucles avant le dernier passage.',
        'Compter la montée comme une maille quand le patron ne dit rien. Si le total est décalé d’une unité en fin de rang, c’est presque toujours la cause.',
        'Piquer sous un seul brin. La demi-bride laisse une petite barre horizontale sous le sommet ; si l’ouvrage est bosselé, le crochet n’est sans doute passé que sous un brin du « V ».',
      ],
      tip: 'La demi-bride a une barre horizontale caractéristique juste sous le « V » du sommet. On peut compter ces barres à distance et repérer la maille où l’on pique sans toucher l’ouvrage. Déplacez un marqueur toutes les dix mailles.',
    },
  },
};
