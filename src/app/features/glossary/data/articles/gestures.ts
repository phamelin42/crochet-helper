import { TermArticles } from './types';

/** Trois gestes de lecture plus que de maille : `yo`, `rep`, `blo`. */
export const GESTURES: TermArticles = {
  yo: {
    en: {
      how: [
        'A yarn over, written “yo”, is the movement that puts an extra loop of yarn on the hook. In crochet, you bring the yarn over the hook from back to front, so that the hook catches it. The hook stays where it is; only the yarn moves.',
        'Hold the yarn taut with your left hand and pass it over the hook, from back to front, until it lies across the hook’s throat. Now you have one more loop on the hook than before.',
        'The yarn over then gets used up by the next movement: “pull through two loops” takes it away again. That is why a taller stitch begins with more yarn overs. A double crochet has one, a treble has two, and a single crochet has none at the start.',
        'In knitting, “yo” means something else. The yarn is brought over the right needle to make a new stitch and a small hole, which is the eyelet in lace. In a knitting pattern, count it as a stitch on the next row.',
      ],
      inPattern:
        'Take the instruction “Hdc: yo, insert hook in next st, yo and pull up a loop, yo and pull through all 3 loops.” This is not a row but the recipe for one stitch, the half double crochet. “yo” is the first yarn over, before you enter the fabric. “insert hook in next st” puts the hook into the next stitch. “yo and pull up a loop” is a second yarn over, which you then pull back through the stitch. There are now three loops on the hook. “yo and pull through all 3 loops” is a third yarn over, pulled through all three loops at once. One loop is left.',
      usUk: 'Identical in gesture, but the abbreviation differs. American patterns write “yo”. British patterns very often write “yrh”, for yarn round hook, and sometimes “yoh”. All three ask for the same movement. A British pattern will not need converting for this one, only translating.',
      mistakes: [
        'Wrapping the yarn the wrong way, from front to back. The hook then does not catch the yarn as it should, and the stitch comes out twisted. Always bring the yarn over the hook from back to front, towards you.',
        'Forgetting the first yarn over in a tall stitch. A double crochet without its yarn over is a single crochet; a treble with only one becomes a double. If the stitches look short, count the yarn overs.',
        'In knitting, forgetting that a yarn over adds a stitch. The row is then one stitch short on the next row, unless a decrease follows to balance it. Count the stitches after each row of lace.',
      ],
      tip: 'When you learn a stitch, say the yarn overs aloud: “yarn over, hook in, yarn over, pull up, yarn over, pull through”. The rhythm sticks, and your eyes can stay on the pattern. After ten stitches you will not need the words any more.',
    },
    fr: {
      how: [
        'Un jeté, noté « yo » dans un patron anglais, est le geste qui ajoute une boucle de fil sur le crochet. Au crochet, on passe le fil sur le crochet d’arrière en avant, de façon que le crochet l’attrape. Le crochet reste en place ; seul le fil bouge.',
        'Tenez le fil tendu de la main gauche et passez-le sur le crochet, d’arrière en avant, jusqu’à ce qu’il repose en travers de la gorge du crochet. Il y a maintenant une boucle de plus sur le crochet qu’avant.',
        'Le jeté est ensuite consommé par le geste suivant : « passer à travers deux boucles » le fait disparaître. C’est pourquoi une maille plus haute commence par davantage de jetés. Une bride en a un, une double bride en a deux, et une maille serrée n’en a aucun au départ.',
        'Au tricot, « yo » veut dire autre chose. Le fil est passé sur l’aiguille droite pour créer une nouvelle maille et un petit trou, qui est l’ajour de la dentelle. Dans un patron de tricot, comptez-le comme une maille au rang suivant.',
      ],
      inPattern:
        'Lisons l’instruction anglaise « Hdc: yo, insert hook in next st, yo and pull up a loop, yo and pull through all 3 loops. » Ce n’est pas un rang mais la recette d’une seule maille, la demi-bride. « yo » est le premier jeté, avant d’entrer dans l’ouvrage. « insert hook in next st » veut dire piquer le crochet dans la maille suivante. « yo and pull up a loop » est un deuxième jeté, que l’on ramène à travers la maille. Il y a alors trois boucles sur le crochet. « yo and pull through all 3 loops » est un troisième jeté, passé à travers les trois boucles d’un seul coup. Il reste une boucle.',
      usUk: 'Le geste est identique, mais l’abréviation change. Les patrons américains écrivent « yo ». Les patrons britanniques écrivent très souvent « yrh », pour yarn round hook, et parfois « yoh ». Les trois demandent le même mouvement. Un patron britannique n’a pas besoin d’être converti pour celle-là, seulement traduit.',
      mistakes: [
        'Enrouler le fil dans le mauvais sens, d’avant en arrière. Le crochet n’attrape alors pas le fil comme il faut, et la maille sort torsadée. Passez toujours le fil sur le crochet d’arrière en avant, vers vous.',
        'Oublier le premier jeté d’une maille haute. Une bride sans son jeté est une maille serrée ; une double bride qui n’en a qu’un devient une bride. Si les mailles paraissent basses, comptez les jetés.',
        'Au tricot, oublier qu’un jeté ajoute une maille. Le rang suivant a alors une maille de moins, à moins qu’une diminution ne vienne l’équilibrer. Comptez les mailles après chaque rang de dentelle.',
      ],
      tip: 'Quand vous apprenez une maille, dites les jetés à voix haute : « jeté, crochet dans la maille, jeté, tirer, jeté, passer ». Le rythme s’installe et vos yeux restent sur le patron. Après dix mailles, vous n’aurez plus besoin des mots.',
    },
  },
  rep: {
    en: {
      how: [
        'To repeat, written “rep”, is to work a group of instructions again. The group is marked by asterisks or brackets, so that the pattern does not have to write the same words a dozen times.',
        'Work the group of instructions between the marks once, exactly as written. This first pass is easy to forget: the instruction “rep from *” comes after you have already worked the group once, so you are asking for the group again, not for its first time.',
        'Return to the asterisk and work the group again, as many times as the pattern says. The pattern may give a number, such as “rep from * 5 times”, or a place to stop, such as “rep from * to end” or “rep from * to last 2 sts”.',
        'Brackets work the same way but carry their own count: “[sc, ch 1] 4 times” means the group inside the brackets, four times over. When the end is given as “to last 2 sts”, stop when two stitches remain and follow the pattern’s next instruction.',
      ],
      inPattern:
        'Take the row “Row 3: ch 1, *sc in next st, ch 1, sk next st; rep from * to end, turn.” “Row 3” is the third row. “ch 1” is the turning chain, a hinge. The asterisk opens the group: “sc in next st”, “ch 1” and “sk next st”. You work these three instructions once, then “rep from * to end” tells you to start again at the asterisk, until you reach the end of the row. “turn” means flip the work. This row makes a mesh: a single crochet, a small space, a single crochet, a small space. This row has no number in brackets, so count your stitches against the row before it.',
      usUk: 'Identical. “Rep” means repeat in American and British patterns alike, and both use asterisks and brackets in the same way. The stitch names inside the group may change between conventions, so read them with the right one in mind, but the repeat itself does not need converting.',
      mistakes: [
        'Repeating from the wrong asterisk. When a row has two asterisks, “rep from *” means the first, and “rep from **” the second. Look at how many stars the pattern shows, and match them.',
        'Working the group once fewer than needed, forgetting the first pass. If the pattern says “*sc, ch 1; rep from * 4 times”, you work the group five times in total: once, then four repeats.',
        'Running past the end. When the pattern says “to end” but your last group is incomplete, the number of stitches in the row below was not a multiple of the group. Stop, and check the row before, since the count is probably off.',
      ],
      tip: 'Keep a finger, or a small marker, under the first word of the group in the pattern. After every repeat, glance back at that word. If you always come back to the same word, you will not lose your place on a long row.',
    },
    fr: {
      how: [
        'Répéter, noté « rep » dans un patron anglais, c’est travailler de nouveau un groupe d’instructions. Le groupe est encadré par des astérisques ou des crochets, pour que le patron n’ait pas à écrire douze fois les mêmes mots.',
        'Travaillez une fois le groupe d’instructions compris entre les repères, exactement comme il est écrit. Ce premier passage s’oublie facilement : « rep from * » vient après que vous avez déjà fait le groupe une fois, on vous demande donc de le refaire, pas de le faire pour la première fois.',
        'Revenez à l’astérisque et travaillez de nouveau le groupe, autant de fois que le patron le dit. Il peut donner un nombre, comme « rep from * 5 times », ou un endroit où s’arrêter, comme « rep from * to end » ou « rep from * to last 2 sts ».',
        'Les crochets fonctionnent de la même façon mais portent leur propre compte : « [sc, ch 1] 4 times » veut dire le groupe entre crochets, quatre fois de suite. Quand la fin est donnée par « to last 2 sts », arrêtez-vous quand il reste deux mailles et suivez l’instruction suivante du patron.',
      ],
      inPattern:
        'Lisons le rang anglais « Row 3: ch 1, *sc in next st, ch 1, sk next st; rep from * to end, turn. » « Row 3 » est le troisième rang. « ch 1 » est la maille en l’air de montée, une charnière. L’astérisque ouvre le groupe : « sc in next st », « ch 1 » et « sk next st ». On travaille ces trois instructions une fois, puis « rep from * to end » demande de recommencer à l’astérisque jusqu’à la fin du rang. « turn » signifie qu’on retourne l’ouvrage. Ce rang fait un filet : une maille serrée, un petit espace, une maille serrée, un petit espace. Ce rang n’a pas de nombre entre parenthèses : comparez donc votre compte à celui du rang d’avant.',
      usUk: 'Identique. « Rep » veut dire répéter dans les patrons américains comme dans les patrons britanniques, et les deux emploient les astérisques et les crochets de la même façon. Les noms de mailles à l’intérieur du groupe peuvent changer d’une convention à l’autre, lisez-les avec la bonne en tête, mais la répétition elle-même n’a pas besoin d’être convertie.',
      mistakes: [
        'Répéter depuis le mauvais astérisque. Quand un rang en a deux, « rep from * » désigne le premier et « rep from ** » le second. Regardez combien d’étoiles le patron montre, et faites-les correspondre.',
        'Travailler le groupe une fois de moins que prévu, en oubliant le premier passage. Si le patron dit « *sc, ch 1; rep from * 4 times », le groupe est travaillé cinq fois en tout : une fois, puis quatre répétitions.',
        'Dépasser la fin. Quand le patron dit « to end » mais que votre dernier groupe est incomplet, le nombre de mailles du rang du dessous n’était pas un multiple du groupe. Arrêtez-vous et vérifiez le rang d’avant, car le compte est sans doute faux.',
      ],
      tip: 'Gardez un doigt, ou un petit marqueur, sous le premier mot du groupe dans le patron. Après chaque répétition, jetez un œil à ce mot. Si vous revenez toujours au même mot, vous ne perdrez pas votre place sur un long rang.',
    },
  },
  blo: {
    en: {
      how: [
        'Back loop only, written “blo”, tells you which part of a stitch to put the hook under. The top of every stitch is a small “V” made of two strands, called loops. In “blo”, you use only one of the two, the back loop.',
        'The back loop is the strand farthest from you, on the side of the fabric that faces you as you work. Look at the top edge of the row: the front loop is nearer to you, the back loop is behind it.',
        'Insert the hook under the back loop only, then work the stitch the pattern names in the ordinary way. Leave the front loop untouched. It stays on the fabric as a small horizontal ridge, visible from the side you are working on.',
        'This changes the look and the behaviour of the fabric. The ridge makes a texture, the fabric folds more easily along that line, and it stretches more. That is why blo is used for the brim of a hat, a cuff, or to make a piece bend at a sharp angle.',
      ],
      inPattern:
        'Take the row “Rnd 7: sc in blo of each st around (24)”. “Rnd 7” is the seventh round. “sc in blo of each st around” means one single crochet in every stitch of the previous round, with the hook going under the back loop only. “Blo” refers to the stitch you work into, the one in the round below. The bracket says 24: the previous round had 24 stitches and you make one new stitch in each, so you end with 24. The front loops of the round below are left behind, and they make a ridge.',
      usUk: 'Identical. “Blo” means back loop only in American and British patterns alike, and it works on the same loop in both. The stitch names change between conventions, so a US “sc in blo” is a “dc in blo” in a British pattern, but the loop you choose stays the same.',
      mistakes: [
        'Taking the front loop by mistake. The ridge then appears on the side you do not want, and the piece does not fold where planned. The back loop is the farther one; if you have to tilt the work to see it, you are still in the right place.',
        'Forgetting that the back loop changes sides when you turn the work. In flat rows, the back loop is the one farthest from you at each row, so it is not always on the same side of the fabric. In rounds, it stays the same.',
        'Splitting the strand instead of taking the whole loop. If the yarn is cut in half by the hook, the stitch will look frayed. Look at the loop before you insert the hook, and take it whole.',
      ],
      tip: 'On a long round in blo it is easy to slip back to both loops without noticing. Look at the ridge from time to time: it should form an unbroken line. When the line has a gap, a stitch went under both loops, and it is quicker to fix a few stitches now than a whole round later.',
    },
    fr: {
      how: [
        'Dans le brin arrière uniquement, noté « blo » dans un patron anglais, indique sous quelle partie de la maille passer le crochet. Le sommet de chaque maille est un petit « V » fait de deux brins. Avec « blo », on n’en utilise qu’un seul, le brin arrière.',
        'Le brin arrière est celui qui est le plus éloigné de vous, du côté de l’ouvrage qui vous fait face pendant que vous travaillez. Regardez le bord supérieur du rang : le brin avant est plus proche de vous, le brin arrière est derrière lui.',
        'Piquez le crochet sous le brin arrière seulement, puis faites la maille que le patron indique, comme d’habitude. Laissez le brin avant intact. Il reste sur l’ouvrage sous la forme d’une petite arête horizontale, visible du côté où vous travaillez.',
        'Cela change l’aspect et le comportement de l’ouvrage. L’arête fait une texture, l’ouvrage se plie plus facilement le long de cette ligne, et il s’étire davantage. C’est pourquoi le blo sert pour le bord d’un bonnet, un poignet, ou pour faire plier une pièce à angle vif.',
      ],
      inPattern:
        'Lisons le tour anglais « Rnd 7: sc in blo of each st around (24) ». « Rnd 7 » désigne le septième tour. « sc in blo of each st around » veut dire une maille serrée dans chaque maille du tour précédent, le crochet passant sous le brin arrière seulement. « Blo » concerne la maille dans laquelle on pique, celle du tour du dessous. Le nombre entre parenthèses annonce 24 : le tour précédent compte 24 mailles et vous en faites une nouvelle dans chacune, donc vous restez à 24. Les brins avant du tour du dessous sont laissés derrière, et ils forment une arête.',
      usUk: 'Identique. « Blo » veut dire dans le brin arrière uniquement dans les patrons américains comme dans les patrons britanniques, et le brin est le même dans les deux. Les noms de mailles changent d’une convention à l’autre : un « sc in blo » américain est un « dc in blo » dans un patron britannique, mais le brin choisi reste le même.',
      mistakes: [
        'Prendre le brin avant par erreur. L’arête apparaît alors du côté qu’on ne veut pas, et la pièce ne se plie pas où prévu. Le brin arrière est le plus éloigné ; si vous devez incliner l’ouvrage pour le voir, vous êtes au bon endroit.',
        'Oublier que le brin arrière change de côté quand on tourne l’ouvrage. En rangs, le brin arrière est à chaque rang celui qui est le plus loin de vous, il n’est donc pas toujours du même côté de l’ouvrage. En tours, il reste le même.',
        'Fendre le brin au lieu de prendre la boucle entière. Si le fil est coupé en deux par le crochet, la maille paraît effilochée. Regardez la boucle avant de piquer, et prenez-la entière.',
      ],
      tip: 'Sur un long tour en blo, on revient facilement aux deux brins sans s’en apercevoir. Regardez l’arête de temps en temps : elle doit former une ligne continue. Quand la ligne a une interruption, une maille est passée sous les deux brins, et il est plus rapide de corriger quelques mailles maintenant qu’un tour entier plus tard.',
    },
  },
};
