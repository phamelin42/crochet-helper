import { Locale } from './locale';

/**
 * Segments d'URL par langue. Les chemins sont traduits — `/glossaire` en
 * français, `/en/glossary` en anglais — parce qu'une URL dans la langue de la
 * page pèse dans le référencement et se partage mieux.
 *
 * Le lecteur occupe la racine : c'est ce que les gens viennent faire ici, et
 * une racine indexable vaut mieux qu'une redirection vers une sous-page.
 */
export const ROUTE_PATHS = {
  reader: { fr: '/', en: '/' },
  glossary: { fr: '/glossaire', en: '/glossary' },
  format: { fr: '/bien-formater-son-patron', en: '/format-your-pattern' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteName = keyof typeof ROUTE_PATHS;
export type LocalizedPath = Record<Locale, string>;
