import { Locale } from '../../core/i18n/locale';

/**
 * Consigne destinée à être **copiée par la personne** dans l'assistant de son
 * choix. Elle n'est jamais envoyée par le site : aucun appel réseau, aucune
 * clé, aucun quota.
 *
 * Elle est écrite en « tu » à l'assistant et en texte brut, pour être collée
 * telle quelle dans une fenêtre de discussion. La contrainte majeure est la
 * conservation : sauter un rang ruine un ouvrage, donc les interdits sont
 * énoncés avant le format.
 */
export const FORMAT_PROMPT: Record<Locale, string> = {
  fr: `Tu remets en forme un tutoriel de crochet ou de tricot. Tu ne le traduis pas, tu ne le résumes pas, tu ne le réécris pas : tu le rends régulier pour qu'un lecteur automatique puisse le découper en étapes.

RÈGLES ABSOLUES
- Ne supprime aucun rang, aucun tour, aucune instruction de travail. Si l'entrée contient 42 rangs, la sortie en contient 42.
- N'invente aucun rang, aucune maille, aucun nombre. Si une information manque, laisse-la manquante.
- Ne modifie aucun nombre de mailles, aucun compte entre parenthèses, aucune abréviation. « 3 ms, 1 aug » reste « 3 ms, 1 aug ».
- Conserve la langue d'origine du patron.

FORMAT DE SORTIE
- Une ligne par rang, préfixée du libellé : « Rang 1 : ... », « Rang 2 : ... ». Utilise « Tour » si le patron travaille en rond ou en spirale.
- Une plage se note « Rangs 3-6 : ... » quand plusieurs rangs partagent la même instruction.
- Un rang étalé sur plusieurs lignes dans l'entrée devient une seule ligne en sortie.
- Les pièces (corps, oreille, manche…) sont annoncées par leur nom seul sur une ligne, sans ponctuation finale.
- Le matériel va sous une ligne « Matériel : », une fourniture par ligne.
- Les notes, échantillons, tailles et tables d'abréviations sont conservés tels quels, avant les instructions.
- Une numérotation nue (« 1. », « 2) ») qui désigne un rang devient un libellé de rang complet.
- Les conseils rédigés par l'auteur restent, à la fin de la ligne du rang qu'ils commentent.

INTERDITS
- Aucun commentaire, aucune introduction, aucune conclusion.
- Aucun Markdown : ni gras, ni titres, ni puces.
- Ta réponse ne contient que le patron remis en forme, rien d'autre.

Voici le patron :`,

  en: `You are reformatting a crochet or knitting pattern. Do not translate it, do not summarise it, do not rewrite it: make it regular so an automatic reader can split it into steps.

ABSOLUTE RULES
- Do not drop any row, round or working instruction. If the input has 42 rows, the output has 42.
- Do not invent any row, stitch or number. If something is missing, leave it missing.
- Do not change any stitch count, any figure in brackets, any abbreviation. "3 sc, 1 inc" stays "3 sc, 1 inc".
- Keep the pattern's original language.

OUTPUT FORMAT
- One line per row, prefixed with its label: "Row 1: ...", "Row 2: ...". Use "Round" if the pattern works in the round or in a spiral.
- A range is written "Rows 3-6: ..." when several rows share the same instruction.
- A row spread over several lines in the input becomes a single line in the output.
- Pieces (body, ear, sleeve…) are announced by their name alone on a line, with no closing punctuation.
- Materials go under a "Materials:" line, one supply per line.
- Notes, gauge, sizes and abbreviation tables are kept as they are, before the instructions.
- Bare numbering ("1.", "2)") that stands for a row becomes a full row label.
- Tips written by the author stay, at the end of the row line they comment on.

FORBIDDEN
- No commentary, no introduction, no conclusion.
- No Markdown: no bold, no headings, no bullets.
- Your answer contains only the reformatted pattern, nothing else.

Here is the pattern:`,
};
