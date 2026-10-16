import { FORMAT_PROMPT } from '../../src/app/features/format/format-prompt';

export type Langue = 'fr' | 'en';

const COMPLEMENT: Record<Langue, string> = {
  fr: 'Conserve tels quels, à leur place, les marqueurs [image N].',
  en: 'Keep the [image N] markers exactly as they are, in place.',
};

/** Même consigne que la page /format, plus la règle propre à l'appel automatique. */
export function consigne(langue: Langue): string {
  return `${FORMAT_PROMPT[langue]}\n\n${COMPLEMENT[langue]}`;
}
