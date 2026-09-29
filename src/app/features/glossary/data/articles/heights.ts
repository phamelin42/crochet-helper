import { TermArticles } from './types';

/** Les mailles de hauteur : `sc`, `dc`, `hdc`, `tr` et la chaînette `ch`. */
export const HEIGHTS: TermArticles = {
  sc: {
    en: {
      how: [
        'Single crochet is the shortest of the basic stitches, and the one that gives the densest fabric. Insert the hook into the stitch the pattern points to, going under both loops of the “V” on top unless the pattern says otherwise.',
        'Yarn over and pull the yarn back through the stitch. You now have two loops on the hook, and the stitch is still open.',
        'Yarn over once more and pull through both loops at once. One loop is left on the hook, and the stitch is finished. There is only one yarn over in the whole stitch, and it comes after the hook has entered the fabric.',
        'To turn at the end of a row, most patterns ask for one chain, written “ch 1”. That chain is a hinge only: it does not count as a stitch unless the pattern says so, and the next row starts in the very first stitch.',
      ],
      inPattern:
        'Take the row “Rnd 3: *sc in next st, inc in next st; rep from * around (18)”. “Rnd 3” means the third round, worked in a spiral or in joined circles. Everything between the asterisks is a group. “sc in next st” is one single crochet in the next stitch. “inc in next st” is two single crochets in the next stitch. “rep from * around” means you repeat the group until you are back at the start. The number in brackets is the check: the previous round had 12 stitches, six groups use two of them each and produce three, so you finish with 18.',
      usUk: 'Single crochet is the American name. A British pattern calls the very same stitch “dc”, for double crochet. So “sc” and “dc” on this site are a pair: sc (US) equals dc (UK). If a pattern uses both “dc” and “htr”, it is British, and its “dc” is the stitch on this page.',
      mistakes: [
        'Working into the gap between two stitches, or under a single strand. The fabric then looks ragged and grows wider than planned. Look for the “V” on top of the stitch and put the hook under both of its strands.',
        'Pulling the first yarn over too high, which leaves a loose, tall loop. Every stitch should have about the same height. If some stand out, you are pulling the first loop up unevenly.',
        'Counting the turning chain as a stitch when the pattern does not. The row then gains one stitch every time you turn, and the edge slowly leans out. Compare your count to the number in brackets at the end of every row.',
      ],
      tip: 'Single crochet is small and hard to count from a distance. After every twenty stitches, slide a stitch marker into the one you have just made, or count the marker gaps out loud. If the number in brackets does not match, fix the row before you go on.',
    },
    fr: {
      how: [
        'La maille serrée est la plus basse des mailles de base, et celle qui donne l’ouvrage le plus dense. Piquez le crochet dans la maille que le patron indique, sous les deux brins du « V » du dessus, sauf consigne contraire.',
        'Faites un jeté et ramenez le fil à travers la maille. Il y a alors deux boucles sur le crochet, et la maille est encore ouverte.',
        'Faites un second jeté et passez-le à travers les deux boucles d’un seul coup. Il reste une boucle sur le crochet : la maille est terminée. La maille serrée ne compte qu’un seul jeté, et il vient après l’entrée du crochet dans l’ouvrage.',
        'Pour tourner en fin de rang, la plupart des patrons demandent une maille en l’air, notée « 1 ml ». Elle ne sert que de charnière : elle ne compte pas comme une maille, sauf si le patron le dit, et le rang suivant commence dans la toute première maille.',
      ],
      inPattern:
        'Prenons le tour anglais « Rnd 3: *sc in next st, inc in next st; rep from * around (18) ». « Rnd 3 » désigne le troisième tour, travaillé en spirale ou en cercles fermés. Ce qui se trouve entre les astérisques forme un groupe. « sc in next st » veut dire une maille serrée dans la maille suivante. « inc in next st » veut dire deux mailles serrées dans la maille suivante. « rep from * around » signifie qu’on répète le groupe jusqu’à revenir au début. Le nombre entre parenthèses sert de contrôle : le tour précédent compte 12 mailles, six groupes en consomment deux chacun et en produisent trois, on termine donc avec 18.',
      usUk: 'La maille serrée est le nom des patrons américains, où elle s’écrit « sc ». Un patron britannique appelle exactement la même maille « dc », pour double crochet. Les deux abréviations forment donc une paire : sc en américain, dc en britannique. Si un patron emploie à la fois « dc » et « htr », il est britannique, et son « dc » est bien la maille serrée.',
      mistakes: [
        'Piquer entre deux mailles ou sous un seul brin. L’ouvrage devient irrégulier et s’élargit plus que prévu. Cherchez le « V » du dessus de la maille et passez le crochet sous ses deux brins.',
        'Tirer le premier jeté trop haut, ce qui laisse une boucle longue et lâche. Toutes les mailles doivent avoir à peu près la même hauteur. Si certaines dépassent, la première boucle est tirée de façon inégale.',
        'Compter la maille en l’air de retournement comme une maille quand le patron ne le demande pas. Le rang gagne alors une maille à chaque retournement, et le bord penche peu à peu. Comparez votre compte au nombre entre parenthèses à la fin de chaque rang.',
      ],
      tip: 'La maille serrée est petite et difficile à compter à distance. Tous les vingt points, glissez un marqueur dans la maille que vous venez de faire, ou comptez à voix haute les espaces entre marqueurs. Si le nombre entre parenthèses ne correspond pas, corrigez le rang avant de continuer.',
    },
  },
};
