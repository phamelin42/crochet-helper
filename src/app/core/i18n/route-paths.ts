import { Locale } from './locale';

/**
 * Segments d'URL par langue. Les chemins sont traduits — `/lecteur` en
 * français, `/en/reader` en anglais — parce qu'une URL dans la langue de la
 * page pèse dans le référencement et se partage mieux.
 */
export const ROUTE_PATHS = {
  home: { fr: '/', en: '/' },
  reader: { fr: '/lecteur', en: '/reader' },
  glossary: { fr: '/glossaire', en: '/glossary' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteName = keyof typeof ROUTE_PATHS;
export type LocalizedPath = Record<Locale, string>;
