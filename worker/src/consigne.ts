import { FORMAT_PROMPT } from '../../src/app/features/format/format-prompt';

export type Langue = 'fr' | 'en';

/**
 * Règles propres à l'appel automatique, ajoutées à la consigne de /format.
 * La langue est celle de la lectrice (celle de la page). Le libellé d'étape
 * (« Étape N » / « Step N ») est reconnu par le découpeur de patrons ; la
 * garde de fidélité ignore ses numéros (voir `fidelite.ts`).
 */
const COMPLEMENT: Record<Langue, string> = {
  fr: `Conserve tels quels, à leur place, les marqueurs [image N].

RÈGLES PROPRES À CET APPEL (elles complètent les règles ci-dessus)
- Si le document répète le même patron en plusieurs langues, ne garde que la version en français ; à défaut, la version en anglais ; à défaut, la première. C'est la seule suppression permise : ne traduis rien, ne mélange pas les langues, ne dis rien des versions retirées.
- Les passages écrits en paragraphes, sans rangs numérotés, se découpent en étapes : une ligne « Étape N : … » par instruction (une action, ou des actions qui vont ensemble), la numérotation repartant à 1 sous chaque nom de pièce. Recopie le texte mot pour mot.
- N'ajoute aucun libellé de rang ni aucun nombre absent de l'original : « Répète le rang 3 pour obtenir 5 rangs » reste tel quel, sans « Rangs 4-7 ».`,
  en: `Keep the [image N] markers exactly as they are, in place.

RULES SPECIFIC TO THIS CALL (they complete the rules above)
- If the document repeats the same pattern in several languages, keep only the English version; failing that, the first one. This is the only deletion allowed: translate nothing, do not mix languages, say nothing about the versions you removed.
- Passages written as paragraphs, without numbered rows, are split into steps: one "Step N: ..." line per instruction (one action, or actions that belong together), numbering restarting at 1 under each piece name. Copy the text word for word.
- Do not add any row label or any number that is not in the original: "Repeat row 3 for a total of 5 rows" stays as it is, without "Rows 4-7".`,
};

/** Même consigne que la page /format, plus les règles propres à l'appel automatique. */
export function consigne(langue: Langue): string {
  return `${FORMAT_PROMPT[langue]}\n\n${COMPLEMENT[langue]}`;
}
